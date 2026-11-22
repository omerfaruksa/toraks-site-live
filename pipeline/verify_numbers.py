#!/usr/bin/env python3
"""Kartlardaki sayilarin ozet metninde bulunup bulunmadigini denetler."""
import json, re

BASE = "/home/ubuntu/torakslit/pipeline/.work"
records = {r["pmid"]: r for r in json.load(open(f"{BASE}/pubmed_records.json", encoding="utf-8"))}
cards = [json.loads(l) for l in open(f"{BASE}/cards.jsonl", encoding="utf-8") if l.strip()]

FIELDS = ["sample", "comparison", "outcomes", "mainResult", "followUp", "dataPeriod"]
NUM = re.compile(r"\d+(?:[.,]\d+)?")

problems = []
checked = 0
for c in cards:
    if c.get("error"):
        continue
    abstract = records[c["pmid"]]["abstract"]
    norm_abs = abstract.replace(",", ".").replace(" ", "")
    for f in FIELDS:
        val = c["card"][f]
        if val.strip().lower().startswith("belirtilmemi"):
            continue
        for tok in NUM.findall(val):
            if len(tok.replace(".", "")) <= 1 and tok not in ("0", "1", "2", "3", "4", "5"):
                continue
            variants = {tok, tok.replace(",", "."), tok.replace(".", ",")}
            if not any(v.replace(" ", "") in norm_abs for v in variants):
                problems.append((c["pmid"], f, tok, val[:90]))
        checked += 1

print(f"denetlenen alan: {checked}, bulunamayan sayi: {len(problems)}")
for p in problems[:25]:
    print(" ", p)
