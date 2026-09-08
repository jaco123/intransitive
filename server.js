/* RPS 9x9 — server: static files + WebSocket game rooms + REST auth/history.
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
const queue = [];                 // lobby seeks: { id, ws, user, timeControl, rating, queuedAt }
const clients = new Set();        // all open WebSocket connections (for lobby broadcasts)
let seekSeq = 0;
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

function newGame(timeControl, casual, startPosition) {
  const tc = normalizeTimeControl(timeControl);
  const position = startPosition || { board: engine.initialBoard(), turn: 'blue' };
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
    casual: !!casual,
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
    rematchOffer: null,     // color that offered a rematch
    spectators: new Set(),  // spectator WebSockets
  };
}

function makeSeat(user, ws, category) {
  const r = user ? db.ratingFor(user, category) : null;
  return {
    token: randomToken(),
    ws,
    connected: !!ws,
    userId: user ? user.id : null,
    username: user ? user.username : null,
    rating: r ? r.rating : null,     // rating at game start (before)
    rd: r ? r.rd : null,
    vol: r ? r.vol : null,
    ratingAfter: null,
    disconnectedAt: null,
  };
}

function seatFor(user, ws, tc) {
  return makeSeat(user, ws, timeControlCategory(tc));
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

function playerInfo(g, color) {
  const p = g[color];
  if (!p) return null;
  if (!p.userId) return { name: CAP[color], guest: true, rating: null };
  let r = p.rating;
  if (g.status === 'finished' && p.ratingAfter != null) r = p.ratingAfter;
  return { name: p.username || CAP[color], guest: false, rating: r == null ? null : Math.round(r) };
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
    ratingDelta: g.ratingDelta || null,
    turn: g.game.turn,
    board: engine.cloneBoard(g.game.board),
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
    rematchOffer: g.rematchOffer || null,
  };
}

function broadcastState(g) {
  if (g.blue && g.blue.ws) send(g.blue.ws, snapshot(g, 'blue'));
  if (g.red && g.red.ws) send(g.red.ws, snapshot(g, 'red'));
  for (const ws of g.spectators) send(ws, snapshot(g, 'blue', true));
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
  if (g.status === 'playing' && c.running) {
    const color = c.running;
    let remaining = now - c.lastTick;
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
    const cat = timeControlCategory(g.timeControl);
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
  send(ws, { type: 'gameChatHistory', messages: g.chat });

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

  const delta = applyRatings(g);
  persistGame(g);
  recordOpenings(g);
  g.ratingDelta = delta;
  broadcastState(g);
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

  const cat = timeControlCategory(g.timeControl);
  db.updateRatingFor(cat, g.blue.userId, res.blue);
  db.updateRatingFor(cat, g.red.userId, res.red);
  db.incrementStats(g.blue.userId, g.result, 'blue');
  db.incrementStats(g.red.userId, g.result, 'red');

  g.blue.ratingAfter = res.blue.rating;
  g.red.ratingAfter = res.red.rating;

  return {
    blue: res.blue.rating - Math.round(beforeBlue.rating),
    red: res.red.rating - Math.round(beforeRed.rating),
  };
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
    history: JSON.stringify(g.game.history),
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

function seatFrom(oldSeat, tc) {
  const user = oldSeat.userId ? db.getUserById(oldSeat.userId) : null;
  return makeSeat(user, oldSeat.ws, timeControlCategory(tc));
}

function startRematch(old) {
  if (!old.blue || !old.red || !old.blue.connected || !old.red.connected) return false;
  const g = newGame(old.timeControl, old.casual, old.startPosition);
  games.set(g.id, g);
  g.blue = seatFrom(old.red, old.timeControl);   // colors reversed
  g.red = seatFrom(old.blue, old.timeControl);
  slotBySocket.set(g.blue.ws, { gameId: g.id, color: 'blue' });
  slotBySocket.set(g.red.ws, { gameId: g.id, color: 'red' });
  send(g.blue.ws, { type: 'rematchStarted', gameId: g.id, color: 'blue', token: g.blue.token });
  send(g.red.ws, { type: 'rematchStarted', gameId: g.id, color: 'red', token: g.red.token });
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

function abortGame(g) {
  if (g.status !== 'playing') return;
  g.status = 'aborted';
  g.reason = 'abort';
  g.result = null;
  g.clocks.running = null;
  stopTicker(g);
  broadcastState(g);
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

function addSpectator(ws, g) {
  g.spectators.add(ws);
  spectateBySocket.set(ws, g.id);
  send(ws, { type: 'spectating', gameId: g.id, color: 'blue' });
  send(ws, snapshot(g, 'blue', true));
  send(ws, { type: 'gameChatHistory', messages: g.chat });
}

function removeSpectator(ws) {
  const gid = spectateBySocket.get(ws);
  if (!gid) return;
  const g = games.get(gid);
  if (g) g.spectators.delete(ws);
  spectateBySocket.delete(ws);
}

function broadcastGameChat(g, entry) {
  const msg = { type: 'gameChat', message: entry };
  if (g.blue && g.blue.ws) send(g.blue.ws, msg);
  if (g.red && g.red.ws) send(g.red.ws, msg);
  for (const ws of g.spectators) send(ws, msg);
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

  const user = resolveUser(msg.session);
  let username;
  if (user) username = user.username;
  else if (role === 'blue') username = CAP.blue;
  else if (role === 'red') username = CAP.red;
  else username = 'Spectator';

  const entry = {
    username,
    userId: user ? user.id : null,
    color: role === 'blue' || role === 'red' ? role : null,
    text,
    time: Date.now(),
  };
  g.chat.push(entry);
  if (g.chat.length > MAX_GAME_CHAT) g.chat.shift();
  broadcastGameChat(g, entry);
}

function handleSpectate(ws, msg) {
  const g = games.get(msg.gameId);
  if (!g) {
    send(ws, { type: 'error', message: 'Game not found.' });
    return;
  }
  if (slotBySocket.get(ws)) {
    send(ws, { type: 'error', message: 'You are already in a game.' });
    return;
  }
  leaveLobby(ws);
  addSpectator(ws, g);
}

function handleJoin(ws, msg) {
  const g = games.get(msg.gameId);
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
    if (g.blue && g.blue.userId === user.id) { attach(ws, g, 'blue'); return; }
    if (g.red && g.red.userId === user.id) { attach(ws, g, 'red'); return; }
  }

  // 3. New player: take the first open seat.
  leaveLobby(ws); // joining a game removes any open seek
  if (!g.blue) {
    g.blue = seatFor(user, ws, g.timeControl);
    attach(ws, g, 'blue');
    return;
  }
  if (!g.red) {
    g.red = seatFor(user, ws, g.timeControl);
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
  const g = newGame(msg.timeControl, msg.rated === false || !user, startPosition);
  games.set(g.id, g);
  g.blue = seatFor(user, ws, g.timeControl);

  let slot = slotBySocket.get(ws);
  if (!slot) {
    slot = {};
    slotBySocket.set(ws, slot);
  }
  slot.gameId = g.id;
  slot.color = 'blue';

  send(ws, { type: 'created', gameId: g.id, color: 'blue', token: g.blue.token });
  send(ws, snapshot(g, 'blue'));
}

function handleClose(ws) {
  const slot = slotBySocket.get(ws);
  if (!slot) return;
  const g = games.get(slot.gameId);
  if (!g) return;

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
    username: e.user ? e.user.username : null,
    rating: e.rating != null ? Math.round(e.rating) : null,
    guest: !e.user,
    casual: !!e.casual,
    timeControl: e.timeControl,
  }));
}

function sendLobby(ws) {
  send(ws, { type: 'lobby', seeks: seekList() });
}

function broadcastLobby() {
  const msg = { type: 'lobby', seeks: seekList() };
  for (const c of clients) send(c, msg);
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
    username: user ? user.username : null,
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
    startPosition,
    casual: !user || msg.rated === false,
    rating: user ? db.ratingFor(user, timeControlCategory(tc)).rating : 1500,
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
  queue.splice(idx, 1);
  leaveLobby(ws); // cancel any seek the acceptor had open

  const user = resolveUser(msg.session);
  const g = newGame(seek.timeControl, seek.casual, seek.startPosition);
  games.set(g.id, g);

  g.blue = seatFor(seek.user, seek.ws, g.timeControl); // seeker takes Blue
  g.red = seatFor(user, ws, g.timeControl);           // acceptor takes Red

  slotBySocket.set(seek.ws, { gameId: g.id, color: 'blue' });
  slotBySocket.set(ws, { gameId: g.id, color: 'red' });

  send(seek.ws, { type: 'queueMatched', gameId: g.id, color: 'blue', token: g.blue.token });
  send(ws, { type: 'queueMatched', gameId: g.id, color: 'red', token: g.red.token });

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
      sendJson(res, 200, { user: db.publicUser(user) });
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
  const relativeAsset = PUBLIC_ASSETS.get(urlPath);
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

    switch (msg.type) {
      case 'create': handleCreate(ws, msg); break;
      case 'join': handleJoin(ws, msg); break;
      case 'spectate': handleSpectate(ws, msg); break;
      case 'move': handleMove(ws, msg); break;
      case 'resign': handleResign(ws); break;
      case 'queue': handleQueue(ws, msg); break;
      case 'queueCancel': handleQueueCancel(ws); break;
      case 'acceptSeek': handleAcceptSeek(ws, msg); break;
      case 'claimVictory': handleClaim(ws, msg); break;
      case 'claimDraw': handleClaim(ws, msg); break;
      case 'gameChat': handleGameChat(ws, msg); break;
      case 'offerDraw': handleOfferDraw(ws); break;
      case 'acceptDraw': handleAcceptDraw(ws); break;
      case 'declineDraw': handleDeclineDraw(ws); break;
      case 'rematch': handleRematch(ws); break;
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
  });
  ws.on('error', () => {
    clients.delete(ws);
    if (removeFromQueue(ws)) broadcastLobby();
    removeSpectator(ws);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('RPS server on http://0.0.0.0:' + PORT);
});

// Opportunistic cleanup of long-finished games (keeps memory bounded).
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, g] of games) {
    if ((g.status === 'finished' || g.status === 'aborted') && g.createdAt < cutoff) {
      stopTicker(g);
      games.delete(id);
    }
  }
}, 10 * 60 * 1000).unref();
