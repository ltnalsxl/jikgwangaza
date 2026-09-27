#!/usr/bin/env bash
# Usage: scripts/ci/commit-and-push.sh "<commit message>" <path> [<path>...]
# Commits the given paths if they changed, then pushes with rebase+retry so that
# several data workflows pushing at the same time don't fail each other.
# Writes changed=true|false to $GITHUB_OUTPUT when available.
set -euo pipefail

message="$1"; shift

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'

git add -A -- "$@"
if git diff --cached --quiet; then
  echo "No changes to commit"
  [ -n "${GITHUB_OUTPUT:-}" ] && echo "changed=false" >> "$GITHUB_OUTPUT"
  exit 0
fi

git commit -q -m "$message"

for attempt in 1 2 3 4 5; do
  if git pull --rebase -q origin main && git push -q origin HEAD:main; then
    echo "Pushed on attempt $attempt"
    [ -n "${GITHUB_OUTPUT:-}" ] && echo "changed=true" >> "$GITHUB_OUTPUT"
    exit 0
  fi
  echo "Push failed (attempt $attempt), retrying..."
  git rebase --abort 2>/dev/null || true
  sleep $((attempt * 5))
done

echo "::error::Failed to push after 5 attempts"
exit 1
