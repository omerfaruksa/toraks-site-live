"""Günlük 24 saatlik tarama ile 7 günlük kayan pencere.

Her koşuda yalnızca son 24 saat taranır; bulunan kayıtlar önceki koşunun
kayıtlarıyla birleştirilir ve pencere dışında kalanlar düşürülür. Böylece
günlük iş yükü tek güne iner, sayı ise proje talimatındaki 7 günlük kapsamı
korumaya devam eder.
"""
from __future__ import annotations

from datetime import date, timedelta


def shift(value: str, days: int) -> str:
    """ISO tarihi gün cinsinden kaydırır; boş değerde boş döner."""
    if not value:
        return ""
    return (date.fromisoformat(value) + timedelta(days=days)).isoformat()


def norm_date(value: str) -> str:
    """'2026', '2026-11', '2026-11-16' biçimlerini karşılaştırılabilir hale getirir."""
    value = (value or "").strip()
    if len(value) == 4:
        return value + "-01-01"
    if len(value) == 7:
        return value + "-01"
    return value


def merge(old: list[dict], new: list[dict], key: str, date_of, keep_start: str,
          buffer_days: int = 0) -> list[dict]:
    """Eski ve yeni kayıtları anahtara göre birleştirir, pencere dışını atar.

    Yeni kayıt aynı anahtarla gelirse tazesi kazanır (özet ve yazar bilgisi
    PubMed'de güncellenmiş olabilir). Tarihi okunamayan kayıt düşürülmez.
    `buffer_days`, kaynak tarih sınırlarının bir gün taşabilmesi için tanınan
    toleranstır; PubMed [edat] sorgusu bitişik günü de döndürebiliyor.
    """
    merged: dict[str, dict] = {}
    for item in list(old or []) + list(new or []):
        value = item.get(key)
        if not value:
            continue
        merged[value] = item
    if not keep_start:
        return list(merged.values())
    floor = shift(keep_start, -buffer_days) if buffer_days else keep_start
    kept = []
    for item in merged.values():
        stamp = norm_date(date_of(item))
        if not stamp or stamp >= floor:
            kept.append(item)
    return kept
