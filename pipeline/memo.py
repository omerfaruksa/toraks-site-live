"""Model kararlarının günler arası belleği.

Günlük kadans aynı kaydı yedi kez tarar; sınıflandırma ve kart üretimi her seferinde
yeniden yapılmasın diye JSON belleği tutulur. Anahtar PMID ile yetmez: özet ya da
model istemi değiştiğinde eski karar geçersiz olmalı, bu yüzden anahtara yükün kısa
bir özeti eklenir. Bozuk dosya sessizce boş kabul edilir.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from config import WORK


def path(name: str) -> Path:
    return WORK / name


def key(item_id: str, payload: dict) -> str:
    """`PMID:kısa-özet` biçiminde bellek anahtarı; içerik değişirse anahtar da değişir."""
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return f"{item_id}:{hashlib.sha1(raw).hexdigest()[:10]}"


def load(name: str) -> dict[str, dict]:
    file = path(name)
    if not file.exists():
        return {}
    try:
        return json.loads(file.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        # Bozuk dosya hattı durdurmaz ama sessiz de kalmaz: tüm kayıtlar yeniden değerlendirilir.
        print(f"  uyarı: {file.name} okunamadı, bellek boş kabul edildi")
        return {}


def save(name: str, memory: dict[str, dict]) -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    path(name).write_text(json.dumps(memory, ensure_ascii=False), encoding="utf-8")


def partition(items: list[dict], memory: dict[str, dict]) -> tuple[list[dict], dict[str, dict]]:
    """Bellekte karşılığı olan öğeleri ayırır: (yeni işler, {id: bellekteki karar})."""
    todo, cached = [], {}
    for item in items:
        hit = memory.get(key(item["id"], item["payload"]))
        if hit is None:
            todo.append(item)
        else:
            cached[item["id"]] = hit
    return todo, cached
