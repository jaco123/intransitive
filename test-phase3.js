'use strict';
/* Phase 3 integration test: matchmaking queue + opening-book aggregation. */
const assert = require('assert');

process.env.PORT = '8093';
process.env.DB_PATH = ':memory:';
require('./server.js');

const WebSocket = require('ws');

const BASE = 'http://127.0.0.1:8093';
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
    const ws = new WebSocket('ws://127.0.0.1:8093/ws');
    const queue = [];
    const waiters = [];
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      const w = waiters.shift();
      if (w) w(msg);
      else queue.push(msg);
    });
    ws.on('open', () => {
      const client = {
        ws,
        next: (timeout = 3000) => new Promise((res, rej) => {
          if (queue.length) return res(queue.shift());
          waiters.push(res);
          setTimeout(() => rej(new Error('timeout waiting for message')), timeout);
        }),
        send: (o) => ws.send(JSON.stringify(o)),
        close: () => ws.close(),
      };
      client.waitFor = async (type, timeout = 3000) => {
        const deadline = Date.now() + timeout;
        for (;;) {
          const m = await client.next(Math.max(0, deadline - Date.now()));
          if (m.type === type) return m;
        }
      };
      resolve(client);
    });
    ws.on('error', reject);
  });
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await delay(300);

  // --- Setup: two users ---
  console.log('Setup');
  const regA = await api('POST', '/api/register', { username: 'alice', password: 'secret1' });
  const tokenA = regA.json.token;
  const regB = await api('POST', '/api/register', { username: 'bob', password: 'secret2' });
  const tokenB = regB.json.token;
  pass('register two players');

  // --- Lobby matchmaking (seek + accept) ---
  console.log('Lobby matchmaking');
  const alice = await mkClient();

  alice.send({ type: 'queue', timeControl: { initial: 60, increment: 0 }, session: tokenA });
  const aSeek = await alice.waitFor('seekCreated');
  assert.strictEqual(aSeek.type, 'seekCreated');
  const seekId = aSeek.id;
  pass('first player opens a seek');

  const bob = await mkClient();
  const lobbyMsg = await bob.waitFor('lobby');
  const lobbySeek = (lobbyMsg.seeks || []).find((s) => s.id === seekId);
  assert.ok(lobbySeek, 'alice\'s seek is visible in the lobby');
  assert.strictEqual(lobbySeek.username, 'alice');
  assert.strictEqual(lobbySeek.rating, 1500);
  pass('seek appears in lobby with player name and rating');

  bob.send({ type: 'acceptSeek', seekId, session: tokenB });

  const aMatched = await alice.waitFor('queueMatched');
  const bMatched = await bob.waitFor('queueMatched');
  assert.strictEqual(aMatched.gameId, bMatched.gameId, 'both matched into the same game');
  assert.notStrictEqual(aMatched.color, bMatched.color, 'matched players must receive opposite colors');
  pass('accepting a seek pairs both players into one game');

  const aState = await alice.waitFor('state');
  const bState = await bob.waitFor('state');
  assert.strictEqual(aState.status, 'playing');
  assert.strictEqual(aState.rated, true);
  assert.strictEqual(aState.players.blue.name, 'alice');
  assert.strictEqual(aState.players.red.name, 'bob');
  pass('matched game starts as rated with correct seats');
  const gameId = aState.gameId;

  // --- Play a move, then resign, to populate the opening book ---
  // Blue (alice) plays e2-f2 (a legal first move), then alice resigns -> bob wins.
  alice.send({ type: 'move', fromC: 4, fromR: 1, toC: 5, toR: 1 }); // e2 -> f2
  const aAfterMove = await alice.waitFor('state');
  assert.strictEqual(aAfterMove.status, 'playing');
  assert.strictEqual(aAfterMove.history.length, 1);
  assert.ok(aAfterMove.turn === 'red');
  await bob.waitFor('state');
  pass('legal move played and broadcast');

  alice.send({ type: 'resign' });
  await alice.waitFor('state');
  await bob.waitFor('state');
  pass('game finished (resignation)');

  // --- Opening book aggregation ---
  console.log('Opening book');
  const openings = await api('GET', '/api/openings');
  assert.strictEqual(openings.status, 200);
  assert.strictEqual(openings.json.position.turn, 'blue');
  assert.strictEqual(openings.json.totalGames, 1);
  const found = openings.json.moves.find((m) => m.move === 'e2-f2');
  assert.ok(found, 'e2-f2 recorded in opening book');
  assert.strictEqual(found.games, 1);
  assert.strictEqual(found.wins, 0); // alice (blue) resigned -> blue lost
  assert.strictEqual(found.losses, 1);
  assert.strictEqual(found.draws, 0);
  pass('opening book records move with correct result stats');

  // Advancing one move gives the red-to-move position with no further games.
  const next = await api('GET', '/api/openings?moves=e2-f2');
  assert.strictEqual(next.status, 200);
  assert.strictEqual(next.json.position.turn, 'red');
  assert.strictEqual(next.json.totalGames, 0);
  pass('opening explorer advances along a move sequence');

  // Invalid move sequence is rejected.
  const bad = await api('GET', '/api/openings?moves=z9-z8');
  assert.strictEqual(bad.status, 400);
  pass('invalid move sequence rejected');

  // --- Guest seek games remain unrated ---
  console.log('Guest seek');
  const g1 = await mkClient();
  g1.send({ type: 'queue', timeControl: { initial: 60, increment: 0 } });
  const gSeek = await g1.waitFor('seekCreated');

  const g2 = await mkClient();
  const gLobby = await g2.waitFor('lobby');
  const gFound = (gLobby.seeks || []).find((s) => s.id === gSeek.id);
  assert.ok(gFound, 'guest seek visible in lobby');

  g2.send({ type: 'acceptSeek', seekId: gSeek.id });
  await g1.waitFor('queueMatched');
  await g2.waitFor('queueMatched');
  const gState = await g1.waitFor('state');
  assert.strictEqual(gState.rated, false);
  await g2.waitFor('state');
  pass('guest seek game is unrated');

  // --- Casual game between two logged-in players: no rating change ---
  console.log('Casual rated suppression');
  const regC = await api('POST', '/api/register', { username: 'carol', password: 'secret3' });
  const tokenC = regC.json.token;
  const regD = await api('POST', '/api/register', { username: 'dave', password: 'secret4' });
  const tokenD = regD.json.token;

  const carol = await mkClient();
  carol.send({ type: 'queue', timeControl: { initial: 60, increment: 0 }, session: tokenC, rated: false });
  const cSeek = await carol.waitFor('seekCreated');

  const dave = await mkClient();
  const dLobby = await dave.waitFor('lobby');
  assert.ok((dLobby.seeks || []).find((s) => s.id === cSeek.id), 'casual seek visible in lobby');
  dave.send({ type: 'acceptSeek', seekId: cSeek.id, session: tokenD });

  await carol.waitFor('queueMatched');
  await dave.waitFor('queueMatched');
  const cState = await carol.waitFor('state');
  assert.strictEqual(cState.rated, false);
  pass('casual game between two logged-in players is unrated');

  carol.send({ type: 'move', fromC: 4, fromR: 1, toC: 5, toR: 1 }); // e2 -> f2
  await carol.waitFor('state');
  await dave.waitFor('state');
  carol.send({ type: 'resign' });
  await carol.waitFor('state');
  await dave.waitFor('state');

  const meC = await api('GET', '/api/me', null, tokenC);
  const meD = await api('GET', '/api/me', null, tokenD);
  assert.strictEqual(meC.json.user.ratings.blitz.rating, 1500, 'casual game does not change loser rating');
  assert.strictEqual(meD.json.user.ratings.blitz.rating, 1500, 'casual game does not change winner rating');
  pass('casual game does not change either player rating');

  carol.close();
  dave.close();

  g1.close();
  g2.close();
  alice.close();
  bob.close();

  console.log('\nAll ' + passCount + ' phase-3 assertions passed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\nTEST FAILED:', err.message);
  process.exit(1);
});
