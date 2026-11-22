#!/usr/bin/env bash
# Günlük literatür sayısı üretir. Kullanım: bash pipeline/run_daily.sh [YYYY-MM-DD]
set -euo pipefail
cd "$(dirname "$0")/.."

export DATE="${1:-${DATE:-$(date +%F)}}"
export WINDOW_END="${WINDOW_END:-$DATE}"
export WINDOW_START="${WINDOW_START:-$(date -d "$DATE -7 days" +%F)}"
export CONC="${CONC:-4}"

echo "== Sayı $DATE (dönem $WINDOW_START → $WINDOW_END) =="
mkdir -p pipeline/.work

echo "-- PubMed taraması"
python3 pipeline/fetch_pubmed.py

echo "-- Triyaj girdisi"
python3 pipeline/prep.py

echo "-- Triyaj (gpt-6-luna)"
manus-node pipeline/triage.mjs

echo "-- İkinci geçiş girdisi"
python3 pipeline/prep2.py

echo "-- İkinci geçiş sınıflandırma (gpt-6-sol)"
manus-node pipeline/recheck.mjs

echo "-- Sınıflandırma birleştirme"
python3 pipeline/merge_cls.py

echo "-- Çalışma kartları (gpt-6-sol + doğrulama)"
manus-node pipeline/cards.mjs

echo "-- Klinik araştırmalar"
python3 pipeline/fetch_trials.py

echo "-- PubMed dışı kaynaklar (Crossref + RSS)"
python3 pipeline/fetch_external.py
manus-node pipeline/triage_external.mjs

echo "-- Sayı dosyası"
python3 pipeline/build_issue.py

echo "-- Yazar/kurum bilgisi ve Türkiye tespiti"
python3 pipeline/enrich_meta.py "content/issues/$DATE.json"

echo "-- PubMed dışı kayıtları ekle"
python3 pipeline/merge_external.py "content/issues/$DATE.json"

echo "-- Dergi kapsama tablosu"
export WINDOW_30D="${WINDOW_30D:-$(date -d "$DATE -30 days" +%F)}"
python3 pipeline/coverage.py "content/issues/$DATE.json"

echo "-- Sayı doğrulaması"
python3 pipeline/verify_numbers.py | tail -3

echo "== Bitti: content/issues/$DATE.json =="
