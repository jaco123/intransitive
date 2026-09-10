"""A high-throughput mirror of engine.js, with conformance tests against it.

The website's engine.js is authoritative.  This module intentionally contains
only rule mechanics, not evaluation features: the trainer must learn from
self-play rather than from hand-authored positional knowledge.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import numpy as np

SIZE = 9
DIRS = ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1))
BLUE, RED = 1, -1
ROCK, PAPER, SCISSORS = 1, 2, 3
OTHER = {BLUE: RED, RED: BLUE}
BEATS = {ROCK: SCISSORS, SCISSORS: PAPER, PAPER: ROCK}


def piece_value(color: int, kind: int) -> int:
    return int(color * kind)


def piece_color(piece: int) -> int:
    return BLUE if piece > 0 else RED


def piece_kind(piece: int) -> int:
    return abs(int(piece))


def square(c: int, r: int) -> str:
    return chr(ord('a') + c) + str(r + 1)


def initial_board() -> np.ndarray:
    board = np.zeros((SIZE, SIZE), dtype=np.int8)
    placements = (
        ('b5', BLUE, PAPER), ('c4', BLUE, PAPER), ('d3', BLUE, PAPER), ('e2', BLUE, PAPER),
        ('c5', BLUE, SCISSORS), ('d4', BLUE, SCISSORS), ('e3', BLUE, SCISSORS),
        ('b4', BLUE, ROCK), ('c3', BLUE, ROCK), ('d2', BLUE, ROCK),
        ('e8', RED, PAPER), ('f7', RED, PAPER), ('g6', RED, PAPER), ('h5', RED, PAPER),
        ('e7', RED, SCISSORS), ('f6', RED, SCISSORS), ('g5', RED, SCISSORS),
        ('f8', RED, ROCK), ('g7', RED, ROCK), ('h6', RED, ROCK),
    )
    for name, color, kind in placements:
        board[int(name[1]) - 1, ord(name[0]) - ord('a')] = piece_value(color, kind)
    return board


def clone_board(board: np.ndarray) -> np.ndarray:
    raw = np.asarray(board)
    if raw.shape != (SIZE, SIZE):
        raise ValueError('board must be 9x9')
    if not np.issubdtype(raw.dtype, np.integer) or not np.isin(raw, (0, -3, -2, -1, 1, 2, 3)).all():
        raise ValueError('board contains an invalid piece value')
    return raw.astype(np.int8, copy=True)


def board_string(board: np.ndarray) -> str:
    letters = {ROCK: 'R', PAPER: 'P', SCISSORS: 'S'}
    rows = []
    for r in range(SIZE - 1, -1, -1):
        for c in range(SIZE):
            piece = int(board[r, c])
            if piece == 0:
                rows.append('.')
            else:
                letter = letters[abs(piece)]
                rows.append(letter if piece > 0 else letter.lower())
    return ''.join(rows)


def legal_actions(board: np.ndarray, color: int) -> list[int]:
    result: list[int] = []
    for r in range(SIZE):
        for c in range(SIZE):
            piece = int(board[r, c])
            if piece == 0 or piece_color(piece) != color:
                continue
            kind = piece_kind(piece)
            for direction, (dc, dr) in enumerate(DIRS):
                nc, nr = c + dc, r + dr
                if not (0 <= nc < SIZE and 0 <= nr < SIZE):
                    continue
                target = int(board[nr, nc])
                if target == 0 or (piece_color(target) != color and BEATS[kind] == piece_kind(target)):
                    result.append((r * SIZE + c) * len(DIRS) + direction)
    return result


def decode_action(action: int) -> tuple[int, int, int, int]:
    if not isinstance(action, (int, np.integer)) or not 0 <= int(action) < SIZE * SIZE * len(DIRS):
        raise ValueError('invalid action')
    source, direction = divmod(int(action), len(DIRS))
    r, c = divmod(source, SIZE)
    dc, dr = DIRS[direction]
    return c, r, c + dc, r + dr


def encode_action(from_c: int, from_r: int, to_c: int, to_r: int) -> int:
    dc, dr = to_c - from_c, to_r - from_r
    try:
        direction = DIRS.index((dc, dr))
    except ValueError as exc:
        raise ValueError('action is not an adjacent move') from exc
    if not (0 <= from_c < SIZE and 0 <= from_r < SIZE and 0 <= to_c < SIZE and 0 <= to_r < SIZE):
        raise ValueError('action is out of bounds')
    return (from_r * SIZE + from_c) * len(DIRS) + direction


@dataclass(frozen=True)
class Move:
    action: int
    from_c: int
    from_r: int
    to_c: int
    to_r: int
    capture: bool
    captured: int


class GameState:
    """Complete path-dependent game state required by engine.js semantics."""

    def __init__(self, board: np.ndarray | None = None, turn: int = BLUE):
        if turn not in (BLUE, RED):
            raise ValueError('turn must be blue or red')
        self.board = clone_board(initial_board() if board is None else board)
        self.turn = turn
        self.halfmove_clock = 0
        self.fullmove_number = 1
        self.status = 'playing'
        self.winner: int | None = None
        self.draw_reason: str | None = None
        self.history: list[Move] = []
        self.last_move: Move | None = None
        self.position_counts: dict[str, int] = {}
        self.board_history: list[np.ndarray] = []
        self._record_position()

    def copy(self) -> 'GameState':
        other = object.__new__(GameState)
        other.board = self.board.copy()
        other.turn = self.turn
        other.halfmove_clock = self.halfmove_clock
        other.fullmove_number = self.fullmove_number
        other.status = self.status
        other.winner = self.winner
        other.draw_reason = self.draw_reason
        other.history = list(self.history)
        other.last_move = self.last_move
        other.position_counts = dict(self.position_counts)
        other.board_history = [board.copy() for board in self.board_history]
        return other

    def position_key(self) -> str:
        return board_string(self.board) + (':b' if self.turn == BLUE else ':r')

    def _record_position(self) -> None:
        self.position_counts[self.position_key()] = self.position_counts.get(self.position_key(), 0) + 1
        self.board_history.append(self.board.copy())

    def legal_actions(self) -> list[int]:
        return legal_actions(self.board, self.turn)

    def is_terminal(self) -> bool:
        return self.status != 'playing'

    def terminal_value(self, perspective: int | None = None) -> float:
        if self.status == 'draw' or self.winner is None:
            return 0.0
        perspective = self.turn if perspective is None else perspective
        return 1.0 if self.winner == perspective else -1.0

    def _goal_winner(self) -> int | None:
        if self.board[SIZE - 1, SIZE - 1] == piece_value(BLUE, ROCK) or \
                self.board[SIZE - 1, SIZE - 1] == piece_value(BLUE, PAPER) or \
                self.board[SIZE - 1, SIZE - 1] == piece_value(BLUE, SCISSORS):
            return BLUE
        if self.board[0, 0] < 0:
            return RED
        return None

    def play(self, action: int) -> Move:
        if self.is_terminal():
            raise ValueError('game is over')
        if action not in set(self.legal_actions()):
            raise ValueError('illegal move')
        from_c, from_r, to_c, to_r = decode_action(action)
        piece = int(self.board[from_r, from_c])
        target = int(self.board[to_r, to_c])
        self.board[from_r, from_c] = 0
        self.board[to_r, to_c] = piece
        move = Move(action, from_c, from_r, to_c, to_r, target != 0, target)
        self.history.append(move)
        self.last_move = move
        self.halfmove_clock = 0 if target != 0 else self.halfmove_clock + 1

        winner = self._goal_winner()
        if winner is not None:
            self.winner = winner
            self.status = 'blue_won' if winner == BLUE else 'red_won'
            return move

        self.turn = OTHER[self.turn]
        if self.turn == BLUE:
            self.fullmove_number += 1
        self._record_position()
        if self.position_counts[self.position_key()] >= 3:
            self.status = 'draw'
            self.draw_reason = 'threefold'
            return move
        if self.halfmove_clock >= 100:
            self.status = 'draw'
            self.draw_reason = '100ply'
            return move
        if not self.legal_actions():
            self.winner = OTHER[self.turn]
            self.status = 'blue_won' if self.winner == BLUE else 'red_won'
        return move

    def snapshot(self) -> dict:
        return {
            'board': board_string(self.board), 'turn': 'blue' if self.turn == BLUE else 'red',
            'status': self.status, 'winner': None if self.winner is None else ('blue' if self.winner == BLUE else 'red'),
            'drawReason': self.draw_reason, 'halfmove': self.halfmove_clock,
            'fullmove': self.fullmove_number, 'legal': self.legal_actions(),
        }


def state_from_positions(board: Iterable[Iterable[int]], turn: int = BLUE) -> GameState:
    return GameState(np.asarray(list(board), dtype=np.int8), turn)
