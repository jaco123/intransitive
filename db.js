/* RPS 9x9 — persistence layer (SQLite via better-sqlite3).
 * Stores users, sessions, ratings, and finished-game history.
 */
'use strict';

const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'rps.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass_salt TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  rating REAL NOT NULL DEFAULT 1500,
  rd REAL NOT NULL DEFAULT 350,
  vol REAL NOT NULL DEFAULT 0.06,
  rating_bullet REAL NOT NULL DEFAULT 1500,
  rd_bullet REAL NOT NULL DEFAULT 350,
  vol_bullet REAL NOT NULL DEFAULT 0.06,
  rating_blitz REAL NOT NULL DEFAULT 1500,
  rd_blitz REAL NOT NULL DEFAULT 350,
  vol_blitz REAL NOT NULL DEFAULT 0.06,
  rating_rapid REAL NOT NULL DEFAULT 1500,
  rd_rapid REAL NOT NULL DEFAULT 350,
  vol_rapid REAL NOT NULL DEFAULT 0.06,
  rating_classical REAL NOT NULL DEFAULT 1500,
  rd_classical REAL NOT NULL DEFAULT 350,
  vol_classical REAL NOT NULL DEFAULT 0.06,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  finished_at INTEGER,
  tc_initial INTEGER NOT NULL,
  tc_increment INTEGER NOT NULL,
  blue_user_id INTEGER,
  red_user_id INTEGER,
  blue_name TEXT,
  red_name TEXT,
  blue_rating_before REAL,
  red_rating_before REAL,
  blue_rating_after REAL,
  red_rating_after REAL,
  status TEXT NOT NULL,
  result TEXT,
  reason TEXT,
  rated INTEGER NOT NULL DEFAULT 0,
  history TEXT NOT NULL DEFAULT '[]',
  start_position TEXT
);

