#!/usr/bin/env bash
# Günlük site güncellemesi: son 7 günü tarar, sayıyı üretir, siteyi besler.
# Aynı kayıtlar için LLM belleği (.work/cls_memo.json, cards_memo.json) kullanılır.
# Kullanım: bash pipeline/run_daily.sh [--date YYYY-MM-DD] [--stages ...]
set -euo pipefail
cd "$(dirname "$0")/.."
exec python3 pipeline/run.py --cadence daily --report "$@"
