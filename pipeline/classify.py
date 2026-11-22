"""Sınıflandırma: iki geçişli LLM + deterministik kural katmanı.

Eski hattaki prep.py + triage.mjs + prep2.py + recheck.mjs + merge_cls.py beş
adımının yerini alır. Model yalnızca "ne görüyorsun" sorusunu yanıtlar; grup
kuralları burada, kodda uygulanır (A grubunda konu dışı kalmaz, D grubu başlık).
"""
from __future__ import annotations

import json

import journals
import llm
import memo
import rules
from config import MODEL_DEEP, MODEL_FAST, WORK


def _payload(rec: dict) -> dict:
    group = journals.group_of(rec)
    return {
        "dergi": journals.name_of(rec),
        "grup": group or "liste_disi",
        "grup_kurali": journals.group_rule(group),
        "yayin_turleri": rec.get("pubtypes") or [],
        "dil": rec.get("language") or "",
        "baslik": rules.clean(rec.get("title")),
        "ozet": rules.clean(rec.get("abstract"))[:2400] or "(özet yok)",
    }


MEMO = "cls_memo.json"


def _candidates(records: list[dict], first: dict[str, dict],
                payloads: dict[str, dict]) -> list[dict]:
    """İkinci geçiş yalnızca Doğrudan/Dolaylı ve cerrahi anahtar sözcüklü kayıtlara."""
    out = []
    for rec in records:
        hit = first.get(rec["pmid"])
        if not hit:
            continue
        interest = hit.get("interest")
        text = f"{rec.get('title', '')} {rec.get('abstract', '')}"
        if interest in ("dogrudan", "dolayli") or (
                interest == "konu_disi" and rules.SURGICAL_KEYWORD.search(text)):
            out.append({"id": rec["pmid"], "payload": payloads[rec["pmid"]]})
    return out


def run(records: list[dict]) -> dict:
    WORK.mkdir(parents=True, exist_ok=True)
    memory = memo.load(MEMO)
    # Günlük kadans aynı kayıtları yedi kez görmemek için önceki kararlar saklanır.
    payloads = {r["pmid"]: _payload(r) for r in records}
    items = [{"id": r["pmid"], "payload": payloads[r["pmid"]]} for r in records]
    todo, cached = memo.partition(items, memory)
    if cached:
        print(f"  bellekten: {len(cached)}/{len(records)} kayıt")

    first_rows = llm.run_worker("triage", todo, "classify_pass1.jsonl", MODEL_FAST)
    first = {r["id"]: r for r in first_rows if not r.get("error")}
    print(f"  birinci geçiş: {len(first)}/{len(todo)}")

    second_items = _candidates([r for r in records if r["pmid"] in first], first, payloads)
    second_rows = llm.run_worker("triage", second_items, "classify_pass2.jsonl", MODEL_DEEP)
    second = {r["id"]: r for r in second_rows if not r.get("error")}
    print(f"  ikinci geçiş: {len(second)}/{len(second_items)}")

    final = dict(cached)
    for pmid, hit in first.items():
        final[pmid] = {
            "interest": hit.get("interest") or "konu_disi",
            "cardiac": bool(hit.get("cardiac")),
            "tags": hit.get("tags") or [],
            "design": hit.get("design") or "other",
            "one_liner": hit.get("one_liner") or "",
            "source": "triage",
        }

    by_pmid = {r["pmid"]: r for r in records}
    for pmid, hit in second.items():
        interest = hit.get("interest") or "konu_disi"
        cardiac = bool(hit.get("cardiac"))
        # A grubu: ikinci geçişe gelen (cerrahi anahtar sözcüklü) kayıt konu dışı kalmaz.
        if journals.group_of(by_pmid[pmid]) == "A" and interest == "konu_disi" and not cardiac:
            interest = "dolayli"
        final[pmid] = {
            "interest": interest,
            "cardiac": cardiac,
            "tags": hit.get("tags") or [],
            "design": hit.get("design") or "other",
            "one_liner": hit.get("one_liner") or final.get(pmid, {}).get("one_liner") or "",
            "source": "recheck",
        }

    (WORK / "final_cls.json").write_text(json.dumps(final, ensure_ascii=False, indent=0), encoding="utf-8")
    memory.update({memo.key(pmid, payloads[pmid]): value
                   for pmid, value in final.items() if pmid in payloads})
    memo.save(MEMO, memory)
    counts = {}
    for value in final.values():
        key = (value["interest"], value["cardiac"])
        counts[key] = counts.get(key, 0) + 1
    for key in sorted(counts):
        print(f"  {key}: {counts[key]}")
    return final
