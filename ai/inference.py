"""Private line protocol for promoted-model computer-game inference.

The web server starts this process with no client-controlled arguments.  It
loads the one promoted checkpoint, reconstructs the canonical path-dependent
state from the server-supplied move history, and returns only an encoded move.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

import numpy as np
import torch

from .checkpoint import CheckpointManager
from .mcts import NetworkEvaluator, search_batch
from .model import PolicyValueNet
from .rules import BLUE, RED, GameState, encode_action
from .trainer import load_config, migrate_input_channels

ROOT = Path(__file__).resolve().parent
DATA_DIR = Path('/home/ubuntu/intransitive-ai-data')
CHECKPOINT_DIR = DATA_DIR / 'checkpoints'
PROMOTED_PATH = CHECKPOINT_DIR / 'promoted.pt'
REQUEST_ID = re.compile(r'^[A-Za-z0-9_-]{1,80}$')


def reply(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload, separators=(',', ':')) + '\n')
    sys.stdout.flush()


def load_promoted() -> tuple[NetworkEvaluator, dict]:
    config = load_config(ROOT / 'config.json')
    if PROMOTED_PATH.parent.resolve() != CHECKPOINT_DIR.resolve() or not PROMOTED_PATH.is_file():
        raise RuntimeError('the promoted AI checkpoint is unavailable')
    manager = CheckpointManager(CHECKPOINT_DIR, config['checkpoint_keep'])
    payload = manager.load_promoted()
    if not isinstance(payload, dict) or not isinstance(payload.get('model'), dict):
        raise RuntimeError('the promoted AI checkpoint is invalid')
    saved_config = payload.get('model_config', {})
    model = PolicyValueNet(config['network_width'], config['network_blocks'])
    model.load_state_dict(migrate_input_channels(payload['model'], saved_config, model.config))
    device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
    model.to(device).eval()
    return NetworkEvaluator(model, device, amp=config['amp'] and device.type == 'cuda'), config


def build_state(request: dict) -> GameState:
    history = request.get('history')
    if not isinstance(history, list) or len(history) > 2000:
        raise ValueError('invalid game history')
    state = GameState()
    for index, item in enumerate(history):
        if not isinstance(item, dict):
            raise ValueError('invalid game move')
        coordinates = [item.get(name) for name in ('fromC', 'fromR', 'toC', 'toR')]
        if not all(isinstance(value, int) and not isinstance(value, bool) and 0 <= value < 9 for value in coordinates):
            raise ValueError('invalid game move')
        action = encode_action(*coordinates)
        if action not in state.legal_actions():
            raise ValueError('history contains an illegal move')
        state.play(action)
        if state.is_terminal() and index != len(history) - 1:
            raise ValueError('history continues after a terminal move')
    expected_turn = request.get('turn')
    if expected_turn not in ('blue', 'red') or state.turn != (BLUE if expected_turn == 'blue' else RED):
        raise ValueError('game state does not match the requested turn')
    if state.is_terminal():
        raise ValueError('cannot search a terminal position')
    return state


def infer(request: dict, evaluator: NetworkEvaluator, config: dict) -> dict:
    request_id = request.get('id')
    if not isinstance(request_id, str) or not REQUEST_ID.fullmatch(request_id):
        raise ValueError('invalid inference request')
    state = build_state(request)
    result = search_batch(
        [state], evaluator, config['mcts_simulations'], add_noise=False,
        rng=np.random.default_rng(0), algorithm=config['search_algorithm'],
        max_num_considered_actions=config['gumbel_max_num_considered_actions'],
        gumbel_scale=0.0, gumbel_value_scale=config['gumbel_value_scale'],
        gumbel_maxvisit_init=config['gumbel_maxvisit_init'],
    )[0]
    if result.action is None:
        raise RuntimeError('the promoted AI returned no legal move')
    return {'type': 'result', 'id': request_id, 'action': int(result.action)}


def main() -> None:
    try:
        os.nice(10)
        torch.set_num_threads(1)
        try:
            torch.set_num_interop_threads(1)
        except RuntimeError:
            pass
        evaluator, config = load_promoted()
        reply({'type': 'ready', 'ok': True, 'device': str(evaluator.device)})
    except Exception as error:
        print(f'AI inference startup failed: {error}', file=sys.stderr, flush=True)
        evaluator = config = None
        reply({'type': 'ready', 'ok': False, 'error': 'The promoted AI checkpoint is unavailable.'})

    for line in sys.stdin:
        try:
            request = json.loads(line)
            if not isinstance(request, dict):
                raise ValueError('invalid inference request')
            if evaluator is None:
                raise RuntimeError('the promoted AI checkpoint is unavailable')
            reply(infer(request, evaluator, config))
        except Exception as error:
            request_id = request.get('id') if isinstance(request, dict) else ''
            reply({'type': 'error', 'id': request_id if isinstance(request_id, str) else '',
                   'error': str(error) if isinstance(error, ValueError) else 'AI inference failed.'})


if __name__ == '__main__':
    main()
