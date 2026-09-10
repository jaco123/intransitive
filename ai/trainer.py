"""Continuous AlphaZero-style learner for Intransitive.

The process is intentionally self-contained: replay and checkpoints are under
the supplied data directory, while the deployed code lives in rps-prod/ai.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import random
import shutil
import signal
import tempfile
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
from torch import nn

from .checkpoint import CheckpointManager, atomic_torch_save, restore_rng, rng_state
from .encoding import CHANNELS, LEGACY_CHANNELS
from .mcts import NetworkEvaluator
from .model import PolicyValueNet
from .replay import ReplayBuffer
from .selfplay import arena, generate_self_play


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def atomic_json(payload: dict, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f'.{destination.name}.', suffix='.tmp', dir=destination.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as output:
            json.dump(payload, output, sort_keys=True, indent=2)
            output.write('\n')
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, destination)
        fd_dir = os.open(destination.parent, os.O_RDONLY)
        try:
            os.fsync(fd_dir)
        finally:
            os.close(fd_dir)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


class LowDiskPause(RuntimeError):
    """Expected operational pause while the configured disk floor is reached."""


def _validate_config(config: dict) -> dict:
    required = {
        'seed', 'network_width', 'network_blocks', 'mcts_simulations', 'self_play_games',
        'self_play_batch_games', 'temperature_plies', 'temperature', 'max_game_plies',
        'c_puct', 'dirichlet_alpha', 'root_noise_epsilon', 'search_algorithm',
        'gumbel_max_num_considered_actions', 'gumbel_scale', 'train_min_samples',
        'train_batch_size', 'train_epochs', 'learning_rate', 'weight_decay',
        'value_loss_weight', 'gradient_clip', 'arena_games', 'arena_simulations',
        'promotion_threshold', 'replay_max_episodes', 'replay_max_samples',
        'replay_max_bytes', 'checkpoint_keep', 'min_free_bytes', 'amp',
        'status_interval_seconds', 'log_max_bytes',
    }
    missing = sorted(required - config.keys())
    if missing:
        raise ValueError('training config is missing required fields: ' + ', '.join(missing))

    def integer(name: str, minimum: int = 1) -> None:
        value = config[name]
        if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
            raise ValueError(f'{name} must be an integer >= {minimum}')

    def number(name: str, minimum: float | None = None, maximum: float | None = None) -> None:
        value = config[name]
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not np.isfinite(value):
            raise ValueError(f'{name} must be finite')
        if minimum is not None and value < minimum or maximum is not None and value > maximum:
            raise ValueError(f'{name} is outside the allowed range')

    for name, minimum in {
        'seed': 0, 'network_width': 8, 'network_blocks': 1, 'mcts_simulations': 1,
        'self_play_games': 1, 'self_play_batch_games': 1, 'temperature_plies': 0,
        'max_game_plies': 1, 'gumbel_max_num_considered_actions': 1,
        'train_min_samples': 1, 'train_batch_size': 1, 'train_epochs': 1,
        'arena_games': 2, 'arena_simulations': 1, 'replay_max_episodes': 1,
        'replay_max_samples': 1, 'replay_max_bytes': 1, 'checkpoint_keep': 2,
        'min_free_bytes': 0,
    }.items():
        integer(name, minimum)
    for name, minimum, maximum in (
        ('temperature', 0.0, None), ('c_puct', 0.0, None), ('dirichlet_alpha', 0.0, None),
        ('root_noise_epsilon', 0.0, 1.0), ('gumbel_scale', 0.0, None),
        ('learning_rate', 0.0, None), ('weight_decay', 0.0, None),
        ('value_loss_weight', 0.0, None), ('gradient_clip', 0.0, None),
        ('promotion_threshold', 0.5, 1.0), ('status_interval_seconds', 0.1, None),
        ('log_max_bytes', 1024.0, None),
    ):
        number(name, minimum, maximum)
    if config['search_algorithm'] != 'gumbel':
        raise ValueError('search_algorithm must be gumbel for self-play training')
    if config['self_play_batch_games'] > config['self_play_games']:
        raise ValueError('self_play_batch_games cannot exceed self_play_games')
    if config['gumbel_max_num_considered_actions'] > 648:
        raise ValueError('gumbel_max_num_considered_actions exceeds action space')
    if not isinstance(config['amp'], bool):
        raise ValueError('amp must be boolean')
    return config


def load_config(path: Path) -> dict:
    with path.open(encoding='utf-8') as source:
        config = json.load(source)
    if not isinstance(config, dict):
        raise ValueError('training config must be a JSON object')
    return _validate_config(config)


def cpu_state_dict(state: dict) -> dict:
    return {key: value.detach().cpu().clone() if torch.is_tensor(value) else value for key, value in state.items()}


def cpu_optimizer_state(state: dict) -> dict:
    result = copy.deepcopy(state)
    for value in result.get('state', {}).values():
        for key, item in list(value.items()):
            if torch.is_tensor(item):
                value[key] = item.cpu()
    return result


def migrate_input_channels(model_state: dict, saved_config: dict, expected: dict) -> dict:
    """Zero-pad only the new rule-derived observation planes for old models."""
    if saved_config == expected:
        return model_state
    compatible = all(saved_config.get(key) == expected.get(key) for key in ('width', 'blocks', 'action_count'))
    stem_weight = model_state.get('stem.0.weight')
    if not (compatible and saved_config.get('in_channels') == LEGACY_CHANNELS and expected['in_channels'] == CHANNELS and stem_weight is not None):
        raise RuntimeError(f'checkpoint model config {saved_config} does not match {expected}')
    padding = torch.zeros((stem_weight.shape[0], CHANNELS - LEGACY_CHANNELS, *stem_weight.shape[2:]), dtype=stem_weight.dtype)
    migrated = dict(model_state)
    migrated['stem.0.weight'] = torch.cat((stem_weight, padding), dim=1)
    return migrated


class Trainer:
    def __init__(self, data_dir: Path, config_path: Path, device_name: str = 'auto'):
        self.data_dir = data_dir
        self.config_path = config_path
        self.config = load_config(config_path)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        os.chmod(self.data_dir, 0o700)
        self.replay = ReplayBuffer(self.data_dir / 'replay', self.config.get('replay_max_episodes', 128),
                                   self.config.get('replay_max_samples', 20000), self.config.get('replay_max_bytes', 2_000_000_000))
        self.checkpoints = CheckpointManager(self.data_dir / 'checkpoints', self.config.get('checkpoint_keep', 8))
        self.status_path = self.data_dir / 'status.json'
        self.log_path = self.data_dir / 'trainer.jsonl'
        self.stop_requested = False
        self.device = self._select_device(device_name)
        torch.set_num_threads(2)
        try:
            torch.set_num_interop_threads(1)
        except RuntimeError:
            # PyTorch allows inter-op configuration only before the first parallel op.
            # A resumed Trainer in the same test/process already has that setting.
            pass
        torch.set_float32_matmul_precision('high')
        if self.device.type == 'cuda':
            torch.backends.cudnn.benchmark = True
        self.model = PolicyValueNet(self.config['network_width'], self.config['network_blocks']).to(self.device)
        self.optimizer = torch.optim.AdamW(self.model.parameters(), lr=self.config.get('learning_rate', 0.001),
                                           weight_decay=self.config.get('weight_decay', 0.0001))
        self.amp = bool(self.config.get('amp', True) and self.device.type == 'cuda')
        self.scaler = torch.amp.GradScaler('cuda', enabled=self.amp)
        self.rng = np.random.default_rng(int(self.config.get('seed', 1)))
        self.iteration = self.optimizer_step = self.total_games = self.total_positions = 0
        self.promoted_step = 0
        self.last_losses: dict = {}
        self.started_at = utc_now()
        self.last_progress_at = time.time()
        self.last_checkpoint_at: float | None = None
        self.last_error: str | None = None
        self.recovery_info: dict | None = None
        self.outcomes = Counter({'blue': 0, 'red': 0, 'draw': 0})
        self.game_length_total = 0
        self.game_length_min: int | None = None
        self.game_length_max: int | None = None
        self.last_arena: dict = {}
        self._restore()
        if self.recovery_info:
            self._log('checkpoint_recovery', **self.recovery_info)
        self._write_status('running', 'trainer initialized')

    def _select_device(self, requested: str) -> torch.device:
        if requested == 'cpu' or (requested == 'auto' and not torch.cuda.is_available()):
            return torch.device('cpu')
        if requested not in ('auto', 'cuda'):
            return torch.device(requested)
        if not torch.cuda.is_available():
            raise RuntimeError('CUDA was explicitly requested but is unavailable')
        return torch.device('cuda:0')

    def _restore(self) -> None:
        payload = self.checkpoints.load_latest()
        self.recovery_info = self.checkpoints.last_recovery
        if payload is None:
            seed = int(self.config.get('seed', 1))
            random.seed(seed)
            np.random.seed(seed)
            torch.manual_seed(seed)
            if torch.cuda.is_available():
                torch.cuda.manual_seed_all(seed)
            return
        saved_config = payload.get('model_config', {})
        expected = self.model.config
        model_state = payload['model']
        optimizer_state = payload['optimizer']
        migrated_representation = False
        if saved_config and saved_config != expected:
            if saved_config.get('in_channels') == LEGACY_CHANNELS:
                model_state = migrate_input_channels(model_state, saved_config, expected)
                optimizer_state = copy.deepcopy(optimizer_state)
                for state in optimizer_state.get('state', {}).values():
                    for key, value in list(state.items()):
                        if torch.is_tensor(value) and value.ndim == 4 and value.shape[1] == LEGACY_CHANNELS:
                            state[key] = torch.cat((value, torch.zeros((value.shape[0], CHANNELS - LEGACY_CHANNELS, *value.shape[2:]), dtype=value.dtype)), dim=1)
                migrated_representation = True
            else:
                raise RuntimeError(f'checkpoint model config {saved_config} does not match {expected}')
        self.model.load_state_dict(model_state)
        self.optimizer.load_state_dict(optimizer_state)
        for state in self.optimizer.state.values():
            for key, value in list(state.items()):
                if torch.is_tensor(value):
                    state[key] = value.to(self.device)
        if payload.get('scaler'):
            self.scaler.load_state_dict(payload['scaler'])
        self.iteration = int(payload.get('iteration', 0))
        self.optimizer_step = int(payload.get('optimizer_step', 0))
        self.total_games = int(payload.get('total_games', 0))
        self.total_positions = int(payload.get('total_positions', 0))
        self.promoted_step = int(payload.get('promoted_step', 0))
        self.last_losses = payload.get('last_losses', {})
        self.outcomes.update(payload.get('outcomes', {}))
        self.game_length_total = int(payload.get('game_length_total', 0))
        self.game_length_min = payload.get('game_length_min')
        self.game_length_max = payload.get('game_length_max')
        self.last_arena = payload.get('last_arena', {})
        if migrated_representation:
            self.recovery_info = {**(self.recovery_info or {}), 'representation_migration': f'{LEGACY_CHANNELS}->{CHANNELS} channels'}
        restore_rng(payload.get('rng', {}))
        if payload.get('generator_state'):
            self.rng.bit_generator.state = payload['generator_state']

    def request_stop(self, *_args) -> None:
        self.stop_requested = True

    def _log(self, event: str, **fields) -> None:
        record = {'time': utc_now(), 'event': event, 'iteration': self.iteration, 'optimizer_step': self.optimizer_step, **fields}
        if self.log_path.exists() and self.log_path.stat().st_size > int(self.config.get('log_max_bytes', 20_000_000)):
            rotated = self.log_path.with_suffix('.jsonl.1')
            rotated.unlink(missing_ok=True)
            os.replace(self.log_path, rotated)
            fd_dir = os.open(self.log_path.parent, os.O_RDONLY)
            try:
                os.fsync(fd_dir)
            finally:
                os.close(fd_dir)
        with self.log_path.open('a', encoding='utf-8') as output:
            output.write(json.dumps(record, sort_keys=True) + '\n')
            output.flush()
            os.fsync(output.fileno())

    def _write_status(self, state: str, message: str = '', **fields) -> None:
        usage = shutil.disk_usage(self.data_dir)
        now = time.time()
        checkpoint_age = now - self.checkpoints.latest.stat().st_mtime if self.checkpoints.latest.exists() else None
        promoted_age = now - self.checkpoints.promoted.stat().st_mtime if self.checkpoints.promoted.exists() else None
        average_length = self.game_length_total / self.total_games if self.total_games else None
        payload = {
            'status': state, 'message': message, 'pid': os.getpid(), 'started_at': self.started_at,
            'updated_at': utc_now(), 'iteration': self.iteration, 'optimizer_step': self.optimizer_step,
            'total_games': self.total_games, 'total_positions': self.total_positions,
            'replay_episodes': len(self.replay.paths()), 'replay_samples': self.replay.sample_count(),
            'checkpoint': str(self.checkpoints.latest), 'promoted_checkpoint': str(self.checkpoints.promoted),
            'promoted_step': self.promoted_step, 'device': str(self.device),
            'cuda_available': torch.cuda.is_available(), 'gpu_name': torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
            'gpu_memory_allocated_bytes': torch.cuda.memory_allocated() if torch.cuda.is_available() else 0,
            'disk_free_bytes': usage.free, 'disk_total_bytes': usage.total, 'last_losses': self.last_losses,
            'outcomes': dict(self.outcomes),
            'game_length': {'average': average_length, 'min': self.game_length_min, 'max': self.game_length_max},
            'last_arena': self.last_arena, 'checkpoint_age_seconds': checkpoint_age,
            'promoted_age_seconds': promoted_age, 'stale_seconds': max(0.0, now - self.last_progress_at),
            'last_error': self.last_error, 'checkpoint_recovery': self.recovery_info,
            'config_sha256': hashlib.sha256(self.config_path.read_bytes()).hexdigest(), **fields,
        }
        atomic_json(payload, self.status_path)

    def _guard_disk(self) -> None:
        if shutil.disk_usage(self.data_dir).free < int(self.config.get('min_free_bytes', 5_000_000_000)):
            raise LowDiskPause('configured minimum free disk space reached')

    def _payload(self) -> dict:
        return {
            'format': 1, 'model_config': self.model.config, 'model': cpu_state_dict(self.model.state_dict()),
            'optimizer': cpu_optimizer_state(self.optimizer.state_dict()), 'scaler': self.scaler.state_dict(),
            'iteration': self.iteration, 'optimizer_step': self.optimizer_step, 'total_games': self.total_games,
            'total_positions': self.total_positions, 'promoted_step': self.promoted_step, 'last_losses': self.last_losses,
            'outcomes': dict(self.outcomes), 'game_length_total': self.game_length_total,
            'game_length_min': self.game_length_min, 'game_length_max': self.game_length_max,
            'last_arena': self.last_arena,
            'config': self.config, 'rng': rng_state(), 'generator_state': self.rng.bit_generator.state,
        }

    def _train(self, states: np.ndarray, policies: np.ndarray, values: np.ndarray) -> dict:
        self.model.train()
        size = len(states)
        batch_size = min(int(self.config['train_batch_size']), size)
        epochs = int(self.config.get('train_epochs', 1))
        total_policy = total_value = total_loss = 0.0
        updates = 0
        for _ in range(epochs):
            order = self.rng.permutation(size)
            for start in range(0, size, batch_size):
                indexes = order[start:start + batch_size]
                x = torch.from_numpy(states[indexes]).to(self.device, non_blocking=True)
                target_policy = torch.from_numpy(policies[indexes]).to(self.device, non_blocking=True)
                target_value = torch.from_numpy(values[indexes]).to(self.device, non_blocking=True)
                self.optimizer.zero_grad(set_to_none=True)
                with torch.autocast(device_type=self.device.type, dtype=torch.float16, enabled=self.amp):
                    logits, predicted_value = self.model(x)
                    policy_loss = -(target_policy * torch.log_softmax(logits, dim=1)).sum(dim=1).mean()
                    value_loss = nn.functional.mse_loss(predicted_value, target_value)
                    loss = policy_loss + float(self.config.get('value_loss_weight', 1.0)) * value_loss
                if not torch.isfinite(loss):
                    raise FloatingPointError('non-finite training loss')
                self.scaler.scale(loss).backward()
                self.scaler.unscale_(self.optimizer)
                nn.utils.clip_grad_norm_(self.model.parameters(), float(self.config.get('gradient_clip', 1.0)))
                self.scaler.step(self.optimizer)
                self.scaler.update()
                total_policy += float(policy_loss.detach().cpu())
                total_value += float(value_loss.detach().cpu())
                total_loss += float(loss.detach().cpu())
                updates += 1
                self.optimizer_step += 1
        if not updates:
            return {}
        return {'policy_loss': total_policy / updates, 'value_loss': total_value / updates,
                'loss': total_loss / updates, 'updates': updates}

    def _promote_or_retain(self) -> dict:
        candidate = NetworkEvaluator(self.model.eval(), self.device, self.amp)
        incumbent_payload = self.checkpoints.load_promoted()
        if incumbent_payload is None:
            self.promoted_step = self.optimizer_step
            return {'promoted': True, 'reason': 'initial_model', 'score': None}
        old_model = PolicyValueNet(**{key: incumbent_payload['model_config'][key] for key in ('width', 'blocks')}).to(self.device)
        old_model.load_state_dict(migrate_input_channels(incumbent_payload['model'], incumbent_payload.get('model_config', {}), old_model.config))
        old_model.eval()
        result = arena(candidate, NetworkEvaluator(old_model, self.device, self.amp), int(self.config.get('arena_games', 4)),
                       int(self.config.get('arena_simulations', 24)), self.rng, int(self.config.get('max_game_plies', 2000)),
                       self.config['search_algorithm'], self.config['gumbel_max_num_considered_actions'], lambda: self.stop_requested)
        promoted = not result.get('interrupted') and result['games'] == int(self.config['arena_games']) and result['score'] >= float(self.config.get('promotion_threshold', 0.55))
        if promoted:
            self.promoted_step = self.optimizer_step
        result.update({'promoted': promoted, 'incumbent_step': int(incumbent_payload.get('optimizer_step', 0))})
        del old_model
        if self.device.type == 'cuda':
            torch.cuda.empty_cache()
        return result

    def run_iteration(self) -> None:
        self._guard_disk()
        self.model.eval()
        evaluator = NetworkEvaluator(self.model, self.device, self.amp)
        started = time.monotonic()
        last_progress_status = [0.0]

        def report_self_play(progress):
            now = time.monotonic()
            interval = float(self.config.get('status_interval_seconds', 10))
            if now - last_progress_status[0] >= interval:
                last_progress_status[0] = now
                self.last_progress_at = time.time()
                self._write_status('running', 'self-play in progress', self_play=progress)

        episodes = generate_self_play(
            evaluator, int(self.config['self_play_games']), int(self.config['mcts_simulations']),
            int(self.config.get('self_play_batch_games', 4)), int(self.config.get('temperature_plies', 12)),
            float(self.config.get('temperature', 1.0)), self.rng, True, int(self.config.get('max_game_plies', 2000)),
            lambda: self.stop_requested, report_self_play, self.config['search_algorithm'],
            self.config['gumbel_max_num_considered_actions'], self.config['gumbel_scale'],
        )
        next_episode = max([int(path.stem.split('-')[1]) for path in self.replay.paths()] or [0]) + 1
        for episode in episodes:
            self.replay.append(episode.states, episode.policies, episode.values, next_episode)
            next_episode += 1
        self.total_games += len(episodes)
        self.total_positions += sum(episode.plies for episode in episodes)
        batch_outcomes = Counter()
        batch_lengths = []
        for episode in episodes:
            batch_outcomes[episode.result] += 1
            batch_lengths.append(episode.plies)
            self.outcomes[episode.result] += 1
            self.game_length_total += episode.plies
            self.game_length_min = episode.plies if self.game_length_min is None else min(self.game_length_min, episode.plies)
            self.game_length_max = episode.plies if self.game_length_max is None else max(self.game_length_max, episode.plies)
        states, policies, values = self.replay.load()
        self.last_losses = self._train(states, policies, values) if len(states) >= int(self.config.get('train_min_samples', 64)) else {}
        stopped = self.stop_requested
        if not stopped:
            self.iteration += 1
        promotion = self._promote_or_retain() if self.last_losses and not stopped else {'promoted': False, 'reason': 'stop_requested' if stopped else 'replay_warming'}
        self.last_arena = promotion if 'games' in promotion else self.last_arena
        payload = self._payload()
        checkpoint = self.checkpoints.save(payload, self.optimizer_step or self.iteration, promote=bool(promotion.get('promoted')))
        self.last_checkpoint_at = time.time()
        elapsed = max(time.monotonic() - started, 1e-6)
        metrics = {'games': len(episodes), 'positions': sum(episode.plies for episode in episodes),
                   'games_per_second': len(episodes) / elapsed, 'positions_per_second': sum(episode.plies for episode in episodes) / elapsed,
                   'replay_samples': len(states), 'checkpoint': str(checkpoint), 'promotion': promotion,
                   'outcomes': dict(batch_outcomes), 'game_length': {
                       'average': sum(batch_lengths) / len(batch_lengths) if batch_lengths else None,
                       'min': min(batch_lengths) if batch_lengths else None, 'max': max(batch_lengths) if batch_lengths else None,
                   }, 'cumulative_outcomes': dict(self.outcomes)}
        self.last_progress_at = time.time()
        self._log('stop_checkpoint' if stopped else 'iteration', elapsed_seconds=elapsed, **metrics)
        self._write_status('stopped' if stopped else 'running', 'checkpoint saved after stop request' if stopped else 'iteration complete', throughput=metrics)

    def run(self, once: bool = False, max_iterations: int | None = None) -> None:
        if once:
            self.run_iteration()
            return
        while not self.stop_requested and (max_iterations is None or self.iteration < max_iterations):
            try:
                self.run_iteration()
            except LowDiskPause as error:
                self.last_error = str(error)
                self.last_progress_at = time.time()
                self._log('low_disk_pause', error=str(error))
                self._write_status('paused_low_disk', str(error))
                time.sleep(60)
            except Exception as error:
                self.last_error = repr(error)
                self._log('fatal_error', error=repr(error))
                self._write_status('fatal_error', str(error))
                raise
        self._write_status('stopped', 'stop requested')


def main() -> None:
    parser = argparse.ArgumentParser(description='Continuous Intransitive AlphaZero self-play trainer')
    parser.add_argument('--data-dir', type=Path, required=True)
    parser.add_argument('--config', type=Path, required=True)
    parser.add_argument('--device', default='auto', choices=('auto', 'cpu', 'cuda'))
    parser.add_argument('--once', action='store_true', help='run exactly one iteration and exit')
    parser.add_argument('--max-iterations', type=int)
    args = parser.parse_args()
    trainer = Trainer(args.data_dir, args.config, args.device)
    signal.signal(signal.SIGTERM, trainer.request_stop)
    signal.signal(signal.SIGINT, trainer.request_stop)
    trainer.run(args.once, args.max_iterations)


if __name__ == '__main__':
    main()
