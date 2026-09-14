"""Deliberately simple bootstrap teacher for early NNUE training."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass

import numpy as np

from .rules import BLUE, SIZE, GameState, decode_action, legal_actions, piece_kind

_TARGET_PRIORITY = {3: 3, 1: 2, 2: 1}  # scissors, rock, paper
_DIRECTIONS = ((1, 0), (-1, 0), (0, 1), (0, -1),
               (1, 1), (1, -1), (-1, 1), (-1, -1))


@dataclass(frozen=True)
class TeacherChoice:
    action: int
    reason: str


def _goal_square(color: int) -> tuple[int, int]:
    return (SIZE - 1, SIZE - 1) if color == BLUE else (0, 0)


def _path_distance(board: np.ndarray, color: int, row: int, column: int) -> int | None:
    """Shortest number of empty-square steps to this side's goal."""
    goal = _goal_square(color)
    if (row, column) == goal:
        return 0
    walkable = board == 0
    walkable[row, column] = True
    queue = deque([(row, column, 0)])
    seen = {(row, column)}
    while queue:
        current_row, current_column, distance = queue.popleft()
        for delta_column, delta_row in _DIRECTIONS:
            next_column = current_column + delta_column
            next_row = current_row + delta_row
            if not (0 <= next_row < SIZE and 0 <= next_column < SIZE):
                continue
            square = (next_row, next_column)
            if square in seen or not walkable[next_row, next_column]:
                continue
            if square == goal:
                return distance + 1
            seen.add(square)
            queue.append((next_row, next_column, distance + 1))
    return None


def _target_kind(state: GameState, action: int) -> int:
    _, _, to_column, to_row = decode_action(action)
    return piece_kind(int(state.board[to_row, to_column]))


def _choose_capture(state: GameState, captures: list[int]) -> int:
    return max(captures, key=lambda action: (_TARGET_PRIORITY[_target_kind(state, action)], -action))


def _choose_goal_move(state: GameState, legal: list[int]) -> int:
    pieces: list[tuple[int, int, int]] = []
    for row in range(SIZE):
        for column in range(SIZE):
            if int(state.board[row, column]) * state.turn > 0:
                distance = _path_distance(state.board.copy(), state.turn, row, column)
                if distance is not None:
                    pieces.append((distance, row, column))

    # If the closest piece cannot make progress, try the next closest piece.
    for before, row, column in sorted(pieces):
        candidates: list[tuple[int, int]] = []
        for action in legal:
            from_column, from_row, to_column, to_row = decode_action(action)
            if (from_column, from_row) != (column, row):
                continue
            board = state.board.copy()
            board[to_row, to_column] = board[from_row, from_column]
            board[from_row, from_column] = 0
            after = _path_distance(board, state.turn, to_row, to_column)
            if after is not None and after < before:
                candidates.append((after, action))
        if candidates:
            return min(candidates)[1]
    return min(legal)


def choose_action(state: GameState) -> TeacherChoice:
    """Capture if possible; otherwise advance the closest goal-bound piece."""
    if state.is_terminal():
        raise ValueError('cannot choose a move from a terminal state')
    legal = state.legal_actions()
    if not legal:
        raise ValueError('cannot choose a move without legal actions')

    captures = []
    for action in legal:
        _, _, to_column, to_row = decode_action(action)
        if int(state.board[to_row, to_column]) * state.turn < 0:
            captures.append(action)
    if captures:
        return TeacherChoice(_choose_capture(state, captures), 'capture')
    return TeacherChoice(_choose_goal_move(state, legal), 'goal-progress')


def _captures(state: GameState, actions: list[int]) -> list[int]:
    return [action for action in actions
            if int(state.board[decode_action(action)[3], decode_action(action)[2]]) * state.turn < 0]


def _safe_after(state: GameState, action: int) -> bool:
    child = state.copy()
    child.play(action)
    if child.is_terminal():
        return child.winner == state.turn
    from_column, from_row, to_column, to_row = decode_action(action)
    return not any(
        decode_action(reply)[2:] == (to_column, to_row)
        for reply in child.legal_actions()
    )


