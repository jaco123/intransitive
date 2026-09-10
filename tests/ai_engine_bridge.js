'use strict';

// Test-only differential bridge.  engine.js remains the canonical rules source.
const fs = require('fs');
const engine = require('../engine.js');

function boardFromValues(values) {
  return values.map((row) => row.map((value) => {
    if (!value) return null;
    const color = value > 0 ? 'blue' : 'red';
    const kind = Math.abs(value);
    return { color, type: kind === 1 ? 'rock' : kind === 2 ? 'paper' : 'scissors' };
  }));
}

function actionMove(action) {
  const source = Math.floor(action / engine.DIRS.length);
  const direction = action % engine.DIRS.length;
  const fromR = Math.floor(source / engine.SIZE);
  const fromC = source % engine.SIZE;
  return { fromC, fromR, toC: fromC + engine.DIRS[direction][0], toR: fromR + engine.DIRS[direction][1] };
}

function actionIds(game) {
  // The game exposes the side-to-move list to callers; use that ordering for exact comparison.
  return game.allLegalMoves().map((move) => (move.fromR * engine.SIZE + move.fromC) * engine.DIRS.length +
    engine.DIRS.findIndex(([dc, dr]) => dc === move.toC - move.fromC && dr === move.toR - move.fromR));
}

function snapshot(game) {
  return {
    board: engine.boardToString(game.board), turn: game.turn, status: game.status,
    winner: game.winner, drawReason: game.drawReason, halfmove: game.halfmoveClock,
    fullmove: game.fullmoveNumber, legal: actionIds(game),
  };
}

function run(testCase) {
  const game = new engine.Game();
  if (testCase.board) {
    game.board = boardFromValues(testCase.board);
    game.turn = testCase.turn || 'blue';
    game.halfmoveClock = testCase.halfmove || 0;
    game.fullmoveNumber = testCase.fullmove || 1;
    game.status = 'playing'; game.winner = null; game.drawReason = null;
    game.history = []; game.lastMove = null; game.positionCounts = new Map(); game.recordPosition();
  }
  const snapshots = [snapshot(game)];
  for (const action of testCase.actions || []) {
    const move = actionMove(action);
    const result = game.move(move.fromC, move.fromR, move.toC, move.toR);
    if (!result.ok) throw new Error(result.error);
    snapshots.push(snapshot(game));
  }
  return snapshots;
}

const input = JSON.parse(fs.readFileSync(0, 'utf8'));
process.stdout.write(JSON.stringify(input.map(run)) + '\n');
