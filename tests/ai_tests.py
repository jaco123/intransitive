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
from ai.encoding import ACTION_COUNT, CHANNELS, REPETITION_PLANES, decode_action, encode_action, encode_state
from ai.mcts import (Edge, NetworkEvaluator, Node, _backup, _completed_qvalues,
                     _gumbel_policy_target, _gumbel_selected_action, _initialize_gumbel_root,
                     search_batch, sequential_halving_schedule)
from ai.model import PolicyValueNet
from ai.replay import ReplayBuffer
from ai.rules import BLUE, RED, GameState, initial_board, piece_value, state_from_positions
from ai.selfplay import generate_self_play
from ai.trainer import Trainer, load_config


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
    state = GameState(cycle)
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
    try:
        state_from_positions([[256] + [0] * 8] + [[0] * 9 for _ in range(8)])
    except ValueError:
        pass
    else:
        raise AssertionError('state_from_positions narrowed invalid values before validation')


def test_encoding_mcts_selfplay():
    torch.manual_seed(4); np.random.seed(4)
    state = GameState(); before = encode_state(state)
    state.play(state.legal_actions()[0]); after = encode_state(state)
    check(before.shape == (CHANNELS, 9, 9) and not np.array_equal(before, after), 'history encoding did not change')
    model = PolicyValueNet(8, 1); model.eval(); evaluator = NetworkEvaluator(model, torch.device('cpu'), False)
    results = search_batch([GameState(), GameState()], evaluator, 3, add_noise=True, rng=np.random.default_rng(5))
    for state, result in zip([GameState(), GameState()], results):
        policy = result.policy
        legal = set(state.legal_actions())
        check(result.action in legal and np.isfinite(policy).all() and abs(float(policy.sum()) - 1) < 1e-5,
              'MCTS action/target result is invalid')
        check(set(np.flatnonzero(policy)).issubset(legal), 'MCTS selected illegal action')
    episodes = generate_self_play(evaluator, 2, 2, 2, 4, 1.0, np.random.default_rng(7))
    check(len(episodes) == 2 and all(np.isfinite(ep.states).all() and np.isfinite(ep.policies).all() and np.isfinite(ep.values).all() for ep in episodes), 'self-play sample is non-finite')
    check(all(np.allclose(ep.policies.sum(axis=1), 1, atol=1e-5) for ep in episodes), 'self-play policy target not normalized')
    parallel_seed = np.random.default_rng(19)
    parallel = generate_self_play(evaluator, 2, 1, 1, 0, 0.0, parallel_seed, workers=2)
    check(len(parallel) == 2 and all(ep.plies > 0 for ep in parallel), 'parallel self-play workers did not return complete episodes')

    state = GameState()
    action = state.legal_actions()[0]
    first = state.copy(); second = state.copy()
    next_key = state.next_position_key_trusted(action)
    first.position_counts[next_key] = 1
    second.position_counts[next_key] = 2
    difference = encode_state(first)[-REPETITION_PLANES:] != encode_state(second)[-REPETITION_PLANES:]
    check(difference.any(), 'encoding omitted rule-derived imminent repetition differences')


