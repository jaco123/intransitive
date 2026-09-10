"""Atomic, bounded self-play episode storage."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

import numpy as np

from .encoding import CHANNELS


class ReplayBuffer:
    def __init__(self, root: str | Path, max_episodes: int = 256, max_samples: int = 50000, max_bytes: int = 2_000_000_000):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.max_episodes = int(max_episodes)
        self.max_samples = int(max_samples)
        self.max_bytes = int(max_bytes)

    def paths(self) -> list[Path]:
        return sorted(self.root.glob('episode-*.npz'))

    def sample_count(self) -> int:
        total = 0
        for path in self.paths():
            try:
                with np.load(path, allow_pickle=False) as data:
                    total += int(data['values'].shape[0])
            except (OSError, ValueError, KeyError):
                continue
        return total

    def append(self, states: np.ndarray, policies: np.ndarray, values: np.ndarray, episode_id: int) -> Path:
        states = np.asarray(states, dtype=np.float16)
        policies = np.asarray(policies, dtype=np.float32)
        values = np.asarray(values, dtype=np.float32).reshape(-1)
        if states.ndim != 4 or policies.ndim != 2 or states.shape[0] != policies.shape[0] or values.shape[0] != states.shape[0]:
            raise ValueError('episode arrays have incompatible shapes')
        if not np.isfinite(states).all() or not np.isfinite(policies).all() or not np.isfinite(values).all():
            raise ValueError('episode contains non-finite data')
        if np.any(policies < 0) or not np.allclose(policies.sum(axis=1), 1.0, atol=1e-4):
            raise ValueError('episode policies must be normalized and non-negative')
        target = self.root / f'episode-{int(episode_id):012d}.npz'
        fd, temporary = tempfile.mkstemp(prefix='.episode-', suffix='.npz', dir=self.root)
        try:
            with os.fdopen(fd, 'wb') as output:
                np.savez_compressed(output, states=states, policies=policies, values=values)
                output.flush()
                os.fsync(output.fileno())
            os.replace(temporary, target)
            self._fsync_directory()
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
        self.prune()
        return target

    def load(self) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        states, policies, values = [], [], []
        for path in self.paths():
            try:
                with np.load(path, allow_pickle=False) as data:
                    states.append(np.asarray(data['states'], dtype=np.float32))
                    policies.append(np.asarray(data['policies'], dtype=np.float32))
                    values.append(np.asarray(data['values'], dtype=np.float32))
            except (OSError, ValueError, KeyError):
                continue
        if not states:
            return np.empty((0, CHANNELS, 9, 9), np.float32), np.empty((0, 648), np.float32), np.empty((0,), np.float32)
        return np.concatenate(states), np.concatenate(policies), np.concatenate(values)

    def prune(self) -> int:
        paths = self.paths()
        removed = 0
        keep: list[Path] = []
        bytes_used = 0
        for path in reversed(paths):
            size = path.stat().st_size if path.exists() else 0
            try:
                with np.load(path, allow_pickle=False) as data:
                    count = int(data['values'].shape[0])
            except (OSError, ValueError, KeyError):
                count = 0
            if len(keep) < self.max_episodes and sum(self._count(p) for p in keep) + count <= self.max_samples and bytes_used + size <= self.max_bytes:
                keep.append(path)
                bytes_used += size
            else:
                path.unlink(missing_ok=True)
                removed += 1
        return removed

    @staticmethod
    def _count(path: Path) -> int:
        try:
            with np.load(path, allow_pickle=False) as data:
                return int(data['values'].shape[0])
        except (OSError, ValueError, KeyError):
            return 0

    def _fsync_directory(self) -> None:
        try:
            fd = os.open(self.root, os.O_RDONLY)
            try:
                os.fsync(fd)
            finally:
                os.close(fd)
        except OSError:
            pass
