'use strict';

// Protocol-level coverage for the server-authoritative, guest-accessible AI game.
// The browser test covers the public UI; this test exercises race/error and
// persistence isolation without calling game APIs to create or play a game.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const PORT = 8096;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'intransitive-ai-game-'));
const dbPath = path.join(tempDir, 'test.db');
let server;

function waitForServer() {
  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`server startup timeout: ${output}`)), 15000);
    server.stdout.on('data', (chunk) => {
      output += chunk.toString();
      if (output.includes('Intransitive server on')) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
    const queue = [];
    const waiters = [];
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (process.env.AI_TEST_DEBUG) console.log('  message', message.type, message.status || '', message.history ? message.history.length : '');
      const waiter = waiters.shift();
      if (waiter) waiter(message);
      else queue.push(message);
    });
    ws.on('open', () => resolve({
      send: (message) => ws.send(JSON.stringify(message)),
      waitFor(predicate, timeout = 45000) {
        const queued = queue.findIndex(predicate);
        if (queued >= 0) return Promise.resolve(queue.splice(queued, 1)[0]);
        return new Promise((res, rej) => {
          const timer = setTimeout(() => {
            const index = waiters.indexOf(waiter);
            if (index >= 0) waiters.splice(index, 1);
            rej(new Error('timeout waiting for protocol message'));
          }, timeout);
          const waiter = (message) => {
            clearTimeout(timer);
            if (predicate(message)) res(message);
            else {
              waiters.unshift(waiter);
              connectMessage(message);
            }
          };
          const connectMessage = (message) => {
            const queuedIndex = queue.findIndex(predicate);
            if (queuedIndex >= 0) res(queue.splice(queuedIndex, 1)[0]);
            else queue.push(message);
          };
          waiters.push(waiter);
        });
      },
      close: () => ws.close(),
    }));
    ws.on('error', reject);
  });
}

async function main() {
  server = spawn(process.execPath, ['server.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), DB_PATH: dbPath },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitForServer();

  const client = await connect();
  try {
    client.send({ type: 'createAI', timeControl: { initial: 60, increment: 0 } });
    console.log('  createAI sent');
    const created = await client.waitFor((message) => message.type === 'created');
    assert.strictEqual(created.color, 'blue');
    assert.ok(created.gameId && created.token);

    const started = await client.waitFor((message) => message.type === 'state' && message.status === 'playing');
    console.log('  AI game started');
    assert.strictEqual(started.computer, true);
    assert.strictEqual(started.rated, false);
    assert.strictEqual(started.players.red.name, 'Intransitive AI');
    assert.strictEqual(started.players.red.ai, true);
    assert.strictEqual(started.spectating, false);

    // Send the same legal move twice without waiting. The server must apply it
    // once, reject the second out-of-turn command, and serialize AI inference.
    const move = { type: 'move', fromC: 3, fromR: 1, toC: 4, toR: 0 };
    client.send(move);
    client.send(move);
    console.log('  duplicate moves sent');
    const humanMove = await client.waitFor((message) => message.type === 'state' && message.history.length === 1);
    assert.strictEqual(humanMove.turn, 'red');
    assert.strictEqual(humanMove.aiThinking, true);
    const duplicate = await client.waitFor((message) => message.type === 'error');
    assert.strictEqual(duplicate.message, 'Not your turn.');

    const aiMove = await client.waitFor((message) => message.type === 'state' && message.history.length === 2, 90000);
    console.log('  AI reply received');
    assert.strictEqual(aiMove.turn, 'blue');
    assert.strictEqual(aiMove.players.red.name, 'Intransitive AI');

    const spectator = await connect();
    spectator.send({ type: 'spectate', gameId: created.gameId });
    const spectatorState = await spectator.waitFor((message) => message.type === 'state' && message.history.length === 2);
    assert.strictEqual(spectatorState.spectating, true);
    spectator.send({ type: 'retryAI' });
    const spectatorRetry = await spectator.waitFor((message) => message.type === 'error');
    assert.strictEqual(spectatorRetry.message, 'AI retry is not available.');
    spectator.close();

    client.send({ type: 'retryAI' });
    const wrongRetry = await client.waitFor((message) => message.type === 'error');
    assert.strictEqual(wrongRetry.message, 'AI retry is not available.');

    client.send({ type: 'resign' });
    const finished = await client.waitFor((message) => message.type === 'state' && message.status === 'finished');
    assert.strictEqual(finished.rated, false);
    const Database = require('better-sqlite3');
    const database = new Database(dbPath, { readonly: true });
    try {
      assert.strictEqual(database.prepare('SELECT COUNT(*) AS count FROM games').get().count, 0);
    } finally {
      database.close();
    }
    console.log('AI protocol lifecycle, spectator/retry authorization, duplicate guard, and history isolation passed');
  } finally {
    client.close();
  }
}

async function stopServer() {
  if (!server) return;
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      server.kill('SIGKILL');
      resolve();
    }, 10000);
    server.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    server.kill('SIGTERM');
  });
  fs.rmSync(tempDir, { recursive: true, force: true });
}

main()
  .catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  })
  .finally(stopServer);
