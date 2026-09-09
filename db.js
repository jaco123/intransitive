/* RPS 9x9 — persistence layer (SQLite via better-sqlite3).
 * Stores users, sessions, ratings, finished-game history, and studies.
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

CREATE TABLE IF NOT EXISTS studies (
  id TEXT PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  private_token TEXT NOT NULL UNIQUE,
  published INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS study_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  position_index INTEGER NOT NULL,
  board TEXT NOT NULL,
  turn TEXT NOT NULL,
  variation TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  UNIQUE(study_id, position_index)
);

CREATE TABLE IF NOT EXISTS study_shares (
  study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (study_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_studies_owner ON studies(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_studies_public ON studies(published, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_shares_user ON study_shares(user_id, created_at DESC);
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
// Persistent studies
// ---------------------------------------------------------------------------
const STUDY_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,79}$/;
const STUDY_ID_RE = /^[A-Za-z0-9_-]{24,64}$/;

function assertStudyName(name) {
  if (typeof name !== 'string' || !STUDY_NAME_RE.test(name.trim())) {
    const error = new Error('Invalid study name.');
    error.code = 'BAD_STUDY_NAME';
    throw error;
  }
  return name.trim();
}

function normalizeStudyPosition(position) {
  if (!position || !Array.isArray(position.board) || position.board.length !== 9 ||
      !['blue', 'red'].includes(position.turn)) {
    const error = new Error('Invalid study position.');
    error.code = 'BAD_STUDY_POSITION';
    throw error;
  }
  const board = position.board.map((row) => {
    if (!Array.isArray(row) || row.length !== 9) {
      const error = new Error('Invalid study position.');
      error.code = 'BAD_STUDY_POSITION';
      throw error;
    }
    return row.map((piece) => {
      if (piece === null) return null;
      if (!piece || typeof piece !== 'object' ||
          !['blue', 'red'].includes(piece.color) ||
          !['rock', 'paper', 'scissors'].includes(piece.type)) {
        const error = new Error('Invalid study position.');
        error.code = 'BAD_STUDY_POSITION';
        throw error;
      }
      return { color: piece.color, type: piece.type };
    });
  });
  return { board, turn: position.turn };
}

function studyId() { return crypto.randomBytes(18).toString('base64url'); }
function studyToken() { return crypto.randomBytes(32).toString('base64url'); }

function studySummary(row) {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    ownerUsername: row.owner_username,
    published: !!row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function studyPositionRows(studyIdValue) {
  return db.prepare(`
    SELECT id, position_index, board, turn, variation, created_at
    FROM study_positions WHERE study_id = ? ORDER BY position_index ASC
  `).all(studyIdValue).map((row) => ({
    id: row.id,
    index: row.position_index,
    board: safeParse(row.board),
    turn: row.turn,
    variation: safeParse(row.variation),
    createdAt: row.created_at,
  }));
}

function studyAccess(row, viewerId, token) {
  if (!row) return false;
  if (viewerId != null && row.owner_id === viewerId) return true;
  if (row.published) return true;
  if (typeof token === 'string' && token.length >= 32 && token === row.private_token) return true;
  if (viewerId == null) return false;
  return !!db.prepare('SELECT 1 FROM study_shares WHERE study_id = ? AND user_id = ?').get(row.id, viewerId);
}

function getStudyRow(id) {
  if (typeof id !== 'string' || !STUDY_ID_RE.test(id)) return null;
  return db.prepare(`
    SELECT s.*, u.username AS owner_username
    FROM studies s JOIN users u ON u.id = s.owner_id WHERE s.id = ?
  `).get(id) || null;
}

function createStudy(ownerId, name, position) {
  const cleanName = assertStudyName(name);
  const cleanPosition = normalizeStudyPosition(position);
  const now = Date.now();
  const id = studyId();
  const token = studyToken();
  const insert = db.transaction(() => {
    db.prepare(`INSERT INTO studies (id, owner_id, name, private_token, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)`).run(id, ownerId, cleanName, token, now, now);
    db.prepare(`INSERT INTO study_positions
      (study_id, position_index, board, turn, variation, created_at)
      VALUES (?, 0, ?, ?, '[]', ?)`).run(id, JSON.stringify(cleanPosition.board), cleanPosition.turn, now);
  });
  insert();
  return getStudy(id, ownerId, null);
}

function listStudies(viewerId) {
  const owned = viewerId == null ? [] : db.prepare(`
    SELECT s.*, u.username AS owner_username FROM studies s
    JOIN users u ON u.id = s.owner_id WHERE s.owner_id = ? ORDER BY s.updated_at DESC
  `).all(viewerId).map(studySummary);
  const shared = viewerId == null ? [] : db.prepare(`
    SELECT s.*, u.username AS owner_username FROM studies s
    JOIN users u ON u.id = s.owner_id JOIN study_shares sh ON sh.study_id = s.id
    WHERE sh.user_id = ? ORDER BY s.updated_at DESC
  `).all(viewerId).map(studySummary);
  const publicStudies = db.prepare(`
    SELECT s.*, u.username AS owner_username FROM studies s
    JOIN users u ON u.id = s.owner_id WHERE s.published = 1
    ORDER BY s.updated_at DESC LIMIT 100
  `).all().map(studySummary);
  return { owned, shared, public: publicStudies };
}

function getStudy(id, viewerId, token) {
  const row = getStudyRow(id);
  if (!studyAccess(row, viewerId, token)) return null;
  const result = studySummary(row);
  result.positions = studyPositionRows(row.id);
  result.canEdit = viewerId != null && row.owner_id === viewerId;
  if (result.canEdit) result.privateToken = row.private_token;
  return result;
}

function addStudyPosition(id, ownerId, position) {
  const row = getStudyRow(id);
  if (!row || row.owner_id !== ownerId) return null;
  const cleanPosition = normalizeStudyPosition(position);
  const now = Date.now();
  const insert = db.transaction(() => {
    const next = db.prepare('SELECT COALESCE(MAX(position_index), -1) + 1 AS next FROM study_positions WHERE study_id = ?').get(id).next;
    db.prepare(`INSERT INTO study_positions
      (study_id, position_index, board, turn, variation, created_at)
      VALUES (?, ?, ?, ?, '[]', ?)`).run(id, next, JSON.stringify(cleanPosition.board), cleanPosition.turn, now);
    db.prepare('UPDATE studies SET updated_at = ? WHERE id = ?').run(now, id);
  });
  insert();
  return getStudy(id, ownerId, null);
}

function deleteStudy(id, ownerId) {
  const row = getStudyRow(id);
  if (!row || row.owner_id !== ownerId) return false;
  return db.prepare('DELETE FROM studies WHERE id = ? AND owner_id = ?').run(id, ownerId).changes === 1;
}

function shareStudy(id, ownerId, targetUserId) {
  const row = getStudyRow(id);
  if (!row || row.owner_id !== ownerId || targetUserId === ownerId) return null;
  db.prepare('INSERT OR IGNORE INTO study_shares (study_id, user_id, created_at) VALUES (?, ?, ?)')
    .run(id, targetUserId, Date.now());
  return getStudy(id, ownerId, null);
}

function setStudyPublished(id, ownerId, published) {
  const row = getStudyRow(id);
  if (!row || row.owner_id !== ownerId) return null;
  db.prepare('UPDATE studies SET published = ?, updated_at = ? WHERE id = ? AND owner_id = ?')
    .run(published ? 1 : 0, Date.now(), id, ownerId);
  return getStudy(id, ownerId, null);
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
  createStudy,
  listStudies,
  getStudy,
  addStudyPosition,
  deleteStudy,
  shareStudy,
  setStudyPublished,
  USERNAME_RE,
};