CREATE INDEX IF NOT EXISTS idx_games_blue ON games(blue_user_id, finished_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_red ON games(red_user_id, finished_at DESC);

CREATE TABLE IF NOT EXISTS positions (
  key TEXT PRIMARY KEY,
  board TEXT NOT NULL,
  turn TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS opening_moves (
  position_key TEXT NOT NULL REFERENCES positions(key) ON DELETE CASCADE,
  move TEXT NOT NULL,
  games INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (position_key, move)
);

CREATE INDEX IF NOT EXISTS idx_opening_moves_position ON opening_moves(position_key);
`);

// Per-time-control rating categories (Lichess definitions).
const CATEGORIES = ['bullet', 'blitz', 'rapid', 'classical'];

// Add per-category rating columns to any pre-existing database.
function migrate() {
  const cols = new Set(db.prepare('PRAGMA table_info(users)').all().map((c) => c.name));
  for (const cat of CATEGORIES) {
    for (const field of ['rating', 'rd', 'vol']) {
      const col = field + '_' + cat;
      if (!cols.has(col)) {
        const def = field === 'rating' ? '1500' : field === 'rd' ? '350' : '0.06';
        db.prepare(`ALTER TABLE users ADD COLUMN ${col} REAL NOT NULL DEFAULT ${def}`).run();
      }
    }
  }
  const gameCols = new Set(db.prepare('PRAGMA table_info(games)').all().map((c) => c.name));
  if (!gameCols.has('start_position')) db.prepare('ALTER TABLE games ADD COLUMN start_position TEXT').run();
}
migrate();

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------------------------------------------------------------------------
// Password hashing (scrypt, no external deps)
// ---------------------------------------------------------------------------
function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

function verifyPassword(password, salt, expectedHash) {
  const actual = Buffer.from(hashPassword(password, salt), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

const USERNAME_RE = /^[A-Za-z0-9_-]{2,20}$/;

function publicUser(u) {
  const ratings = {};
  for (const cat of CATEGORIES) {
    ratings[cat] = {
      rating: Math.round(u['rating_' + cat] != null ? u['rating_' + cat] : u.rating),
      rd: Math.round(u['rd_' + cat] != null ? u['rd_' + cat] : u.rd),
    };
  }
  return {
    id: u.id,
    username: u.username,
    rating: Math.round(u.rating),
    rd: Math.round(u.rd),
    ratings,
    wins: u.wins,
    losses: u.losses,
    draws: u.draws,
    topCategories: topCategoriesForUser(u.id),
    createdAt: u.created_at,
  };
}

// ---------------------------------------------------------------------------
// Users & sessions
// ---------------------------------------------------------------------------
function createUser(username, password) {
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    const err = new Error('Username must be 2-20 chars (letters, numbers, _ or -).');
    err.code = 'BAD_USERNAME';
    throw err;
  }
  if (typeof password !== 'string' || password.length < 6) {
    const err = new Error('Password must be at least 6 characters.');
    err.code = 'BAD_PASSWORD';
    throw err;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  const now = Date.now();

  const insert = db.prepare(`
    INSERT INTO users (username, pass_salt, pass_hash, rating, rd, vol, created_at)
    VALUES (?, ?, ?, 1500, 350, 0.06, ?)
  `);
  try {
    const info = insert.run(username, salt, hash, now);
    return getUserById(info.lastInsertRowid);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      const err = new Error('That username is already taken.');
      err.code = 'USERNAME_TAKEN';
      throw err;
    }
    throw e;
  }
}

function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
}

function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username) || null;
}

function topCategoriesForUser(userId) {
  return CATEGORIES.filter((cat) => {
    const top = db.prepare(`
      SELECT id FROM users
      ORDER BY rating_${cat} DESC, username ASC
      LIMIT 1
    `).get();
    return top && top.id === userId;
  });
}

function listPlayers(search = '', limit = 50) {
  const boundedLimit = Math.max(1, Math.min(50, Math.trunc(Number(limit) || 50)));
  const term = String(search || '').trim().slice(0, 20);
  const escaped = term.replace(/[\\%_]/g, '\\$&');
  const rows = db.prepare(`
    SELECT id, username, wins, losses, draws,
      rating_bullet, rating_blitz, rating_rapid, rating_classical
    FROM users
    WHERE username LIKE ? ESCAPE '\\'
    ORDER BY username ASC
    LIMIT ?
  `).all('%' + escaped + '%', boundedLimit);
  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    ratings: {
      bullet: Math.round(row.rating_bullet),
      blitz: Math.round(row.rating_blitz),
      rapid: Math.round(row.rating_rapid),
      classical: Math.round(row.rating_classical),
    },
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
  }));
}

function listLeaderboards(limit = 10) {
  const boundedLimit = Math.max(1, Math.min(10, Math.trunc(Number(limit) || 10)));
  const result = {};
  for (const cat of CATEGORIES) {
    const rows = db.prepare(`
      SELECT id, username, rating_${cat} AS rating, wins, losses, draws
      FROM users
      ORDER BY rating_${cat} DESC, username ASC
      LIMIT ?
    `).all(boundedLimit);
    result[cat] = rows.map((row) => ({
      id: row.id,
      username: row.username,
      rating: Math.round(row.rating),
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
    }));
  }
  return result;
}

function verifyCredentials(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') return null;
  const u = getUserByUsername(username);
  if (!u) return null;
  if (!verifyPassword(password, u.pass_salt, u.pass_hash)) return null;
  return u;
}

function createSession(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  const now = Date.now();
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(token, userId, now, now + SESSION_TTL_MS);
  return token;
}

function getSessionUser(token) {
  if (!token) return null;
  const s = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  if (!s) return null;
  if (s.expires_at < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return getUserById(s.user_id);
}

function deleteSession(token) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

// ---------------------------------------------------------------------------
// Ratings & stats
// ---------------------------------------------------------------------------
function updateRating(id, r) {
  db.prepare('UPDATE users SET rating = ?, rd = ?, vol = ? WHERE id = ?')
    .run(Math.round(r.rating), Math.round(r.rd), Number(r.vol.toFixed(6)), id);
}

function ratingFor(user, category) {
  const cat = CATEGORIES.includes(category) ? category : 'blitz';
  return {
    rating: user['rating_' + cat] != null ? user['rating_' + cat] : user.rating,
    rd: user['rd_' + cat] != null ? user['rd_' + cat] : user.rd,
    vol: user['vol_' + cat] != null ? user['vol_' + cat] : user.vol,
  };
}

function updateRatingFor(category, id, r) {
  const cat = CATEGORIES.includes(category) ? category : 'blitz';
  db.prepare(`UPDATE users SET rating_${cat} = ?, rd_${cat} = ?, vol_${cat} = ? WHERE id = ?`)
    .run(Math.round(r.rating), Math.round(r.rd), Number(r.vol.toFixed(6)), id);
}

function incrementStats(id, result, color) {
  if (!id) return;
  const stmt =
    result === 'draw'
      ? db.prepare('UPDATE users SET draws = draws + 1 WHERE id = ?')
      : result === color
        ? db.prepare('UPDATE users SET wins = wins + 1 WHERE id = ?')
        : db.prepare('UPDATE users SET losses = losses + 1 WHERE id = ?');
  stmt.run(id);
}

// ---------------------------------------------------------------------------
// Game history
// ---------------------------------------------------------------------------
function saveGame(g) {
  db.prepare(`
    INSERT OR REPLACE INTO games (
      id, created_at, finished_at, tc_initial, tc_increment,
      blue_user_id, red_user_id, blue_name, red_name,
      blue_rating_before, red_rating_before,
      blue_rating_after, red_rating_after,
      status, result, reason, rated, history
      , start_position
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    g.id, g.createdAt, g.finishedAt, g.tcInitial, g.tcIncrement,
    g.blueUserId, g.redUserId, g.blueName, g.redName,
    g.blueRatingBefore, g.redRatingBefore,
    g.blueRatingAfter, g.redRatingAfter,
    g.status, g.result, g.reason, g.rated ? 1 : 0, g.history,
    g.startPosition ? JSON.stringify(g.startPosition) : null
  );
}

function listGames(userId, limit = 50) {
  const rows = db.prepare(`
    SELECT * FROM games
    WHERE (blue_user_id = ? OR red_user_id = ?) AND status = 'finished'
    ORDER BY finished_at DESC
    LIMIT ?
  `).all(userId, userId, limit);

  return rows.map((r) => ({
    id: r.id,
    finishedAt: r.finished_at,
    tcInitial: r.tc_initial,
    tcIncrement: r.tc_increment,
    blueName: r.blue_name,
    redName: r.red_name,
    blueUserId: r.blue_user_id,
    redUserId: r.red_user_id,
    blueRatingBefore: r.blue_rating_before,
    redRatingBefore: r.red_rating_before,
    blueRatingAfter: r.blue_rating_after,
    redRatingAfter: r.red_rating_after,
    result: r.result,
    reason: r.reason,
    rated: !!r.rated,
    history: safeParse(r.history),
    startPosition: safeParse(r.start_position),
  }));
}

function listPublicGames(userId, limit = 50) {
  return listGames(userId, Math.max(1, Math.min(50, Math.trunc(Number(limit) || 50))));
}

function getGame(id) {
  const r = db.prepare('SELECT * FROM games WHERE id = ?').get(id);
  if (!r) return null;
  return {
    id: r.id,
    createdAt: r.created_at,
    finishedAt: r.finished_at,
    tcInitial: r.tc_initial,
    tcIncrement: r.tc_increment,
    blueName: r.blue_name,
    redName: r.red_name,
    blueUserId: r.blue_user_id,
    redUserId: r.red_user_id,
    blueRatingBefore: r.blue_rating_before,
    redRatingBefore: r.red_rating_before,
    blueRatingAfter: r.blue_rating_after,
    redRatingAfter: r.red_rating_after,
    status: r.status,
    result: r.result,
    reason: r.reason,
    rated: !!r.rated,
    history: safeParse(r.history),
    startPosition: safeParse(r.start_position),
  };
}

function safeParse(s) {
  try { return JSON.parse(s); } catch (e) { return []; }
}

// ---------------------------------------------------------------------------
// Opening book (positions + aggregated move stats)
// ---------------------------------------------------------------------------
function recordOpening({ key, board, turn, move, wins, draws, losses }) {
  db.prepare('INSERT OR IGNORE INTO positions (key, board, turn) VALUES (?, ?, ?)')
    .run(key, JSON.stringify(board), turn);

  db.prepare(`
    INSERT INTO opening_moves (position_key, move, games, wins, draws, losses)
    VALUES (?, ?, 1, ?, ?, ?)
    ON CONFLICT(position_key, move) DO UPDATE SET
      games = games + 1,
      wins = wins + excluded.wins,
      draws = draws + excluded.draws,
      losses = losses + excluded.losses
  `).run(key, move, wins, draws, losses);
}

function getOpening(key) {
  const pos = db.prepare('SELECT * FROM positions WHERE key = ?').get(key);
  if (!pos) return null;
  const moves = db.prepare(`
    SELECT * FROM opening_moves WHERE position_key = ? ORDER BY games DESC, move ASC
  `).all(key);
  return {
    key: pos.key,
    board: safeParse(pos.board),
    turn: pos.turn,
    totalGames: moves.reduce((s, m) => s + m.games, 0),
    moves: moves.map((m) => ({
      move: m.move,
      games: m.games,
      wins: m.wins,
      draws: m.draws,
      losses: m.losses,
    })),
  };
}

module.exports = {
  createUser,
  getUserById,
  getUserByUsername,
  listPlayers,
  listLeaderboards,
  verifyCredentials,
  createSession,
  getSessionUser,
  deleteSession,
  updateRating,
  ratingFor,
  updateRatingFor,
  CATEGORIES,
  incrementStats,
  saveGame,
  listGames,
  listPublicGames,
  getGame,
  recordOpening,
  getOpening,
  publicUser,
  topCategoriesForUser,
  USERNAME_RE,
};
