"""Batched neural-guided self-play and model-vs-model arena games."""

from __future__ import annotations

from dataclasses import dataclass
import numpy as np

from .encoding import encode_state
from .mcts import NetworkEvaluator, choose_from_policy, search_batch
from .rules import BLUE, GameState


@dataclass
class Episode:
    states: np.ndarray
    policies: np.ndarray
    values: np.ndarray
    result: str
    plies: int


def _value_for_player(state: GameState, player: int) -> float:
    if state.status == 'draw' or state.winner is None:
        return 0.0
    return 1.0 if state.winner == player else -1.0


def generate_self_play(
    evaluator: NetworkEvaluator, games: int, simulations: int, batch_games: int,
    temperature_plies: int, temperature: float, rng: np.random.Generator,
    root_noise: bool = True, max_game_plies: int = 2000, should_stop=None, progress=None,
    search_algorithm: str = 'gumbel', max_num_considered_actions: int = 4, gumbel_scale: float = 1.0,
    gumbel_value_scale: float = 0.1, gumbel_maxvisit_init: float = 50.0,
) -> list[Episode]:
    """Advance several games in lockstep so leaf evaluations are GPU-batched."""
    episodes: list[Episode] = []
    remaining = int(games)
    while remaining:
        count = min(remaining, max(1, int(batch_games)))
        active = [GameState() for _ in range(count)]
        records: list[list[tuple[np.ndarray, np.ndarray, int]]] = [[] for _ in active]
        ply = 0
        while active:
            if should_stop is not None and should_stop():
                return episodes
            results = search_batch(active, evaluator, simulations, add_noise=root_noise, rng=rng,
                                   algorithm=search_algorithm, max_num_considered_actions=max_num_considered_actions,
                                   gumbel_scale=gumbel_scale, gumbel_value_scale=gumbel_value_scale,
                                   gumbel_maxvisit_init=gumbel_maxvisit_init)
            next_active: list[GameState] = []
            next_records: list[list[tuple[np.ndarray, np.ndarray, int]]] = []
            for state, result, record in zip(active, results, records):
                player = state.turn
                record.append((encode_state(state), result.policy, player))
                if search_algorithm == 'gumbel':
                    action = result.action
                    if action is None:
                        raise RuntimeError('non-terminal Gumbel search returned no action')
                else:
                    action = choose_from_policy(result.policy, temperature if ply < temperature_plies else 0.0, rng)
                state.play(action)
                if state.is_terminal():
                    values = np.asarray([_value_for_player(state, side) for _, _, side in record], dtype=np.float32)
                    episodes.append(Episode(
                        np.stack([item[0] for item in record]).astype(np.float32),
                        np.stack([item[1] for item in record]).astype(np.float32),
                        values, 'draw' if state.status == 'draw' else ('blue' if state.winner == BLUE else 'red'),
                        len(record),
                    ))
                else:
                    next_active.append(state)
                    next_records.append(record)
            active, records = next_active, next_records
            ply += 1
            if progress is not None:
                progress({'active_games': len(active), 'completed_games': len(episodes), 'ply': ply})
            if ply > max_game_plies:
                raise RuntimeError('self-play exceeded configured safety horizon without an engine terminal result')
        remaining -= count
    return episodes


def play_arena_game(
    blue_evaluator: NetworkEvaluator, red_evaluator: NetworkEvaluator,
    simulations: int, rng: np.random.Generator, max_game_plies: int = 2000,
    search_algorithm: str = 'gumbel', max_num_considered_actions: int = 4,
    gumbel_value_scale: float = 0.1, gumbel_maxvisit_init: float = 50.0,
    gumbel_scale: float = 0.0,
) -> str:
    state = GameState()
    while not state.is_terminal():
        evaluator = blue_evaluator if state.turn == BLUE else red_evaluator
        result = search_batch([state], evaluator, simulations, add_noise=False, rng=rng,
                              algorithm=search_algorithm, max_num_considered_actions=max_num_considered_actions,
                              gumbel_scale=gumbel_scale, gumbel_value_scale=gumbel_value_scale,
                              gumbel_maxvisit_init=gumbel_maxvisit_init)[0]
        action = result.action if search_algorithm == 'gumbel' else choose_from_policy(result.policy, 0.0, rng)
        if action is None:
            raise RuntimeError('non-terminal arena search returned no action')
        state.play(action)
        if state.ply_count > max_game_plies:
            raise RuntimeError('arena exceeded configured safety horizon without an engine terminal result')
    return 'draw' if state.status == 'draw' else ('blue' if state.winner == BLUE else 'red')


def arena(
    candidate: NetworkEvaluator, incumbent: NetworkEvaluator, games: int,
    simulations: int, rng: np.random.Generator, max_game_plies: int = 2000,
    search_algorithm: str = 'gumbel', max_num_considered_actions: int = 4, should_stop=None,
    gumbel_value_scale: float = 0.1, gumbel_maxvisit_init: float = 50.0,
    arena_gumbel_scale: float = 1.0,
) -> dict:
    if int(games) < 2 or int(games) % 2:
        raise ValueError('arena games must be a positive even number for paired evaluation')
    wins = draws = losses = 0
    completed = 0
    for _ in range(int(games) // 2):
        if should_stop is not None and should_stop():
            break
        # One deterministic seed defines a paired trial. Reusing it with the
        # colors/models swapped makes the comparison fair while distinct
        # pair seeds provide genuine algorithmic exploration rather than
        # duplicate deterministic games.
        pair_seed = int(rng.integers(0, np.iinfo(np.int64).max, dtype=np.int64))
        for candidate_blue in (True, False):
            pair_rng = np.random.default_rng(pair_seed)
            result = play_arena_game(candidate if candidate_blue else incumbent,
                                     incumbent if candidate_blue else candidate, simulations, pair_rng, max_game_plies,
                                     search_algorithm, max_num_considered_actions,
                                     gumbel_value_scale, gumbel_maxvisit_init, arena_gumbel_scale)
            completed += 1
            if result == 'draw':
                draws += 1
            elif (result == 'blue') == candidate_blue:
                wins += 1
            else:
                losses += 1
    score = (wins + 0.5 * draws) / max(1, completed)
    return {'games': completed, 'pairs': completed // 2, 'wins': wins, 'draws': draws, 'losses': losses, 'score': score,
            'interrupted': bool(should_stop is not None and should_stop())}
