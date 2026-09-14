'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const port = 8101;
const dbPath = `/tmp/rps-game-session-${process.pid}.db`;
const server = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
  env: { ...process.env, PORT: String(port), DB_PATH: dbPath },
  stdio: ['ignore', 'pipe', 'inherit'],
});

function client() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const messages = [];
    const waiters = [];
    ws.on('message', (raw) => {
      const message = JSON.parse(raw);
      const index = waiters.findIndex((waiter) => waiter.test(message));
      if (index >= 0) waiters.splice(index, 1)[0].resolve(message);
      else messages.push(message);
    });
    ws.once('open', () => resolve({
      send(message) { ws.send(JSON.stringify(message)); },
      wait(test, timeout = 4000) {
        const predicate = typeof test === 'string' ? (message) => message.type === test : test;
        const index = messages.findIndex(predicate);
        if (index >= 0) return Promise.resolve(messages.splice(index, 1)[0]);
        return new Promise((resolveWait, rejectWait) => {
          const waiter = { test: predicate, resolve: resolveWait };
          waiters.push(waiter);
          setTimeout(() => {
            const i = waiters.indexOf(waiter);
            if (i >= 0) waiters.splice(i, 1);
            rejectWait(new Error('Timed out waiting for protocol message: ' + String(predicate)));
          }, timeout);
        });
      },
      async expectNone(test, duration = 250) {
        const predicate = typeof test === 'string' ? (message) => message.type === test : test;
        assert.strictEqual(messages.some(predicate), false, 'unexpected queued protocol message');
        await new Promise((resolveWait) => setTimeout(resolveWait, duration));
        assert.strictEqual(messages.some(predicate), false, 'unexpected protocol message');
      },
      close() { ws.close(); },
    }));
    ws.once('error', reject);
  });
}

async function register(username) {
  const response = await fetch(`http://127.0.0.1:${port}/api/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'session-isolation-password' }),
  });
  assert.strictEqual(response.status, 200);
  return (await response.json()).token;
}

async function createStartedGame() {
  const blue = await client();
  const red = await client();
  blue.send({ type: 'create', rated: false, color: 'blue', timeControl: { initial: 300, increment: 0 } });
  const created = await blue.wait('created');
  red.send({ type: 'join', gameId: created.gameId });
  await red.wait('joined');
  await blue.wait((message) => message.type === 'state' && message.gameId === created.gameId && message.status === 'playing');
  await red.wait((message) => message.type === 'state' && message.gameId === created.gameId && message.status === 'playing');
  return { blue, red, gameId: created.gameId };
}

async function main() {
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (chunk) => { if (String(chunk).includes('Intransitive server')) resolve(); });
    server.once('exit', (code) => reject(new Error(`server exited ${code}`)));
  });

  const first = await createStartedGame();
  const second = await createStartedGame();

  first.blue.send({ type: 'gameChat', gameId: first.gameId, text: 'first-game-only' });
  const chat = await first.red.wait((message) => message.type === 'gameChat' && message.gameId === first.gameId);
  assert.strictEqual(chat.message.gameId, first.gameId);
  assert.strictEqual(chat.message.text, 'first-game-only');
  await second.blue.expectNone((message) => message.type === 'gameChat');

  first.blue.send({ type: 'gameChat', gameId: second.gameId, text: 'stale-cross-game-message' });
  await second.red.expectNone((message) => message.type === 'gameChat' && message.message && message.message.text === 'stale-cross-game-message');

  first.blue.send({ type: 'resign' });
  const terminal = await first.red.wait((message) => message.type === 'gameChat' && message.message && message.message.terminal);
  assert.strictEqual(terminal.gameId, first.gameId);
  assert.strictEqual(terminal.message.gameId, first.gameId);
  assert.strictEqual(terminal.message.text, 'Red wins by resignation');

  const spectator = await client();
  spectator.send({ type: 'spectate', gameId: first.gameId });
  const history = await spectator.wait('gameChatHistory');
  assert.strictEqual(history.gameId, first.gameId);
  assert.ok(history.messages.some((message) => message.terminal && message.gameId === first.gameId));
  assert.ok(history.messages.every((message) => message.gameId === first.gameId));

  const challengerToken = await register('SessionChallenger');
  const targetToken = await register('SessionTarget');
  const challenger = await client();
  const target = await client();
  challenger.send({ type: 'identify', session: challengerToken });
  target.send({ type: 'identify', session: targetToken });
  await Promise.all([challenger.wait('challengeList'), target.wait('challengeList')]);
  challenger.send({ type: 'create', session: challengerToken, rated: false, color: 'blue', timeControl: { initial: 300, increment: 3 } });
  const waitingRoom = await challenger.wait('created');
  challenger.send({
    type: 'challengeCreate', session: challengerToken, targetUsername: 'SessionTarget',
    rated: false, timeControl: { initial: 300, increment: 3 },
  });
  const received = await target.wait('challengeReceived');
  target.send({ type: 'challengeAccept', session: targetToken, challengeId: received.challenge.id });
  const [challengerAccepted, targetAccepted] = await Promise.all([
    challenger.wait('challengeAccepted'), target.wait('challengeAccepted'),
  ]);
  assert.strictEqual(challengerAccepted.gameId, waitingRoom.gameId);
  assert.strictEqual(targetAccepted.gameId, waitingRoom.gameId);
  assert.strictEqual(challengerAccepted.color, 'blue');
  assert.strictEqual(targetAccepted.color, 'red');
  assert.ok(challengerAccepted.token && targetAccepted.token);
  await challenger.wait((message) => message.type === 'state' && message.status === 'playing');
  await target.wait((message) => message.type === 'state' && message.status === 'playing');
  await challenger.expectNone((message) => message.type === 'created' && message.gameId === waitingRoom.gameId);
  await target.expectNone((message) => message.type === 'joined' && message.gameId === waitingRoom.gameId);

  const directChallengerToken = await register('DirectChallenger');
  const directTargetToken = await register('DirectTarget');
  const directChallenger = await client();
  const directTarget = await client();
  directChallenger.send({ type: 'identify', session: directChallengerToken });
  directTarget.send({ type: 'identify', session: directTargetToken });
  await Promise.all([directChallenger.wait('challengeList'), directTarget.wait('challengeList')]);
  directChallenger.send({
    type: 'challengeCreate', session: directChallengerToken, targetUsername: 'DirectTarget',
    rated: false, timeControl: { initial: 180, increment: 2 },
  });
  const directReceived = await directTarget.wait('challengeReceived');
  directTarget.send({ type: 'challengeAccept', session: directTargetToken, challengeId: directReceived.challenge.id });
  const [directA, directB] = await Promise.all([
    directChallenger.wait('challengeAccepted'), directTarget.wait('challengeAccepted'),
  ]);
  assert.strictEqual(directA.gameId, directB.gameId);
  assert.notStrictEqual(directA.color, directB.color);
  assert.ok(directA.token && directB.token);
  await directChallenger.wait((message) => message.type === 'state' && message.gameId === directA.gameId && message.status === 'playing');
  await directTarget.wait((message) => message.type === 'state' && message.gameId === directA.gameId && message.status === 'playing');

  for (const socket of [first.blue, first.red, second.blue, second.red, spectator, challenger, target, directChallenger, directTarget]) socket.close();
  console.log('Per-game chat, terminal transcript, and direct challenge transition passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  server.kill('SIGTERM');
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(dbPath + suffix); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
});
