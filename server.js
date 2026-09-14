/* Intransitive 9x9 — server: static files + WebSocket game rooms + REST auth/history.
 * The server is the single authority on game state and move legality.
 * Accounts, ratings (Glicko-2), and game history are persisted in SQLite.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const engine = require('./engine.js');
const db = require('./db.js');
const rating = require('./rating.js');
const { buildRatingPreview, roundedDelta } = require('./rating-preview.js');

const ROOT = __dirname;
const PORT = process.env.PORT || 8090;
const TICK_MS = 100;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
};

// Keep the public surface explicit. In particular, never derive a filesystem
// path from a request URL: the checkout contains source, tests, and database
// files that must remain private.
const PUBLIC_ASSETS = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/analysis', 'index.html'],
  ['/editor', 'index.html'],
  ['/leaderboard', 'index.html'],
  ['/players', 'index.html'],
  ['/profile', 'index.html'],
  ['/rating-stats', 'index.html'],
  ['/watch', 'index.html'],
  ['/engine.js', 'engine.js'],
  ['/app.js', 'app.js'],
  ['/style.css', 'style.css'],
  ['/favicon.svg', 'favicon.svg'],
  ['/assets/lichess-pointer.svg', 'assets/lichess-pointer.svg'],
  ['/assets/lichess-trash.svg', 'assets/lichess-trash.svg'],
  ['/assets/lichess-icons.woff2', 'assets/lichess-icons.woff2'],
  ['/assets/lichess-icons.LICENSE.txt', 'assets/lichess-icons.LICENSE.txt'],
  ['/sound/Move.mp3', 'sound/Move.mp3'],
  ['/sound/Capture.mp3', 'sound/Capture.mp3'],
  ['/sound/GameStart.mp3', 'sound/GameStart.mp3'],
  ['/sound/LowTime.mp3', 'sound/LowTime.mp3'],
  ['/sound/Victory.mp3', 'sound/Victory.mp3'],
  ['/sound/Defeat.mp3', 'sound/Defeat.mp3'],
  ['/sound/Draw.mp3', 'sound/Draw.mp3'],
]);

const DEFAULT_TIMECONTROL = { initial: 300, increment: 3 }; // 5+3, in seconds
const OTHER = { blue: 'red', red: 'blue' };
const CAP = { blue: 'Blue', red: 'Red' };
const GRACE_MS = 15000;              // first-move grace period per player
const DISCONNECT_GRACE_MS = 120000;  // opponent must be gone this long to claim
const MAX_GAME_CHAT = 200;

// ---------------------------------------------------------------------------
// Game rooms (in-memory; finished games are persisted to SQLite)
// ---------------------------------------------------------------------------
const games = new Map();          // gameId -> game state
const slotBySocket = new WeakMap(); // ws -> { gameId, color }
const spectateBySocket = new WeakMap(); // ws -> gameId (spectators)
const spectatorColorBySocket = new WeakMap(); // ws -> viewed board orientation
const spectatorPerspectiveBySocket = new WeakMap(); // ws -> preferred player user id
const queue = [];                 // lobby seeks: { id, ws, user, timeControl, rating, queuedAt }
const clients = new Set();        // all open WebSocket connections (for lobby broadcasts)
const userBySocket = new WeakMap();
const presenceBySocket = new WeakMap();
const challenges = new Map();      // challengeId -> pending direct challenge
const analysisInvites = new Map(); // inviteId -> pending study invitation
const analysisRooms = new Map();   // analysisId -> shared analysis room
let seekSeq = 0;
let guestSeq = 0;
const guestNames = new WeakMap();
const chatLog = [];               // recent public chat messages (in-memory)
const MAX_CHAT = 100;

function randomId() {
  return crypto.randomBytes(4).toString('base64url').slice(0, 6);
}
function randomToken() {
  return crypto.randomBytes(24).toString('hex');
}

function normalizeTimeControl(tc) {
  const i = Number(tc && tc.initial);
  const inc = Number(tc && tc.increment);
  const initial = Number.isFinite(i) && i >= 0 && i <= 10800 ? Math.round(i) : DEFAULT_TIMECONTROL.initial;
  const increment = Number.isFinite(inc) && inc >= 0 && inc <= 60 ? Math.round(inc) : DEFAULT_TIMECONTROL.increment;
  return { initial, increment };
}

function isInfiniteTimeControl(tc) {
  return Number(tc && tc.initial) === 0;
}

function parseStartPosition(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.board) || value.board.length !== engine.SIZE) return null;
  for (const row of value.board) {
    if (!Array.isArray(row) || row.length !== engine.SIZE) return null;
    for (const piece of row) {
      if (piece !== null && (!piece || typeof piece !== 'object' ||
          !['blue', 'red'].includes(piece.color) || !['rock', 'paper', 'scissors'].includes(piece.type))) return null;
    }
  }
  if (value.turn !== 'blue' && value.turn !== 'red') return null;
  return { board: engine.cloneBoard(value.board), turn: value.turn };
}

function startPositionFromMessage(msg) {
  return msg.board === undefined ? undefined : parseStartPosition({ board: msg.board, turn: msg.turn });
}

function normalizeVariant(value) {
  return value === 'rps4200' ? 'rps4200' : 'standard';
}

// Lichess-style category from a time control (initial seconds + 40 * increment seconds).
function timeControlCategory(tc) {
  const initial = Number(tc && tc.initial) || 0;
  const increment = Number(tc && tc.increment) || 0;
  const est = initial + 40 * increment;
  if (est < 180) return 'bullet';
  if (est < 480) return 'blitz';
  if (est < 1500) return 'rapid';
  return 'classical';
}

function ratingCategoryForGame(g) {
  return g.variant === 'rps4200' ? 'rps4200' : timeControlCategory(g.timeControl);
}

function newGame(timeControl, casual, startPosition, options = {}) {
  const tc = normalizeTimeControl(timeControl);
  const variant = normalizeVariant(options.variant);
  const position = startPosition || { board: engine.initialBoardForVariant(variant), turn: 'blue' };
  const game = new engine.Game();
  game.board = engine.cloneBoard(position.board);
  game.turn = position.turn;
  game.history = [];
  game.lastMove = null;
  game.halfmoveClock = 0;
  game.fullmoveNumber = 1;
  game.positionCounts = new Map();
  game.recordPosition();
  return {
    id: randomId(),
    createdAt: Date.now(),
    timeControl: tc,
    variant,
    casual: !!casual,
    publicChat: !!options.publicChat,
    blue: null,
    red: null,
    game,
    startPosition: { board: engine.cloneBoard(position.board), turn: position.turn },
    status: 'waiting',            // waiting | playing | finished | aborted
    result: null,                 // 'blue' | 'red' | 'draw' | null
    reason: null,                 // goal | timeout | noMoves | threefold | 100ply | resign | abort
    rated: false,
    ratingDelta: null,
    clocks: {
      blueMs: tc.initial * 1000,
      redMs: tc.initial * 1000,
      blueGraceMs: 0,
      redGraceMs: 0,
      running: null,              // 'blue' | 'red' | null
      lastTick: Date.now(),
    },
    ticker: null,
    lastAbandoned: null,
    chat: [],               // in-game chat history
    drawOffer: null,        // color that offered a draw
    takebackOffer: null,     // { color, moveIndex } while awaiting a response
    takebackDeclines: { blue: 0, red: 0 },
    takebackDeclinedMoves: new Set(),
    rematchOffer: null,     // color that offered a rematch
    spectators: new Set(),  // spectator WebSockets
    persistHistory: options.persistHistory !== false,
  };
}

function hydrateFinishedGame(saved) {
  const start = saved.startPosition || { board: engine.initialBoard(), turn: 'blue' };
  const g = newGame({ initial: saved.tcInitial, increment: saved.tcIncrement }, !saved.rated, start, { variant: saved.variant, publicChat: !!saved.publicChat });
  g.id = saved.id;
  g.createdAt = saved.createdAt;
  g.status = saved.status || 'finished';
  g.result = saved.result;
  g.reason = saved.reason;
  g.rated = !!saved.rated;
  const blueUser = saved.blueUserId ? db.getUserById(saved.blueUserId) : null;
  const redUser = saved.redUserId ? db.getUserById(saved.redUserId) : null;
  g.blue = seatFor(blueUser, null, g.timeControl, g.variant);
  g.red = seatFor(redUser, null, g.timeControl, g.variant);
  g.blue.username = saved.blueName; g.blue.rating = saved.blueRatingBefore;
  g.red.username = saved.redName; g.red.rating = saved.redRatingBefore;
  const history = Array.isArray(saved.history) ? saved.history : [];
  for (const move of history) g.game.move(move.fromC, move.fromR, move.toC, move.toR);
  g.game.history = history;
  for (const move of history) {
    if (move.clockAfterMs != null && (move.color === 'blue' || move.color === 'red')) g.clocks[move.color + 'Ms'] = move.clockAfterMs;
  }
  if (g.reason === 'timeout' && (g.result === 'blue' || g.result === 'red')) {
    g.clocks[g.result === 'blue' ? 'redMs' : 'blueMs'] = 0;
  }
  g.clocks.running = null;
  ensureTerminalGameChat(g, false);
  return g;
}

function restoreSeat(savedSeat, tc, variant) {
  const user = savedSeat && savedSeat.userId ? db.getUserById(savedSeat.userId) : null;
  const seat = makeSeat(user, null, variant === 'rps4200' ? 'rps4200' : timeControlCategory(tc), {
    username: savedSeat && savedSeat.username || null,
  });
  if (savedSeat && savedSeat.token) seat.token = savedSeat.token;
  if (savedSeat && savedSeat.username) seat.username = savedSeat.username;
  if (savedSeat && savedSeat.rating != null) seat.rating = savedSeat.rating;
  if (savedSeat && savedSeat.rd != null) seat.rd = savedSeat.rd;
  if (savedSeat && savedSeat.vol != null) seat.vol = savedSeat.vol;
  seat.ws = null;
  seat.connected = false;
  seat.disconnectedAt = null;
  return seat;
}

function hydrateActiveGame(saved) {
  const start = saved.startPosition || { board: engine.initialBoardForVariant(saved.variant), turn: 'blue' };
  const g = newGame(saved.timeControl, !!saved.casual, start, {
    variant: saved.variant,
    publicChat: !!saved.publicChat,
  });
  g.id = saved.id;
  g.createdAt = saved.createdAt || Date.now();
  g.status = 'playing';
  g.rated = !!saved.rated;
  g.blue = restoreSeat(saved.blue, g.timeControl, g.variant);
  g.red = restoreSeat(saved.red, g.timeControl, g.variant);

  const history = Array.isArray(saved.history) ? saved.history : [];
  for (const move of history) g.game.move(move.fromC, move.fromR, move.toC, move.toR);
  g.game.history = history;
  if (saved.clocks && typeof saved.clocks === 'object') {
    for (const color of ['blue', 'red']) {
      for (const field of ['Ms', 'GraceMs']) {
        const key = color + field;
        if (Number.isFinite(Number(saved.clocks[key]))) g.clocks[key] = Number(saved.clocks[key]);
      }
    }
  }

  g.chat = Array.isArray(saved.chat) ? saved.chat.slice(-MAX_GAME_CHAT) : [];
  g.drawOffer = saved.drawOffer === 'blue' || saved.drawOffer === 'red' ? saved.drawOffer : null;
  g.takebackOffer = saved.takebackOffer && typeof saved.takebackOffer === 'object'
    ? saved.takebackOffer : null;
  g.takebackDeclines = {
    blue: Number(saved.takebackDeclines && saved.takebackDeclines.blue) || 0,
    red: Number(saved.takebackDeclines && saved.takebackDeclines.red) || 0,
  };
  g.takebackDeclinedMoves = new Set(Array.isArray(saved.takebackDeclinedMoves) ? saved.takebackDeclinedMoves : []);
  g.rematchOffer = saved.rematchOffer === 'blue' || saved.rematchOffer === 'red' ? saved.rematchOffer : null;

  // Do not charge time while the service is being restarted. The first player
  // to reconnect resumes the same side's clock from a fresh server timestamp.
  g.resumeRunning = saved.clocks && (saved.clocks.running === 'blue' || saved.clocks.running === 'red')
    ? saved.clocks.running : g.game.turn;
  g.pausedForRestart = true;
  g.clocks.running = null;
  g.clocks.lastTick = Date.now();
  return g;
}
function makeSeat(user, ws, category, options = {}) {
  const r = user ? db.ratingFor(user, category) : null;
  return {
    token: randomToken(),
    ws,
    connected: !!ws,
    userId: user ? user.id : null,
    username: user ? user.username : (options.username || (ws ? guestNameFor(ws) : null)),
    rating: r ? r.rating : null,     // rating at game start (before)
    rd: r ? r.rd : null,
    vol: r ? r.vol : null,
    ratingAfter: null,
    disconnectedAt: null,
  };
}

function guestNameFor(ws) {
  if (!ws) return 'Guest' + (++guestSeq);
  let name = guestNames.get(ws);
  if (!name) {
    name = 'Guest' + (++guestSeq);
    guestNames.set(ws, name);
  }
  return name;
}

function seatFor(user, ws, tc, variant = 'standard') {
  return makeSeat(user, ws, variant === 'rps4200' ? 'rps4200' : timeControlCategory(tc));
}

function resolveUser(sessionToken) {
  if (typeof sessionToken !== 'string' || !sessionToken) return null;
  return db.getSessionUser(sessionToken);
}

function send(ws, obj) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function authenticatedUser(ws, msg) {
  const user = resolveUser(msg && msg.session);
  if (user) userBySocket.set(ws, user);
  return user || userBySocket.get(ws) || null;
}

function publicChallenge(challenge) {
  return {
    id: challenge.id,
    challenger: challenge.challengerUsername,
    target: challenge.targetUsername,
    timeControl: challenge.timeControl,
    variant: challenge.variant,
    publicChat: !!challenge.publicChat,
    rated: challenge.rated,
    createdAt: challenge.createdAt,
  };
}

function sendPendingChallenges(ws, userId) {
  const pending = [];
  for (const challenge of challenges.values()) {
    if (challenge.targetId === userId) pending.push(publicChallenge(challenge));
  }
  // Also acknowledge an empty list so clients know identification completed.
  send(ws, { type: 'challengeList', challenges: pending });
}

function publicAnalysisInvite(invite) {
  return { id: invite.id, from: invite.from, link: invite.link, createdAt: invite.createdAt };
}

function sendPendingAnalysisInvites(ws, userId) {
  const pending = userId ? db.listAnalysisInvites(userId) : [];
  const known = new Set(pending.map((invite) => invite.id));
  for (const invite of analysisInvites.values()) {
    if (invite.targetId === userId && !known.has(invite.id)) pending.push(publicAnalysisInvite(invite));
  }
  send(ws, { type: 'analysisInviteList', invites: pending });
}

function notifyUser(userId, message) {
  for (const client of clients) {
    const user = userBySocket.get(client);
    if (user && user.id === userId) send(client, message);
  }
}

function handleAnalysisJoin(ws, msg) {
  const id = typeof msg.analysisId === 'string' ? msg.analysisId.slice(0, 64) : '';
  if (!id) return;
  let room = analysisRooms.get(id);
  if (!room) {
    room = { owner: ws, members: new Set(), state: null, syncUsers: false, ownerMovesOnly: false };
    analysisRooms.set(id, room);
  }
  room.members.add(ws);
  if (room.state && room.syncUsers) send(ws, { type: 'analysisState', analysisId: id, ...room.state, syncUsers: room.syncUsers, ownerMovesOnly: room.ownerMovesOnly });
  send(ws, { type: 'analysisSettings', analysisId: id, syncUsers: room.syncUsers, ownerMovesOnly: room.ownerMovesOnly, owner: room.owner === ws });
}

function handleAnalysisSettings(ws, msg) {
  const room = analysisRooms.get(msg.analysisId);
  if (!room || !room.members.has(ws)) return;
  if (typeof msg.syncUsers === 'boolean') room.syncUsers = msg.syncUsers;
  if (room.owner === ws && typeof msg.ownerMovesOnly === 'boolean') room.ownerMovesOnly = msg.ownerMovesOnly;
  for (const member of room.members) send(member, { type: 'analysisSettings', analysisId: msg.analysisId, syncUsers: room.syncUsers, ownerMovesOnly: room.ownerMovesOnly, owner: room.owner === member });
}

function handleAnalysisState(ws, msg) {
  const room = analysisRooms.get(msg.analysisId);
  if (!room || !room.syncUsers || (room.ownerMovesOnly && room.owner !== ws)) return;
  if (!msg.state || typeof msg.state !== 'object') return;
  let baseBoard = null;
  if (msg.state.baseBoard != null) {
    try {
      baseBoard = engine.cloneBoard(msg.state.baseBoard);
    } catch (_) {
      return;
    }
  }
  const baseTurn = msg.state.baseTurn === 'red' ? 'red' : 'blue';
  if (!Array.isArray(msg.state.moves) || msg.state.moves.length > 2000) return;
  const variant = normalizeVariant(msg.variant);
  room.state = { baseBoard, baseTurn, moves: msg.state.moves, variant };
  for (const member of room.members) if (member !== ws) send(member, { type: 'analysisState', analysisId: msg.analysisId, ...room.state, syncUsers: room.syncUsers, ownerMovesOnly: room.ownerMovesOnly });
}

function connectedSocketForUser(userId) {
  for (const client of clients) {
    const user = userBySocket.get(client);
    if (user && user.id === userId && client.readyState === 1) return client;
  }
  return null;
}

function handleAnalysisInvite(ws, msg) {
  const from = authenticatedUser(ws, msg);
  const targetUsername = typeof msg.targetUsername === 'string' ? msg.targetUsername.trim() : '';
  const target = targetUsername ? db.getUserByUsername(targetUsername) : null;
  if (!from) {
    send(ws, { type: 'error', message: 'You must be logged in to send an analysis invite.' });
    return;
  }
  if (!target) {
    send(ws, { type: 'error', message: 'That player was not found.' });
    return;
  }
  if (typeof msg.link !== 'string' || !msg.link.trim() || msg.link.length > 10000) {
    send(ws, { type: 'error', message: 'The analysis link is invalid or too long.' });
    return;
  }
  const invite = {
    id: randomId(),
    from: from.username,
    targetId: target.id,
    link: msg.link,
    createdAt: Date.now(),
  };
  db.saveAnalysisInvite({ id: invite.id, inviterUserId: from.id, inviterName: from.username, targetUserId: target.id, targetName: target.username, link: msg.link, createdAt: invite.createdAt });
  analysisInvites.set(invite.id, invite);
  send(ws, { type: 'analysisInviteSent', target: target.username });
  notifyUser(target.id, { type: 'analysisInvite', invite: publicAnalysisInvite(invite) });
}

function handleAnalysisInviteDismiss(ws, msg) {
  const user = authenticatedUser(ws, msg);
  const invite = analysisInvites.get(msg.inviteId);
  if (user && invite && invite.targetId === user.id) { analysisInvites.delete(invite.id); db.resolveAnalysisInvite(invite.id, user.id); }
}

function playerInfo(g, color) {
  const p = g[color];
  if (!p) return null;
  if (!p.userId) return { name: p.username || CAP[color], guest: true, rating: null, userId: null };
  let r = p.rating;
  if (g.status === 'finished' && p.ratingAfter != null) r = p.ratingAfter;
  return { name: p.username || CAP[color], guest: false, rating: r == null ? null : Math.round(r), userId: p.userId };
}

function ratingPreview(g) {
  if (!g.rated || !g.blue || !g.red || g.blue.rating == null || g.red.rating == null) return null;
  const blue = { rating: g.blue.rating, rd: g.blue.rd, vol: g.blue.vol };
  const red = { rating: g.red.rating, rd: g.red.rd, vol: g.red.vol };
  return buildRatingPreview(blue, red);
}

function snapshot(g, color, spectating) {
  const opp = OTHER[color];
  const isSpec = !!spectating;
  return {
    type: 'state',
    gameId: g.id,
    color,
    status: g.status,
    result: g.result,
    reason: g.reason,
    rated: !!g.rated,
    casual: !!g.casual,
    variant: g.variant,
    publicChat: !!g.publicChat,
    ratingDelta: g.ratingDelta || null,
    ratingPreview: ratingPreview(g),
    turn: g.game.turn,
    board: engine.cloneBoard(g.game.board),
    startPosition: { board: engine.cloneBoard(g.startPosition.board), turn: g.startPosition.turn },
    history: g.game.history.slice(),
    lastMove: g.game.lastMove,
    clocks: {
      blueMs: Math.max(0, Math.round(g.clocks.blueMs)),
      redMs: Math.max(0, Math.round(g.clocks.redMs)),
      blueGraceMs: Math.max(0, Math.round(g.clocks.blueGraceMs)),
      redGraceMs: Math.max(0, Math.round(g.clocks.redGraceMs)),
      running: g.clocks.running,
    },
    timeControl: g.timeControl,
    players: {
      blue: playerInfo(g, 'blue'),
      red: playerInfo(g, 'red'),
    },
    youConnected: isSpec ? true : !!(g[color] && g[color].connected),
    opponentConnected: isSpec ? true : !!(g[opp] && g[opp].connected),
    waitingForOpponent: g.status === 'waiting',
    opponentAbandoned: isSpec ? false : (g.status === 'playing' && abandonedColor(g) === opp),
    spectating: isSpec,
    drawOffer: g.drawOffer || null,
    takebackOffer: g.takebackOffer || null,
    takebackBlocked: takebackBlockedState(g),
    rematchOffer: g.rematchOffer || null,
  };
}

function broadcastState(g) {
  if (g.blue && g.blue.ws) send(g.blue.ws, snapshot(g, 'blue'));
  if (g.red && g.red.ws) send(g.red.ws, snapshot(g, 'red'));
  for (const ws of g.spectators) send(ws, snapshot(g, spectatorColorBySocket.get(ws) || 'blue', true));
}

function broadcastClock(g) {
  const msg = {
    type: 'clock',
    blueMs: Math.max(0, Math.round(g.clocks.blueMs)),
    redMs: Math.max(0, Math.round(g.clocks.redMs)),
    blueGraceMs: Math.max(0, Math.round(g.clocks.blueGraceMs)),
    redGraceMs: Math.max(0, Math.round(g.clocks.redGraceMs)),
    running: g.clocks.running,
  };
  if (g.blue && g.blue.ws) send(g.blue.ws, msg);
  if (g.red && g.red.ws) send(g.red.ws, msg);
  for (const ws of g.spectators) send(ws, msg);
}

function stopTicker(g) {
  if (g.ticker) {
    clearInterval(g.ticker);
    g.ticker = null;
  }
}

function settleClock(g) {
  const now = Date.now();
  const c = g.clocks;
  if (g.status === 'playing' && c.running && !isInfiniteTimeControl(g.timeControl)) {
    const color = c.running;
    let remaining = now - c.lastTick;
  persistActiveGame(g);
    c.lastTick = now;

    // First-move grace: the clock doesn't start until the grace period elapses.
    const graceKey = color + 'GraceMs';
    if (c[graceKey] > 0) {
      const consumed = Math.min(c[graceKey], remaining);
      c[graceKey] -= consumed;
      remaining -= consumed;
    }
    if (remaining > 0) {
      c[color + 'Ms'] -= remaining;
    }

    if (c.blueMs <= 0) {
      c.blueMs = 0;
      finishGame(g, OTHER.blue, 'timeout');
    } else if (c.redMs <= 0) {
      c.redMs = 0;
      finishGame(g, OTHER.red, 'timeout');
    }
  } else {
    c.lastTick = now;
  }
}

function tick(g) {
  if (g.status !== 'playing') return;
  settleClock(g);
  if (g.status !== 'playing') return;
  broadcastClock(g);

  const ab = abandonedColor(g);
  if (ab !== g.lastAbandoned) {
    g.lastAbandoned = ab;
    broadcastState(g);
  }
}

function startGame(g) {
  g.status = 'playing';
  g.clocks.blueMs = g.timeControl.initial * 1000;
  g.clocks.redMs = g.timeControl.initial * 1000;
  g.clocks.blueGraceMs = GRACE_MS;
  g.clocks.redGraceMs = GRACE_MS;
  g.clocks.running = g.game.turn;
  g.clocks.lastTick = Date.now();

  if (!g.casual && g.blue && g.blue.userId && g.red && g.red.userId) {
    g.rated = true;
    const cat = ratingCategoryForGame(g);
    const b = db.getUserById(g.blue.userId);
    const r = db.getUserById(g.red.userId);
    const br = db.ratingFor(b, cat);
    const rr = db.ratingFor(r, cat);
    g.blue.rating = br.rating; g.blue.rd = br.rd; g.blue.vol = br.vol;
    g.red.rating = rr.rating; g.red.rd = rr.rd; g.red.vol = rr.vol;
  } else {
    g.rated = false;
  }

  g.ticker = setInterval(() => tick(g), TICK_MS);
  broadcastState(g);
  if (g.blue && g.blue.ws) send(g.blue.ws, { type: 'gameStart' });
  if (g.red && g.red.ws) send(g.red.ws, { type: 'gameStart' });
}

function attach(ws, g, color) {
  const player = g[color];
  // A refresh/reconnect can race the old socket's close event. Invalidate the
  // previous socket first so it cannot continue issuing commands as this seat.
  const previousWs = player.ws;
  if (previousWs && previousWs !== ws) {
    slotBySocket.delete(previousWs);
    previousWs.close(4001, 'Replaced by a newer connection');
  }
  player.ws = ws;
  player.connected = true;
  player.disconnectedAt = null;

  let slot = slotBySocket.get(ws);
  if (!slot) {
    slot = {};
    slotBySocket.set(ws, slot);
  }
  slot.gameId = g.id;
  slot.color = color;

  send(ws, { type: 'joined', gameId: g.id, color, token: player.token });
  sendGameChatHistory(ws, g);

  if (g.status === 'playing' && g.pausedForRestart) {
    g.pausedForRestart = false;
    g.clocks.running = g.resumeRunning || g.game.turn;
    g.resumeRunning = null;
    g.clocks.lastTick = Date.now();
    g.ticker = setInterval(() => tick(g), TICK_MS);
    broadcastClock(g);
    persistActiveGame(g);
  }

  const opp = OTHER[color];
  if (g.status === 'waiting' && g.blue && g.blue.connected && g.red && g.red.connected) {
    startGame(g);
  } else {
    send(ws, snapshot(g, color));
    if (g[opp] && g[opp].ws) send(g[opp].ws, { type: 'opponent', connected: true });
  }
}

// ---------------------------------------------------------------------------
// Game finishing, ratings, persistence
// ---------------------------------------------------------------------------
function finishGame(g, result, reason) {
  if (g.status === 'finished') return;
  g.status = 'finished';
  g.result = result;
  g.reason = reason;
  g.clocks.running = null;
  stopTicker(g);
  db.deleteActiveGame(g.id);

  const delta = applyRatings(g);
  if (g.persistHistory) {
    persistGame(g);
    if (g.variant === 'standard') recordOpenings(g);
  }
  g.ratingDelta = delta;
  const terminalChat = ensureTerminalGameChat(g, false);
  broadcastState(g);
  if (terminalChat) broadcastGameChat(g, terminalChat);
}

function applyRatings(g) {
  if (!g.rated || !g.blue.userId || !g.red.userId) return null;

  let outcome;
  if (g.result === 'blue') outcome = 1;
  else if (g.result === 'red') outcome = 0;
  else outcome = 0.5;

  const beforeBlue = { rating: g.blue.rating, rd: g.blue.rd, vol: g.blue.vol };
  const beforeRed = { rating: g.red.rating, rd: g.red.rd, vol: g.red.vol };
  const res = rating.apply(beforeBlue, beforeRed, outcome);

  const cat = ratingCategoryForGame(g);
  db.updateRatingFor(cat, g.blue.userId, res.blue);
  db.updateRatingFor(cat, g.red.userId, res.red);
  db.incrementStats(g.blue.userId, g.result, 'blue');
  db.incrementStats(g.red.userId, g.result, 'red');

  g.blue.ratingAfter = Math.round(res.blue.rating);
  g.red.ratingAfter = Math.round(res.red.rating);

  return {
    blue: roundedDelta(res.blue, beforeBlue),
    red: roundedDelta(res.red, beforeRed),
  };
}

function activeSeatSnapshot(seat) {
  if (!seat) return null;
  return {
    token: seat.token,
    userId: seat.userId,
    username: seat.username,
    rating: seat.rating,
    rd: seat.rd,
    vol: seat.vol,
  };
}

function activeGameSnapshot(g) {
  return {
    id: g.id,
    createdAt: g.createdAt,
    timeControl: g.timeControl,
    variant: g.variant,
    casual: !!g.casual,
    publicChat: !!g.publicChat,
    rated: !!g.rated,
    blue: activeSeatSnapshot(g.blue),
    red: activeSeatSnapshot(g.red),
    history: g.game.history,
    startPosition: g.startPosition,
    clocks: {
      blueMs: g.clocks.blueMs,
      redMs: g.clocks.redMs,
      blueGraceMs: g.clocks.blueGraceMs,
      redGraceMs: g.clocks.redGraceMs,
      running: g.clocks.running,
    },
    chat: g.chat.slice(-MAX_GAME_CHAT),
    drawOffer: g.drawOffer,
    takebackOffer: g.takebackOffer,
    takebackDeclines: g.takebackDeclines,
    takebackDeclinedMoves: Array.from(g.takebackDeclinedMoves),
    rematchOffer: g.rematchOffer,
  };
}

function persistActiveGame(g) {
  if (!g || g.status !== 'playing' || !g.blue || !g.red) return;
  db.saveActiveGame(activeGameSnapshot(g));
}
function persistGame(g) {
  db.saveGame({
    id: g.id,
    createdAt: g.createdAt,
    finishedAt: Date.now(),
    tcInitial: g.timeControl.initial,
    tcIncrement: g.timeControl.increment,
    blueUserId: g.blue && g.blue.userId ? g.blue.userId : null,
    redUserId: g.red && g.red.userId ? g.red.userId : null,
    blueName: g.blue ? (g.blue.username || CAP.blue) : CAP.blue,
    redName: g.red ? (g.red.username || CAP.red) : CAP.red,
    blueRatingBefore: g.blue && g.blue.rating != null ? g.blue.rating : null,
    redRatingBefore: g.red && g.red.rating != null ? g.red.rating : null,
    blueRatingAfter: g.blue && g.blue.ratingAfter != null ? g.blue.ratingAfter : null,
    redRatingAfter: g.red && g.red.ratingAfter != null ? g.red.ratingAfter : null,
    status: g.status,
    result: g.result,
    reason: g.reason,
    rated: g.rated,
    variant: g.variant,
    history: JSON.stringify(g.game.history),
    startPosition: g.startPosition,
  });
}

// Record every position reached in a rated game into the opening book.
// Stats are stored from Blue's perspective: wins = Blue won, losses = Red won.
function recordOpenings(g) {
  if (!g.rated) return;
  const history = g.game.history;
  if (!history.length) return;

  let board = engine.initialBoard();
  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    const turn = i % 2 === 0 ? 'blue' : 'red';
    const key = engine.boardToString(board) + ':' + (turn === 'blue' ? 'b' : 'r');
    const move = engine.FILES[m.fromC] + (m.fromR + 1) + (m.capture ? 'x' : '-') + engine.FILES[m.toC] + (m.toR + 1);

    db.recordOpening({
      key,
      board,
      turn,
      move,
      wins: g.result === 'blue' ? 1 : 0,
      draws: g.result === 'draw' ? 1 : 0,
      losses: g.result === 'red' ? 1 : 0,
    });

    // Advance to the position after this move.
    const piece = board[m.fromR][m.fromC];
    board[m.fromR][m.fromC] = null;
    board[m.toR][m.toC] = piece;
  }
}

// ---------------------------------------------------------------------------
// WS message handlers
// ---------------------------------------------------------------------------
function handleMove(ws, msg) {
  const slot = slotBySocket.get(ws);
  if (!slot) return;
  const g = games.get(slot.gameId);
  if (!g || g.status !== 'playing') {
    send(ws, { type: 'error', message: 'Game is not in progress.' });
    return;
  }
  if (slot.color !== g.game.turn) {
    send(ws, { type: 'error', message: 'Not your turn.' });
    return;
  }

  settleClock(g);
  if (g.status !== 'playing') return; // a timeout may have just ended the game

  const { fromC, fromR, toC, toR } = msg;
  if (![fromC, fromR, toC, toR].every((n) => Number.isInteger(n))) {
    send(ws, { type: 'error', message: 'Invalid move.' });
    return;
  }
  if (!engine.inBounds(fromC, fromR) || !engine.inBounds(toC, toR)) {
    send(ws, { type: 'error', message: 'Invalid move.' });
    return;
  }

  const res = g.game.move(fromC, fromR, toC, toR);
  if (!res.ok) {
    send(ws, { type: 'error', message: res.error || 'Illegal move.' });
    return;
  }

  // Making a move declines any pending draw offer.
  if (g.drawOffer) {
    g.drawOffer = null;
    broadcastDrawOffer(g);
  }

  // Add increment to the player who just moved, then start the opponent's clock.
  if (slot.color === 'blue') { g.clocks.blueMs += g.timeControl.increment * 1000; g.clocks.blueGraceMs = 0; }
  else { g.clocks.redMs += g.timeControl.increment * 1000; g.clocks.redGraceMs = 0; }
  const recordedMove = g.game.history[g.game.history.length - 1];
  if (recordedMove) recordedMove.color = slot.color;
  if (recordedMove) recordedMove.clockAfterMs = Math.max(0, Math.round(g.clocks[slot.color + 'Ms']));

  const st = g.game.status;
  if (st !== 'playing') {
    if (st === 'draw') {
      finishGame(g, 'draw', g.game.drawReason);
    } else {
      const reason = engine.getWinner(g.game.board) ? 'goal' : 'noMoves';
      finishGame(g, g.game.winner, reason);
    }
  } else {
    g.clocks.running = g.game.turn;
    g.clocks.lastTick = Date.now();
    broadcastState(g);
    persistActiveGame(g);
  }
}

function handleResign(ws) {
  const slot = slotBySocket.get(ws);
  if (!slot) return;
  const g = games.get(slot.gameId);
  if (!g || g.status !== 'playing') return;
  finishGame(g, OTHER[slot.color], 'resign');
}

function abandonedColor(g) {
  if (g.status !== 'playing') return null;
  const now = Date.now();
  if (g.blue && !g.blue.connected && g.blue.disconnectedAt && now - g.blue.disconnectedAt >= DISCONNECT_GRACE_MS) return 'blue';
  if (g.red && !g.red.connected && g.red.disconnectedAt && now - g.red.disconnectedAt >= DISCONNECT_GRACE_MS) return 'red';
  return null;
}

function handleClaim(ws, msg) {
  const slot = slotBySocket.get(ws);
  if (!slot) return;
  const g = games.get(slot.gameId);
  if (!g || g.status !== 'playing') return;
  if (abandonedColor(g) !== OTHER[slot.color]) {
    send(ws, { type: 'error', message: 'You cannot claim right now.' });
    return;
  }
  if (msg.type === 'claimVictory') finishGame(g, slot.color, 'abandon');
  else finishGame(g, 'draw', 'abandon');
}

function broadcastDrawOffer(g) {
  const msg = { type: 'drawOffer', color: g.drawOffer || null };
  if (g.blue && g.blue.ws) send(g.blue.ws, msg);
  if (g.red && g.red.ws) send(g.red.ws, msg);
}

function handleOfferDraw(ws) {
  const slot = slotBySocket.get(ws);
  if (!slot) return;
  const g = games.get(slot.gameId);
  if (!g || g.status !== 'playing') return;
  g.drawOffer = slot.color;
  broadcastDrawOffer(g);
}

function handleAcceptDraw(ws) {
  const slot = slotBySocket.get(ws);
  if (!slot) return;
  const g = games.get(slot.gameId);
  if (!g || g.status !== 'playing') return;
  if (!g.drawOffer || g.drawOffer === slot.color) return;
  finishGame(g, 'draw', 'agreement');
}

function handleDeclineDraw(ws) {
  const slot = slotBySocket.get(ws);
  if (!slot) return;
  const g = games.get(slot.gameId);
  if (!g || g.status !== 'playing') return;
  g.drawOffer = null;
  broadcastDrawOffer(g);
}

function takebackMoveIndex(g, color) {
  for (let i = g.game.history.length - 1; i >= 0; i--) {
    if (g.game.history[i].color === color) return i;
  }
  return -1;
}

function takebackBlockedState(g) {
  return { blue: takebackBlocked(g, 'blue'), red: takebackBlocked(g, 'red') };
}

function takebackBlocked(g, color) {
  if (g.takebackDeclines[color] >= 3) return true;
  const moveIndex = takebackMoveIndex(g, color);
  return moveIndex >= 0 && g.takebackDeclinedMoves.has(color + ':' + moveIndex);
}

function broadcastTakebackOffer(g) {
  const msg = { type: 'takebackOffer', offer: g.takebackOffer || null, blocked: takebackBlockedState(g) };
  if (g.blue && g.blue.ws) send(g.blue.ws, msg);
  if (g.red && g.red.ws) send(g.red.ws, msg);
}

function handleTakebackRequest(ws) {
  const slot = slotBySocket.get(ws);
  const g = slot ? games.get(slot.gameId) : null;
  if (!g || g.status !== 'playing' || !g.blue || !g.red || !g.blue.connected || !g.red.connected) return;
  if (g.takebackOffer || !g.game.history.length) return;
  settleClock(g);
  const moveIndex = takebackMoveIndex(g, slot.color);
  if (moveIndex < 0) return;
  if (takebackBlocked(g, slot.color)) return;
  g.takebackOffer = { color: slot.color, moveIndex };
  broadcastTakebackOffer(g);
}

function restoreTakeback(g, moveIndex) {
  const kept = g.game.history.slice(0, moveIndex).map((move) => ({ ...move }));
  const restored = new engine.Game();
  restored.board = engine.cloneBoard(g.startPosition.board);
  restored.turn = g.startPosition.turn;
  restored.history = [];
  restored.lastMove = null;
  restored.halfmoveClock = 0;
  restored.fullmoveNumber = 1;
  restored.status = 'playing';
  restored.winner = null;
  restored.drawReason = null;
  restored.positionCounts = new Map();
  restored.recordPosition();
  for (const move of kept) restored.move(move.fromC, move.fromR, move.toC, move.toR);
  restored.history = kept;
  g.game = restored;
  g.clocks.blueMs = g.timeControl.initial * 1000;
  g.clocks.redMs = g.timeControl.initial * 1000;
  g.clocks.blueGraceMs = kept.length ? 0 : GRACE_MS;
  g.clocks.redGraceMs = kept.length ? 0 : GRACE_MS;
  for (const move of kept) {
    if ((move.color === 'blue' || move.color === 'red') && move.clockAfterMs != null) {
      g.clocks[move.color + 'Ms'] = move.clockAfterMs;
    }
  }
  g.clocks.running = g.game.turn;
  g.clocks.lastTick = Date.now();
  g.drawOffer = null;
  g.takebackOffer = null;
  broadcastState(g);
  broadcastTakebackOffer(g);
  persistActiveGame(g);
}

function handleTakebackResponse(ws, accept) {
  const slot = slotBySocket.get(ws);
  const g = slot ? games.get(slot.gameId) : null;
  const offer = g && g.takebackOffer;
  if (!g || g.status !== 'playing' || !offer || offer.color === slot.color) return;
  if (!accept) {
    g.takebackDeclines[offer.color] += 1;
    g.takebackDeclinedMoves.add(offer.color + ':' + offer.moveIndex);
    g.takebackOffer = null;
    broadcastTakebackOffer(g);
    return;
  }
  restoreTakeback(g, offer.moveIndex);
}

function seatFrom(oldSeat, tc, variant = 'standard') {
  const user = oldSeat.userId ? db.getUserById(oldSeat.userId) : null;
  return makeSeat(user, oldSeat.ws, variant === 'rps4200' ? 'rps4200' : timeControlCategory(tc));
}

function startRematch(old) {
  if (!old.blue || !old.red || !old.blue.connected || !old.red.connected) return false;
  const g = newGame(old.timeControl, old.casual, old.variant === 'rps4200' ? undefined : old.startPosition, { variant: old.variant, publicChat: old.publicChat });
  games.set(g.id, g);
  g.blue = seatFrom(old.red, old.timeControl, old.variant);   // colors reversed
  g.red = seatFrom(old.blue, old.timeControl, old.variant);
  slotBySocket.set(g.blue.ws, { gameId: g.id, color: 'blue' });
  slotBySocket.set(g.red.ws, { gameId: g.id, color: 'red' });
  send(g.blue.ws, { type: 'rematchStarted', gameId: g.id, color: 'blue', token: g.blue.token });
  send(g.red.ws, { type: 'rematchStarted', gameId: g.id, color: 'red', token: g.red.token });
  for (const ws of old.spectators) send(ws, { type: 'spectatorRematch', oldGameId: old.id, gameId: g.id });
  startGame(g);
  return true;
}

function broadcastRematchOffer(g) {
  const msg = { type: 'rematchOffer', color: g.rematchOffer || null };
  if (g.blue && g.blue.ws) send(g.blue.ws, msg);
  if (g.red && g.red.ws) send(g.red.ws, msg);
}

function handleRematch(ws) {
  const slot = slotBySocket.get(ws);
  if (!slot) return;
  const g = games.get(slot.gameId);
  if (!g || g.status !== 'finished') return;
  const opp = OTHER[slot.color];
  if (g.rematchOffer && g.rematchOffer === opp) {
    if (!startRematch(g)) {
      send(ws, { type: 'error', message: 'Both players must be connected to start a rematch.' });
    }
  } else {
    g.rematchOffer = slot.color;
    broadcastRematchOffer(g);
  }
}

function handleRematchCancel(ws) {
  const slot = slotBySocket.get(ws);
  const g = slot ? games.get(slot.gameId) : null;
  if (!g || g.status !== 'finished' || g.rematchOffer !== slot.color) return;
  g.rematchOffer = null;
  broadcastRematchOffer(g);
}

function abortGame(g) {
  if (g.status !== 'playing') return;
  g.status = 'aborted';
  g.reason = 'abort';
  g.result = null;
  g.clocks.running = null;
  stopTicker(g);
  db.deleteActiveGame(g.id);
  const terminalChat = ensureTerminalGameChat(g, false);
  broadcastState(g);
  if (terminalChat) broadcastGameChat(g, terminalChat);
}

function handleAbort(ws) {
  const slot = slotBySocket.get(ws);
  if (!slot) return;
  const g = games.get(slot.gameId);
  if (!g || g.status !== 'playing') return;
  if (g.game.history.length >= 2) {
    send(ws, { type: 'error', message: 'You can only abort before both players have moved.' });
    return;
  }
  abortGame(g);
}

function addSpectator(ws, g, color = 'blue', perspectiveUserId = null) {
  removeSpectator(ws);
  g.spectators.add(ws);
  spectateBySocket.set(ws, g.id);
  spectatorColorBySocket.set(ws, color === 'red' ? 'red' : 'blue');
  if (perspectiveUserId != null) spectatorPerspectiveBySocket.set(ws, String(perspectiveUserId));
  else spectatorPerspectiveBySocket.delete(ws);
  send(ws, { type: 'spectating', gameId: g.id, color: spectatorColorBySocket.get(ws) });
  send(ws, snapshot(g, spectatorColorBySocket.get(ws), true));
  sendGameChatHistory(ws, g);
}

function removeSpectator(ws) {
  const gid = spectateBySocket.get(ws);
  if (!gid) return;
  const g = games.get(gid);
  if (g) g.spectators.delete(ws);
  spectateBySocket.delete(ws);
  spectatorColorBySocket.delete(ws);
  spectatorPerspectiveBySocket.delete(ws);
}

function chatEntryVisibleTo(g, entry, audience) {
  if (g.publicChat) return true;
  if (!entry || !entry.audience) return audience === 'players';
  return entry.audience === 'public' || entry.audience === 'both' || entry.audience === audience;
}

function broadcastGameChat(g, entry) {
  const msg = { type: 'gameChat', gameId: g.id, message: entry };
  const visibleToPlayers = g.publicChat || chatEntryVisibleTo(g, entry, 'players');
  const visibleToSpectators = g.publicChat || chatEntryVisibleTo(g, entry, 'spectators');
  if (visibleToPlayers) {
    if (g.blue && g.blue.ws) send(g.blue.ws, msg);
    if (g.red && g.red.ws) send(g.red.ws, msg);
  }
  if (visibleToSpectators) {
    for (const ws of g.spectators) send(ws, msg);
  }
}

function sendGameChatHistory(ws, g) {
  const slot = slotBySocket.get(ws);
  const audience = slot && slot.gameId === g.id ? 'players'
    : spectateBySocket.get(ws) === g.id ? 'spectators' : 'players';
  send(ws, { type: 'gameChatHistory', gameId: g.id, messages: g.chat.filter((entry) => chatEntryVisibleTo(g, entry, audience)) });
}

function gameResultText(g) {
  if (g.status === 'aborted') return 'Game aborted';
  if (g.result === 'draw') {
    if (g.reason === 'threefold') return 'Draw — threefold repetition';
    if (g.reason === '100ply') return 'Draw — 50-move rule';
    return 'Draw';
  }
  const winner = g.result === 'blue' ? 'Blue' : 'Red';
  if (g.reason === 'timeout') return winner + ' wins on time';
  if (g.reason === 'resign') return winner + ' wins by resignation';
  if (g.reason === 'noMoves') return winner + ' wins — opponent has no legal moves';
  return winner + ' wins';
}

function ensureTerminalGameChat(g, announce) {
  if (g.status !== 'finished' && g.status !== 'aborted') return null;
  const existing = g.chat.find((entry) => entry && entry.terminal);
  if (existing) return existing;
  const entry = {
    gameId: g.id,
    username: 'Game',
    userId: null,
    color: null,
    text: gameResultText(g),
    time: Date.now(),
    system: true,
    terminal: true,
    audience: 'both',
  };
  g.chat.push(entry);
  if (g.chat.length > MAX_GAME_CHAT) g.chat.shift();
  if (announce) broadcastGameChat(g, entry);
  return entry;
}

function handleGameChat(ws, msg) {
  const text = String(msg.text || '').trim().slice(0, 500);
  if (!text) return;

  const slot = slotBySocket.get(ws);
  let g = null;
  let role = null; // 'blue' | 'red' | 'spectator'
  if (slot) {
    g = games.get(slot.gameId);
    if (g) role = slot.color;
  }
  if (!g) {
    const gid = spectateBySocket.get(ws);
    if (gid) {
      g = games.get(gid);
      role = 'spectator';
    }
  }
  if (!g) return;
  // Older clients did not send gameId. The socket's authoritative seat still
  // scopes those messages; explicit mismatches are always rejected.
  if (msg.gameId != null && msg.gameId !== g.id) return;

  const user = resolveUser(msg.session);
  let username;
  if (user) username = user.username;
  else if (role === 'blue') username = g.blue && g.blue.username || CAP.blue;
  else if (role === 'red') username = g.red && g.red.username || CAP.red;
  else username = 'Spectator';

  const entry = {
    gameId: g.id,
    username,
    userId: user ? user.id : null,
    color: role === 'blue' || role === 'red' ? role : null,
    audience: g.publicChat ? 'public' : role === 'spectator' ? 'spectators' : 'players',
    text,
    time: Date.now(),
  };
  g.chat.push(entry);
  if (g.chat.length > MAX_GAME_CHAT) g.chat.shift();
  broadcastGameChat(g, entry);
}

function handleChallengeCreate(ws, msg) {
  const challenger = authenticatedUser(ws, msg);
  if (!challenger) {
    send(ws, { type: 'error', message: 'You must be logged in to send a challenge.' });
    return;
  }
  if (typeof msg.targetUsername !== 'string' || !/^[A-Za-z0-9_-]{2,20}$/.test(msg.targetUsername)) {
    send(ws, { type: 'error', message: 'Invalid challenge target.' });
    return;
  }
  const target = db.getUserByUsername(msg.targetUsername);
  if (!target || target.id === challenger.id) {
    send(ws, { type: 'error', message: 'That player cannot be challenged.' });
    return;
  }
  const timeControl = normalizeTimeControl(msg.timeControl);
  const rated = msg.rated !== false && !isInfiniteTimeControl(timeControl);
  const variant = normalizeVariant(msg.variant);
  for (const challenge of challenges.values()) {
    if (challenge.challengerId === challenger.id && challenge.targetId === target.id) {
      send(ws, { type: 'error', message: 'You already have a pending challenge to that player.' });
      return;
    }
  }
  const challenge = {
    id: randomId(),
    challengerId: challenger.id,
    challengerUsername: challenger.username,
    challengerWs: ws,
    targetId: target.id,
    targetUsername: target.username,
    timeControl,
    variant,
    publicChat: msg.publicChat === true,
    rated,
    createdAt: Date.now(),
  };
  challenges.set(challenge.id, challenge);
  send(ws, { type: 'challengeSent', challenge: publicChallenge(challenge) });
  notifyUser(target.id, { type: 'challengeReceived', challenge: publicChallenge(challenge) });
}

function handleChallengeAccept(ws, msg) {
  const target = authenticatedUser(ws, msg);
  const challenge = challenges.get(msg.challengeId);
  if (!target || !challenge || challenge.targetId !== target.id) {
    send(ws, { type: 'error', message: 'That challenge is no longer available.' });
    return;
  }
  const challenger = db.getUserById(challenge.challengerId);
  const activeSeat = (socket) => {
    const slot = slotBySocket.get(socket);
    const game = slot && games.get(slot.gameId);
    return game && (game.status === 'waiting' || game.status === 'playing') ? { slot, game } : null;
  };
  const challengerWs = challenge.challengerWs && challenge.challengerWs.readyState === 1
    ? challenge.challengerWs : connectedSocketForUser(challenge.challengerId);
  const targetActive = activeSeat(ws);
  const challengerActive = challengerWs ? activeSeat(challengerWs) : null;
  const reusablePrivateGame = challengerActive && challengerActive.game.status === 'waiting' &&
    challengerActive.game[challengerActive.slot.color] &&
    challengerActive.game[challengerActive.slot.color].userId === challenge.challengerId &&
    !challengerActive.game[challengerActive.slot.color === 'blue' ? 'red' : 'blue'];
  if (!challenger || !challengerWs || challengerWs.readyState !== 1 || targetActive ||
      (challengerActive && !reusablePrivateGame)) {
    challenges.delete(challenge.id);
    send(ws, { type: 'error', message: 'That challenge can no longer be accepted.' });
    return;
  }
  challenges.delete(challenge.id);
  leaveLobby(ws);
  leaveLobby(challengerWs);
  removeSpectator(ws);
  removeSpectator(challengerWs);
  const g = reusablePrivateGame ? challengerActive.game : newGame(challenge.timeControl, !challenge.rated, undefined, { variant: challenge.variant, publicChat: challenge.publicChat });
  if (!reusablePrivateGame) games.set(g.id, g);
  const challengerColor = reusablePrivateGame ? challengerActive.slot.color
    : (challenge.rated || Math.random() < 0.5 ? (Math.random() < 0.5 ? 'blue' : 'red') : 'blue');
  const targetColor = challengerColor === 'blue' ? 'red' : 'blue';
  if (!reusablePrivateGame) g[challengerColor] = seatFor(challenger, challengerWs, g.timeControl, g.variant);
  g[targetColor] = seatFor(target, ws, g.timeControl, g.variant);
  slotBySocket.set(challengerWs, { gameId: g.id, color: challengerColor });
  slotBySocket.set(ws, { gameId: g.id, color: targetColor });
  send(challengerWs, {
    type: 'challengeAccepted', challengeId: challenge.id, gameId: g.id,
    color: challengerColor, token: g[challengerColor].token, private: true,
  });
  send(ws, {
    type: 'challengeAccepted', challengeId: challenge.id, gameId: g.id,
    color: targetColor, token: g[targetColor].token, private: true,
  });
  sendGameChatHistory(challengerWs, g);
  sendGameChatHistory(ws, g);
  startGame(g);
}

function handleChallengeDecline(ws, msg) {
  const target = authenticatedUser(ws, msg);
  const challenge = challenges.get(msg.challengeId);
  if (!target || !challenge || challenge.targetId !== target.id) return;
  challenges.delete(challenge.id);
  notifyUser(challenge.challengerId, { type: 'challengeDeclined', challengeId: challenge.id });
}

function handleSpectate(ws, msg) {
  let g = games.get(msg.gameId);
  if (!g) {
    const saved = db.getGame(msg.gameId);
    if (saved && (saved.status === 'finished' || saved.status === 'aborted')) {
      g = hydrateFinishedGame(saved);
      games.set(g.id, g);
    }
  }
  if (!g) {
    send(ws, { type: 'error', message: 'Game not found.' });
    return;
  }
  if (slotBySocket.get(ws)) {
    send(ws, { type: 'error', message: 'You are already in a game.' });
    return;
  }
  leaveLobby(ws);
  const perspectiveUserId = msg.perspectiveUserId != null ? String(msg.perspectiveUserId) : null;
  const color = perspectiveUserId && g.blue && String(g.blue.userId) === perspectiveUserId
    ? 'blue'
    : perspectiveUserId && g.red && String(g.red.userId) === perspectiveUserId ? 'red' : 'blue';
  addSpectator(ws, g, color, perspectiveUserId);
}

function handleJoin(ws, msg) {
  let g = games.get(msg.gameId);
  if (!g) {
    const saved = db.getGame(msg.gameId);
    if (saved && (saved.status === 'finished' || saved.status === 'aborted')) {
      g = hydrateFinishedGame(saved);
      games.set(g.id, g);
    }
  }
  if (!g) {
    send(ws, { type: 'error', message: 'Game not found.' });
    return;
  }

  // 1. Reconnect via game token (same tab / refresh).
  const token = msg.token;
  if (token) {
    if (g.blue && g.blue.token === token) { attach(ws, g, 'blue'); return; }
    if (g.red && g.red.token === token) { attach(ws, g, 'red'); return; }
  }

  // 2. Reclaim seat by account (solves "closed tab, come back later").
  const user = resolveUser(msg.session);
  if (user) {
    const ownColor = g.blue && g.blue.userId === user.id ? 'blue'
      : g.red && g.red.userId === user.id ? 'red' : null;
    if (ownColor) {
      const ownSeat = g[ownColor];
      // A live account session cannot occupy both seats. A disconnected seat
      // may still be reclaimed for an in-progress game, which is the normal
      // refresh/reconnect path.
      if (ownSeat.ws && ownSeat.ws !== ws) {
        send(ws, { type: 'error', message: "You can't play yourself." });
        return;
      }
      attach(ws, g, ownColor);
      return;
    }
  }

  // 3. New player: take the first open seat.
  leaveLobby(ws); // joining a game removes any open seek
  if (!g.blue) {
    g.blue = seatFor(user, ws, g.timeControl, g.variant);
    attach(ws, g, 'blue');
    return;
  }
  if (!g.red) {
    g.red = seatFor(user, ws, g.timeControl, g.variant);
    attach(ws, g, 'red');
    return;
  }

  // 4. Game is full → spectate.
  addSpectator(ws, g);
}

function handleCreate(ws, msg) {
  leaveLobby(ws); // creating a private game removes any open seek
  const user = resolveUser(msg.session);
  const startPosition = startPositionFromMessage(msg);
  if (startPosition === null) {
    send(ws, { type: 'error', message: 'Invalid starting position.' });
    return;
  }
  if (startPosition !== undefined && msg.rated !== false) {
    send(ws, { type: 'error', message: 'Custom starting positions are casual only.' });
    return;
  }
  const tc = normalizeTimeControl(msg.timeControl);
  const variant = normalizeVariant(msg.variant);
  const g = newGame(tc, msg.rated === false || !user || isInfiniteTimeControl(tc), startPosition, { variant, publicChat: msg.publicChat === true });
  games.set(g.id, g);
  const ownerColor = (msg.rated !== false && user && !isInfiniteTimeControl(tc))
    ? (msg.color === 'random' ? 'random' : (msg.color === 'red' ? 'red' : 'blue'))
    : (msg.color === 'red' ? 'red' : msg.color === 'blue' ? 'blue' : msg.color === 'random' ? 'random' : 'blue');
  const color = ownerColor === 'random' ? (Math.random() < 0.5 ? 'blue' : 'red') : ownerColor;
  g[color] = seatFor(user, ws, g.timeControl, g.variant);

  let slot = slotBySocket.get(ws);
  if (!slot) {
    slot = {};
    slotBySocket.set(ws, slot);
  }
  slot.gameId = g.id;
  slot.color = color;

  send(ws, { type: 'created', gameId: g.id, color, token: g[color].token, private: true });
  send(ws, snapshot(g, 'blue'));
}

function handleClose(ws) {
  const slot = slotBySocket.get(ws);
  if (!slot) return;
  const g = games.get(slot.gameId);
  if (!g) return;
  // Directly-created games are private while waiting for the invited player.
  // Removing them on disconnect prevents a stale invite URL from becoming a
  // playable game later. Public seeks live in `queue` and are handled above.
  if (g.status === 'waiting') {
    games.delete(g.id);
    return;
  }

  const player = g[slot.color];
  if (player && player.ws === ws) {
    player.ws = null;
    player.connected = false;
    player.disconnectedAt = Date.now();
  }

  const opp = OTHER[slot.color];
  if (g[opp] && g[opp].ws) {
    send(g[opp].ws, { type: 'opponent', connected: false });
  }
}

function leaveAnalysisRooms(ws) {
  for (const [id, room] of analysisRooms) {
    room.members.delete(ws);
    if (room.owner === ws) {
      room.owner = room.members.values().next().value || null;
      if (!room.owner) analysisRooms.delete(id);
    }
  }
}

// ---------------------------------------------------------------------------
// Matchmaking queue
// ---------------------------------------------------------------------------
function removeFromQueue(ws) {
  const before = queue.length;
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].ws === ws) queue.splice(i, 1);
  }
  return queue.length !== before;
}

function seekList() {
  return queue.map((e) => ({
    id: e.id,
    username: e.user ? e.user.username : guestNameFor(e.ws),
    rating: e.rating != null ? Math.round(e.rating) : null,
    guest: !e.user,
    casual: !!e.casual,
    variant: e.variant,
    timeControl: e.timeControl,
  }));
}

function lobbyPlayers() {
  const users = new Map();
  for (const client of clients) {
    const user = userBySocket.get(client);
    if (user && presenceBySocket.get(client) === 'home' && !users.has(user.id)) users.set(user.id, user);
  }
  return Array.from(users.values()).map((user) => ({
    id: user.id, username: user.username, ratings: db.publicUser(user).ratings,
  })).sort((a, b) => a.username.localeCompare(b.username));
}

function sendLobby(ws) {
  send(ws, { type: 'lobby', seeks: seekList(), lobbyPlayers: lobbyPlayers() });
}

function broadcastLobby() {
  const msg = { type: 'lobby', seeks: seekList(), lobbyPlayers: lobbyPlayers() };
  for (const c of clients) send(c, msg);
}

function activeGameInfo(g) {
  return {
    id: g.id,
    status: g.status,
    rated: !!g.rated,
    casual: !!g.casual,
    variant: g.variant,
    category: ratingCategoryForGame(g),
    tcInitial: g.timeControl.initial,
    tcIncrement: g.timeControl.increment,
    createdAt: g.createdAt,
    moveCount: g.game.history.length,
    board: engine.cloneBoard(g.game.board),
    turn: g.game.turn,
    players: {
      blue: playerInfo(g, 'blue'),
      red: playerInfo(g, 'red'),
    },
    spectators: g.spectators.size,
  };
}

function activeGames() {
  return Array.from(games.values())
    .filter((g) => g.status === 'playing')
    .sort((a, b) => (b.createdAt - a.createdAt) || a.id.localeCompare(b.id))
    .map(activeGameInfo);
}

function activeGamesForUser(userId) {
  return Array.from(games.values())
    .filter((g) => g.status === 'playing' &&
      ((g.blue && g.blue.userId === userId) || (g.red && g.red.userId === userId)))
    .sort((a, b) => (b.createdAt - a.createdAt) || a.id.localeCompare(b.id))
    .map(activeGameInfo);
}

// ---------------------------------------------------------------------------
// Public chat
// ---------------------------------------------------------------------------
function sendChatHistory(ws) {
  send(ws, { type: 'chatHistory', messages: chatLog.slice(-MAX_CHAT) });
}

function broadcastChat(entry) {
  const msg = { type: 'chat', message: entry };
  for (const c of clients) send(c, msg);
}

function handleChat(ws, msg) {
  const text = String(msg.text || '').trim().slice(0, 500);
  if (!text) return;
  const user = resolveUser(msg.session);
  const entry = {
    username: user ? user.username : guestNameFor(ws),
    userId: user ? user.id : null,
    text,
    time: Date.now(),
  };
  chatLog.push(entry);
  if (chatLog.length > MAX_CHAT) chatLog.shift();
  broadcastChat(entry);
}

function leaveLobby(ws) {
  if (removeFromQueue(ws)) broadcastLobby();
}

// Parse a coordinate move like "e2-e4" or "d4xe5" into { fromC, fromR, toC, toR }.
function parseMoveNotation(notation) {
  const m = /^([a-i])([1-9])([-x])([a-i])([1-9])$/.exec(String(notation || '').trim());
  if (!m) return null;
  const fromC = engine.FILES.indexOf(m[1]);
  const fromR = parseInt(m[2], 10) - 1;
  const toC = engine.FILES.indexOf(m[4]);
  const toR = parseInt(m[5], 10) - 1;
  return { fromC, fromR, toC, toR };
}

function handleQueue(ws, msg) {
  const user = resolveUser(msg.session);
  const tc = normalizeTimeControl(msg.timeControl);
  const startPosition = startPositionFromMessage(msg);
  if (startPosition === null) {
    send(ws, { type: 'error', message: 'Invalid starting position.' });
    return;
  }
  if (startPosition !== undefined && msg.rated !== false) {
    send(ws, { type: 'error', message: 'Custom starting positions are casual only.' });
    return;
  }

  // If this socket is already seeking, just re-send its seek confirmation.
  const existing = queue.find((e) => e.ws === ws);
  if (existing) {
    send(ws, { type: 'seekCreated', id: existing.id, timeControl: existing.timeControl });
    sendLobby(ws);
    return;
  }

  const id = 's' + (++seekSeq).toString(36) + randomId();
  queue.push({
    id,
    ws,
    user,
    timeControl: tc,
    variant: normalizeVariant(msg.variant),
    publicChat: msg.publicChat === true,
    startPosition,
    // API clients that omit color retain the historical blue default; the UI
    // always sends its explicit Blue/Random/Red choice.
    color: msg.color === 'blue' || msg.color === 'red' || msg.color === 'random' ? msg.color : 'blue',
    casual: !user || msg.rated === false || isInfiniteTimeControl(tc),
    rating: user ? db.ratingFor(user, normalizeVariant(msg.variant) === 'rps4200' ? 'rps4200' : timeControlCategory(tc)).rating : 1500,
    queuedAt: Date.now(),
  });

  send(ws, { type: 'seekCreated', id, timeControl: tc });
  broadcastLobby();
}

function handleQueueCancel(ws) {
  if (removeFromQueue(ws)) {
    send(ws, { type: 'seekCancelled' });
    broadcastLobby();
  }
}

function handleCancelPrivate(ws, msg = {}) {
  const slot = slotBySocket.get(ws);
  const requestedGameId = typeof msg.gameId === 'string' ? msg.gameId : '';
  const g = requestedGameId ? games.get(requestedGameId) : (slot ? games.get(slot.gameId) : null);
  const user = resolveUser(msg.session);
  const owner = g && ['blue', 'red'].some((color) => {
    const seat = g[color];
    return seat && (seat.ws === ws || (user && seat.userId != null && seat.userId === user.id));
  });
  if (!g || g.status !== 'waiting' || !owner) {
    send(ws, { type: 'error', message: 'This private game cannot be cancelled.' });
    return;
  }

  games.delete(g.id);
  for (const color of ['blue', 'red']) {
    if (g[color] && g[color].ws) {
      send(g[color].ws, { type: 'privateCancelled', gameId: g.id });
      slotBySocket.delete(g[color].ws);
    }
  }
  if (slotBySocket.get(ws)?.gameId === g.id) slotBySocket.delete(ws);
}

function handleAcceptSeek(ws, msg) {
  const idx = queue.findIndex((e) => e.id === msg.seekId);
  if (idx === -1) {
    send(ws, { type: 'error', message: 'That seek is no longer available.' });
    return;
  }
  const seek = queue[idx];
  if (seek.ws === ws) {
    send(ws, { type: 'error', message: "You can't play yourself." });
    return;
  }
  const user = resolveUser(msg.session);
  if (!seek.casual && !user) {
    send(ws, { type: 'error', message: 'Guests cannot accept rated games.' });
    return;
  }
  if (user && seek.user && user.id === seek.user.id) {
    send(ws, { type: 'error', message: "You can't play yourself." });
    return;
  }
  queue.splice(idx, 1);
  leaveLobby(ws); // cancel any seek the acceptor had open

  const g = newGame(seek.timeControl, seek.casual, seek.startPosition, { variant: seek.variant, publicChat: seek.publicChat });
  games.set(g.id, g);

  const acceptColor = (!seek.casual && user) ? 'random' : (msg.color === 'blue' || msg.color === 'red' ? msg.color : 'random');
  let seekerColor;
  if (seek.color === 'blue' || acceptColor === 'red') seekerColor = 'blue';
  else if (seek.color === 'red' || acceptColor === 'blue') seekerColor = 'red';
  else seekerColor = Math.random() < 0.5 ? 'blue' : 'red';
  const acceptorColor = seekerColor === 'blue' ? 'red' : 'blue';
  g[seekerColor] = seatFor(seek.user, seek.ws, g.timeControl, g.variant);
  g[acceptorColor] = seatFor(user, ws, g.timeControl, g.variant);

  slotBySocket.set(seek.ws, { gameId: g.id, color: seekerColor });
  slotBySocket.set(ws, { gameId: g.id, color: acceptorColor });

  send(seek.ws, { type: 'queueMatched', gameId: g.id, color: seekerColor, token: g[seekerColor].token });
  send(ws, { type: 'queueMatched', gameId: g.id, color: acceptorColor, token: g[acceptorColor].token });

  startGame(g);
  broadcastLobby();
}

// ---------------------------------------------------------------------------
// HTTP: REST API + static files
// ---------------------------------------------------------------------------
function getAuthToken(req) {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) return h.slice(7);
  if (req.headers.cookie) {
    const parts = req.headers.cookie.split(';').map((s) => s.trim());
    for (const p of parts) {
      if (p.startsWith('session=')) return p.slice('session='.length);
    }
  }
  return null;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1e6) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (e) {
        const err = new Error('invalid json');
        err.code = 'INVALID_JSON';
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  });
  res.end(body);
}

function profileUser(user) {
  const result = db.publicUser(user);
  result.ratingRanks = Object.fromEntries(db.CATEGORIES.map((category) => [category, db.leaderboardRank(category, user.id)]));
  return result;
}

async function handleApi(req, res, urlPath, query) {
  try {
    // --- auth ---
    if (req.method === 'POST' && urlPath === '/api/register') {
      const body = await readBody(req);
      const user = db.createUser(body && body.username, body && body.password);
      const token = db.createSession(user.id);
      sendJson(res, 200, { token, user: db.publicUser(user) });
      return;
    }

    if (req.method === 'POST' && urlPath === '/api/login') {
      const body = await readBody(req);
      const u = db.verifyCredentials(body && body.username, body && body.password);
      if (!u) {
        sendJson(res, 401, { error: 'Invalid username or password.' });
        return;
      }
      const token = db.createSession(u.id);
      sendJson(res, 200, { token, user: db.publicUser(u) });
      return;
    }

    if (req.method === 'POST' && urlPath === '/api/logout') {
      db.deleteSession(getAuthToken(req));
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && urlPath === '/api/me') {
      const user = db.getSessionUser(getAuthToken(req));
      if (!user) {
        sendJson(res, 401, { error: 'Not authenticated.' });
        return;
      }
      sendJson(res, 200, { user: profileUser(user), activeGames: activeGamesForUser(user.id) });
      return;
    }

    if (req.method === 'GET' && urlPath === '/api/watch') {
      sendJson(res, 200, { games: activeGames() });
      return;
    }

    if (req.method === 'GET' && urlPath === '/api/players') {
      const search = query ? query.get('search') || '' : '';
      const online = new Set(Array.from(clients).map((client) => userBySocket.get(client)?.id).filter(Boolean));
      sendJson(res, 200, { players: db.listPlayers(search, 5000).map((player) => ({ ...player, online: online.has(player.id) })) });
      return;
    }

    const distributionMatch = urlPath.match(/^\/api\/rating-distribution\/(bullet|blitz|rapid|classical)$/);
    if (req.method === 'GET' && distributionMatch) {
      sendJson(res, 200, { category: distributionMatch[1], ratings: db.ratingDistribution(distributionMatch[1]) });
      return;
    }

    if (req.method === 'GET' && urlPath === '/api/leaderboard') {
      const viewer = db.getSessionUser(getAuthToken(req));
      const leaderboards = db.listLeaderboards(10);
      const ranks = {};
      if (viewer) for (const category of db.CATEGORIES) ranks[category] = db.leaderboardRank(category, viewer.id);
      const publicViewer = viewer ? db.publicUser(viewer) : null;
      sendJson(res, 200, {
        leaderboards,
        ranks,
        viewer: publicViewer ? {
          id: publicViewer.id,
          username: publicViewer.username,
          ratings: Object.fromEntries(db.CATEGORIES.map((category) => [category, publicViewer.ratings[category].rating])),
        } : null,
      });
      return;
    }

    const playerMatch = urlPath.match(/^\/api\/players\/([A-Za-z0-9_-]{2,20})$/);
    if (req.method === 'GET' && playerMatch) {
      const user = db.getUserByUsername(playerMatch[1]);
      if (!user) {
        sendJson(res, 404, { error: 'Player not found.' });
        return;
      }
      sendJson(res, 200, {
        user: profileUser(user),
        games: db.listPublicGames(user.id, 50),
        activeGames: activeGamesForUser(user.id),
      });
      return;
    }

    // --- history ---
    if (req.method === 'GET' && urlPath === '/api/games') {
      const user = db.getSessionUser(getAuthToken(req));
      if (!user) {
        sendJson(res, 401, { error: 'Not authenticated.' });
        return;
      }
      sendJson(res, 200, { games: db.listGames(user.id) });
      return;
    }

    if (req.method === 'GET' && urlPath === '/api/analysis-saves') {
      const user = db.getSessionUser(getAuthToken(req));
      if (!user) { sendJson(res, 401, { error: 'Not authenticated.' }); return; }
      sendJson(res, 200, { analyses: db.listAnalyses(user.id) });
      return;
    }

    if (req.method === 'POST' && urlPath === '/api/analysis-saves') {
      const user = db.getSessionUser(getAuthToken(req));
      if (!user) { sendJson(res, 401, { error: 'Not authenticated.' }); return; }
      const body = await readBody(req);
      const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
      const baseTurn = body.baseTurn === 'red' ? 'red' : 'blue';
      const baseBoard = parseStartPosition({ board: body.baseBoard, turn: baseTurn });
      const moves = Array.isArray(body.moves) ? body.moves.slice(0, 2000).filter((move) => typeof move === 'string' && /^[a-i][1-9][-x][a-i][1-9]$/.test(move)) : [];
      if (!name || !baseBoard) { sendJson(res, 400, { error: 'A name and valid analysis position are required.' }); return; }
      sendJson(res, 200, { analysis: db.saveAnalysis(user.id, name, baseBoard.board, baseTurn, moves) });
      return;
    }

    const analysisSaveMatch = urlPath.match(/^\/api\/analysis-saves\/(\d+)$/);
    if (req.method === 'DELETE' && analysisSaveMatch) {
      const user = db.getSessionUser(getAuthToken(req));
      if (!user) { sendJson(res, 401, { error: 'Not authenticated.' }); return; }
      if (!db.deleteAnalysis(user.id, analysisSaveMatch[1])) { sendJson(res, 404, { error: 'Analysis not found.' }); return; }
      sendJson(res, 200, { deleted: true });
      return;
    }

    const gm = urlPath.match(/^\/api\/games\/([A-Za-z0-9_-]+)$/);
    if (req.method === 'GET' && gm) {
      const g = db.getGame(gm[1]);
      if (!g) {
        sendJson(res, 404, { error: 'Game not found.' });
        return;
      }
      sendJson(res, 200, { game: g });
      return;
    }

    // --- opening explorer ---
    if (req.method === 'GET' && urlPath === '/api/openings') {
      const movesParam = (query && query.get('moves')) || '';
      const boardParam = (query && query.get('board')) || '';
      const turnParam = (query && query.get('turn')) || 'blue';

      let board;
      let turn;

      if (boardParam) {
        board = engine.stringToBoard(boardParam);
        if (!board) {
          sendJson(res, 400, { error: 'Invalid board.' });
          return;
        }
        turn = turnParam === 'red' ? 'red' : 'blue';
      } else {
        const moveList = movesParam ? movesParam.split(',').filter(Boolean) : [];
        board = engine.initialBoard();
        turn = 'blue';
        for (const notation of moveList) {
          const m = parseMoveNotation(notation);
          if (!m) {
            sendJson(res, 400, { error: 'Invalid move: ' + notation });
            return;
          }
          const legal = engine.legalMovesFrom(board, turn, m.fromC, m.fromR)
            .find((x) => x.toC === m.toC && x.toR === m.toR);
          if (!legal) {
            sendJson(res, 400, { error: 'Illegal move sequence at ' + notation });
            return;
          }
          const piece = board[m.fromR][m.fromC];
          board[m.fromR][m.fromC] = null;
          board[m.toR][m.toC] = piece;
          turn = turn === 'blue' ? 'red' : 'blue';
        }
      }

      const key = engine.boardToString(board) + ':' + (turn === 'blue' ? 'b' : 'r');
      const opening = db.getOpening(key);
      sendJson(res, 200, {
        position: { key, board, turn },
        totalGames: opening ? opening.totalGames : 0,
        moves: opening ? opening.moves : [],
      });
      return;
    }

    sendJson(res, 404, { error: 'Not found.' });
  } catch (e) {
    if (e.code === 'USERNAME_TAKEN' || e.code === 'BAD_USERNAME' || e.code === 'BAD_PASSWORD' || e.code === 'INVALID_JSON') {
      sendJson(res, 400, { error: e.message });
      return;
    }
    sendJson(res, 500, { error: 'Server error.' });
  }
}

function serveStatic(req, res, urlPath) {
  const cleanRoute = /^\/(?:analysis|game|spectate|profile|rating-stats)(?:\/[A-Za-z0-9_-]+)?$/.test(urlPath);
  const relativeAsset = PUBLIC_ASSETS.get(urlPath) || (cleanRoute ? 'index.html' : null);
  if (!relativeAsset) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const filePath = path.join(ROOT, relativeAsset);

  fs.lstat(filePath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      });
      res.end(data);
    });
  });
}

const httpServer = http.createServer((req, res) => {
  const rawUrl = req.url || '/';
  const [pathname, queryString] = rawUrl.split('?');
  let urlPath;
  try {
    urlPath = decodeURIComponent(pathname);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }
  const query = new URLSearchParams(queryString || '');
  if (urlPath.startsWith('/api/')) {
    handleApi(req, res, urlPath, query);
    return;
  }
  serveStatic(req, res, urlPath);
});

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (ws) => {
  clients.add(ws);
  presenceBySocket.set(ws, 'home');
  sendLobby(ws);
  sendChatHistory(ws);

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      send(ws, { type: 'error', message: 'Malformed message.' });
      return;
    }

    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
      send(ws, { type: 'error', message: 'Malformed message.' });
      return;
    }

    if (msg.session) {
      authenticatedUser(ws, msg);
      broadcastLobby();
    }

    switch (msg.type) {
      case 'identify': {
        const user = authenticatedUser(ws, msg);
        sendPendingChallenges(ws, user?.id);
        sendPendingAnalysisInvites(ws, user?.id);
        break;
      }
      case 'presence': {
        const screen = typeof msg.screen === 'string' ? msg.screen.slice(0, 24) : 'home';
        presenceBySocket.set(ws, screen);
        broadcastLobby();
        break;
      }
      case 'create': handleCreate(ws, msg); break;
      case 'join': handleJoin(ws, msg); break;
      case 'spectate': handleSpectate(ws, msg); break;
      case 'move': handleMove(ws, msg); break;
      case 'resign': handleResign(ws); break;
      case 'queue': handleQueue(ws, msg); break;
      case 'queueCancel': handleQueueCancel(ws); break;
      case 'cancelPrivate': handleCancelPrivate(ws, msg); break;
      case 'acceptSeek': handleAcceptSeek(ws, msg); break;
      case 'challengeCreate': handleChallengeCreate(ws, msg); break;
      case 'challengeAccept': handleChallengeAccept(ws, msg); break;
      case 'challengeDecline': handleChallengeDecline(ws, msg); break;
      case 'claimVictory': handleClaim(ws, msg); break;
      case 'claimDraw': handleClaim(ws, msg); break;
      case 'gameChat': handleGameChat(ws, msg); break;
      case 'offerDraw': handleOfferDraw(ws); break;
      case 'acceptDraw': handleAcceptDraw(ws); break;
      case 'declineDraw': handleDeclineDraw(ws); break;
      case 'takeback': handleTakebackRequest(ws); break;
      case 'acceptTakeback': handleTakebackResponse(ws, true); break;
      case 'declineTakeback': handleTakebackResponse(ws, false); break;
      case 'rematch': handleRematch(ws); break;
      case 'rematchCancel': handleRematchCancel(ws); break;
      case 'analysisInvite': handleAnalysisInvite(ws, msg); break;
      case 'analysisInviteDismiss': handleAnalysisInviteDismiss(ws, msg); break;
      case 'analysisJoin': handleAnalysisJoin(ws, msg); break;
      case 'analysisSettings': handleAnalysisSettings(ws, msg); break;
      case 'analysisState': handleAnalysisState(ws, msg); break;
      case 'abort': handleAbort(ws); break;
      case 'chat': handleChat(ws, msg); break;
      default: send(ws, { type: 'error', message: 'Unknown message type.' }); break;
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    if (removeFromQueue(ws)) broadcastLobby();
    handleClose(ws);
    removeSpectator(ws);
    leaveAnalysisRooms(ws);
    broadcastLobby();
  });
  ws.on('error', () => {
    clients.delete(ws);
    if (removeFromQueue(ws)) broadcastLobby();
    handleClose(ws);
    removeSpectator(ws);
    leaveAnalysisRooms(ws);
    broadcastLobby();
  });
});

function restoreActiveGames() {
  for (const saved of db.listActiveGames()) {
    try {
      const g = hydrateActiveGame(saved);
      if (!g.id || !g.blue || !g.red) throw new Error('incomplete active game snapshot');
      g.pausedForRestart = false;
      g.clocks.running = g.resumeRunning || g.game.turn;
      g.resumeRunning = null;
      g.clocks.lastTick = Date.now();
      g.ticker = setInterval(() => tick(g), TICK_MS);
      games.set(g.id, g);
    } catch (error) {
      console.error('Discarding invalid active game snapshot:', saved && saved.id, error.message);
      if (saved && saved.id) db.deleteActiveGame(saved.id);
    }
  }
}

restoreActiveGames();
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('Intransitive server on http://0.0.0.0:' + PORT);
});

function shutdown() {
  for (const g of games.values()) {
    if (g.status === 'playing') {
      if (!g.pausedForRestart) settleClock(g);
      if (g.status === 'playing') persistActiveGame(g);
    }
    stopTicker(g);
  }
  for (const ws of clients) ws.close(1001, 'Server shutting down');
  wss.close();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

// Opportunistic cleanup of long-finished games (keeps memory bounded).
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  const challengeCutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, challenge] of challenges) {
    if (challenge.createdAt < challengeCutoff) challenges.delete(id);
  }
  for (const [id, invite] of analysisInvites) {
    if (invite.createdAt < challengeCutoff) analysisInvites.delete(id);
  }
  for (const [id, g] of games) {
    if ((g.status === 'finished' || g.status === 'aborted') && g.createdAt < cutoff) {
      stopTicker(g);
      games.delete(id);
    }
  }
}, 10 * 60 * 1000).unref();
