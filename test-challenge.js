'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const port = 8097;
const dbPath = `/tmp/rps-challenge-${process.pid}.db`;
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
      const index = waiters.findIndex((waiter) => waiter.type === message.type && (!waiter.test || waiter.test(message)));
      if (index >= 0) waiters.splice(index, 1)[0].resolve(message);
      else messages.push(message);
    });
    ws.once('open', () => resolve({
      send(message) { ws.send(JSON.stringify(message)); },
      wait(type, test) {
        const index = messages.findIndex((message) => message.type === type && (!test || test(message)));
        if (index >= 0) return Promise.resolve(messages.splice(index, 1)[0]);
        return new Promise((resolveWait, rejectWait) => {
          const waiter = { type, test, resolve: resolveWait };
          waiters.push(waiter);
          setTimeout(() => {
            const i = waiters.indexOf(waiter);
            if (i >= 0) waiters.splice(i, 1);
            rejectWait(new Error(`Timed out waiting for ${type}`));
          }, 4000);
        });
      },
      close() { ws.close(); },
    }));
    ws.once('error', reject);
  });
}

async function register(username) {
  const response = await fetch(`http://127.0.0.1:${port}/api/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'challenge-test-password' }),
  });
  assert.strictEqual(response.status, 200);
  return (await response.json()).token;
}

async function main() {
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (chunk) => { if (String(chunk).includes('Intransitive server')) resolve(); });
    server.once('exit', (code) => reject(new Error(`server exited ${code}`)));
  });
  const challengerToken = await register('ChallengeOwner');
  const targetToken = await register('ChallengeTarget');
  const challenger = await client();
  const target = await client();
  challenger.send({ type: 'identify', session: challengerToken });
  target.send({ type: 'identify', session: targetToken });
  challenger.send({ type: 'create', session: challengerToken, rated: false, color: 'blue', timeControl: { initial: 300, increment: 3 } });
  const created = await challenger.wait('created');
  challenger.send({ type: 'challengeCreate', session: challengerToken, targetUsername: 'ChallengeTarget', rated: false, timeControl: { initial: 300, increment: 3 } });
  const received = await target.wait('challengeReceived');
  target.send({ type: 'challengeAccept', session: targetToken, challengeId: received.challenge.id });
  const accepted = await target.wait('challengeAccepted');
  assert.strictEqual(accepted.gameId, created.gameId, 'acceptance should transition both players into the existing private room');
  const state = await target.wait('state', (message) => message.status === 'playing');
  assert.strictEqual(state.players.blue.name, 'ChallengeOwner');
  assert.strictEqual(state.players.red.name, 'ChallengeTarget');
  challenger.close();
  target.close();
  console.log('Private-room challenge acceptance passed.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  server.kill('SIGTERM');
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(dbPath + suffix); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
});
