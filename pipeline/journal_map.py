#!/usr/bin/env python3
"""PubMed kayitlarini ISSN uzerinden dergi listesine eslestirir."""
import csv, json

CSV_PATH = "/home/ubuntu/torakslit/pipeline/dergi_listesi.csv"


def load_map():
    rows = list(csv.DictReader(open(CSV_PATH, encoding="utf-8")))
    by_issn = {}
    for r in rows:
        issns = [r["issn_print"], r["issn_electronic"]] + (r.get("former_issn") or "").split(";")
        for i in issns:
            i = (i or "").strip()
            if i:
                by_issn[i] = r
    return rows, by_issn


def canonical(record, by_issn):
    for i in record.get("issns") or []:
        if i in by_issn:
            return by_issn[i]
    return None
