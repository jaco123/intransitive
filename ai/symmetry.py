"""Exact rule-preserving board symmetries for training-sample augmentation."""

from __future__ import annotations

import numpy as np

from .encoding import ACTION_COUNT, CHANNELS, HISTORY_STEPS
from .rules import BLUE, DIRS, RED, SIZE

SYMMETRY_NAMES = ('identity', 'main_diagonal', 'rotate_180_swap_colors', 'anti_diagonal_swap_colors')
SYMMETRY_COUNT = len(SYMMETRY_NAMES)
_COLOR_SWAP = np.asarray((False, False, True, True))


def _transform_coordinate(column: int, row: int, symmetry: int) -> tuple[int, int]:
    if symmetry == 0:
        return column, row
    if symmetry == 1:
        return row, column
    if symmetry == 2:
        return SIZE - 1 - column, SIZE - 1 - row
    if symmetry == 3:
        return SIZE - 1 - row, SIZE - 1 - column
    raise ValueError('unknown symmetry')


def _validate_symmetry(symmetry: int) -> int:
    if not isinstance(symmetry, (int, np.integer)) or not 0 <= int(symmetry) < SYMMETRY_COUNT:
        raise ValueError('unknown symmetry')
    return int(symmetry)


def transform_board(board: np.ndarray, symmetry: int) -> np.ndarray:
    """Map cells and swap piece colors when the goals are exchanged."""
    symmetry = _validate_symmetry(symmetry)
    board = np.asarray(board)
    if board.shape != (SIZE, SIZE):
        raise ValueError('board must be 9x9')
    if symmetry == 0:
        transformed = board.copy()
    elif symmetry == 1:
        transformed = board.T.copy()
    elif symmetry == 2:
        transformed = np.flip(board, axis=(0, 1)).copy()
    else:
        transformed = np.flip(board.T, axis=(0, 1)).copy()
    if _COLOR_SWAP[symmetry]:
        transformed = (-transformed).astype(board.dtype, copy=False)
    return transformed


def transform_turn(turn: int, symmetry: int) -> int:
    symmetry = _validate_symmetry(symmetry)
    if turn not in (BLUE, RED):
        raise ValueError('turn must be blue or red')
    return -turn if _COLOR_SWAP[symmetry] else turn


def transform_action(action: int, symmetry: int) -> int:
    """Map every encoded action, including geometrically illegal edge actions."""
    symmetry = _validate_symmetry(symmetry)
    if not isinstance(action, (int, np.integer)) or not 0 <= int(action) < ACTION_COUNT:
        raise ValueError('invalid action')
    source, direction = divmod(int(action), len(DIRS))
    row, column = divmod(source, SIZE)
    column_delta, row_delta = DIRS[direction]
    mapped_source = _transform_coordinate(column, row, symmetry)
    mapped_destination = _transform_coordinate(column + column_delta, row + row_delta, symmetry)
    mapped_direction = (mapped_destination[0] - mapped_source[0], mapped_destination[1] - mapped_source[1])
    return (mapped_source[1] * SIZE + mapped_source[0]) * len(DIRS) + DIRS.index(mapped_direction)


def _make_action_map() -> np.ndarray:
    return np.asarray([[transform_action(action, symmetry) for action in range(ACTION_COUNT)]
                       for symmetry in range(SYMMETRY_COUNT)], dtype=np.int64)


def _make_direction_map() -> np.ndarray:
    result = np.empty((SYMMETRY_COUNT, len(DIRS)), dtype=np.int64)
    for symmetry in range(SYMMETRY_COUNT):
        for index, (column_delta, row_delta) in enumerate(DIRS):
            source = (SIZE // 2, SIZE // 2)
            destination = (source[0] + column_delta, source[1] + row_delta)
            mapped_source = _transform_coordinate(*source, symmetry)
            mapped_destination = _transform_coordinate(*destination, symmetry)
            mapped = (mapped_destination[0] - mapped_source[0], mapped_destination[1] - mapped_source[1])
            result[symmetry, index] = DIRS.index(mapped)
    return result


ACTION_MAP = _make_action_map()
DIRECTION_MAP = _make_direction_map()


def transform_policy(policy: np.ndarray, symmetry: int) -> np.ndarray:
    symmetry = _validate_symmetry(symmetry)
    policy = np.asarray(policy)
    if policy.shape != (ACTION_COUNT,):
        raise ValueError('policy must have one entry per action')
    transformed = np.zeros_like(policy)
    transformed[ACTION_MAP[symmetry]] = policy
    return transformed


def _transform_spatial(planes: np.ndarray, symmetry: int) -> np.ndarray:
    if symmetry == 0:
        return planes.copy()
    if symmetry == 1:
        return planes.transpose(0, 2, 1).copy()
    if symmetry == 2:
        return np.flip(planes, axis=(1, 2)).copy()
    return np.flip(planes.transpose(0, 2, 1), axis=(1, 2)).copy()


def transform_encoded_state(encoded: np.ndarray, symmetry: int) -> np.ndarray:
    """Transform only rule-derived planes; exact path state is not invented."""
    symmetry = _validate_symmetry(symmetry)
    encoded = np.asarray(encoded)
    if encoded.shape != (CHANNELS, SIZE, SIZE):
        raise ValueError('encoded state has an unexpected shape')
    transformed = np.empty_like(encoded)
    for step in range(HISTORY_STEPS):
        block = _transform_spatial(encoded[step * 6:(step + 1) * 6], symmetry)
        if _COLOR_SWAP[symmetry]:
            transformed[step * 6:step * 6 + 3] = block[3:6]
            transformed[step * 6 + 3:step * 6 + 6] = block[:3]
        else:
            transformed[step * 6:(step + 1) * 6] = block
    transformed[HISTORY_STEPS * 6] = (-encoded[HISTORY_STEPS * 6] if _COLOR_SWAP[symmetry]
                                       else encoded[HISTORY_STEPS * 6])
    transformed[HISTORY_STEPS * 6 + 1:HISTORY_STEPS * 6 + 3] = encoded[HISTORY_STEPS * 6 + 1:HISTORY_STEPS * 6 + 3]
    repetition_start = HISTORY_STEPS * 6 + 3
    repetition = _transform_spatial(encoded[repetition_start:], symmetry)
    for direction in range(len(DIRS)):
        destination = int(DIRECTION_MAP[symmetry, direction])
        transformed[repetition_start + destination * 2:repetition_start + destination * 2 + 2] = repetition[direction * 2:direction * 2 + 2]
    return transformed


def augment_batch(states: np.ndarray, policies: np.ndarray, rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    """Apply one uniformly selected valid symmetry per sample on the fly."""
    states = np.asarray(states)
    policies = np.asarray(policies)
    if states.ndim != 4 or states.shape[1:] != (CHANNELS, SIZE, SIZE):
        raise ValueError('states have an unexpected shape')
    if policies.shape != (len(states), ACTION_COUNT):
        raise ValueError('policies have an unexpected shape')
    choices = rng.integers(0, SYMMETRY_COUNT, size=len(states))
    augmented_states = np.empty_like(states)
    augmented_policies = np.empty_like(policies)
    for symmetry in range(SYMMETRY_COUNT):
        indexes = np.flatnonzero(choices == symmetry)
        for index in indexes:
            augmented_states[index] = transform_encoded_state(states[index], symmetry)
            augmented_policies[index] = transform_policy(policies[index], symmetry)
    return augmented_states, augmented_policies
