"""Validated, immutable outcome-only teacher snapshots.

The external files are not self-play replay and never provide policy targets.
They are imported once after strict validation into a compact read-only index.
Only decisive labels are retained: a FEN has no information that can explain
whether a draw came from the source engine's repetition or move-count rule.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import tempfile
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path

import numpy as np

from .encoding import CHANNELS, encode_teacher_snapshot
from .rules import BLUE, RED, legal_actions

FORMAT_VERSION = 1
MAX_INT32 = 2**31 - 1
LINE_PATTERN = re.compile(r'^([^\s]+) ([br]) (-?[0-9]+) ([0-9]+(?:\.[0-9]+)?)$')
OUTCOMES = {Decimal('0'): -1.0, Decimal('0.5'): 0.0, Decimal('1'): 1.0}


class TeacherFormatError(ValueError):
    """An external teacher file is malformed or semantically unsafe."""


@dataclass(frozen=True)
class TeacherRecord:
    board: np.ndarray
    turn: int
    evaluation: int
    value: float
    source_id: int


def _parse_fen(fen: str) -> np.ndarray:
    ranks = fen.split('/')
    if len(ranks) != 9:
        raise TeacherFormatError('FEN must contain exactly 9 ranks')
    rows: list[list[int]] = []
    for rank in ranks:
        row: list[int] = []
        for symbol in rank:
            if symbol in '123456789':
                row.extend([0] * int(symbol))
            elif symbol in 'RPSrps':
                kind = {'R': 1, 'P': 2, 'S': 3}[symbol.upper()]
                row.append(kind if symbol.isupper() else -kind)
            else:
                raise TeacherFormatError(f'invalid FEN symbol: {symbol!r}')
        if len(row) != 9:
            raise TeacherFormatError('each FEN rank must expand to 9 squares')
        rows.append(row)
    # FEN lists rank 9 through rank 1; rules.py arrays index rank 1 first.
    return np.asarray(rows[::-1], dtype=np.int8)


def parse_teacher_line(line: str, source_id: int = 0) -> TeacherRecord:
    """Parse one strict ASCII line without narrowing the evaluation first."""
    match = LINE_PATTERN.fullmatch(line)
    if match is None:
        raise TeacherFormatError('expected: FEN side_to_move integer_eval outcome')
    fen, side, evaluation_text, outcome_text = match.groups()
    try:
        evaluation = int(evaluation_text)
    except ValueError as error:
        raise TeacherFormatError('engine evaluation must be an integer') from error
    if not -MAX_INT32 <= evaluation <= MAX_INT32:
        raise TeacherFormatError('engine evaluation does not fit signed int32')
    try:
        outcome_number = Decimal(outcome_text)
    except InvalidOperation as error:
        raise TeacherFormatError('outcome is not numeric') from error
    if outcome_number not in OUTCOMES:
        raise TeacherFormatError('outcome must be exactly 0, 0.5, or 1')
    return TeacherRecord(_parse_fen(fen), BLUE if side == 'b' else RED,
                         evaluation, OUTCOMES[outcome_number], int(source_id))


def _source_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def _state_key(record: TeacherRecord) -> bytes:
    turn_byte = b'\x01' if record.turn == BLUE else b'\xff'
    return record.board.tobytes(order='C') + turn_byte


def _split_is_validation(key: bytes, validation_fraction: float) -> bool:
    bucket = int.from_bytes(hashlib.sha256(key).digest()[:8], 'big') / 2**64
    return bucket < validation_fraction


def _write_npz_atomic(destination: Path, arrays: dict[str, np.ndarray]) -> None:
    fd, temporary = tempfile.mkstemp(prefix='.records-', suffix='.npz', dir=destination.parent)
    try:
        with os.fdopen(fd, 'wb') as output:
            np.savez_compressed(output, **arrays)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, destination)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def _write_json_atomic(destination: Path, payload: dict) -> None:
    fd, temporary = tempfile.mkstemp(prefix='.manifest-', suffix='.tmp', dir=destination.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as output:
            json.dump(payload, output, sort_keys=True, indent=2)
            output.write('\n')
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, destination)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def build_teacher_dataset(
    source_paths: list[Path], destination: Path, validation_fraction: float = 0.1,
    max_records: int = 2_000_000,
) -> dict:
    """Validate and atomically build a separate immutable teacher index.

    Filtering is intentionally conservative. Draws, positions containing a
    canonical goal, no-legal-move positions, and every state with conflicting
    outcome labels are excluded because the missing source path semantics make
    their target unsafe. Evaluation integers are retained only in the manifest
    statistics and are never used as a neural target.
    """
    if not source_paths:
        raise ValueError('at least one teacher source is required')
    if not 0.0 < validation_fraction < 1.0:
        raise ValueError('validation_fraction must be between 0 and 1')
    if isinstance(max_records, bool) or max_records < 1:
        raise ValueError('max_records must be positive')
    source_paths = [Path(path) for path in source_paths]
    for path in source_paths:
        if not path.is_file():
            raise FileNotFoundError(path)
    if destination.exists():
        raise FileExistsError(f'teacher dataset destination already exists: {destination}')

    records: list[TeacherRecord] = []
    source_stats = []
    evaluation_values: list[int] = []
    try:
        for source_id, path in enumerate(source_paths):
            parsed = 0
            with path.open('r', encoding='ascii', newline='') as source:
                for line_number, raw_line in enumerate(source, 1):
                    if raw_line.endswith('\n'):
                        raw_line = raw_line[:-1]
                    if raw_line.endswith('\r'):
                        raw_line = raw_line[:-1]
                    if len(records) >= max_records:
                        raise TeacherFormatError(f'max_records exceeded at {path}:{line_number}')
                    try:
                        record = parse_teacher_line(raw_line, source_id)
                    except TeacherFormatError as error:
                        raise TeacherFormatError(f'{path}:{line_number}: {error}') from error
                    records.append(record)
                    evaluation_values.append(record.evaluation)
                    parsed += 1
            source_stats.append({'path': str(path), 'sha256': _source_sha256(path), 'records': parsed})

        labels: dict[bytes, float | None] = {}
        for record in records:
            key = _state_key(record)
            previous = labels.get(key, record.value)
            labels[key] = record.value if previous == record.value else None

        discarded = CounterLike()
        unique: dict[bytes, TeacherRecord] = {}
        for record in records:
            key = _state_key(record)
            if record.value == 0.0:
                discarded.add('draw_outcome'); continue
            if record.board[8, 8] > 0 or record.board[0, 0] < 0:
                discarded.add('goal_snapshot'); continue
            if not legal_actions(record.board, record.turn):
                discarded.add('no_legal_move'); continue
            if labels[key] is None:
                discarded.add('conflicting_outcome'); continue
            if key in unique:
                discarded.add('duplicate_state'); continue
            unique[key] = record

        kept = list(unique.values())
        boards = np.stack([record.board.reshape(-1) for record in kept]).astype(np.int8, copy=False)
        turns = np.asarray([record.turn for record in kept], dtype=np.int8)
        values = np.asarray([record.value for record in kept], dtype=np.float32)
        source_ids = np.asarray([record.source_id for record in kept], dtype=np.uint8)
        split = np.asarray([1 if _split_is_validation(_state_key(record), validation_fraction) else 0
                            for record in kept], dtype=np.uint8)
        if not np.any(split == 0) or not np.any(split == 1):
            raise TeacherFormatError('deterministic split did not produce both partitions')

        temporary = Path(tempfile.mkdtemp(prefix=f'.{destination.name}-', dir=destination.parent))
        try:
            records_path = temporary / 'records.npz'
            _write_npz_atomic(records_path, {'boards': boards, 'turns': turns, 'values': values,
                                              'source_ids': source_ids, 'split': split})
            manifest = {
                'format': FORMAT_VERSION,
                'record_file': 'records.npz',
                'records_sha256': _source_sha256(records_path),
                'sources': source_stats,
                'policy_targets': False,
                'evaluation_used': False,
                'evaluation': {'min': min(evaluation_values), 'max': max(evaluation_values),
                               'distinct': len(set(evaluation_values))},
                'parsed_records': len(records),
                'retained_records': len(kept),
                'train_records': int((split == 0).sum()),
                'validation_records': int((split == 1).sum()),
                'validation_fraction': validation_fraction,
                'discarded': discarded.as_dict(),
                'filter_policy': {
                    'discard_draw_outcomes': True,
                    'discard_goal_snapshots': True,
                    'discard_no_legal_move': True,
                    'discard_conflicting_board_side_outcomes': True,
                    'deduplicate_board_side_state': True,
                },
            }
            _write_json_atomic(temporary / 'manifest.json', manifest)
            os.chmod(records_path, 0o400)
            os.chmod(temporary / 'manifest.json', 0o400)
            os.chmod(temporary, 0o700)
            os.rename(temporary, destination)
            temporary = None
        finally:
            if temporary is not None:
                shutil.rmtree(temporary, ignore_errors=True)
    except Exception:
        raise
    return manifest


class CounterLike:
    """Small JSON-friendly counter kept local to the importer."""

    def __init__(self):
        self.values: dict[str, int] = {}

    def add(self, name: str) -> None:
        self.values[name] = self.values.get(name, 0) + 1

    def as_dict(self) -> dict[str, int]:
        return dict(sorted(self.values.items()))


class TeacherDataset:
    """Read-only access to an imported dataset and deterministic partitions."""

    def __init__(self, directory: Path, max_records: int | None = None):
        self.directory = Path(directory)
        manifest_path = self.directory / 'manifest.json'
        records_path = self.directory / 'records.npz'
        try:
            self.manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        except (OSError, ValueError) as error:
            raise TeacherFormatError(f'cannot read teacher manifest: {directory}') from error
        if self.manifest.get('format') != FORMAT_VERSION or self.manifest.get('record_file') != 'records.npz':
            raise TeacherFormatError('unsupported teacher dataset format')
        parsed_records = self.manifest.get('parsed_records')
        if max_records is not None and (not isinstance(parsed_records, int) or parsed_records > max_records):
            raise TeacherFormatError('teacher dataset exceeds configured record limit')
        if self.manifest.get('records_sha256') != _source_sha256(records_path):
            raise TeacherFormatError('teacher records checksum mismatch')
        try:
            with np.load(records_path, allow_pickle=False) as data:
                self.boards = np.asarray(data['boards'], dtype=np.int8)
                self.turns = np.asarray(data['turns'], dtype=np.int8)
                self.values = np.asarray(data['values'], dtype=np.float32)
                self.source_ids = np.asarray(data['source_ids'], dtype=np.uint8)
                self.split = np.asarray(data['split'], dtype=np.uint8)
        except (OSError, ValueError, KeyError, TypeError) as error:
            raise TeacherFormatError('cannot load teacher records') from error
        count = len(self.boards)
        if (self.boards.ndim != 2 or self.boards.shape[1:] != (81,) or self.turns.shape != (count,)
                or self.values.shape != (count,) or self.source_ids.shape != (count,)
                or self.split.shape != (count,) or not np.isin(self.turns, (BLUE, RED)).all()
                or not np.isfinite(self.values).all() or not np.isin(self.values, (-1.0, 1.0)).all()
                or not np.isin(self.split, (0, 1)).all()):
            raise TeacherFormatError('teacher records have invalid shapes or values')
        self.train_indices = np.flatnonzero(self.split == 0)
        self.validation_indices = np.flatnonzero(self.split == 1)
        if not len(self.train_indices) or not len(self.validation_indices):
            raise TeacherFormatError('teacher train/validation partitions must both be non-empty')

    def sample(self, batch_size: int, rng: np.random.Generator, validation: bool = False) -> tuple[np.ndarray, np.ndarray]:
        if isinstance(batch_size, bool) or batch_size < 1:
            raise ValueError('teacher batch_size must be positive')
        indices = self.validation_indices if validation else self.train_indices
        selected = indices[rng.integers(0, len(indices), size=batch_size)]
        states = np.stack([encode_teacher_snapshot(self.boards[index].reshape(9, 9), int(self.turns[index]))
                           for index in selected]).astype(np.float32, copy=False)
        return states, self.values[selected].copy()

    @property
    def count(self) -> int:
        return int(len(self.boards))
