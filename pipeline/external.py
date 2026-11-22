"""PubMed dışı kayıtların sınıflandırması.

Eski triage_external.mjs tüm Crossref/RSS havuzunu (bu sayıda 606 kayıt) modele
gönderiyordu. Burada önce kural süzgeci uygulanır: yalnızca torasik/cerrahi
anahtar sözcük taşıyan kayıtlar modele gider, gerisi başlık düzeyinde elenir.
"""
from __future__ import annotations

import json

import journals
import llm
import rules
from config import MODEL_FAST, WORK


def _prefilter(records: list[dict]) -> list[dict]:
    keep = []
    for rec in records:
        text = f"{rec.get('title', '')} {rec.get('abstract', '')}"
        listed = rec.get("journal") in journals.listed_names()
        if rules.is_thoracic(text) or rules.is_surgical(text) or listed:
            keep.append(rec)
    return keep


def run(window_records: list[dict]) -> list[dict]:
    pool = _prefilter(window_records)
    print(f"  kural süzgeci: {len(window_records)} → {len(pool)} kayıt")
    items = [{
        "id": rec["id"],
        "payload": {
            "dergi": rec["journal"], "baslik": rec["title"],
            "ozet": (rec.get("abstract") or "")[:1800] or "(özet yok)",
            "yayin_turleri": rec.get("pubtypes") or [],
        },
    } for rec in pool]
    rows = llm.run_worker("triage", items, "external_cls_raw.jsonl", MODEL_FAST)
    verdict = {r["id"]: r for r in rows if not r.get("error")}

    out = []
    for rec in pool:
        hit = verdict.get(rec["id"])
        if not hit:
            continue
        interest = hit.get("interest") or "konu_disi"
        if interest == "konu_disi":
            continue
        out.append({
            **rec,
            "interest": interest,
            "cardiac": bool(hit.get("cardiac")),
            "tags": hit.get("tags") or [],
            "one_liner": hit.get("one_liner") or "",
            "title_tr": rec.get("title_tr") or "",
        })
    (WORK / "external_cls.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"  PubMed dışı ilgili kayıt: {len(out)}")
    return out
