"""Atomic checkpointing, RNG recovery, promotion, and retention."""

from __future__ import annotations

import os
import random
import tempfile
from pathlib import Path

import numpy as np
import torch


def rng_state() -> dict:
    state = {'python': random.getstate(), 'numpy': np.random.get_state(), 'torch': torch.get_rng_state()}
    if torch.cuda.is_available():
        state['cuda'] = torch.cuda.get_rng_state_all()
    return state


def restore_rng(state: dict) -> None:
    if not state:
        return
    random.setstate(state['python'])
    np.random.set_state(state['numpy'])
    torch.set_rng_state(state['torch'])
    if torch.cuda.is_available() and state.get('cuda'):
        torch.cuda.set_rng_state_all(state['cuda'])


def atomic_torch_save(payload: dict, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f'.{destination.name}.', suffix='.tmp', dir=destination.parent)
    try:
        with os.fdopen(fd, 'wb') as output:
            torch.save(payload, output)
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


class CheckpointManager:
    def __init__(self, root: str | Path, keep: int = 8):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.keep = max(2, int(keep))

    @property
    def latest(self) -> Path:
        return self.root / 'checkpoint-latest.pt'

    @property
    def promoted(self) -> Path:
        return self.root / 'promoted.pt'

    def save(self, payload: dict, step: int, promote: bool = False) -> Path:
        numbered = self.root / f'checkpoint-{int(step):012d}.pt'
        atomic_torch_save(payload, numbered)
        atomic_torch_save(payload, self.latest)
        if promote:
            atomic_torch_save(payload, self.promoted)
        self.prune()
        return numbered

    def load_latest(self) -> dict | None:
        if not self.latest.exists():
            return None
        return torch.load(self.latest, map_location='cpu', weights_only=False)

    def load_promoted(self) -> dict | None:
        if not self.promoted.exists():
            return None
        return torch.load(self.promoted, map_location='cpu', weights_only=False)

    def prune(self) -> None:
        paths = sorted(self.root.glob('checkpoint-[0-9]*.pt'))
        for path in paths[:-self.keep]:
            path.unlink(missing_ok=True)
