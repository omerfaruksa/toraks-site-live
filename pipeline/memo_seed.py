"""Model belleğinin depoda saklanan kopyası.

`pipeline/.work` geçicidir: sandbox sıfırlandığında `cls_memo.json` ve
`cards_memo.json` kaybolur, ilk koşu tüm kayıtları yeniden sınıflandırır.
Bu modül belleği `content/memo` altında tutar ve `.work` boşsa geri yükler.
Bellek yalnızca kararları taşır (ilgi sınıfı, etiketler, kart alanları);
özet veya hasta verisi içermez.
"""
from __future__ import annotations

import shutil

from config import CONTENT, WORK

SEED = CONTENT / "memo"
FILES = ("cls_memo.json", "cards_memo.json", "briefs_memo.json")


def restore() -> list[str]:
    """`.work` içinde olmayan bellek dosyalarını depodaki kopyadan geri getirir."""
    if not SEED.exists():
        return []
    WORK.mkdir(parents=True, exist_ok=True)
    restored: list[str] = []
    for name in FILES:
        src, dst = SEED / name, WORK / name
        if src.exists() and not dst.exists():
            shutil.copy2(src, dst)
            restored.append(name)
    return restored


def persist() -> list[str]:
    """Koşu sonundaki belleği depoya kopyalar; sonraki oturum buradan başlar."""
    if not WORK.exists():
        return []
    saved: list[str] = []
    SEED.mkdir(parents=True, exist_ok=True)
    for name in FILES:
        src = WORK / name
        if src.exists():
            shutil.copy2(src, SEED / name)
            saved.append(name)
    return saved
