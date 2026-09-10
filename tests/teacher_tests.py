#!/usr/bin/env python3
"""Strict external teacher-data validation and isolated auxiliary training tests."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import numpy as np
import torch

ROOT = Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0, str(ROOT))

from ai.encoding import ACTION_COUNT, CHANNELS, encode_teacher_snapshot
from ai.teacher_data import (TeacherDataset, TeacherFormatError, build_teacher_dataset,
                             parse_teacher_line)
from ai.trainer import Trainer


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def write_source(path: Path) -> None:
    lines = [
        '9/9/9/9/9/9/9/1P7/8p b 12 1',
        '9/9/9/9/9/9/9/1P7/8p b 13 1',
        '9/9/9/9/9/9/9/2P6/8p b 14 1',
        '9/9/9/9/9/9/9/2P6/8p b 14 0',
        '9/9/9/9/9/9/9/1P7/8p r -12 0.5',
        '8P/9/9/9/9/9/9/1P7/8p b 12 1',
        '9/9/9/9/9/9/9/3P5/8p b 15 0',
        '9/9/9/9/9/9/9/1P7/8p b 12 1.25',
        '9/9/9/9/9/9/9/1P7/8p b 12 1 junk',
    ]
    path.write_text('\n'.join(lines) + '\n', encoding='ascii')


def test_parser_and_filter() -> None:
    with tempfile.TemporaryDirectory(prefix='intransitive-teacher-test-') as temporary:
        root = Path(temporary); source = root / 'source.txt'; write_source(source)
        try:
            build_teacher_dataset([source], root / 'teacher')
        except TeacherFormatError as error:
            check('source.txt:8' in str(error), f'unexpected malformed-line error: {error}')
        else:
            raise AssertionError('malformed teacher input was accepted')
        source.write_text('\n'.join(source.read_text(encoding='ascii').splitlines()[:7]) + '\n', encoding='ascii')
        manifest = build_teacher_dataset([source], root / 'teacher', validation_fraction=0.5)
        check(manifest['parsed_records'] == 7, 'parsed count mismatch')
        check(manifest['policy_targets'] is False and manifest['evaluation_used'] is False,
              'teacher policy/evaluation use was not explicit')
        check(manifest['discarded']['draw_outcome'] == 1, 'draw filter mismatch')
        check(manifest['discarded']['goal_snapshot'] == 1, 'goal filter mismatch')
        check(manifest['discarded']['conflicting_outcome'] == 2, 'conflicting-label filter mismatch')
        check(manifest['retained_records'] == 2, 'state dedup/filter retention mismatch')
        dataset = TeacherDataset(root / 'teacher')
        check(dataset.count == 2 and len(dataset.train_indices) and len(dataset.validation_indices),
              'teacher partitions are not usable')
        check(set(dataset.values.tolist()) == {-1.0, 1.0}, 'side-to-move outcome conversion mismatch')
        states, values = dataset.sample(5, np.random.default_rng(4))
        check(states.shape == (5, CHANNELS, 9, 9) and np.all(np.isin(values, (-1, 1))),
              'teacher samples are malformed')


def test_snapshot_encoding_and_corruption() -> None:
    board = np.zeros((9, 9), np.int8); board[0, 0] = 1; board[8, 8] = -3
    encoded = encode_teacher_snapshot(board, 1)
    check(encoded.shape == (CHANNELS, 9, 9), 'snapshot encoding shape mismatch')
    check(np.array_equal(encoded[0], board == 1) and np.all(encoded[6:24] == 0),
          'snapshot encoded unavailable history as a fabricated state')
    check(np.all(encoded[24] == 1) and np.all(encoded[25:] == 0),
          'snapshot turn/path channels are not explicit')
    try:
        parse_teacher_line('9/9/9/9/9/9/9/9/9 b 1 0.25')
    except TeacherFormatError:
        pass
    else:
        raise AssertionError('invalid outcome was accepted')

    with tempfile.TemporaryDirectory(prefix='intransitive-teacher-corrupt-') as temporary:
        root = Path(temporary); source = root / 'source.txt'
        source.write_text('\n'.join(
            f'9/9/9/9/9/9/9/{i}R{8-i}/8r b 0 1' for i in range(1, 8)
        ) + '\n', encoding='ascii')
        build_teacher_dataset([source], root / 'teacher', validation_fraction=0.5)
        records = root / 'teacher' / 'records.npz'
        records.chmod(0o600)
        records.write_bytes(records.read_bytes() + b'corruption')
        try:
            TeacherDataset(root / 'teacher')
        except TeacherFormatError:
            pass
        else:
            raise AssertionError('corrupt teacher records were accepted')


def test_auxiliary_training_is_isolated() -> None:
    with tempfile.TemporaryDirectory(prefix='intransitive-teacher-train-') as temporary:
        root = Path(temporary); source = root / 'source.txt'
        source.write_text('\n'.join([
            '9/9/9/9/9/9/9/1P7/8r b 1 1',
            '9/9/9/9/9/9/9/2P6/8r r -1 0',
            '9/9/9/9/9/9/9/3P5/8r b 1 1',
            '9/9/9/9/9/9/9/4P4/8r r -1 0',
            '9/9/9/9/9/9/9/5P3/8r b 1 1',
            '9/9/9/9/9/9/9/6P2/8r r -1 0',
            '9/9/9/9/9/9/9/7P1/8r b 1 1',
            '9/9/9/9/9/9/9/1P7/7r1 r -1 0',
        ]) + '\n', encoding='ascii')
        teacher_dir = root / 'teacher'; build_teacher_dataset([source], teacher_dir, validation_fraction=0.25)
        config = json.loads((ROOT / 'ai' / 'config.json').read_text(encoding='utf-8'))
        config.update({'network_width': 8, 'network_blocks': 1, 'teacher_data_dir': str(teacher_dir),
                       'teacher_data_enabled': True, 'teacher_batch_size': 2, 'teacher_value_loss_weight': 0.2,
                       'teacher_warmup_steps': 0,
                       'mcts_simulations': 1, 'self_play_games': 1,
                       'self_play_batch_games': 1, 'self_play_workers': 1, 'train_min_samples': 1,
                       'train_batch_size': 2, 'train_epochs': 1, 'arena_games': 2, 'arena_simulations': 1,
                       'max_game_plies': 20, 'replay_max_episodes': 2, 'replay_max_samples': 20})
        config_path = root / 'config.json'; config_path.write_text(json.dumps(config), encoding='utf-8')
        trainer = Trainer(root / 'data', config_path, 'cpu')
        states = np.zeros((2, CHANNELS, 9, 9), np.float32)
        policies = np.zeros((2, ACTION_COUNT), np.float32); policies[:, 0] = 1
        result = trainer._train(states, policies, np.zeros(2, np.float32))
        check(result['teacher_batches'] > 0 and result['teacher_weight'] == 0.2,
              'auxiliary teacher loss was not applied')
        check(np.isfinite(result['teacher_loss']) and trainer.teacher.count == 8,
              'teacher loss/data was not finite or isolated')


if __name__ == '__main__':
    test_parser_and_filter(); print('PASS teacher parser, filtering, deduplication, and split')
    test_snapshot_encoding_and_corruption(); print('PASS teacher snapshot unknown-history encoding and corruption rejection')
    test_auxiliary_training_is_isolated(); print('PASS isolated auxiliary outcome training')
