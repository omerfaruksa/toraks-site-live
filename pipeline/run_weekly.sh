#!/usr/bin/env bash
# Haftalık sayı: cumartesi koşar, son 7 günü tarar, site verisini ve Markdown raporunu üretir.
# Kullanım: bash pipeline/run_weekly.sh [--date YYYY-MM-DD] [--stages ...]
set -euo pipefail
cd "$(dirname "$0")/.."
exec python3 pipeline/run.py --cadence weekly --report "$@"
