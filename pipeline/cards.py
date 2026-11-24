"""Çalışma kartı üretimi ve sayı doğrulaması.

Eski cards.mjs + verify_numbers.py ikilisinin yerini alır: model kartı yazar,
ikinci model çağrısı düzeltir, ardından sayılar burada kaynak özetle karşılaştırılır.
"""
from __future__ import annotations

import json

import journals
import llm
import memo
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
    checked = flagged = untranslated = 0
    for row in rows:
        if row.get("error") or not row.get("card"):
            continue
        rec = records.get(row["id"])
        if not rec:
            continue
        card = row["card"]
        # Kural: Türkçe başlık zorunlu. Model başlığı çevirmeden bırakırsa görünür olsun.
        same_title = (str(card.get("titleTr") or "").strip().lower()
                      == str(card.get("titleOrig") or "").strip().lower())
        row["titleUntranslated"] = bool(card.get("titleTr")) and same_title
        if row["titleUntranslated"]:
            untranslated += 1
        missing = rules.numbers_missing(row["card"], rec.get("abstract") or "")
        row["numberMismatches"] = missing
        row["mismatches"] = []
        checked += 1
        if missing:
            flagged += 1
            row.setdefault("mismatches", []).extend(f"özette yok: {m}" for m in missing)
    print(f"  sayı denetimi: {checked} kart, {flagged} uyarı")
    if untranslated:
        print(f"  çeviri denetimi: {untranslated} kart başlığı çevrilmemiş")
    return rows


MEMO = "cards_memo.json"


def run(records: list[dict], cls: dict) -> dict[str, dict]:
    WORK.mkdir(parents=True, exist_ok=True)
    memory = memo.load(MEMO)
    items = targets(records, cls)
    # Günlük kadansta aynı kart yedi kez yazılmasın: önceki kartlar yeniden kullanılır.
    todo, cached = memo.partition(items, memory)
    if cached:
        print(f"  bellekten: {len(cached)}/{len(items)} kart")
    fresh = llm.run_worker("cards", todo, "cards.jsonl", MODEL_DEEP) if todo else []
    # Pencere dışına çıkan kayıtların kartları dosyada kalmasın: işçi dosyayı
    # baştan okuduğu için eski satırlar denetim sayısını şişiriyordu.
    keep = {item["id"] for item in items}
    fresh = [row for row in fresh if (row.get("id") or row.get("pmid")) in keep]
    by_pmid = {r["pmid"]: r for r in records}
    rows = verify(list(cached.values()) + fresh, by_pmid)
    (WORK / "cards.jsonl").write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + "\n", encoding="utf-8")
    cards = {r["id"]: r for r in rows if not r.get("error") and r.get("card")}
    payloads = {item["id"]: item["payload"] for item in items}
    memory.update({memo.key(pmid, payloads[pmid]): row
                   for pmid, row in cards.items() if pmid in payloads})
    memo.save(MEMO, memory)
    print(f"  kart: {len(cards)}/{len(items)}")
    return cards
