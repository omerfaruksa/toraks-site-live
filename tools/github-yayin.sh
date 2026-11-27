#!/usr/bin/env bash
# GitHub yayınını elle eşitler. Günlük Manus görevinden bağımsızdır: iki taraf
# ayrı yürür, bu betik yalnız çağrıldığında GitHub'a gönderir.
#
# Kullanım: bash tools/github-yayin.sh ["commit mesajı"]
#   GITHUB_URL değişkeniyle başka depoya gönderilebilir.
set -euo pipefail
cd "$(dirname "$0")/.."

URL="${GITHUB_URL:-https://github.com/omerfaruksa/toraks-site-live.git}"
SITE="${GITHUB_SITE:-https://omerfaruksa.github.io/toraks-site-live/}"
MSG="${1:-GitHub eşitlemesi}"

if [ -n "$(git status --porcelain)" ]; then
  echo "uyarı: çalışma ağacında işlenmemiş değişiklik var; yalnız işlenmiş hâl gönderilir." >&2
fi

echo "gönderiliyor: $(git rev-parse --short HEAD) → $URL"
git push "$URL" HEAD:main

if command -v gh >/dev/null 2>&1; then
  REPO="$(echo "$URL" | sed -E 's#https://github.com/##; s#\.git$##')"
  echo "sayfa derlemesi bekleniyor: $REPO"
  sleep 10
  gh run list -R "$REPO" -L 1 || true
fi

echo "site: $SITE"
echo "sürüm çıkarmak için: Actions > Sürüm > Run workflow"