def choose_action_advanced(state: GameState) -> TeacherChoice:
    """Tactical teacher: win, capture, defend, create safe attacks, then advance.

    This deliberately remains shallow and deterministic.  It supplies useful
    tactical structure early in learning without becoming a search engine.
    """
    if state.is_terminal():
        raise ValueError('cannot choose a move from a terminal state')
    legal = state.legal_actions()
    if not legal:
        raise ValueError('cannot choose a move without legal actions')

    winning = [action for action in legal if (lambda child: child.is_terminal() and child.winner == state.turn)(
        _play_copy(state, action))]
    if winning:
        return TeacherChoice(_choose_capture(state, winning) if _captures(state, winning) else min(winning), 'win-now')

    captures = _captures(state, legal)
    if captures:
        safe = [action for action in captures if _safe_after(state, action)]
        choices = safe or captures
        return TeacherChoice(_choose_capture(state, choices), 'safe-capture' if safe else 'capture')

    # Save a piece that can currently be captured, preferring the most valuable.
    threatened = []
    enemy_actions = legal_actions(state.board, -state.turn)
    for reply in enemy_actions:
        _, _, target_column, target_row = decode_action(reply)
        if int(state.board[target_row, target_column]) * state.turn > 0:
            threatened.append((_TARGET_PRIORITY.get(piece_kind(int(state.board[target_row, target_column])), 0), reply))
    if threatened:
        endangered = {decode_action(reply)[2:4] for _, reply in threatened}
        escapes = [action for action in legal
                   if decode_action(action)[0:2] in endangered and _safe_after(state, action)]
        if escapes:
            return TeacherChoice(min(escapes), 'save-piece')

    # Prefer a move that creates a capture next turn, especially an undefended one.
    attacks = []
    for action in legal:
        child = _play_copy(state, action)
        if child.is_terminal():
            continue
        attack_actions = _captures_for_color(child.board, state.turn)
        if not attack_actions:
            continue
        undefended = []
        for attack in attack_actions:
            _, _, target_column, target_row = decode_action(attack)
            after_attack = _play_copy(child, attack)
            defended = any(decode_action(reply)[2:] == (target_column, target_row)
                           for reply in after_attack.legal_actions())
            undefended.append((not defended, _TARGET_PRIORITY.get(
                piece_kind(int(child.board[target_row, target_column])), 0), attack))
        best = max(undefended, key=lambda item: (item[0], item[1]))
        attacks.append((best[0], best[1], action))
    if attacks:
        return TeacherChoice(max(attacks, key=lambda item: (item[0], item[1], -item[2]))[2], 'safe-attack')

    return TeacherChoice(_choose_goal_move(state, legal), 'goal-progress')


def _play_copy(state: GameState, action: int) -> GameState:
    child = state.copy()
    child.play(action)
    return child


def _captures_for_color(board: np.ndarray, color: int) -> list[int]:
    return [action for action in legal_actions(board, color)
            if int(board[decode_action(action)[3], decode_action(action)[2]]) * color < 0]


def choose_action_variant(state: GameState, variant: str = 'simple') -> TeacherChoice:
    if variant == 'advanced':
        return choose_action_advanced(state)
    if variant != 'simple':
        raise ValueError(f'unknown teacher variant: {variant}')
    return choose_action(state)


def hardcoded_move_score(state: GameState, action: int) -> float:
    """Small bootstrap score for a move; game results remain the main target."""
    child = _play_copy(state, action)
    score = 0.0
    if child.is_terminal():
        score += 8.0 if child.winner == state.turn else -8.0
    _, _, to_column, to_row = decode_action(action)
    captured_kind = piece_kind(int(state.board[to_row, to_column]))
    if captured_kind and int(state.board[to_row, to_column]) * state.turn < 0:
        # A capture is more valuable when it removes a piece that is already
        # close to its own goal.  This gives the bootstrap evaluator a useful
        # notion of urgency without replacing the eventual game-result target.
        captured_distance = _path_distance(state.board.copy(), -state.turn, to_row, to_column)
        urgency = max(0.0, float((SIZE * 2) - captured_distance)) if captured_distance is not None else 0.0
        score += 3.0 + 0.45 * urgency

    # Reward real shortest-path progress and mildly discourage opponent progress.
    own_before = own_after = enemy_before = enemy_after = 0
    for row in range(SIZE):
        for column in range(SIZE):
            piece = int(state.board[row, column])
            updated = int(child.board[row, column])
            if piece * state.turn > 0:
                own_before += _path_distance(state.board.copy(), state.turn, row, column) or 0
            if updated * state.turn > 0:
                own_after += _path_distance(child.board.copy(), state.turn, row, column) or 0
            if piece * -state.turn > 0:
                enemy_before += _path_distance(state.board.copy(), -state.turn, row, column) or 0
            if updated * -state.turn > 0:
                enemy_after += _path_distance(child.board.copy(), -state.turn, row, column) or 0
    score += 0.5 * (own_before - own_after) + 0.25 * (enemy_after - enemy_before)

    # Penalize exposing the only remaining piece of a type when it is actually
    # capturable, and discourage removing the opponent's last example of a type.
    moved_kind = piece_kind(int(child.board[to_row, to_column]))
    own_count = int(np.sum(child.board * state.turn == moved_kind))
    enemy_can_capture = any(
        decode_action(reply)[2:] == (to_column, to_row)
        for reply in legal_actions(child.board, -state.turn)
    )
    if own_count == 1 and enemy_can_capture:
        score -= 3.5
    if captured_kind and int(np.sum(child.board == -state.turn * captured_kind)) == 0:
        score -= 3.5

    # A move that leaves an immediate opponent win is strongly bad.
    if not child.is_terminal():
        if any((_play_copy(child, reply).is_terminal() and
                _play_copy(child, reply).winner == -state.turn)
               for reply in child.legal_actions()):
            score -= 8.0
    return float(np.clip(score, -8.0, 8.0))
