"""Neural state/action encodings.  No positional evaluation is encoded."""

from __future__ import annotations

import numpy as np

from .rules import BOARD_HISTORY_LIMIT, BLUE, DIRS, GameState, SIZE, decode_action as decode_rule_action
from .rules import encode_action as encode_rule_action

ACTION_COUNT = SIZE * SIZE * len(DIRS)
HISTORY_STEPS = BOARD_HISTORY_LIMIT
REPETITION_PLANES = len(DIRS) * 2
LEGACY_CHANNELS = HISTORY_STEPS * 6 + 3
CHANNELS = LEGACY_CHANNELS + REPETITION_PLANES


def encode_action(from_c: int, from_r: int, to_c: int, to_r: int) -> int:
    return encode_rule_action(from_c, from_r, to_c, to_r)


def decode_action(action: int) -> tuple[int, int, int, int]:
    return decode_rule_action(action)


def _board_planes(board: np.ndarray) -> np.ndarray:
    values = np.asarray((1, 2, 3, -1, -2, -3), dtype=board.dtype)
    return np.equal(board[..., None], values).transpose(2, 0, 1).astype(np.float32, copy=False)


def encode_state(state: GameState) -> np.ndarray:
    """Return bounded board history plus exact one-ply repetition effects.

    The rules retain complete repetition counts. The final 16 planes encode,
    per move direction, whether that legal move would revisit a position once
    or at least twice. This is a bounded, rule-derived representation of every
    immediately possible threefold transition; MCTS still retains exact full
    histories for deeper consequences.
    """
    planes = np.zeros((CHANNELS, SIZE, SIZE), dtype=np.float32)
    history = list(state.board_history[-HISTORY_STEPS:])
    if not history:
        history = [state.board]
    history = [history[0]] * (HISTORY_STEPS - len(history)) + history
    boards = np.stack(history[::-1])
    values = np.asarray((1, 2, 3, -1, -2, -3), dtype=boards.dtype)
    planes[:HISTORY_STEPS * 6] = np.equal(boards[..., None], values).transpose(0, 3, 1, 2).reshape(HISTORY_STEPS * 6, SIZE, SIZE)
    planes[HISTORY_STEPS * 6, :, :] = 1.0 if state.turn == BLUE else -1.0
    planes[HISTORY_STEPS * 6 + 1, :, :] = min(state.halfmove_clock, 100) / 100.0
    planes[HISTORY_STEPS * 6 + 2, :, :] = min(state.position_counts.get(state.position_key(), 1), 3) / 3.0
    repetition_start = HISTORY_STEPS * 6 + 3
    current_board_bytes = state.board.tobytes(order='C')
    for action in state.legal_actions():
        count = state.position_counts.get(state.next_position_key_trusted(action, current_board_bytes), 0)
        if count not in (1, 2):
            continue
        source = action // len(DIRS)
        direction = action % len(DIRS)
        row, column = divmod(source, SIZE)
        threshold = count - 1
        planes[repetition_start + direction * 2 + threshold, row, column] = 1.0
    return planes


def encode_teacher_snapshot(board: np.ndarray, turn: int) -> np.ndarray:
    """Encode a position without inventing unavailable path history.

    Teacher FEN records contain only a board and side to move.  The current
    board is therefore placed in the newest board plane, while older boards,
    the halfmove clock, and repetition planes remain zero (unknown).  This is
    deliberately different from constructing a ``GameState`` and pretending
    that the snapshot began a fresh game.
    """
    board = np.asarray(board)
    if board.shape != (SIZE, SIZE):
        raise ValueError('teacher board must be 9x9')
    if turn not in (1, -1):
        raise ValueError('teacher turn must be blue or red')
    values = np.asarray((1, 2, 3, -1, -2, -3), dtype=board.dtype)
    planes = np.zeros((CHANNELS, SIZE, SIZE), dtype=np.float32)
    planes[:6] = np.equal(board[None, ...], values[:, None, None]).astype(np.float32)
    planes[HISTORY_STEPS * 6] = 1.0 if turn == BLUE else -1.0
    return planes


def encode_batch(states: list[GameState]) -> np.ndarray:
    if not states:
        return np.empty((0, CHANNELS, SIZE, SIZE), dtype=np.float32)
    return np.stack([encode_state(state) for state in states]).astype(np.float32, copy=False)