def test_gumbel_policy_improvement_and_backup():
    def official_schedule(max_actions, simulations):
        if max_actions <= 1:
            return tuple(range(simulations))
        log2_max = int(np.ceil(np.log2(max_actions)))
        sequence = []
        visits = [0] * max_actions
        considered = max_actions
        while len(sequence) < simulations:
            extra = max(1, int(simulations / (log2_max * considered)))
            for _ in range(extra):
                sequence.extend(visits[:considered])
                for index in range(considered):
                    visits[index] += 1
            considered = max(2, considered // 2)
        return tuple(sequence[:simulations])

    for max_actions in (1, 2, 3, 4, 5, 8, 16):
        for simulations in (1, 2, 3, 4, 8, 11, 17, 32):
            check(sequential_halving_schedule(max_actions, simulations) == official_schedule(max_actions, simulations),
                  f'official sequential halving schedule mismatch for {max_actions}/{simulations}')
    root = Node(GameState())
    _initialize_gumbel_root(root, np.zeros(ACTION_COUNT, dtype=np.float32), 0.0, 8, 4, 1.0, np.random.default_rng(12))
    check(len(root.legal_actions) == 36 and len(root.children) == 36,
          'Gumbel root did not retain all legal actions for exact completed-Q targets')
    sampled = root.children[root.legal_actions[0]]; sampled.visits = 1; sampled.value_sum = 1.0
    target_with_q = _gumbel_policy_target(root)
    check(target_with_q[sampled.action] > target_with_q[root.legal_actions[-1]], 'completed Q did not influence Gumbel policy target')

    # The executed action is not the training target argmax: it is restricted
    # to the mctx maximum-visit set. Make an unvisited action's target logit
    # dominant and prove it cannot be executed.
    target_action = root.legal_actions[-1]
    eligible_action = root.legal_actions[0]
    root.root_prior_logits[target_action] = 20.0
    root.children[target_action].prior_logit = 20.0
    root.children[eligible_action].visits = 2
    root.children[eligible_action].value_sum = -2.0
    target_with_q = _gumbel_policy_target(root)
    executed = _gumbel_selected_action(root, 0.1, 50.0)
    check(int(np.argmax(target_with_q)) == target_action and executed == eligible_action,
          'Gumbel execution was not masked to maximum-visit actions')

    # Gumbel noise changes the executed root action, while zero scale is
    # deterministic for identical priors/visit statistics.
    noisy_actions = set()
    for seed in range(12):
        noisy_root = Node(GameState())
        _initialize_gumbel_root(noisy_root, np.zeros(ACTION_COUNT, dtype=np.float32), 0.0, 1, 4, 1.0,
                                np.random.default_rng(seed))
        noisy_actions.add(_gumbel_selected_action(noisy_root))
    check(len(noisy_actions) > 1, 'root Gumbel scale did not influence action selection')
    zero_actions = []
    for seed in (1, 2, 3):
        zero_root = Node(GameState())
        _initialize_gumbel_root(zero_root, np.zeros(ACTION_COUNT, dtype=np.float32), 0.0, 1, 4, 0.0,
                                np.random.default_rng(seed))
        zero_actions.append(_gumbel_selected_action(zero_root))
    check(len(set(zero_actions)) == 1, 'zero-scale Gumbel selection was not deterministic')
    model = PolicyValueNet(8, 1); model.eval(); evaluator = NetworkEvaluator(model, torch.device('cpu'), False)
    state = GameState(); legal = set(state.legal_actions())
    result = search_batch([state], evaluator, 8, rng=np.random.default_rng(11), max_num_considered_actions=4)[0]
    target = result.policy
    check(np.isfinite(target).all() and abs(float(target.sum()) - 1.0) < 1e-5, 'Gumbel target is not normalized')
    check(result.action in legal and set(np.flatnonzero(target)).issubset(legal) and len(np.flatnonzero(target)) == len(legal),
          'Gumbel action/target did not complete legal actions')

    parent = GameState(); child = parent.copy(); action = parent.legal_actions()[0]; child.play_trusted(action)
    edge = Edge(action, BLUE, Node(child), 1.0, 0.0)
    _backup([edge], -1.0)
    check(edge.visits == 1 and edge.value_sum == 1.0, 'backup failed to flip child-perspective value')
    goal = np.zeros((9, 9), dtype=np.int8); goal[7, 7] = piece_value(BLUE, 1)
    goal_parent = GameState(goal); goal_action = encode_action(7, 7, 8, 8); goal_child = goal_parent.copy(); goal_child.play_trusted(goal_action)
    goal_edge = Edge(goal_action, BLUE, Node(goal_child), 1.0, 0.0); _backup([goal_edge], 1.0)
    check(goal_edge.value_sum == 1.0, 'goal terminal backup incorrectly flipped retained-turn value')
    draw_edge = Edge(action, BLUE, Node(child), 1.0, 0.0); _backup([draw_edge], 0.0)
    check(draw_edge.value_sum == 0.0, 'draw backup was not neutral')
    node = Node(parent, raw_value=0.25)
    a = Edge(action, BLUE, None, 0.5, 0.0); b = Edge(parent.legal_actions()[1], BLUE, None, 0.5, 0.0)
    node.children = {a.action: a, b.action: b}
    completed = _completed_qvalues(node)
    check(np.allclose(completed, 0.0), 'unvisited completed Q values were not neutral and normalized')
    public_copy = state.copy()
    search_copy = state.copy(include_history=False)
    check(len(public_copy.history) == len(state.history) and len(search_copy.history) == 0
          and search_copy.ply_count == state.ply_count, 'search copy lost or copied the wrong rule history')


def test_replay_checkpoint_and_tiny_training():
    with tempfile.TemporaryDirectory(prefix='intransitive-ai-test-') as temporary:
        root = Path(temporary); replay = ReplayBuffer(root / 'replay', max_episodes=2, max_samples=10)
        states = np.zeros((3, CHANNELS, 9, 9), np.float32); policies = np.zeros((3, ACTION_COUNT), np.float32); policies[:, 0] = 1; values = np.zeros(3, np.float32)
        replay.append(states, policies, values, 1); replay.append(states, policies, values, 2); replay.append(states, policies, values, 3)
        check(len(replay.paths()) == 2 and replay.load()[0].shape[0] == 6, 'replay retention/load mismatch')
        replay_outcomes, replay_lengths = replay.statistics()
        check(replay_outcomes['draw'] == 2 and replay_lengths == [3, 3], 'replay outcome statistics mismatch')
        manager = CheckpointManager(root / 'checkpoints', keep=2)
        manager.save({'model': {'x': torch.tensor([1.0])}, 'optimizer': {}}, 1)
        check(manager.load_latest()['model']['x'].item() == 1, 'checkpoint reload mismatch')
        manager.latest.write_bytes(b'corrupted checkpoint')
        recovered = manager.load_latest()
        check(recovered['model']['x'].item() == 1 and manager.last_recovery and manager.latest.stat().st_size > 0,
              'corrupt latest checkpoint did not recover from numbered checkpoint')

        config = json.loads((ROOT / 'ai' / 'config.json').read_text())
        config.update({'network_width': 8, 'network_blocks': 1, 'mcts_simulations': 1, 'self_play_games': 1,
                       'self_play_batch_games': 1, 'self_play_workers': 1, 'train_min_samples': 1, 'train_batch_size': 8,
                       'train_epochs': 1, 'arena_games': 2, 'arena_simulations': 1, 'max_game_plies': 2000,
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

        bad = dict(config); bad['mcts_simulations'] = 0
        bad_path = root / 'bad-config.json'; bad_path.write_text(json.dumps(bad))
        missing_data = root / 'must-not-be-created'
        try:
            Trainer(missing_data, bad_path, 'cpu')
        except ValueError:
            pass
        else:
            raise AssertionError('invalid config was accepted')
        check(not missing_data.exists(), 'invalid config mutated trainer data directory')


def test_config_duplicates_and_fresh_seed():
    failures = []
    with tempfile.TemporaryDirectory(prefix='intransitive-ai-config-test-') as temporary:
        root = Path(temporary)
        base_config = ROOT / 'ai' / 'config.json'
        duplicate_config = root / 'duplicate.json'
        text = base_config.read_text(encoding='utf-8')
        marker = '  "promotion_threshold":'
        duplicate_config.write_text(text.replace(marker, '  "arena_gumbel_scale": 1.0,\n' + marker, 1), encoding='utf-8')
        try:
            load_config(duplicate_config)
        except ValueError:
            pass
        else:
            failures.append('duplicate JSON config keys were silently accepted')

        first = Trainer(root / 'first', base_config, 'cpu')
        second = Trainer(root / 'second', base_config, 'cpu')
        same = all(torch.equal(first.model.state_dict()[key], second.model.state_dict()[key])
                   for key in first.model.state_dict())
        if not same:
            failures.append('fresh trainers with the same seed initialized different model weights')
    check(not failures, '; '.join(failures))


def main():
    torch.set_num_threads(1)
    test_rules_and_differential(); print('PASS AI rules and JS differential conformance')
    test_encoding_mcts_selfplay(); print('PASS AI encoding, MCTS, and self-play')
    test_gumbel_policy_improvement_and_backup(); print('PASS Gumbel policy improvement and MCTS backup semantics')
    test_config_duplicates_and_fresh_seed(); print('PASS config duplicate rejection and deterministic fresh initialization')
    test_replay_checkpoint_and_tiny_training(); print('PASS AI replay, atomic checkpoint, tiny training, and resume')
    print('ALL AI TESTS PASSED')


if __name__ == '__main__':
    main()
