#!/usr/bin/env bash
# Haftalık rapor: cumartesi 12:00. Tarama yapmaz; son 7 günlük sayıyı birleştirir,
# PMID/DOI ile tekilleştirir ve content/reports/haftalik-<tarih>.md üretir.
# Kullanım: bash pipeline/run_weekly_report.sh [--weeks 7]
set -euo pipefail
cd "$(dirname "$0")/.."
exec python3 pipeline/run.py --report-week --weeks "${WEEKS:-7}" "$@"
