"""Batched neural-guided self-play and model-vs-model arena games."""

from __future__ import annotations

from dataclasses import dataclass
from multiprocessing import get_context
from queue import Empty
import traceback
import numpy as np
import torch

from .encoding import encode_state
from .mcts import NetworkEvaluator, choose_from_policy, search_batch
from .model import PolicyValueNet
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


def _generate_self_play_single(
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


def _persistent_worker_entry(index, command_queue, result_queue, stop_event) -> None:
    """Keep one actor and CUDA context alive while the trainer is running."""
    try:
        torch.set_num_threads(1)
        try:
            torch.set_num_interop_threads(1)
        except RuntimeError:
            pass
        model = None
        model_config = None
        device = None
        while True:
            command = command_queue.get()
            if command is None:
                return
            try:
                (games, seed, next_model_config, model_state, device_name, simulations, batch_games,
                 temperature_plies, temperature, root_noise, max_game_plies, search_algorithm,
                 max_num_considered_actions, gumbel_scale, gumbel_value_scale, gumbel_maxvisit_init) = command
                if model is None or model_config != next_model_config:
                    model = PolicyValueNet(**{key: next_model_config[key] for key in ('width', 'blocks')})
                    model_config = dict(next_model_config)
                    device = torch.device(device_name)
                    model.to(device)
                model.load_state_dict(model_state)
                model.eval()
                evaluator = NetworkEvaluator(model, device, amp=device.type == 'cuda')

                def report(progress):
                    result_queue.put(('progress', index, progress))

                episodes = _generate_self_play_single(
                    evaluator, games, simulations, batch_games, temperature_plies, temperature,
                    np.random.default_rng(seed), root_noise, max_game_plies, stop_event.is_set,
                    report, search_algorithm, max_num_considered_actions, gumbel_scale,
                    gumbel_value_scale, gumbel_maxvisit_init,
                )
                result_queue.put(('done', index, episodes))
            except BaseException as error:
                result_queue.put(('error', index, repr(error), traceback.format_exc()))
    except BaseException as error:
        result_queue.put(('fatal', index, repr(error), traceback.format_exc()))


class SelfPlayPool:
    """Bounded persistent actor pool with exact per-iteration model refresh."""

    def __init__(self, workers: int, device_name: str):
        workers = int(workers)
        if workers < 1:
            raise ValueError('self-play workers must be positive')
        self.workers = workers
        self._context = get_context('spawn')
        # A queue per actor keeps the parent-derived seed stream attached to
        # the actor slot while retaining bounded backpressure. A shared queue
        # would let a faster child consume another actor's seeded job.
        self._commands = [self._context.Queue(maxsize=1) for _ in range(workers)]
        self._results = self._context.Queue(maxsize=max(8, workers * 8))
        self._stop_event = self._context.Event()
        self._processes = []
        self._closed = False
        for index in range(workers):
            process = self._context.Process(
                target=_persistent_worker_entry,
                args=(index, self._commands[index], self._results, self._stop_event),
                name=f'intransitive-selfplay-{index}',
            )
            process.start()
            self._processes.append(process)

    def run(
        self, evaluator: NetworkEvaluator, games: int, simulations: int, batch_games: int,
        temperature_plies: int, temperature: float, rng: np.random.Generator,
        root_noise: bool, max_game_plies: int, should_stop, progress, search_algorithm: str,
        max_num_considered_actions: int, gumbel_scale: float, gumbel_value_scale: float,
        gumbel_maxvisit_init: float,
    ) -> list[Episode]:
        if self._closed:
            raise RuntimeError('self-play pool is closed')
        games = int(games)
        if should_stop is not None and should_stop():
            return []
        worker_count = min(self.workers, games)
        counts = [games // worker_count + (index < games % worker_count) for index in range(worker_count)]
        seeds = [int(value) for value in rng.integers(0, np.iinfo(np.int64).max, size=worker_count, dtype=np.int64)]
        model_state = {key: value.detach().cpu() if torch.is_tensor(value) else value
                       for key, value in evaluator.model.state_dict().items()}
        worker_progress = {
            index: {'active_games': counts[index], 'completed_games': 0, 'ply': 0}
            for index in range(worker_count)
        }
        completed: dict[int, list[Episode]] = {}
        failed = False

        def aggregate() -> dict:
            return {
                'active_games': sum(int(item.get('active_games', 0)) for item in worker_progress.values()),
                'completed_games': sum(int(item.get('completed_games', 0)) for item in worker_progress.values()),
                'ply': max((int(item.get('ply', 0)) for item in worker_progress.values()), default=0),
                'worker_count': worker_count,
            }

        command_args = (evaluator.model.config, model_state, str(evaluator.device), simulations,
                        batch_games, temperature_plies, temperature, root_noise, max_game_plies,
                        search_algorithm, max_num_considered_actions, gumbel_scale,
                        gumbel_value_scale, gumbel_maxvisit_init)
        try:
            self._stop_event.clear()
            for index, count in enumerate(counts):
                self._commands[index].put((count, seeds[index], *command_args))
            while len(completed) < worker_count:
                if should_stop is not None and should_stop():
                    self._stop_event.set()
                try:
                    message = self._results.get(timeout=0.25)
                except Empty:
                    dead = [process for process in self._processes[:worker_count] if not process.is_alive()]
                    if dead:
                        raise RuntimeError(f'self-play worker exited without a result: {dead[0].name} ({dead[0].exitcode})')
                    continue
                kind, index, payload, *details = message
                if kind == 'progress':
                    worker_progress[index] = payload
                    if progress is not None:
                        progress({**aggregate(), 'workers': dict(worker_progress)})
                elif kind == 'done':
                    completed[index] = payload
                    worker_progress[index] = {
                        'active_games': 0, 'completed_games': len(payload),
                        'ply': max((episode.plies for episode in payload), default=0),
                    }
                    if progress is not None:
                        progress({**aggregate(), 'workers': dict(worker_progress)})
                elif kind in ('error', 'fatal'):
                    raise RuntimeError(f'self-play worker {index} failed: {payload}\n{details[0]}')
                else:
                    raise RuntimeError(f'unknown self-play worker message: {kind}')
        except BaseException:
            failed = True
            self.close()
            raise
        finally:
            if not failed:
                self._stop_event.clear()
        return [episode for index in range(worker_count) for episode in completed[index]]

    def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        self._stop_event.set()
        for command_queue in self._commands:
            command_queue.put(None)
        for process in self._processes:
            process.join(timeout=5)
        for process in self._processes:
            if process.is_alive():
                process.terminate()
                process.join(timeout=5)
        for command_queue in self._commands:
            command_queue.close()
        self._results.close()
        for command_queue in self._commands:
            command_queue.join_thread()
        self._results.join_thread()

    def __enter__(self):
        return self

    def __exit__(self, _exception_type, _exception, _traceback) -> None:
        self.close()


def _generate_self_play_processes(
    evaluator: NetworkEvaluator, games: int, simulations: int, batch_games: int,
    temperature_plies: int, temperature: float, rng: np.random.Generator,
    root_noise: bool, max_game_plies: int, should_stop, progress, search_algorithm: str,
    max_num_considered_actions: int, gumbel_scale: float, gumbel_value_scale: float,
    gumbel_maxvisit_init: float, workers: int,
) -> list[Episode]:
    """Run a bounded pool for callers that do not retain one between iterations."""
    with SelfPlayPool(workers, str(evaluator.device)) as pool:
        return pool.run(evaluator, games, simulations, batch_games, temperature_plies, temperature, rng,
                        root_noise, max_game_plies, should_stop, progress, search_algorithm,
                        max_num_considered_actions, gumbel_scale, gumbel_value_scale, gumbel_maxvisit_init)


def generate_self_play(
    evaluator: NetworkEvaluator, games: int, simulations: int, batch_games: int,
    temperature_plies: int, temperature: float, rng: np.random.Generator,
    root_noise: bool = True, max_game_plies: int = 2000, should_stop=None, progress=None,
    search_algorithm: str = 'gumbel', max_num_considered_actions: int = 4, gumbel_scale: float = 1.0,
    gumbel_value_scale: float = 0.1, gumbel_maxvisit_init: float = 50.0,
    workers: int = 1, actor_pool: SelfPlayPool | None = None,
) -> list[Episode]:
    """Generate lockstep GPU batches, optionally using isolated CPU actors."""
    games = int(games)
    workers = int(workers)
    if games < 1 or workers < 1:
        raise ValueError('self-play games and workers must be positive')
    if workers == 1:
        return _generate_self_play_single(
            evaluator, games, simulations, batch_games, temperature_plies, temperature, rng,
            root_noise, max_game_plies, should_stop, progress, search_algorithm,
            max_num_considered_actions, gumbel_scale, gumbel_value_scale, gumbel_maxvisit_init,
        )
    if workers > games:
        raise ValueError('self-play workers cannot exceed games')
    if actor_pool is not None:
        if actor_pool.workers != workers:
            raise ValueError('persistent self-play pool worker count does not match configuration')
        return actor_pool.run(
            evaluator, games, simulations, batch_games, temperature_plies, temperature, rng,
            root_noise, max_game_plies, should_stop, progress, search_algorithm,
            max_num_considered_actions, gumbel_scale, gumbel_value_scale, gumbel_maxvisit_init,
        )
    return _generate_self_play_processes(
        evaluator, games, simulations, batch_games, temperature_plies, temperature, rng,
        root_noise, max_game_plies, should_stop, progress, search_algorithm,
        max_num_considered_actions, gumbel_scale, gumbel_value_scale, gumbel_maxvisit_init, workers,
    )


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
