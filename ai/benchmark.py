"""Small reproducible throughput diagnostic for the deployed machine."""

from __future__ import annotations

import argparse
import json
import time

import numpy as np
import torch

from .mcts import NetworkEvaluator, search_batch
from .model import PolicyValueNet
from .rules import GameState


def benchmark(device_name: str = 'auto') -> dict:
    device = torch.device('cuda:0' if device_name == 'auto' and torch.cuda.is_available() else device_name if device_name != 'auto' else 'cpu')
    model = PolicyValueNet(48, 2).to(device).eval()
    evaluator = NetworkEvaluator(model, device, amp=device.type == 'cuda')
    rows = []
    for batch_size in (1, 4, 8):
        states = [GameState() for _ in range(batch_size)]
        evaluator.predict(states)  # warm up kernels/allocators
        started = time.perf_counter(); evaluator.predict(states); elapsed = time.perf_counter() - started
        rows.append({'batch': batch_size, 'inferences_per_second': batch_size / max(elapsed, 1e-9), 'seconds': elapsed})
    states = [GameState() for _ in range(4)]
    started = time.perf_counter(); search_batch(states, evaluator, 8, add_noise=False, rng=np.random.default_rng(2)); elapsed = time.perf_counter() - started
    return {'device': str(device), 'cuda': torch.cuda.is_available(), 'gpu': torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
            'network_parameters': sum(parameter.numel() for parameter in model.parameters()), 'inference': rows,
            'batch_mcts_roots': 4, 'batch_mcts_simulations': 8, 'batch_mcts_seconds': elapsed,
            'batch_mcts_root_searches_per_second': 4 / max(elapsed, 1e-9)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--device', default='auto')
    print(json.dumps(benchmark(parser.parse_args().device), sort_keys=True))
