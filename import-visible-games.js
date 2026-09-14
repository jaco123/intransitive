'use strict';

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const Database = require('better-sqlite3');
const engine = require(path.join(__dirname, 'engine.js'));

const dbPath = process.env.RPS_DB_PATH || path.join(__dirname, 'data', 'rps.db');
const sourcePath = process.env.RPS_IMPORT_PATH || '/tmp/rps-opening-games.json';
const sourceGames = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const db = new Database(dbPath);

const users = new Map(db.prepare('SELECT id, username FROM users').all()
  .map((user) => [user.username.toLowerCase(), user.id]));
const insert = db.prepare(`
  INSERT OR REPLACE INTO games (
    id, created_at, finished_at, tc_initial, tc_increment,
    blue_user_id, red_user_id, blue_name, red_name,
    blue_rating_before, red_rating_before, blue_rating_after, red_rating_after,
    status, result, reason, rated, history, start_position
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

function parseMove(text) {
  const match = String(text || '').match(/^([A-I])([1-9])-([A-I])([1-9])$/i);
  if (!match) return null;
  return {
    fromC: engine.FILES.indexOf(match[1].toLowerCase()),
    fromR: Number(match[2]) - 1,
    toC: engine.FILES.indexOf(match[3].toLowerCase()),
    toR: Number(match[4]) - 1,
  };
}

function sourceResult(result) {
  if (result === 'blue win') return 'blue';
  if (result === 'red win') return 'red';
  if (result === 'draw') return 'draw';
  return null;
}

function importGame(source, index, now) {
  const game = new engine.Game();
  const history = [];
  const sourceMoves = Array.isArray(source.moves) ? source.moves : [];
  for (const notation of sourceMoves) {
    if (game.status !== 'playing') break;
    const move = parseMove(notation);
    if (!move || [move.fromC, move.fromR, move.toC, move.toR].some((n) => n < 0)) break;
    const color = game.turn;
    const result = game.move(move.fromC, move.fromR, move.toC, move.toR);
    if (!result.ok) break;
    const recorded = { ...game.history[game.history.length - 1], color };
    history.push(recorded);
  }

  // Only source games with an explicit result belong in the database.
  // Imported move lists use different terminal rules, so there is no
  // fallback result and no result-less game import path.
  const result = sourceResult(source.result);
  if (!result) return { skipped: true, historyLength: 0, sourceMoves: sourceMoves.length };
  const reason = 'imported';
  const id = 'imp_' + crypto.createHash('sha256').update(JSON.stringify(source)).digest('hex').slice(0, 20);
  const createdAt = now - (sourceGames.length - index) * 1000;
  const finishedAt = Math.min(now, createdAt + Math.max(1000, Math.min(1800000, history.length * 1000)));
  const blueName = source.blue_username || 'Unknown';
  const redName = source.red_username || 'Unknown';
  insert.run(
    id, createdAt, finishedAt, 0, 0,
    users.get(blueName.toLowerCase()) || null, users.get(redName.toLowerCase()) || null,
    blueName, redName, null, null, null, null,
    'finished', result, reason, 0, JSON.stringify(history), null
  );
  return { historyLength: history.length, sourceMoves: sourceMoves.length, result, reason };
}

const importAll = db.transaction(() => {
  const now = Date.now();
  const stats = { rows: 0, moves: 0, skipped: 0, truncated: 0 };
  sourceGames.forEach((source, index) => {
    const imported = importGame(source, index, now);
    if (imported.skipped) { stats.skipped++; return; }
    stats.rows++;
    stats.moves += imported.historyLength;
    if (imported.historyLength < imported.sourceMoves) stats.truncated++;
  });
  return stats;
});

const before = db.prepare("SELECT COUNT(*) AS n FROM games WHERE id LIKE 'imp_%'").get().n;
const stats = importAll();
const after = db.prepare("SELECT COUNT(*) AS n FROM games WHERE id LIKE 'imp_%'").get().n;
console.log(JSON.stringify({ ...stats, existingImported: before, importedRows: after }));
db.close();
