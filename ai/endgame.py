"""Conservative bounded solver for tiny, path-safe endgames.

The solver reports only forced wins/losses it can prove within the requested
depth. Cycles and depth cutoffs are treated as unknown, never as losses, so an
unresolved position falls back to neural search.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import numpy as np

from .rules import GameState


@dataclass(frozen=True)
class EndgameResult:
    outcome: int  # 1 = forced win, -1 = forced loss, 0 = unknown/draw
    action: int | None
    distance: int | None


def _eligible(state: GameState, piece_limit: int) -> bool:
    pieces = int((state.board != 0).sum())
    return (not state.is_terminal() and pieces <= piece_limit and pieces > 0
            and state.halfmove_clock == 0
            and max(state.position_counts.values(), default=1) == 1)


def solve_endgame(state: GameState, max_depth: int = 12, piece_limit: int = 2) -> EndgameResult:
    """Prove a tiny endgame result, or return unknown without guessing."""
    if max_depth < 1 or piece_limit < 1 or not _eligible(state, piece_limit):
        return EndgameResult(0, None, None)

    root_player = state.turn
    active: set[tuple[bytes, int, int]] = set()

    @lru_cache(maxsize=200_000)
    def visit(board_key: bytes, turn: int, halfmove: int, depth: int) -> tuple[int, int]:
        key = (board_key, turn, halfmove)
        if key in active or depth <= 0:
            return 0, 0
        active.add(key)
        try:
            board = np.frombuffer(board_key, dtype=np.int8).reshape(9, 9).copy()
            current = GameState(board, turn)
            current.halfmove_clock = halfmove
            current.position_counts = {current.position_key(): 1}
            legal = current.legal_actions()
            if not legal:
                return -1, 0
            best_distance = 10**9
            all_forced_loss = True
            for action in legal:
                child = current.copy(include_history=False)
                parent = current.turn
                child.play_trusted(action)
                if child.is_terminal():
                    child_outcome = 1 if child.winner == parent else -1
                    child_distance = 1
                else:
                    result, child_distance = visit(child.board.tobytes(order='C'), child.turn,
                                                    child.halfmove_clock, depth - 1)
                    child_outcome = result if child.turn == parent else -result
                if child_outcome == 1:
                    all_forced_loss = False
                    best_distance = min(best_distance, child_distance + 1)
                    return 1, best_distance
                if child_outcome != -1:
                    all_forced_loss = False
            if all_forced_loss:
                return -1, 1
            return 0, 0
        finally:
            active.discard(key)

    outcome, distance = visit(state.board.tobytes(order='C'), state.turn, state.halfmove_clock, max_depth)
    if outcome == 0:
        return EndgameResult(0, None, None)
    for action in state.legal_actions():
        child = state.copy(include_history=False)
        parent = state.turn
        child.play_trusted(action)
        if child.is_terminal():
            child_outcome = 1 if child.winner == parent else -1
            child_distance = 1
        else:
            result, child_distance = visit(child.board.tobytes(order='C'), child.turn,
                                           child.halfmove_clock, max_depth - 1)
            child_outcome = result if child.turn == parent else -result
            child_distance += 1
        if child_outcome == outcome:
            return EndgameResult(outcome, action, child_distance)
    return EndgameResult(outcome, None, distance)
