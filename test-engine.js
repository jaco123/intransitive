const assert = require('assert');
const E = require('./engine.js');

// 1. Initial position
{
  const g = new E.Game();
  const counts = {};
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const p = g.pieceAt(c, r);
      if (p) {
        counts[p.color] = (counts[p.color] || 0) + 1;
        counts[p.type] = (counts[p.type] || 0) + 1;
      }
    }
  }
  assert.strictEqual(counts.blue, 10, 'blue count');
  assert.strictEqual(counts.red, 10, 'red count');
  assert.strictEqual(counts.paper, 8, 'paper count');
  assert.strictEqual(counts.scissors, 6, 'scissors count');
  assert.strictEqual(counts.rock, 6, 'rock count');
  assert.strictEqual(g.turn, 'blue', 'blue moves first');
  console.log('ok 1: initial position');
}

// 2. Beats table
{
  assert.strictEqual(E.beats('rock', 'scissors'), true);
  assert.strictEqual(E.beats('scissors', 'paper'), true);
  assert.strictEqual(E.beats('paper', 'rock'), true);
  assert.strictEqual(E.beats('rock', 'rock'), false);
  assert.strictEqual(E.beats('rock', 'paper'), false);
  assert.strictEqual(E.beats('paper', 'scissors'), false);
  assert.strictEqual(E.beats('scissors', 'rock'), false);
  assert.strictEqual(E.beats('paper', 'paper'), false);
  assert.strictEqual(E.beats('scissors', 'scissors'), false);
  console.log('ok 2: beats table');
}

// 3. Legal moves from blue paper on e2
{
  const g = new E.Game();
  const moves = g.legalMovesFrom(4, 1); // e2
  assert.strictEqual(moves.length, 5, '5 quiet moves');
  assert.ok(moves.every(m => !m.capture), 'all quiet');
  console.log('ok 3: blue paper e2 has 5 quiet moves');
}

// 4. Rock captures scissors only
{
  const board = E.initialBoard().map(row => row.map(() => null));
  board[3][4] = { color: 'blue', type: 'rock' };    // e4
  board[3][3] = { color: 'red', type: 'scissors' }; // d4
  board[3][5] = { color: 'red', type: 'paper' };    // f4
  board[2][3] = { color: 'red', type: 'rock' };     // d3
  const moves = E.legalMovesFrom(board, 'blue', 4, 3);
  assert.strictEqual(moves.length, 6, '5 quiet + 1 capture');
  const caps = moves.filter(m => m.capture);
  assert.strictEqual(caps.length, 1, 'one capture');
  assert.deepStrictEqual([caps[0].toC, caps[0].toR], [3, 3], 'captures scissors on d4');
  console.log('ok 4: rock captures scissors only');
}

// 5. Blue reaching I9 wins
{
  const board = E.initialBoard().map(row => row.map(() => null));
  board[7][7] = { color: 'blue', type: 'rock' }; // h8, next to I9
  const g = new E.Game();
  g.board = board;
  g.turn = 'blue';
  const res = g.move(7, 7, 8, 8);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(g.status, 'blue_won');
  assert.strictEqual(g.winner, 'blue');
  console.log('ok 5: blue reaching I9 wins');
}

// 6. Red reaching A1 wins
{
  const board = E.initialBoard().map(row => row.map(() => null));
  board[1][1] = { color: 'red', type: 'paper' }; // b2, next to A1
  const g = new E.Game();
  g.board = board;
  g.turn = 'red';
  const res = g.move(1, 1, 0, 0);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(g.status, 'red_won');
  assert.strictEqual(g.winner, 'red');
  console.log('ok 6: red reaching A1 wins');
}

// 7. Win by capturing onto the goal square
{
  const board = E.initialBoard().map(row => row.map(() => null));
  board[8][8] = { color: 'red', type: 'scissors' }; // red scissors on I9
  board[8][7] = { color: 'blue', type: 'rock' };    // blue rock on h9
  const g = new E.Game();
  g.board = board;
  g.turn = 'blue';
  const res = g.move(7, 8, 8, 8); // rock takes scissors on I9
  assert.strictEqual(res.ok, true);
  assert.strictEqual(g.status, 'blue_won');
  console.log('ok 7: capture onto goal wins');
}

