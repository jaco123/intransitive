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
from .encoding import CHANNELS, LEGACY_CHANNELS
from .mcts import NetworkEvaluator, search_batch
from .model import PolicyValueNet
from .rules import BLUE, RED, GameState, encode_action

ROOT = Path(__file__).resolve().parent
DATA_DIR = Path('/home/ubuntu/intransitive-ai-data')
CHECKPOINT_DIR = DATA_DIR / 'checkpoints'
PROMOTED_PATH = CHECKPOINT_DIR / 'promoted.pt'
REQUEST_ID = re.compile(r'^[A-Za-z0-9_-]{1,80}$')


def _reject_duplicate_json_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f'duplicate config key: {key}')
        result[key] = value
    return result


def load_config(path: Path) -> dict:
    """Load only the configuration needed by the promoted runtime model."""
    with path.open(encoding='utf-8') as source:
        config = json.load(source, object_pairs_hook=_reject_duplicate_json_keys)
    if not isinstance(config, dict):
        raise ValueError('AI config must be a JSON object')
    required = (
        'network_width', 'network_blocks', 'mcts_simulations', 'amp',
        'search_algorithm',
        'gumbel_max_num_considered_actions', 'gumbel_value_scale',
        'gumbel_maxvisit_init',
    )
    missing = [key for key in required if key not in config]
    if missing:
        raise ValueError(f'AI config is missing: {", ".join(missing)}')
    return config


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


def reply(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload, separators=(',', ':')) + '\n')
    sys.stdout.flush()


def load_promoted() -> tuple[NetworkEvaluator, dict]:
    config = load_config(ROOT / 'config.json')
    if PROMOTED_PATH.parent.resolve() != CHECKPOINT_DIR.resolve() or not PROMOTED_PATH.is_file():
        raise RuntimeError('the promoted AI checkpoint is unavailable')
    manager = CheckpointManager(CHECKPOINT_DIR)
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
    raw_board = request.get('startBoard')
    if raw_board is None:
        state = GameState()
    else:
        if not isinstance(raw_board, list) or len(raw_board) != 9 or any(not isinstance(row, list) or len(row) != 9 for row in raw_board):
            raise ValueError('invalid starting board')
        values = {'rock': 1, 'paper': 2, 'scissors': 3}
        board = np.zeros((9, 9), dtype=np.int8)
        for row_index, row in enumerate(raw_board):
            for column_index, piece in enumerate(row):
                if piece is None:
                    continue
                if not isinstance(piece, dict) or piece.get('color') not in ('blue', 'red') or piece.get('type') not in values:
                    raise ValueError('invalid starting board')
                value = values[piece['type']]
                board[row_index, column_index] = value if piece['color'] == 'blue' else -value
        start_turn = request.get('startTurn')
        if start_turn not in ('blue', 'red'):
            raise ValueError('invalid starting turn')
        state = GameState(board, BLUE if start_turn == 'blue' else RED)
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
