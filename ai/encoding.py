"""Neural state/action encodings.  No positional evaluation is encoded."""

from __future__ import annotations

import numpy as np

from .rules import BLUE, DIRS, GameState, SIZE, decode_action as decode_rule_action
from .rules import encode_action as encode_rule_action

ACTION_COUNT = SIZE * SIZE * len(DIRS)
HISTORY_STEPS = 4
CHANNELS = HISTORY_STEPS * 6 + 3


def encode_action(from_c: int, from_r: int, to_c: int, to_r: int) -> int:
    return encode_rule_action(from_c, from_r, to_c, to_r)


def decode_action(action: int) -> tuple[int, int, int, int]:
    return decode_rule_action(action)


def _board_planes(board: np.ndarray) -> np.ndarray:
    planes = np.zeros((6, SIZE, SIZE), dtype=np.float32)
    for index, value in enumerate((1, 2, 3, -1, -2, -3)):
        planes[index] = (board == value)
    return planes


def encode_state(state: GameState) -> np.ndarray:
    """Return current plus three previous positions, side, clock, repetition."""
    planes = np.zeros((CHANNELS, SIZE, SIZE), dtype=np.float32)
    history = state.board_history[-HISTORY_STEPS:]
    if not history:
        history = [state.board]
    while len(history) < HISTORY_STEPS:
        history.insert(0, history[0])
    for index, board in enumerate(reversed(history)):
        planes[index * 6:(index + 1) * 6] = _board_planes(board)
    planes[HISTORY_STEPS * 6, :, :] = 1.0 if state.turn == BLUE else -1.0
    planes[HISTORY_STEPS * 6 + 1, :, :] = min(state.halfmove_clock, 100) / 100.0
    planes[HISTORY_STEPS * 6 + 2, :, :] = min(state.position_counts.get(state.position_key(), 1), 3) / 3.0
    return planes


def encode_batch(states: list[GameState]) -> np.ndarray:
    if not states:
        return np.empty((0, CHANNELS, SIZE, SIZE), dtype=np.float32)
    return np.stack([encode_state(state) for state in states]).astype(np.float32, copy=False)
