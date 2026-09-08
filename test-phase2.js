'use strict';
/* Phase 2 integration test: accounts, rated games, Glicko-2, history. */
const assert = require('assert');

process.env.PORT = '8092';
process.env.DB_PATH = ':memory:';
require('./server.js');

const WebSocket = require('ws');

const BASE = 'http://127.0.0.1:8092';
let passCount = 0;
function pass(name) {
  passCount++;
  console.log('  PASS ' + name);
}

async function api(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

function mkClient() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://127.0.0.1:8092/ws');
    const queue = [];
    const waiters = [];
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'lobby' || msg.type === 'chatHistory' || msg.type === 'gameStart' || msg.type === 'gameChatHistory') return; // ignore broadcasts/notifications in this test
      const w = waiters.shift();
      if (w) w(msg);
      else queue.push(msg);
    });
    ws.on('open', () => {
      resolve({
        ws,
        next: (timeout = 3000) => new Promise((res, rej) => {
          if (queue.length) return res(queue.shift());
          waiters.push(res);
          setTimeout(() => rej(new Error('timeout waiting for message')), timeout);
        }),
        send: (o) => ws.send(JSON.stringify(o)),
        close: () => ws.close(),
      });
    });
    ws.on('error', reject);
  });
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await delay(300);

  // --- Auth ---
  console.log('Auth');
  const regA = await api('POST', '/api/register', { username: 'alice', password: 'secret1' });
  assert.strictEqual(regA.status, 200, 'alice register');
  assert.ok(regA.json.token && regA.json.user.username === 'alice');
  const tokenA = regA.json.token;
  pass('register alice');

  const regB = await api('POST', '/api/register', { username: 'bob', password: 'secret2' });
  const tokenB = regB.json.token;
  assert.ok(regB.json.user.username === 'bob');
  pass('register bob');

  const dup = await api('POST', '/api/register', { username: 'Alice', password: 'secret3' });
  assert.strictEqual(dup.status, 400);
  assert.match(dup.json.error, /taken/);
  pass('duplicate username rejected (case-insensitive)');

  const badLogin = await api('POST', '/api/login', { username: 'alice', password: 'wrong' });
  assert.strictEqual(badLogin.status, 401);
  pass('wrong password rejected');

  const login = await api('POST', '/api/login', { username: 'alice', password: 'secret1' });
  assert.strictEqual(login.status, 200);
  pass('login works');

  const me = await api('GET', '/api/me', null, tokenA);
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.json.user.username, 'alice');
  assert.strictEqual(me.json.user.rating, 1500);
  pass('GET /api/me');

  const meAnon = await api('GET', '/api/me');
  assert.strictEqual(meAnon.status, 401);
  pass('unauthenticated /api/me rejected');

  // --- Rated game over WS ---
  console.log('Rated game');
  const alice = await mkClient();
  alice.send({ type: 'create', timeControl: { initial: 60, increment: 0 }, session: tokenA });
  const created = await alice.next();
  assert.strictEqual(created.type, 'created');
  const gameId = created.gameId;
  await alice.next(); // waiting state
  pass('alice creates game with session');

  const bob = await mkClient();
  bob.send({ type: 'join', gameId, session: tokenB });
  const bJoined = await bob.next();
  assert.strictEqual(bJoined.type, 'joined');
  assert.strictEqual(bJoined.color, 'red');
  pass('bob joins with session (red)');

  const aState = await alice.next();
  assert.strictEqual(aState.status, 'playing');
  assert.strictEqual(aState.rated, true);
  assert.strictEqual(aState.players.blue.name, 'alice');
  assert.strictEqual(aState.players.red.name, 'bob');
  assert.strictEqual(aState.players.blue.rating, 1500);
  pass('game is rated; player names + ratings present');
  await bob.next(); // bob state

  // Alice (blue) resigns -> bob (red) wins.
  alice.send({ type: 'resign' });
  const aFin = await alice.next();
  assert.strictEqual(aFin.status, 'finished');
  assert.strictEqual(aFin.result, 'red');
  assert.strictEqual(aFin.reason, 'resign');
  assert.ok(aFin.ratingDelta);
  assert.ok(aFin.ratingDelta.red > 0 && aFin.ratingDelta.blue < 0);
  await bob.next(); // bob finish state
  pass('resignation applies rated result with rating deltas');

  alice.close();
  bob.close();

  // --- Ratings updated (per time control; 60+0 is Bullet) ---
  const meA = await api('GET', '/api/me', null, tokenA);
  const meB = await api('GET', '/api/me', null, tokenB);
  assert.ok(meA.json.user.ratings.bullet.rating < 1500, 'alice lost bullet rating');
  assert.ok(meB.json.user.ratings.bullet.rating > 1500, 'bob gained bullet rating');
  assert.strictEqual(meA.json.user.ratings.blitz.rating, 1500, 'blitz rating untouched');
  pass('Per-time-control Glicko-2 ratings persisted (loser down, winner up)');

  // --- History ---
  const histA = await api('GET', '/api/games', null, tokenA);
  assert.strictEqual(histA.status, 200);
  assert.strictEqual(histA.json.games.length, 1);
  const g = histA.json.games[0];
  assert.strictEqual(g.id, gameId);
  assert.strictEqual(g.result, 'red');
  assert.strictEqual(g.rated, true);
  pass('history lists the finished rated game');

  const histB = await api('GET', '/api/games', null, tokenB);
  assert.strictEqual(histB.json.games.length, 1);
  pass('history visible to both players');

  const fetched = await api('GET', '/api/games/' + gameId, null, tokenA);
  assert.strictEqual(fetched.status, 200);
  assert.ok(Array.isArray(fetched.json.game.history));
  assert.strictEqual(fetched.json.game.history.length, 0);
  pass('single game fetch returns replayable history');

  // --- Guest game stays unrated & not saved ---
  console.log('Guest (unrated) game');
  const g1 = await mkClient();
  g1.send({ type: 'create', timeControl: { initial: 60, increment: 0 } });
  const c1 = await g1.next();
  const guestId = c1.gameId;
  await g1.next();
  const g2 = await mkClient();
  g2.send({ type: 'join', gameId: guestId });
  await g2.next();
  const guestState = await g1.next();
  assert.strictEqual(guestState.rated, false);
  await g2.next();
  pass('guest game is unrated');
  g1.send({ type: 'resign' });
  await g1.next();
  await g2.next();
  const guestHist = await api('GET', '/api/games', null, tokenA);
  assert.strictEqual(guestHist.json.games.length, 1, 'guest game not added to history');
  pass('guest game is not persisted to history');

  g1.close();
  g2.close();

  console.log('\nAll ' + passCount + ' phase-2 assertions passed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\nTEST FAILED:', err.message);
  process.exit(1);
});
