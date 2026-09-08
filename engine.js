/* RPS 9x9 — pure rules engine (no DOM). Usable in browser and Node. */
(function (global) {
  'use strict';

  const SIZE = 9;
  const FILES = 'abcdefghi';
  const COLORS = { BLUE: 'blue', RED: 'red' };
  const TYPES = { ROCK: 'rock', PAPER: 'paper', SCISSORS: 'scissors' };

  // The type that the key type can capture.
  const BEATS = { rock: 'scissors', scissors: 'paper', paper: 'rock' };

  // King moves: 8 directions as [dc, dr].
  const DIRS = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];

  function inBounds(c, r) {
    return c >= 0 && c < SIZE && r >= 0 && r < SIZE;
  }

  function squareName(c, r) {
    return FILES[c] + String(r + 1);
  }

  function parseSquare(name) {
    const c = FILES.indexOf(name[0].toLowerCase());
    const r = parseInt(name.slice(1), 10) - 1;
    if (c < 0 || !inBounds(c, r)) throw new Error('Invalid square: ' + name);
    return { c, r };
  }

  function beats(typeA, typeB) {
    return BEATS[typeA] === typeB;
  }

  function initialBoard() {
    const b = [];
    for (let r = 0; r < SIZE; r++) b.push(new Array(SIZE).fill(null));
    const put = (name, color, type) => {
      const { c, r } = parseSquare(name);
      b[r][c] = { color, type };
    };

    // Blue (bottom, moves first)
    put('b5', 'blue', 'paper'); put('c4', 'blue', 'paper');
    put('d3', 'blue', 'paper'); put('e2', 'blue', 'paper');
    put('c5', 'blue', 'scissors'); put('d4', 'blue', 'scissors'); put('e3', 'blue', 'scissors');
    put('b4', 'blue', 'rock'); put('c3', 'blue', 'rock'); put('d2', 'blue', 'rock');

    // Red (top)
    put('e8', 'red', 'paper'); put('f7', 'red', 'paper');
    put('g6', 'red', 'paper'); put('h5', 'red', 'paper');
    put('e7', 'red', 'scissors'); put('f6', 'red', 'scissors'); put('g5', 'red', 'scissors');
    put('f8', 'red', 'rock'); put('g7', 'red', 'rock'); put('h6', 'red', 'rock');

    return b;
  }

  function cloneBoard(board) {
    return board.map(row => row.map(p => (p ? { color: p.color, type: p.type } : null)));
  }

  function boardToString(board) {
    let s = '';
    for (let r = SIZE - 1; r >= 0; r--) {
      for (let c = 0; c < SIZE; c++) {
        const p = board[r][c];
        if (!p) { s += '.'; continue; }
        const letter = p.type === 'rock' ? 'R' : p.type === 'paper' ? 'P' : 'S';
        s += p.color === 'blue' ? letter : letter.toLowerCase();
      }
    }
    return s;
  }

  // Reverse of boardToString: '.' = empty, uppercase = Blue, lowercase = Red.
  function stringToBoard(s) {
    if (typeof s !== 'string' || s.length !== SIZE * SIZE) return null;
    const b = [];
    for (let r = 0; r < SIZE; r++) b.push(new Array(SIZE).fill(null));
    let i = 0;
    for (let r = SIZE - 1; r >= 0; r--) {
      for (let c = 0; c < SIZE; c++) {
        const ch = s[i++];
        if (ch === '.') continue;
        // Reject malformed position strings instead of treating unknown piece
        // letters as scissors. This matters when positions come from a URL.
        if (!'RPSrps'.includes(ch)) return null;
        const color = ch === ch.toUpperCase() ? 'blue' : 'red';
        const lc = ch.toLowerCase();
        const type = lc === 'r' ? 'rock' : lc === 'p' ? 'paper' : 'scissors';
        b[r][c] = { color, type };
      }
    }
    return b;
  }

  function isGoalSquare(color, c, r) {
    if (color === 'blue') return c === SIZE - 1 && r === SIZE - 1; // I9
    return c === 0 && r === 0; // A1
  }

  function getWinner(board) {
    const blueGoal = board[SIZE - 1][SIZE - 1];
    const redGoal = board[0][0];
    if (blueGoal && blueGoal.color === 'blue') return 'blue';
    if (redGoal && redGoal.color === 'red') return 'red';
    return null;
  }

  function legalMovesFrom(board, color, c, r) {
    if (!board || !inBounds(c, r)) return [];
    const piece = board[r][c];
    if (!piece || piece.color !== color) return [];
    const moves = [];
    for (let i = 0; i < DIRS.length; i++) {
      const nc = c + DIRS[i][0];
      const nr = r + DIRS[i][1];
      if (!inBounds(nc, nr)) continue;
      const t = board[nr][nc];
      if (!t) {
        moves.push({ fromC: c, fromR: r, toC: nc, toR: nr, capture: false });
      } else if (t.color !== color && beats(piece.type, t.type)) {
        moves.push({ fromC: c, fromR: r, toC: nc, toR: nr, capture: true });
      }
    }
    return moves;
  }

  function allLegalMoves(board, color) {
    const moves = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const p = board[r][c];
        if (p && p.color === color) {
          for (const m of legalMovesFrom(board, color, c, r)) moves.push(m);
        }
      }
    }
    return moves;
  }

  function hasLegalMoves(board, color) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const p = board[r][c];
        if (p && p.color === color && legalMovesFrom(board, color, c, r).length > 0) return true;
      }
    }
    return false;
  }

  const OTHER = { blue: 'red', red: 'blue' };

  class Game {
    constructor() {
      this.board = initialBoard();
      this.turn = COLORS.BLUE;
      this.halfmoveClock = 0;
      this.fullmoveNumber = 1;
      this.status = 'playing'; // 'playing' | 'blue_won' | 'red_won' | 'draw'
      this.winner = null;      // 'blue' | 'red' | null
      this.drawReason = null;  // 'threefold' | '100ply' | null
      this.history = [];
      this.lastMove = null;
      this.positionCounts = new Map();
      this.recordPosition();
    }

    pieceAt(c, r) { return inBounds(c, r) ? this.board[r][c] : null; }

    positionKey() {
      return boardToString(this.board) + ':' + (this.turn === 'blue' ? 'b' : 'r');
    }

    recordPosition() {
      const key = this.positionKey();
      this.positionCounts.set(key, (this.positionCounts.get(key) || 0) + 1);
    }

    legalMovesFrom(c, r) {
      return legalMovesFrom(this.board, this.turn, c, r);
    }

    allLegalMoves(color) {
      return allLegalMoves(this.board, color || this.turn);
    }

    hasLegalMoves(color) {
      return hasLegalMoves(this.board, color || this.turn);
    }

    move(fromC, fromR, toC, toR) {
      if (this.status !== 'playing') return { ok: false, error: 'Game is over' };
      if (![fromC, fromR, toC, toR].every(Number.isInteger) ||
          !inBounds(fromC, fromR) || !inBounds(toC, toR)) {
        return { ok: false, error: 'Invalid square' };
      }
      const piece = this.pieceAt(fromC, fromR);
      if (!piece || piece.color !== this.turn) return { ok: false, error: 'Not your piece' };
      const legal = this.legalMovesFrom(fromC, fromR).find(m => m.toC === toC && m.toR === toR);
      if (!legal) return { ok: false, error: 'Illegal move' };

      const target = this.pieceAt(toC, toR);
      const capture = !!target;

      this.board[fromR][fromC] = null;
      this.board[toR][toC] = piece;

      this.history.push({
        fromC, fromR, toC, toR, capture,
        capturedType: target ? target.type : null,
        capturedColor: target ? target.color : null,
      });
      this.lastMove = { fromC, fromR, toC, toR, capture };

      // Half-move clock: reset on capture, otherwise increment.
      this.halfmoveClock = capture ? 0 : this.halfmoveClock + 1;

      // Win check (reaching your goal square, including by capturing onto it).
      const winner = getWinner(this.board);
      if (winner) {
        this.winner = winner;
        this.status = winner === 'blue' ? 'blue_won' : 'red_won';
        return { ok: true };
      }

      // Switch sides.
      this.turn = OTHER[this.turn];
      if (this.turn === COLORS.BLUE) this.fullmoveNumber += 1;

      // Threefold repetition (automatic on the third occurrence).
      this.recordPosition();
      if (this.positionCounts.get(this.positionKey()) >= 3) {
        this.status = 'draw';
        this.drawReason = 'threefold';
        return { ok: true };
      }

      // 100 ply with no captures = 50 moves per player.
      if (this.halfmoveClock >= 100) {
        this.status = 'draw';
        this.drawReason = '100ply';
        return { ok: true };
      }

      // No legal moves for the side to move → that side loses.
      if (!this.hasLegalMoves(this.turn)) {
        this.winner = OTHER[this.turn];
        this.status = this.winner === 'blue' ? 'blue_won' : 'red_won';
        return { ok: true };
      }

      return { ok: true };
    }
  }

  const api = {
    SIZE, FILES, COLORS, TYPES, BEATS, DIRS,
    inBounds, squareName, parseSquare, beats,
    initialBoard, cloneBoard, boardToString, stringToBoard,
    isGoalSquare, getWinner,
    legalMovesFrom, allLegalMoves, hasLegalMoves,
    Game,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.RPSEngine = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
