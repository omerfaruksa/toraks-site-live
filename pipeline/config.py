"""Tek yapılandırma noktası: yollar, dönem, model adları, eşzamanlılık.

Eski betiklerdeki sabit tarihler ve mutlak yollar burada toplanır; tüm modüller
yalnızca bu modülden okur.
"""
from __future__ import annotations

import os
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PIPELINE = ROOT / "pipeline"
WORK = PIPELINE / ".work"
CACHE = PIPELINE / ".cache"
CONTENT = ROOT / "content"
ISSUES = CONTENT / "issues"
INDEX = CONTENT / "index.json"

JOURNALS_CSV = PIPELINE / "dergi_listesi.csv"
SOURCES_CSV = PIPELINE / "kaynak_esleme.csv"

MODEL_FAST = os.environ.get("MODEL_FAST", "gpt-6-luna")
MODEL_DEEP = os.environ.get("MODEL_DEEP", "gpt-6-sol")
LLM_CONC = int(os.environ.get("CONC", "6"))
HTTP_WORKERS = int(os.environ.get("HTTP_WORKERS", "6"))

# Günlük kadans: sayı her gün üretilir, pencere yine son 7 gündür (yuvarlanan
# hafta). Böylece ana sayfa her gün tazelenir, kapsam proje talimatındaki gibi
# kalır; tekrar eden kayıtlar LLM belleğinden (cls_memo/cards_memo) okunur.
CADENCE_DAYS = {"daily": 7, "weekly": 7, "biweekly": 14, "monthly": 30}
# Sayının kapsadığı pencere ile taranan pencere ayrıdır: günlük kadans her gün
# yalnızca son 24 saati tarar, bulunanlar 7 günlük kayan pencereye eklenir.
SCAN_DAYS = {"daily": 1, "weekly": 7, "biweekly": 14, "monthly": 30}
# ClinicalTrials.gov her gün taranmaz: kayıt ve sonuç bildirimleri seyrek düşer,
# on beş günlük pencere hem taze kalır hem de gereksiz istek üretmez.
TRIALS_DAYS = int(os.environ.get("TRIALS_DAYS", "15"))
DEFAULT_CADENCE = os.environ.get("CADENCE", "daily")
CACHE_TTL = int(os.environ.get("CACHE_TTL", str(6 * 3600)))

AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz",
         "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]


def window(issue_date: date, days: int) -> tuple[str, str]:
    """(baslangic, bitis) ISO tarihleri. Pencere bitişi sayı tarihidir."""
    return (issue_date - timedelta(days=days)).isoformat(), issue_date.isoformat()


def issue_date_for(cadence: str = DEFAULT_CADENCE, today: date | None = None) -> date:
    """Sayı tarihi: çalıştırma günü. Günlük görev her gün, haftalık rapor görevi
    cumartesi koştuğu için tarihler kendiliğinden yerine oturur."""
    return today or date.today()


def period_label(start: str, end: str) -> str:
    s, e = date.fromisoformat(start), date.fromisoformat(end)
    if s.year == e.year and s.month == e.month:
        return f"{s.day}–{e.day} {AYLAR[e.month - 1]} {e.year}"
    if s.year == e.year:
        return f"{s.day} {AYLAR[s.month - 1]} – {e.day} {AYLAR[e.month - 1]} {e.year}"
    return (f"{s.day} {AYLAR[s.month - 1]} {s.year} – "
            f"{e.day} {AYLAR[e.month - 1]} {e.year}")


def ensure_dirs() -> None:
    for d in (WORK, CACHE, ISSUES):
        d.mkdir(parents=True, exist_ok=True)
