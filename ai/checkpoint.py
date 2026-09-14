"""Loading the promoted model used by the live AI opponent."""

from __future__ import annotations

from pathlib import Path

import torch


class CheckpointManager:
    def __init__(self, root: str | Path):
        self.root = Path(root)

    @property
    def promoted(self) -> Path:
        return self.root / 'promoted.pt'

    def load_promoted(self) -> dict | None:
        if not self.promoted.exists():
            return None
        return torch.load(self.promoted, map_location='cpu', weights_only=False)
