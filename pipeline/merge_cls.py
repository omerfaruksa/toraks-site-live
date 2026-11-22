#!/usr/bin/env python3
"""Triyaj + ikinci gecis -> nihai siniflandirma.

Kural: A grubu dergilerde hicbir makale "konu disi" sayilmaz (protokol: tum makaleler
degerlendirilir). Cerrahi degisken yoksa "dolayli" olur; kardiyak icerik cardiac=true kalir.
"""
import json

BASE = "/home/ubuntu/torakslit/pipeline/.work"
final = {}
for line in open(f"{BASE}/triage_out.jsonl", encoding="utf-8"):
    r = json.loads(line)
    if r.get("error"):
        continue
    final[r["pmid"]] = {
        "interest": r["interest"], "cardiac": r.get("cardiac", False),
        "tags": r.get("tags") or [], "design": r.get("design") or "other",
        "one_liner": r.get("one_liner") or "", "source": "triage",
    }

group = {r["pmid"]: r["group"] for r in json.load(open(f"{BASE}/recheck_input.json", encoding="utf-8"))}

over = 0
for line in open(f"{BASE}/recheck_out.jsonl", encoding="utf-8"):
    r = json.loads(line)
    if r.get("error"):
        continue
    interest = r["interest"]
    cardiac = r["cardiac"]
    prev = final.get(r["pmid"], {})
    if group.get(r["pmid"]) == "A" and interest == "konu_disi" and not cardiac:
        interest = "dolayli"
    final[r["pmid"]] = {
        "interest": interest, "cardiac": cardiac,
        "tags": r.get("tags") or [], "design": r.get("design") or "other",
        "one_liner": r.get("one_liner") or (prev.get("one_liner") if interest == "dolayli" else "") or "",
        "source": "recheck",
    }
    over += 1

json.dump(final, open(f"{BASE}/final_cls.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)

from collections import Counter
c = Counter((v["interest"], v["cardiac"]) for v in final.values())
print("toplam", len(final), "| ikinci gecis", over)
for k, v in sorted(c.items()):
    print(" ", k, v)
