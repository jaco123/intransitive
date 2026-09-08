'use strict';
/* Regression coverage for malformed HTTP/WS input, reconnects, and position validation. */
const assert = require('assert');
const WebSocket = require('ws');

// Read-only HTTP checks may target a configured deployment. Protocol checks
// always use this throwaway in-memory server because they create game state.
const PORT = Number(process.env.RPS_TEST_PORT || 8095);
const BASE = 'http://127.0.0.1:' + PORT;
const TARGET_BASE = process.env.RPS_TEST_BASE || BASE;
const WS_BASE = 'ws://127.0.0.1:' + PORT + '/ws';
process.env.PORT = String(PORT);
process.env.DB_PATH = ':memory:';
require('./server.js');

let passCount = 0;
function pass(name) {
  passCount++;
  console.log('  PASS ' + name);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function mkClient() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_BASE);
    const queue = [];
    const waiters = [];
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      const waiter = waiters.shift();
      if (waiter) waiter(msg);
      else queue.push(msg);
    });
    ws.once('open', () => {
      const client = {
        ws,
        send: (message) => ws.send(JSON.stringify(message)),
        sendRaw: (message) => ws.send(message),
        close: () => ws.close(),
        next: (timeout = 2000) => new Promise((resolveNext, rejectNext) => {
          if (queue.length) return resolveNext(queue.shift());
          let timer;
          const waiter = (msg) => { clearTimeout(timer); resolveNext(msg); };
          timer = setTimeout(() => {
            const index = waiters.indexOf(waiter);
            if (index >= 0) waiters.splice(index, 1);
            rejectNext(new Error('timeout waiting for WS message'));
          }, timeout);
          waiters.push(waiter);
        }),
        waitFor: async (type, timeout = 2000) => {
          const deadline = Date.now() + timeout;
          for (;;) {
            const msg = await client.next(Math.max(1, deadline - Date.now()));
            if (msg.type === type) return msg;
          }
        },
        queuedMessages: () => queue.slice(),
      };
      resolve(client);
    });
    ws.once('error', reject);
  });
}

async function createGame() {
  const blue = await mkClient();
  blue.send({ type: 'create', timeControl: { initial: 60, increment: 0 } });
  const created = await blue.waitFor('created');
  await blue.waitFor('state');

  const red = await mkClient();
  red.send({ type: 'join', gameId: created.gameId });
  const joined = await red.waitFor('joined');
  await red.waitFor('state');
  await blue.waitFor('state');
  return { blue, red, gameId: created.gameId, redToken: joined.token };
}

async function finishGame(game) {
  game.blue.send({ type: 'resign' });
  const finished = await game.blue.waitFor('state');
  assert.strictEqual(finished.status, 'finished');
  await game.red.waitFor('state');
}

async function main() {
  await delay(100);

  const icon = await fetch(TARGET_BASE + '/favicon.svg');
  assert.strictEqual(icon.status, 200);
  assert.match(await icon.text(), /<svg/);
  pass('favicon is served');

  const badBoard = await fetch(TARGET_BASE + '/api/openings?board=' + 'Z'.repeat(81));
  assert.strictEqual(badBoard.status, 400);
  pass('opening explorer rejects unknown board symbols');

  const badJson = await fetch(TARGET_BASE + '/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
  assert.strictEqual(badJson.status, 400);
  pass('API rejects malformed JSON with a client error');

  for (const payload of [null, 42, 'scalar', []]) {
    const response = await fetch(BASE + '/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.strictEqual(response.status, 400, 'malformed register payload should be a client error');
  }
  const afterAuthPayloads = await fetch(BASE + '/favicon.svg');
  assert.strictEqual(afterAuthPayloads.status, 200);
  pass('syntactically valid malformed auth payloads return 400 and server survives');

  const malformedPath = await fetch(TARGET_BASE + '/%E0%A4%A');
  assert.strictEqual(malformedPath.status, 400);
  const afterMalformedPath = await fetch(BASE + '/favicon.svg');
  assert.strictEqual(afterMalformedPath.status, 200);
  pass('HTTP server survives malformed URL escaping');

  const malformed = await mkClient();
  malformed.sendRaw('null');
  const malformedMessage = await malformed.waitFor('error');
  assert.strictEqual(malformedMessage.message, 'Malformed message.');
  malformed.close();
  pass('WebSocket rejects a JSON null frame without crashing');

  const invalidMoves = await createGame();
  for (const move of [
    { fromC: -1, fromR: 1, toC: 0, toR: 1 },
    { fromC: 0.5, fromR: 1, toC: 0, toR: 1 },
    { fromC: 0, fromR: 1, toC: 99, toR: 1 },
  ]) {
    invalidMoves.blue.send({ type: 'move', ...move });
    const error = await invalidMoves.blue.waitFor('error');
    assert.strictEqual(error.message, 'Invalid move.');
  }
  invalidMoves.blue.close();
  invalidMoves.red.close();
  pass('out-of-bounds and non-integer WebSocket moves are rejected safely');

  const disconnectedRematch = await createGame();
  await finishGame(disconnectedRematch);
  disconnectedRematch.red.send({ type: 'rematch' });
  await disconnectedRematch.blue.waitFor('rematchOffer');
  await disconnectedRematch.red.waitFor('rematchOffer');
  disconnectedRematch.red.close();
  await disconnectedRematch.blue.waitFor('opponent');
  disconnectedRematch.blue.send({ type: 'rematch' });
  const rematchError = await disconnectedRematch.blue.waitFor('error');
  assert.strictEqual(rematchError.message, 'Both players must be connected to start a rematch.');
  assert.strictEqual(disconnectedRematch.blue.queuedMessages().some((msg) => msg.type === 'rematchStarted'), false);
  disconnectedRematch.blue.close();
  pass('disconnected rematch acceptance is refused without starting a game');

  const reconnect = await createGame();
  reconnect.red.ws.on('error', () => {});
  const replacement = await mkClient();
  replacement.send({ type: 'join', gameId: reconnect.gameId, token: reconnect.redToken });
  await replacement.waitFor('joined');
  await replacement.waitFor('state');
  await reconnect.blue.waitFor('opponent');
  try { reconnect.red.send({ type: 'resign' }); } catch (e) {}
  await delay(100);
  const staleMessages = reconnect.blue.queuedMessages();
  assert.strictEqual(staleMessages.some((msg) => msg.type === 'state' && msg.status === 'finished'), false);
  assert.strictEqual(staleMessages.some((msg) => msg.type === 'opponent' && msg.connected === false), false);
  replacement.send({ type: 'resign' });
  const replacementFinished = await reconnect.blue.waitFor('state');
  assert.strictEqual(replacementFinished.status, 'finished');
  reconnect.blue.close();
  replacement.close();
  pass('replaced socket loses seat authority without disconnecting its replacement');

  console.log('\nAll ' + passCount + ' hardening assertions passed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\nTEST FAILED:', err.message);
  process.exit(1);
});
