'use strict';
/* Automated two-player test for the WebSocket server.
 * Starts the server on a throwaway port (8091) and exercises the full flow.
 */
const assert = require('assert');

process.env.PORT = '8091';
process.env.DB_PATH = ':memory:';
require('./server.js'); // starts listening

const WebSocket = require('ws');

function mkClient() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://127.0.0.1:8091/ws');
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
let passCount = 0;
function pass(name) {
  passCount++;
  console.log('  PASS ' + name);
}

async function main() {
  await delay(300);

  // ---------------- Game 1: create, join, move, validate, resign ----------------
  console.log('Game 1 — create/join/start');
  const blue = await mkClient();
  blue.send({ type: 'create', timeControl: { initial: 300, increment: 3 } });

  const created = await blue.next();
  assert.strictEqual(created.type, 'created');
  assert.strictEqual(created.color, 'blue');
  assert.ok(created.token && created.gameId);
  const gameId = created.gameId;
  pass('create returns gameId, color=blue, token');

  const waiting = await blue.next();
  assert.strictEqual(waiting.type, 'state');
  assert.strictEqual(waiting.status, 'waiting');
  pass('creator sees waiting state');

  const red = await mkClient();
  red.send({ type: 'join', gameId });

  const redJoined = await red.next();
  assert.strictEqual(redJoined.type, 'joined');
  assert.strictEqual(redJoined.color, 'red');
  assert.ok(redJoined.token);
  pass('joiner gets color=red and token');

  const redState = await red.next();
  assert.strictEqual(redState.status, 'playing');
  assert.strictEqual(redState.turn, 'blue');
  assert.ok(Array.isArray(redState.board) && redState.board.length === 9);
  pass('game starts when both are present (turn=blue)');

  const blueState = await blue.next();
  assert.strictEqual(blueState.status, 'playing');
  assert.strictEqual(blueState.clocks.running, 'blue');
  pass('creator receives started state, blue clock running');

  // Wrong-turn guard: red tries to move first.
  red.send({ type: 'move', fromC: 7, fromR: 4, toC: 8, toR: 4 });
  const wrongTurn = await red.next();
  assert.strictEqual(wrongTurn.type, 'error');
  assert.strictEqual(wrongTurn.message, 'Not your turn.');
  pass('rejects move when it is not your turn');

  // Blue makes a legal move: d2 -> e1.
  blue.send({ type: 'move', fromC: 3, fromR: 1, toC: 4, toR: 0 });
  const blueMoved = await blue.next();
  assert.strictEqual(blueMoved.type, 'state');
  assert.strictEqual(blueMoved.history.length, 1);
  assert.strictEqual(blueMoved.turn, 'red');
  assert.strictEqual(blueMoved.clocks.running, 'red');
  assert.ok(blueMoved.clocks.blueMs > 300000, 'increment was added to blue');
  pass('legal move applied: turn=red, increment added');

  const blueMoved2 = await red.next();
  assert.strictEqual(blueMoved2.history.length, 1);
  pass('move broadcast to opponent');

  // Blue tries to move again (now red's turn).
  blue.send({ type: 'move', fromC: 3, fromR: 1, toC: 4, toR: 0 });
  const wrongTurn2 = await blue.next();
  assert.strictEqual(wrongTurn2.type, 'error');
  pass('rejects second move by same side');

  // Red makes a legal move: h5 -> i5.
  red.send({ type: 'move', fromC: 7, fromR: 4, toC: 8, toR: 4 });
  const redMoved = await red.next();
  assert.strictEqual(redMoved.history.length, 2);
  assert.strictEqual(redMoved.turn, 'blue');
  const blueSees = await blue.next();
  assert.strictEqual(blueSees.history.length, 2);
  pass('red move applied and broadcast');

  // Illegal move: blue d3 -> e3 (own piece).
  blue.send({ type: 'move', fromC: 3, fromR: 2, toC: 4, toR: 2 });
  const illegal = await blue.next();
  assert.strictEqual(illegal.type, 'error');
  assert.strictEqual(illegal.message, 'Illegal move');
  pass('rejects illegal move (cannot capture own piece)');

  // Resign by blue -> red wins.
  blue.send({ type: 'resign' });
  const resignedBlue = await blue.next();
  assert.strictEqual(resignedBlue.status, 'finished');
  assert.strictEqual(resignedBlue.result, 'red');
  assert.strictEqual(resignedBlue.reason, 'resign');
  const resignedRed = await red.next();
  assert.strictEqual(resignedRed.status, 'finished');
  assert.strictEqual(resignedRed.result, 'red');
  pass('resignation ends game, opponent wins');

  blue.close();
  red.close();

  // ---------------- Game 2: disconnect / reconnect ----------------
  console.log('Game 2 — disconnect/reconnect');
  const b2 = await mkClient();
  b2.send({ type: 'create', timeControl: { initial: 60, increment: 0 } });
  const c2 = await b2.next();
  const gameId2 = c2.gameId;
  await b2.next(); // waiting state

  const r2 = await mkClient();
  r2.send({ type: 'join', gameId: gameId2 });
  const r2j = await r2.next();
  const redToken2 = r2j.token;
  await r2.next(); // red state playing
  await b2.next(); // blue state playing
  pass('second game started');

  // Red disconnects -> blue is notified.
  r2.close();
  const oppLeft = await b2.next();
  assert.strictEqual(oppLeft.type, 'opponent');
  assert.strictEqual(oppLeft.connected, false);
  pass('disconnect notifies opponent');

  // Red reconnects with token.
  const r3 = await mkClient();
  r3.send({ type: 'join', gameId: gameId2, token: redToken2 });
  const r3j = await r3.next();
  assert.strictEqual(r3j.type, 'joined');
  assert.strictEqual(r3j.color, 'red');
  const r3state = await r3.next();
  assert.strictEqual(r3state.status, 'playing');
  const oppBack = await b2.next();
  assert.strictEqual(oppBack.type, 'opponent');
  assert.strictEqual(oppBack.connected, true);
  pass('reconnect with token restores the same color');

  b2.close();
  r3.close();

  console.log('\nAll ' + passCount + ' assertions passed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\nTEST FAILED:', err.message);
  process.exit(1);
});
