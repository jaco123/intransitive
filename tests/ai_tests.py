#!/usr/bin/env python3
"""Deterministic AI subsystem tests, including JS-engine differential checks."""

from __future__ import annotations

import json
import random
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import torch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ai.checkpoint import CheckpointManager
from ai.encoding import ACTION_COUNT, CHANNELS, decode_action, encode_action, encode_state
from ai.mcts import NetworkEvaluator, search_batch
from ai.model import PolicyValueNet
from ai.replay import ReplayBuffer
from ai.rules import BLUE, RED, GameState, initial_board, piece_value
from ai.selfplay import generate_self_play
from ai.trainer import Trainer


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def js_differential(cases):
    process = subprocess.run(['node', str(ROOT / 'tests' / 'ai_engine_bridge.js')], input=json.dumps(cases),
                             text=True, capture_output=True, cwd=ROOT)
    if process.returncode:
        raise AssertionError('canonical JS bridge failed: ' + process.stderr.strip())
    expected = json.loads(process.stdout)
    for index, (case, js_snapshots) in enumerate(zip(cases, expected)):
        state = GameState(initial_board() if 'board' not in case else np.asarray(case['board'], dtype=np.int8),
                          BLUE if case.get('turn', 'blue') == 'blue' else RED)
        if 'halfmove' in case:
            state.halfmove_clock = case['halfmove']
        for snap_index, js_snapshot in enumerate(js_snapshots):
            check(state.snapshot() == js_snapshot, f'JS differential mismatch case={index} snapshot={snap_index}: {state.snapshot()} != {js_snapshot}')
            if snap_index < len(case.get('actions', [])):
                state.play(case['actions'][snap_index])


def test_rules_and_differential():
    board = initial_board()
    check(board.shape == (9, 9) and len(GameState().legal_actions()) == 36, 'initial rules mismatch')
    for action in GameState().legal_actions():
        check(encode_action(*decode_action(action)) == action, 'action encode/decode mismatch')

    rng = random.Random(1729)
    cases = []
    for _ in range(120):
        state = GameState(); actions = []
        for _ply in range(rng.randrange(1, 90)):
            legal = state.legal_actions()
            if not legal:
                break
            action = rng.choice(legal); actions.append(action); state.play(action)
            if state.is_terminal():
                break
        cases.append({'actions': actions})

    # Custom editor positions and path-dependent terminal rules.
    goal = np.zeros((9, 9), dtype=np.int8); goal[7, 7] = piece_value(BLUE, 1)
    cases.append({'board': goal.tolist(), 'actions': [encode_action(7, 7, 8, 8)]})
    blocked = np.zeros((9, 9), dtype=np.int8); blocked[4, 4] = piece_value(BLUE, 1)
    for dc, dr in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
        blocked[4 + dr, 4 + dc] = piece_value(RED, 1)
    blocked[8, 8] = piece_value(RED, 1)
    cases.append({'board': blocked.tolist(), 'turn': 'red', 'actions': [encode_action(8, 8, 7, 8)]})
    cycle = np.zeros((9, 9), dtype=np.int8); cycle[1, 1] = piece_value(BLUE, 1); cycle[7, 7] = piece_value(RED, 1)
    cycle_actions = [encode_action(1, 1, 2, 1), encode_action(7, 7, 6, 7), encode_action(2, 1, 1, 1), encode_action(6, 7, 7, 7)] * 2
    cases.append({'board': cycle.tolist(), 'actions': cycle_actions})
    clock = np.zeros((9, 9), dtype=np.int8); clock[1, 1] = piece_value(BLUE, 1); clock[7, 7] = piece_value(RED, 1)
    cases.append({'board': clock.tolist(), 'halfmove': 99, 'actions': [encode_action(1, 1, 2, 1)]})
    js_differential(cases)

    state = GameState(goal); state.play(encode_action(7, 7, 8, 8)); check(state.status == 'blue_won' and state.turn == BLUE, 'goal semantics mismatch')
    state = GameState(cycle); 
    for action in cycle_actions: state.play(action)
    check(state.status == 'draw' and state.draw_reason == 'threefold', 'threefold semantics mismatch')
    state = GameState(clock); state.halfmove_clock = 99; state.play(encode_action(1, 1, 2, 1))
    check(state.status == 'draw' and state.draw_reason == '100ply', '100-ply semantics mismatch')
    invalid = np.zeros((9, 9), dtype=np.int64); invalid[0, 0] = 256
    try:
        GameState(invalid)
    except ValueError:
        pass
    else:
        raise AssertionError('invalid board values were accepted')


