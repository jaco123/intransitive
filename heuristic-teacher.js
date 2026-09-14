'use strict';

// The browser/server rules engine is authoritative for the playable teacher.
const engine = require('./engine.js');

const TYPE_PRIORITY = { scissors: 3, rock: 2, paper: 1 };

function cloneGame(source) {
  const game = new engine.Game();
  game.board = engine.cloneBoard(source.board);
  game.turn = source.turn;
  game.halfmoveClock = source.halfmoveClock;
  game.fullmoveNumber = source.fullmoveNumber;
  game.status = source.status;
  game.winner = source.winner;
  game.drawReason = source.drawReason;
  game.history = source.history.slice();
  game.lastMove = source.lastMove ? { ...source.lastMove } : null;
  game.positionCounts = new Map(source.positionCounts);
  return game;
}

function safeAfter(game, move) {
  const child = cloneGame(game);
  const result = child.move(move.fromC, move.fromR, move.toC, move.toR);
  if (!result.ok || child.status !== 'playing') return true;
  return !child.allLegalMoves().some((reply) => reply.toC === move.toC && reply.toR === move.toR);
}

function sourceType(game, move) {
  return game.board[move.fromR][move.fromC].type;
}

function targetType(game, move) {
  return game.board[move.toR][move.toC] && game.board[move.toR][move.toC].type;
}

function isUndefendedAttack(game, move) {
  const child = cloneGame(game);
  if (!child.move(move.fromC, move.fromR, move.toC, move.toR).ok || child.status !== 'playing') return true;
  const attacker = { c: move.toC, r: move.toR };
  const attacks = engine.allLegalMoves(child.board, game.turn).filter((next) => next.capture);
  if (!attacks.length) return false;
  return attacks.some((attack) => {
    const afterCapture = cloneGame(child);
    afterCapture.turn = game.turn;
    if (!afterCapture.move(attack.fromC, attack.fromR, attack.toC, attack.toR).ok) return false;
    if (afterCapture.status !== 'playing') return true;
    return !afterCapture.allLegalMoves().some((reply) => reply.toC === attacker.c && reply.toR === attacker.r);
  });
}

const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1]];

function pathDistance(board, color, fromC, fromR) {
  const goal = color === engine.COLORS.BLUE ? [engine.SIZE - 1, engine.SIZE - 1] : [0, 0];
  if (fromC === goal[0] && fromR === goal[1]) return 0;
  const walkable = board.map((row) => row.map((square) => !square));
  walkable[fromR][fromC] = true;
  const queue = [[fromC, fromR, 0]];
  const seen = new Set([`${fromC},${fromR}`]);
  for (let head = 0; head < queue.length; head++) {
    const [c, r, distance] = queue[head];
    for (const [dc, dr] of DIRECTIONS) {
      const nextC = c + dc;
      const nextR = r + dr;
      if (nextC < 0 || nextC >= engine.SIZE || nextR < 0 || nextR >= engine.SIZE) continue;
      const key = `${nextC},${nextR}`;
      if (seen.has(key) || !walkable[nextR][nextC]) continue;
      if (nextC === goal[0] && nextR === goal[1]) return distance + 1;
      seen.add(key);
      queue.push([nextC, nextR, distance + 1]);
    }
  }
  return null;
}

function actionKey(move) {
  return [move.fromR, move.fromC, move.toR, move.toC];
}

function compareActions(a, b) {
  const ak = actionKey(a); const bk = actionKey(b);
  for (let i = 0; i < ak.length; i++) if (ak[i] !== bk[i]) return ak[i] - bk[i];
  return 0;
}

function closestGoalMove(game, legal) {
  const pieces = [];
  for (let r = 0; r < engine.SIZE; r++) for (let c = 0; c < engine.SIZE; c++) {
    const piece = game.board[r][c];
    if (!piece || piece.color !== game.turn) continue;
    const distance = pathDistance(game.board, game.turn, c, r);
    if (distance !== null) pieces.push({ distance, c, r });
  }
  pieces.sort((a, b) => a.distance - b.distance || a.r - b.r || a.c - b.c);
  for (const piece of pieces) {
    const advancing = legal.filter((move) => move.fromC === piece.c && move.fromR === piece.r)
      .map((move) => {
        const child = cloneGame(game);
        if (!child.move(move.fromC, move.fromR, move.toC, move.toR).ok) return null;
        const after = pathDistance(child.board, game.turn, move.toC, move.toR);
        return after !== null && after < piece.distance ? { move, after } : null;
      }).filter(Boolean);
    if (advancing.length) {
      advancing.sort((a, b) => a.after - b.after || compareActions(a.move, b.move));
      return advancing[0].move;
    }
  }
  return null;
}

function chooseMove(game) {
  if (!game || game.status !== 'playing') throw new Error('Cannot choose from a finished game.');
  const legal = game.allLegalMoves();
  if (!legal.length) throw new Error('No legal moves available.');

  const captures = legal.filter((move) => move.capture);
  if (captures.length) {
    captures.sort((a, b) => TYPE_PRIORITY[targetType(game, b)] - TYPE_PRIORITY[targetType(game, a)] || compareActions(a, b));
    return { ...captures[0], reason: 'capture' };
  }

  const goalMove = closestGoalMove(game, legal);
  return goalMove ? { ...goalMove, reason: 'goal-progress' } :
    { ...legal.slice().sort(compareActions)[0], reason: 'fallback' };
}

function targetTypeAfterMove(game, move) {
  const child = cloneGame(game);
  child.move(move.fromC, move.fromR, move.toC, move.toR);
  const attacks = engine.allLegalMoves(child.board, game.turn).filter((next) => next.capture);
  return attacks.length ? targetType(child, attacks[0]) : 'paper';
}

module.exports = { chooseMove };
