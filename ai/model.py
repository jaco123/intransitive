"""Small residual policy/value network sized for one RTX 5000."""

from __future__ import annotations

import torch
from torch import nn

from .encoding import ACTION_COUNT, CHANNELS
from .rules import SIZE


class ResidualBlock(nn.Module):
    def __init__(self, width: int):
        super().__init__()
        self.conv1 = nn.Conv2d(width, width, 3, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(width)
        self.conv2 = nn.Conv2d(width, width, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(width)
        self.activation = nn.ReLU(inplace=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x
        x = self.activation(self.bn1(self.conv1(x)))
        x = self.bn2(self.conv2(x))
        return self.activation(x + residual)


class PolicyValueNet(nn.Module):
    def __init__(self, width: int = 64, blocks: int = 3):
        super().__init__()
        if width < 8 or blocks < 1:
            raise ValueError('network width/blocks are too small')
        self.config = {'in_channels': CHANNELS, 'action_count': ACTION_COUNT, 'width': width, 'blocks': blocks}
        self.stem = nn.Sequential(
            nn.Conv2d(CHANNELS, width, 3, padding=1, bias=False),
            nn.BatchNorm2d(width),
            nn.ReLU(inplace=True),
        )
        self.torso = nn.Sequential(*(ResidualBlock(width) for _ in range(blocks)))
        self.policy = nn.Sequential(
            nn.Conv2d(width, 2, 1, bias=False), nn.BatchNorm2d(2), nn.ReLU(inplace=True),
            nn.Flatten(), nn.Linear(2 * SIZE * SIZE, ACTION_COUNT),
        )
        self.value = nn.Sequential(
            nn.Conv2d(width, 1, 1, bias=False), nn.BatchNorm2d(1), nn.ReLU(inplace=True),
            nn.Flatten(), nn.Linear(SIZE * SIZE, width), nn.ReLU(inplace=True),
            nn.Linear(width, 1), nn.Tanh(),
        )

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        features = self.torso(self.stem(x))
        return self.policy(features), self.value(features).squeeze(-1)
