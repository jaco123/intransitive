#!/usr/bin/env python3
"""Verify the installed AI service and, optionally, a real restart recovery."""

from __future__ import annotations

import argparse
import json
import subprocess
import time
from pathlib import Path


DATA = Path('/home/ubuntu/intransitive-ai-data')
SERVICE = 'intransitive-ai.service'


def status() -> dict:
    with (DATA / 'status.json').open(encoding='utf-8') as source:
        return json.load(source)


def systemctl(*args: str) -> str:
    return subprocess.check_output(['systemctl', *args], text=True).strip()


def check_installation() -> None:
    assert systemctl('is-active', SERVICE) == 'active'
    assert systemctl('is-enabled', SERVICE) == 'enabled'
    current = status()
    assert current['status'] == 'running' and current['device'].startswith('cuda')
    assert Path(current['checkpoint']).is_file()
    print(json.dumps({'mode': 'check', 'iteration': current['iteration'], 'optimizer_step': current['optimizer_step'],
                      'pid': current['pid'], 'status': current['status']}))


def live_restart(timeout: int) -> None:
    before = status()
    old_pid = before['pid']
    subprocess.check_call(['sudo', '-n', 'systemctl', 'restart', SERVICE])
    deadline = time.monotonic() + timeout
    restarted = None
    while time.monotonic() < deadline:
        try:
            candidate = status()
            if candidate.get('pid') != old_pid and candidate.get('status') == 'running':
                restarted = candidate
                break
        except (OSError, ValueError, KeyError):
            pass
        time.sleep(2)
    if restarted is None:
        raise AssertionError('service did not publish a running post-restart status')
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        current = status()
        if current.get('optimizer_step', 0) > before.get('optimizer_step', 0):
            print(json.dumps({'mode': 'live-restart', 'before': before, 'after': current}, sort_keys=True))
            return
        time.sleep(5)
    raise AssertionError('counters did not advance after restart')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--live', action='store_true', help='restart the enabled service and await progress')
    parser.add_argument('--timeout', type=int, default=900)
    args = parser.parse_args()
    check_installation()
    if args.live:
        live_restart(args.timeout)


if __name__ == '__main__':
    main()
