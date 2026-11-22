"""Çalışma kartı üretimi ve sayı doğrulaması.

Eski cards.mjs + verify_numbers.py ikilisinin yerini alır: model kartı yazar,
ikinci model çağrısı düzeltir, ardından sayılar burada kaynak özetle karşılaştırılır.
"""
from __future__ import annotations

import json

import journals
import llm
import rules
from config import MODEL_DEEP, WORK


def targets(records: list[dict], cls: dict) -> list[dict]:
    out = []
    for rec in records:
        hit = cls.get(rec["pmid"]) or {}
        if hit.get("interest") != "dogrudan" or hit.get("cardiac"):
            continue
        if not rules.clean(rec.get("abstract")):
            continue
        out.append({
            "id": rec["pmid"],
            "payload": {
                "dergi": journals.name_of(rec),
                "baslik": rules.clean(rec.get("title")),
                "ozet": rules.clean(rec.get("abstract"))[:2600],
                "yayin_turleri": rec.get("pubtypes") or [],
                "tasarim_ipucu": hit.get("design"),
                "konu_etiketleri": hit.get("tags") or [],
            },
        })
    return out


def verify(rows: list[dict], records: dict[str, dict]) -> list[dict]:
    """Sayı karşılaştırması: özette bulunmayan sayılar `numberMismatches` alanına yazılır."""
    checked = flagged = 0
    for row in rows:
        if row.get("error") or not row.get("card"):
            continue
        rec = records.get(row["id"])
        if not rec:
            continue
        missing = rules.numbers_missing(row["card"], rec.get("abstract") or "")
        row["numberMismatches"] = missing
        row["mismatches"] = []
        checked += 1
        if missing:
            flagged += 1
            row.setdefault("mismatches", []).extend(f"özette yok: {m}" for m in missing)
    print(f"  sayı denetimi: {checked} kart, {flagged} uyarı")
    return rows


MEMO = WORK / "cards_memo.json"


def _load_memo() -> dict[str, dict]:
    if MEMO.exists():
        try:
            return json.loads(MEMO.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def run(records: list[dict], cls: dict) -> dict[str, dict]:
    WORK.mkdir(parents=True, exist_ok=True)
    memo = _load_memo()
    items = targets(records, cls)
    # Günlük kadansta aynı kart yedi kez yazılmasın: önceki kartlar yeniden kullanılır.
    todo = [i for i in items if i["id"] not in memo]
    reused = [memo[i["id"]] for i in items if i["id"] in memo]
    if reused:
        print(f"  bellekten: {len(reused)}/{len(items)} kart")
    fresh = llm.run_worker("cards", todo, "cards.jsonl", MODEL_DEEP) if todo else []
    rows = reused + fresh
    by_pmid = {r["pmid"]: r for r in records}
    rows = verify(rows, by_pmid)
    (WORK / "cards.jsonl").write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + "\n", encoding="utf-8")
    cards = {r["id"]: r for r in rows if not r.get("error") and r.get("card")}
    memo.update({r["id"]: r for r in rows if not r.get("error") and r.get("card")})
    MEMO.write_text(json.dumps(memo, ensure_ascii=False), encoding="utf-8")
    print(f"  kart: {len(cards)}/{len(items)}")
    return cards
