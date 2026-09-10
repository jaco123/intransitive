"""Command-line importer for the validated external teacher snapshots."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .teacher_data import build_teacher_dataset


def main() -> None:
    parser = argparse.ArgumentParser(description='Build an immutable Intransitive teacher snapshot index')
    parser.add_argument('--source', type=Path, action='append', required=True,
                        help='ASCII teacher file; repeat for each source')
    parser.add_argument('--destination', type=Path, required=True,
                        help='new output directory, which must not already exist')
    parser.add_argument('--validation-fraction', type=float, default=0.1)
    parser.add_argument('--max-records', type=int, default=2_000_000)
    args = parser.parse_args()
    manifest = build_teacher_dataset(args.source, args.destination,
                                     args.validation_fraction, args.max_records)
    print(json.dumps(manifest, sort_keys=True, indent=2))


if __name__ == '__main__':
    main()
