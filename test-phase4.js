'use strict';
/* Phase 4 integration test: in-game chat, spectating, draw offers, abort, rematch. */
const assert = require('assert');

process.env.PORT = '8094';
process.env.DB_PATH = ':memory:';
require('./server.js');

const WebSocket = require('ws');

let passCount = 0;
function pass(name) {
  passCount++;
  console.log('  PASS ' + name);
}

function mkClient() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://127.0.0.1:8094/ws');
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

  // --- In-game chat ---
  console.log('In-game chat');
  const blue = await mkClient();
  blue.send({ type: 'create', timeControl: { initial: 60, increment: 0 } });
  const created = await blue.waitFor('created');
  const gameId = created.gameId;
  await blue.waitFor('state'); // waiting

  const red = await mkClient();
  red.send({ type: 'join', gameId });
  await red.waitFor('joined');
  await red.waitFor('state'); // playing
  await blue.waitFor('state'); // playing

  blue.send({ type: 'gameChat', text: 'hello red' });
  const redChat = await red.waitFor('gameChat');
  assert.strictEqual(redChat.message.text, 'hello red');
  const blueChat = await blue.waitFor('gameChat');
  assert.strictEqual(blueChat.message.text, 'hello red');
  pass('in-game chat delivered to both players');

  // --- Spectating ---
  console.log('Spectating');
  const spec = await mkClient();
  spec.send({ type: 'spectate', gameId });
  const specAnnounce = await spec.waitFor('spectating');
  assert.strictEqual(specAnnounce.gameId, gameId);
  const specState = await spec.waitFor('state');
  assert.strictEqual(specState.spectating, true);
  assert.strictEqual(specState.status, 'playing');
  pass('third player can spectate a live game');

  blue.send({ type: 'gameChat', text: 'hi spectators' });
  const specChat = await spec.waitFor('gameChat');
  assert.strictEqual(specChat.message.text, 'hi spectators');
  pass('spectator receives in-game chat');

  // --- Draw offer + accept ---
  console.log('Draw offer');
  blue.send({ type: 'offerDraw' });
  const redOffer = await red.waitFor('drawOffer');
  assert.strictEqual(redOffer.color, 'blue');
  red.send({ type: 'acceptDraw' });
  const blueDraw = await blue.waitFor('state');
  assert.strictEqual(blueDraw.status, 'finished');
  assert.strictEqual(blueDraw.result, 'draw');
  assert.strictEqual(blueDraw.reason, 'agreement');
  await red.waitFor('state');
  pass('draw offered by blue and accepted by red ends the game');

  // --- Rematch ---
  console.log('Rematch');
  blue.send({ type: 'rematch' });
  await blue.waitFor('rematchOffer');
  const redRematchOffer = await red.waitFor('rematchOffer');
  assert.strictEqual(redRematchOffer.color, 'blue');
  red.send({ type: 'rematch' });
  const blueRematch = await blue.waitFor('rematchStarted');
  const redRematch = await red.waitFor('rematchStarted');
  assert.strictEqual(blueRematch.gameId, redRematch.gameId);
  assert.notStrictEqual(blueRematch.gameId, gameId);
  // Colors are reversed on rematch.
  assert.strictEqual(blueRematch.color, 'red');
  assert.strictEqual(redRematch.color, 'blue');
  await blue.waitFor('state');
  await red.waitFor('state');
  pass('rematch reverses colors and starts a fresh game');

  blue.close();
  red.close();
  spec.close();

  // --- Abort ---
  console.log('Abort');
  const b2 = await mkClient();
  b2.send({ type: 'create', timeControl: { initial: 60, increment: 0 } });
  const c2 = await b2.waitFor('created');
  const gameId2 = c2.gameId;
  await b2.waitFor('state');

  const r2 = await mkClient();
  r2.send({ type: 'join', gameId: gameId2 });
  await r2.waitFor('joined');
  await r2.waitFor('state');
  await b2.waitFor('state');

  b2.send({ type: 'abort' });
  const bAborted = await b2.waitFor('state');
  assert.strictEqual(bAborted.status, 'aborted');
  assert.strictEqual(bAborted.result, null);
  await r2.waitFor('state');
  pass('game can be aborted before the first move');

  b2.close();
  r2.close();

  console.log('\nAll ' + passCount + ' phase-4 assertions passed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\nTEST FAILED:', err.message);
  process.exit(1);
});
