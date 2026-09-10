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

if [ "${INTRANSITIVE_WEBSITE_OFFLINE:-0}" = "1" ]; then
  printf '\n===== real-site UI tests =====\n'
  printf 'SKIP: INTRANSITIVE_WEBSITE_OFFLINE=1 (website intentionally stopped)\n'
else
printf '\n===== requested Intransitive UI regression test =====\n'
if ! node "$project_dir/tests/requested-ui.js"; then
  printf 'FAILED: requested Intransitive UI regression test\n'
  failed=1
fi

printf '\n===== requested batch UI regression test =====\n'
if ! node "$project_dir/tests/requested-batch-ui.js"; then
  printf 'FAILED: requested batch UI regression test\n'
  failed=1
fi

printf '\n===== requested layout/rating UI regression test =====\n'
if ! node "$project_dir/tests/requested-layout-rating-ui.js"; then
  printf 'FAILED: requested layout/rating UI regression test\n'
  failed=1
fi

printf '\n===== requested legacy-rating UI regression test =====\n'
if ! node "$project_dir/tests/requested-rating-legacy-ui.js"; then
  printf 'FAILED: requested legacy-rating UI regression test\n'
  failed=1
fi

printf '\n===== editor UI regression and interaction test =====\n'
if ! node "$project_dir/tests/editor-ui.js"; then
  printf 'FAILED: editor UI regression and interaction test\n'
  failed=1
fi

printf '\n===== next editor/analysis UI test =====\n'
if ! node "$project_dir/tests/editor-next-ui.js"; then
  printf 'FAILED: next editor/analysis UI test\n'
  failed=1
fi

printf '\n===== latest UI/protocol regression test =====\n'
if ! node "$project_dir/tests/latest-ui.js"; then
  printf 'FAILED: latest UI/protocol regression test\n'
  failed=1
fi

printf '\n===== latest UI2 directory/capture regression test =====\n'
if ! node "$project_dir/tests/latest-ui2.js"; then
  printf 'FAILED: latest UI2 directory/capture regression test\n'
  failed=1
fi

printf '\n===== latest UI3 analysis/watch/players regression test =====\n'
if ! node "$project_dir/tests/latest-ui3.js"; then
  printf 'FAILED: latest UI3 analysis/watch/players regression test\n'
  failed=1
fi

printf '\n===== latest UI4 naming/profile/premove regression test =====\n'
if ! node "$project_dir/tests/latest-ui4.js"; then
  printf 'FAILED: latest UI4 naming/profile/premove regression test\n'
  failed=1
fi

printf '\n===== latest UI5 unavailable-destination premove regression test =====\n'
if ! node "$project_dir/tests/latest-ui5.js"; then
  printf 'FAILED: latest UI5 unavailable-destination premove regression test\n'
  failed=1
fi

printf '\n===== live deployment browser test =====\n'
if ! node "$project_dir/tests/live-deployment.js"; then
  printf 'FAILED: live deployment browser test\n'
  failed=1
fi
fi

printf '\n===== AlphaZero AI conformance/training tests =====\n'
ai_python="${INTRANSITIVE_AI_PYTHON:-/home/ubuntu/intransitive-ai-venv/bin/python}"
if [ ! -x "$ai_python" ]; then
  printf 'AI Python environment not found: %s\n' "$ai_python"
  failed=1
elif ! "$ai_python" "$project_dir/tests/ai_tests.py"; then
  printf 'FAILED: AlphaZero AI conformance/training tests\n'
  failed=1
fi
if [ -x "$ai_python" ] && ! "$ai_python" "$project_dir/tests/ai_service_recovery.py"; then
  printf 'FAILED: AlphaZero service installation/status verification\n'
  failed=1
fi

if [ "$failed" -ne 0 ]; then
  printf '\nOne or more tests failed.\n'
  exit 1
fi

printf '\nAll RPS tests passed.\n'
