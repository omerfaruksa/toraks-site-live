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

# Haftalık tarama: sayı cumartesi tarihli, pencere son 7 gün.
CADENCE_DAYS = {"weekly": 7, "biweekly": 14, "monthly": 30}
DEFAULT_CADENCE = os.environ.get("CADENCE", "weekly")
CACHE_TTL = int(os.environ.get("CACHE_TTL", str(6 * 3600)))

AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz",
         "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]


def parse_date(value: str | None) -> date:
    return date.fromisoformat(value) if value else date.today()


def window(issue_date: date, days: int) -> tuple[str, str]:
    """(baslangic, bitis) ISO tarihleri. Pencere bitişi sayı tarihidir."""
    return (issue_date - timedelta(days=days)).isoformat(), issue_date.isoformat()


def issue_date_for(cadence: str = DEFAULT_CADENCE, today: date | None = None) -> date:
    """Sayı tarihi: çalıştırma günü. Haftalık görev cumartesi koştuğu için tarihler
    kendiliğinden cumartesiye düşer; geriye dönük tarih üretilmez."""
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
