"""Olgu sunumu ve video makaleler için kısa tanıtım.

Bu kayıtlar çalışma kartı almaz (kart yalnızca Doğrudan makalelere yazılır) ama
başlık çevirisi ve iki cümlelik özet, akışta çıplak başlık kalmasını önler.
Çıktı `briefs.jsonl`: {id, titleTr, summary, designLabel}.
"""
from __future__ import annotations

import json

import journals
import llm
import memo
import rules
from config import MODEL_FAST, WORK

MEMO = "briefs_memo.json"


def targets(records: list[dict], cls: dict) -> list[dict]:
    out = []
    for rec in records:
        hit = cls.get(rec["pmid"]) or {}
        if hit.get("interest") != "video_olgu" or hit.get("cardiac"):
            continue
        # Özeti olmayan olgularda da başlık çevirisi istenir; özet alanı boş kalır.
        abstract = rules.clean(rec.get("abstract"))
        if not rules.is_thoracic(f"{rules.clean(rec.get('title'))} {abstract}"):
            continue
        out.append({
            "id": rec["pmid"],
            "payload": {
                "dergi": journals.name_of(rec),
                "baslik": rules.clean(rec.get("title")),
                "ozet": abstract[:1600] or "özet yok",
                "yayin_turleri": rec.get("pubtypes") or [],
            },
        })
    return out


def run(records: list[dict], cls: dict) -> dict[str, dict]:
    WORK.mkdir(parents=True, exist_ok=True)
    memory = memo.load(MEMO)
    items = targets(records, cls)
    todo, cached = memo.partition(items, memory)
    if cached:
        print(f"  bellekten: {len(cached)}/{len(items)} tanıtım")
    fresh = llm.run_worker("briefs", todo, "briefs_raw.jsonl", MODEL_FAST) if todo else []
    keep = {item["id"] for item in items}
    fresh = [row for row in fresh if (row.get("id") or row.get("pmid")) in keep]
    rows = list(cached.values()) + fresh
    (WORK / "briefs.jsonl").write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + "\n", encoding="utf-8")
    payloads = {item["id"]: item["payload"] for item in items}
    memory.update({memo.key(row["id"], payloads[row["id"]]): row
                   for row in rows if not row.get("error") and row.get("brief")})
    memo.save(MEMO, memory)
    # İşçi dosyası önceki koşulardan satır taşıyabilir: sayı yalnız bu koşunun hedeflerinden.
    written = len({row["id"] for row in rows if row.get("brief")} & keep)
    print(f"  tanıtım: {written}/{len(items)}")
    return {row["id"]: row["brief"] for row in rows if not row.get("error") and row.get("brief")}