def test_encoding_mcts_selfplay():
    torch.manual_seed(4); np.random.seed(4)
    state = GameState(); before = encode_state(state)
    state.play(state.legal_actions()[0]); after = encode_state(state)
    check(before.shape == (CHANNELS, 9, 9) and not np.array_equal(before, after), 'history encoding did not change')
    model = PolicyValueNet(8, 1); model.eval(); evaluator = NetworkEvaluator(model, torch.device('cpu'), False)
    policies = search_batch([GameState(), GameState()], evaluator, 3, add_noise=True, rng=np.random.default_rng(5))
    for state, policy in zip([GameState(), GameState()], policies):
        legal = set(state.legal_actions())
        check(np.isfinite(policy).all() and abs(float(policy.sum()) - 1) < 1e-5, 'MCTS policy is not normalized')
        check(set(np.flatnonzero(policy)).issubset(legal), 'MCTS selected illegal action')
    episodes = generate_self_play(evaluator, 2, 2, 2, 4, 1.0, np.random.default_rng(7))
    check(len(episodes) == 2 and all(np.isfinite(ep.states).all() and np.isfinite(ep.policies).all() and np.isfinite(ep.values).all() for ep in episodes), 'self-play sample is non-finite')
    check(all(np.allclose(ep.policies.sum(axis=1), 1, atol=1e-5) for ep in episodes), 'self-play policy target not normalized')


def test_replay_checkpoint_and_tiny_training():
    with tempfile.TemporaryDirectory(prefix='intransitive-ai-test-') as temporary:
        root = Path(temporary); replay = ReplayBuffer(root / 'replay', max_episodes=2, max_samples=10)
        states = np.zeros((3, CHANNELS, 9, 9), np.float32); policies = np.zeros((3, ACTION_COUNT), np.float32); policies[:, 0] = 1; values = np.zeros(3, np.float32)
        replay.append(states, policies, values, 1); replay.append(states, policies, values, 2); replay.append(states, policies, values, 3)
        check(len(replay.paths()) == 2 and replay.load()[0].shape[0] == 6, 'replay retention/load mismatch')
        manager = CheckpointManager(root / 'checkpoints', keep=2)
        manager.save({'model': {'x': torch.tensor([1.0])}}, 1)
        check(manager.load_latest()['model']['x'].item() == 1, 'checkpoint reload mismatch')

        config = json.loads((ROOT / 'ai' / 'config.json').read_text())
        config.update({'network_width': 8, 'network_blocks': 1, 'mcts_simulations': 1, 'self_play_games': 1,
                       'self_play_batch_games': 1, 'train_min_samples': 1, 'train_batch_size': 8,
                       'train_epochs': 1, 'arena_games': 1, 'arena_simulations': 1, 'max_game_plies': 300,
                       'replay_max_episodes': 4, 'replay_max_samples': 1000})
        config_path = root / 'config.json'; config_path.write_text(json.dumps(config))
        trainer = Trainer(root / 'data', config_path, 'cpu')
        original = {key: value.detach().clone() for key, value in trainer.model.state_dict().items()}
        trainer.run(once=True)
        check(trainer.optimizer_step > 0 and trainer.checkpoints.latest.exists(), 'tiny training did not update/checkpoint')
        changed = any(not torch.equal(original[key], value) for key, value in trainer.model.state_dict().items())
        check(changed, 'tiny training weights did not change')
        check(trainer.status_path.exists() and trainer.status_path.read_text().strip(), 'status file missing')
        resumed = Trainer(root / 'data', config_path, 'cpu')
        check(resumed.optimizer_step == trainer.optimizer_step and resumed.total_games == trainer.total_games, 'checkpoint resume counters mismatch')
        check(not list((root / 'data' / 'checkpoints').glob('.*.tmp')), 'temporary checkpoint remained')


def main():
    torch.set_num_threads(1)
    test_rules_and_differential(); print('PASS AI rules and JS differential conformance')
    test_encoding_mcts_selfplay(); print('PASS AI encoding, MCTS, and self-play')
    test_replay_checkpoint_and_tiny_training(); print('PASS AI replay, atomic checkpoint, tiny training, and resume')
    print('ALL AI TESTS PASSED')


if __name__ == '__main__':
    main()
