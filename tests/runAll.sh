#!/usr/bin/env bash
set -u

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
failed=0

for test_file in test-engine.js test-ws.js test-phase2.js test-phase3.js test-phase4.js test-hardening.js; do
  printf '\n===== %s =====\n' "$test_file"
  if ! node "$project_dir/$test_file"; then
    printf 'FAILED: %s\n' "$test_file"
    failed=1
  fi
done

printf '\n===== live deployment browser test =====\n'
if ! node "$project_dir/tests/live-deployment.js"; then
  printf 'FAILED: live deployment browser test\n'
  failed=1
fi

if [ "$failed" -ne 0 ]; then
  printf '\nOne or more tests failed.\n'
  exit 1
fi

printf '\nAll RPS tests passed.\n'
