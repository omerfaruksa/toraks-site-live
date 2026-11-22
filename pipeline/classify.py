"""Sınıflandırma: iki geçişli LLM + deterministik kural katmanı.

Eski hattaki prep.py + triage.mjs + prep2.py + recheck.mjs + merge_cls.py beş
adımının yerini alır. Model yalnızca "ne görüyorsun" sorusunu yanıtlar; grup
kuralları burada, kodda uygulanır (A grubunda konu dışı kalmaz, D grubu başlık).
"""
from __future__ import annotations

import json

import fetch
import journals
import llm
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


def _candidates(records: list[dict], first: dict[str, dict]) -> list[dict]:
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
            out.append({"id": rec["pmid"], "payload": _payload(rec)})
    return out


MEMO = WORK / "cls_memo.json"


def _load_memo() -> dict[str, dict]:
    if MEMO.exists():
        try:
            return json.loads(MEMO.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def run(records: list[dict]) -> dict:
    WORK.mkdir(parents=True, exist_ok=True)
    memo = _load_memo()
    # Günlük kadans aynı kayıtları yedi kez görmemek için önceki kararlar saklanır.
    todo = [r for r in records if r["pmid"] not in memo]
    reused = len(records) - len(todo)
    if reused:
        print(f"  bellekten: {reused}/{len(records)} kayıt")

    first_items = [{"id": r["pmid"], "payload": _payload(r)} for r in todo]
    first_rows = llm.run_worker("triage", first_items, "classify_pass1.jsonl", MODEL_FAST)
    first = {r["id"]: r for r in first_rows if not r.get("error")}
    print(f"  birinci geçiş: {len(first)}/{len(records)}")

    second_items = _candidates(todo, first)
    second_rows = llm.run_worker("triage", second_items, "classify_pass2.jsonl", MODEL_DEEP)
    second = {r["id"]: r for r in second_rows if not r.get("error")}
    print(f"  ikinci geçiş: {len(second)}/{len(second_items)}")

    final = {r["pmid"]: memo[r["pmid"]] for r in records if r["pmid"] in memo}
    for pmid, hit in first.items():
        final[pmid] = {
            "interest": hit.get("interest") or "konu_disi",
            "cardiac": bool(hit.get("cardiac")),
            "tags": hit.get("tags") or [],
            "design": hit.get("design") or "other",
            "one_liner": hit.get("one_liner") or "",
            "source": "triage",
        }

    for pmid, hit in second.items():
        group = journals.group_of(next(r for r in records if r["pmid"] == pmid))
        interest = hit.get("interest") or "konu_disi"
        cardiac = bool(hit.get("cardiac"))
        # A grubu: hiçbir makale konu dışı bırakılmaz (kardiyak ayrı etiketlenir).
        if group == "A" and interest == "konu_disi" and not cardiac:
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
    memo.update(final)
    MEMO.write_text(json.dumps(memo, ensure_ascii=False, indent=0), encoding="utf-8")
    counts = {}
    for value in final.values():
        key = (value["interest"], value["cardiac"])
        counts[key] = counts.get(key, 0) + 1
    for key in sorted(counts):
        print(f"  {key}: {counts[key]}")
    return final
