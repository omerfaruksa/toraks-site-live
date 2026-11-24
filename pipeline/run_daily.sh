#!/usr/bin/env bash
# Günlük site güncellemesi: son 24 saati tarar, 7 günlük kayan pencereye ekler,
# sayıyı üretir ve siteyi besler. Pencereyi baştan kurmak için: --scan-window 7
# Aynı kayıtlar için LLM belleği (.work/cls_memo.json, cards_memo.json) kullanılır.
# Bellek ayrıca content/memo altında saklanır; .work kaybolursa oradan geri gelir.
# Koşu çıktısı pipeline/.work/run.log dosyasına da yazılır.
# Kullanım: bash pipeline/run_daily.sh [--date YYYY-MM-DD] [--stages ...]
set -euo pipefail
cd "$(dirname "$0")/.."
LOG=pipeline/.work/run.log
mkdir -p "$(dirname "$LOG")"
# Günlük dosyası sınırsız büyümesin: 2 MB üstündeyse son 2000 satır tutulur.
if [ -f "$LOG" ] && [ "$(wc -c < "$LOG")" -gt 2097152 ]; then
  tail -n 2000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi
{
  echo "=== $(date -Iseconds) günlük koşu ==="
  python3 pipeline/run.py --cadence daily --report "$@"
} 2>&1 | tee -a "$LOG"
exit "${PIPESTATUS[0]}"
