#!/usr/bin/env bash
# Sürüm paketi üretir: depodaki izlenen ve izlenmeyen (ama yok sayılmayan) dosyalar.
# node_modules, dist, .git, önbellekler ve yerel iş dosyaları pakete girmez.
# Kullanım: bash tools/paket.sh [cikti_dizini]
set -euo pipefail
cd "$(dirname "$0")/.."

OUT_DIR="${1:-$PWD/../work}"
mkdir -p "$OUT_DIR"
TAG="$(date +%Y-%m-%d)"
NAME="torakslit-$TAG"
ZIP="$OUT_DIR/$NAME.zip"

if [ -n "$(git status --porcelain)" ]; then
  echo "uyarı: çalışma ağacında izlenmeyen değişiklik var; paket bu hâliyle üretiliyor." >&2
fi

rm -f "$ZIP"
git ls-files -co --exclude-standard -z | xargs -0 zip -q "$ZIP"

COUNT="$(unzip -l "$ZIP" | tail -1 | awk '{print $2}')"
SIZE="$(du -h "$ZIP" | cut -f1)"
SUM="$(sha256sum "$ZIP" | cut -d' ' -f1)"

echo "paket: $ZIP"
echo "dosya: $COUNT · boyut: $SIZE"
echo "sha256: $SUM"
echo "sürüm: $TAG"
