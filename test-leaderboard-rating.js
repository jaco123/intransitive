'use strict';

const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');
const { buildRatingPreview, roundedDelta } = require('./rating-preview.js');
const rating = require('./rating.js');

const PORT = 8101;
const BASE = `http://127.0.0.1:${PORT}`;

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(BASE + '/api/leaderboard');
      if (response.ok) return;
    } catch (error) {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('test server did not start');
}

async function main() {
  // Unequal ratings/RDs ensure the independent Glicko-2 changes are not
  // accidentally represented as exact negatives of one another.
  const blue = { rating: 1825, rd: 55, vol: 0.06 };
  const red = { rating: 1375, rd: 210, vol: 0.06 };
  const preview = buildRatingPreview(blue, red);
  const blueWin = rating.apply(blue, red, 1);
  const draw = rating.apply(blue, red, 0.5);
  const redWin = rating.apply(blue, red, 0);

  assert.deepStrictEqual(preview.blue, {
    win: roundedDelta(blueWin.blue, blue),
    draw: roundedDelta(draw.blue, blue),
    loss: roundedDelta(redWin.blue, blue),
  });
  assert.deepStrictEqual(preview.red, {
    win: roundedDelta(redWin.red, red),
    draw: roundedDelta(draw.red, red),
    loss: roundedDelta(blueWin.red, red),
  });
  assert.notStrictEqual(preview.blue.win, -preview.red.loss);

  const server = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT), DB_PATH: ':memory:' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  server.stderr.on('data', (chunk) => { stderr += chunk; });

  try {
    await waitForServer();
    for (let index = 0; index < 10; index++) {
      const registration = await fetch(BASE + '/api/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'Alpha' + String(index).padStart(2, '0'), password: 'secret1' }),
      });
      assert.strictEqual(registration.status, 200);
    }
    const registration = await fetch(BASE + '/api/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'RankViewer', password: 'secret1' }),
    });
    assert.strictEqual(registration.status, 200);
    const account = await registration.json();

    const leaderboard = await fetch(BASE + '/api/leaderboard', {
      headers: { authorization: 'Bearer ' + account.token },
    });
    assert.strictEqual(leaderboard.status, 200, 'authenticated leaderboard must not fail');
    const body = await leaderboard.json();
    assert.strictEqual(body.viewer.id, account.user.id);
    assert.strictEqual(body.viewer.username, 'RankViewer');
    for (const category of ['bullet', 'blitz', 'rapid', 'classical']) {
      assert.strictEqual(body.viewer.ratings[category], 1500);
      assert.strictEqual(body.ranks[category], 1);
      assert.ok(Array.isArray(body.leaderboards[category]));
      assert.strictEqual(body.leaderboards[category].length, 10);
      assert.ok(!body.leaderboards[category].some((row) => row.id === body.viewer.id),
        'tied viewer outside the limited top ten must still have rank data for a separate row');
    }
  } finally {
    server.kill('SIGTERM');
    await new Promise((resolve) => server.once('exit', resolve));
  }

  console.log('leaderboard and player-perspective rating preview regressions passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