// 8. Red can stand on I9 without winning (blocking)
{
  const board = E.initialBoard().map(row => row.map(() => null));
  board[8][8] = { color: 'red', type: 'paper' };
  assert.strictEqual(E.getWinner(board), null);
  console.log('ok 8: red on I9 does not win');
}

// 9. 100-ply draw (50 moves per player, no captures)
{
  const g = new E.Game();
  g.halfmoveClock = 99;
  const res = g.move(4, 1, 5, 1); // blue paper e2 -> f2
  assert.strictEqual(res.ok, true);
  assert.strictEqual(g.status, 'draw');
  assert.strictEqual(g.drawReason, '100ply');
  console.log('ok 9: 100-ply draw');
}

// 10. Threefold repetition
{
  const board = E.initialBoard().map(row => row.map(() => null));
  board[1][0] = { color: 'blue', type: 'rock' }; // a2
  board[7][0] = { color: 'red', type: 'rock' };  // a8
  const g = new E.Game();
  g.board = board;
  g.turn = 'blue';
  g.positionCounts = new Map();
  g.recordPosition();
  const seq = [
    [0, 1, 0, 2], [0, 7, 0, 6], [0, 2, 0, 1], [0, 6, 0, 7],
    [0, 1, 0, 2], [0, 7, 0, 6], [0, 2, 0, 1], [0, 6, 0, 7],
  ];
  for (const [fc, fr, tc, tr] of seq) g.move(fc, fr, tc, tr);
  assert.strictEqual(g.status, 'draw');
  assert.strictEqual(g.drawReason, 'threefold');
  console.log('ok 10: threefold repetition');
}

// 11. No legal moves is a loss
{
  const board = E.initialBoard().map(row => row.map(() => null));
  board[3][3] = { color: 'red', type: 'rock' }; // d4
  for (const [dc, dr] of E.DIRS) {
    board[3 + dr][3 + dc] = { color: 'blue', type: 'paper' };
  }
  board[1][0] = { color: 'blue', type: 'paper' }; // a2, movable
  const g = new E.Game();
  g.board = board;
  g.turn = 'blue';
  const res = g.move(0, 1, 0, 2); // blue paper a2 -> a3
  assert.strictEqual(res.ok, true);
  assert.strictEqual(g.status, 'blue_won');
  assert.strictEqual(g.winner, 'blue');
  console.log('ok 11: no legal moves is a loss');
}

// 12. Cannot move the opponent's piece
{
  const g = new E.Game();
  const res = g.move(4, 7, 4, 6); // red paper e8 while it's blue's turn
  assert.strictEqual(res.ok, false);
  console.log('ok 12: cannot move opponent piece');
}

// 13. lastMove carries the capture flag (for move vs capture sound)
{
  const board = E.initialBoard().map(row => row.map(() => null));
  board[3][4] = { color: 'blue', type: 'rock' };    // e4
  board[3][3] = { color: 'red', type: 'scissors' }; // d4
  const g = new E.Game();
  g.board = board;
  g.turn = 'blue';
  g.move(4, 3, 3, 3); // rock captures scissors
  assert.strictEqual(g.lastMove.capture, true, 'capture move flagged');

  const g2 = new E.Game();
  g2.move(4, 1, 5, 1); // quiet paper move e2 -> f2
  assert.strictEqual(g2.lastMove.capture, false, 'quiet move not flagged');
  console.log('ok 13: lastMove capture flag');
}

// 14. Invalid coordinates are rejected without indexing outside the board.
{
  const g = new E.Game();
  assert.deepStrictEqual(E.legalMovesFrom(g.board, 'blue', -1, 0), []);
  const res = g.move(99, 0, 0, 0);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error, 'Invalid square');
  console.log('ok 14: invalid coordinates rejected');
}

console.log('ALL ENGINE TESTS PASSED');
