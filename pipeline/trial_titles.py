"""ClinicalTrials.gov başlıklarının Türkçe çevirisi.

Klinik araştırma kayıtları da normal makale gibi işlenir: başlık Türkçeye
çevrilir, özgün başlık korunur. Çeviri `trials_tr.json` içinde NCT kimliğine
göre saklanır; aynı çalışma iki hafta sonra yeniden taranınca model çağrılmaz.
"""
from __future__ import annotations

import json

import llm
from config import MODEL_FAST, WORK

CACHE = "trials_tr.json"


def load() -> dict[str, str]:
    path = WORK / CACHE
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save(cache: dict[str, str]) -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    (WORK / CACHE).write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")


def run(rows: list[dict]) -> dict[str, str]:
    """Eksik başlıkları çevirir; hazır çevirileri yeniden istemez."""
    cache = load()
    todo = [{"id": trial["nct"], "payload": {"baslik": trial["title"]}}
            for trial in rows
            if trial.get("nct") and trial["nct"] not in cache and trial.get("title")]
    if not todo:
        print(f"  klinik araştırma başlığı: {len(cache)} çeviri bellekte")
        return cache
    fresh = llm.run_worker_reliable("trials", todo, "trials_tr_raw.jsonl", MODEL_FAST,
                                    "klinik araştırma başlığı")
    for row in fresh:
        title = (row.get("titleTr") or "").strip()
        if not row.get("error") and title:
            cache[row["id"]] = title
    save(cache)
    print(f"  klinik araştırma başlığı: {len(cache)} çeviri ({len(todo)} yeni istek)")
    return cache
