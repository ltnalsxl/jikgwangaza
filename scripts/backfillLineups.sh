#!/usr/bin/env bash

set -euo pipefail

START_DATE="${1:-2025-07-28}"
END_DATE="${2:-2026-06-13}"
SAVE_DIR="${3:-public/data/kbo_crawler_data}"

python3 public/kbo_crawler.py \
  --mode range \
  --start-date "$START_DATE" \
  --end-date "$END_DATE" \
  --skip-existing-dates \
  --save_dir "$SAVE_DIR"
