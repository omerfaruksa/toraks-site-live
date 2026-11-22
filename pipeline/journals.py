"""Dergi kaydı: dergi_listesi.csv ve kaynak_esleme.csv tek yerden okunur."""
from __future__ import annotations

import csv
from functools import lru_cache

from config import JOURNALS_CSV, SOURCES_CSV

GROUP_RULE = {
    "A": "A grubu: torasik cerrahi çekirdek dergisi; tüm makaleler değerlendirilir. "
         "Kardiyak içerik dışlanmaz, cardiac=true işaretlenir.",
    "B": "B grubu: yalnızca torasik cerrahiyle ilgili makaleler alınır; kalp nakli, kapak, "
         "koroner ve damar çalışmaları konu_disi sayılır.",
    "C": "C grubu: yalnızca konu etiketlerinden birine uyan ve cerrahi yönetimle ilişkili "
         "makaleler alınır; diğerleri konu_disi.",
    "D": "D grubu: video ve olgu sunumu dergisi; yalnızca başlık düzeyinde listelenir.",
    "E": "E grubu: ulusal dergi; aynı kurallar, Türkçe kayıtlar orijinal dilinde işlenir.",
    "F": "F grubu: PubMed dışı/kısmi indeksli dergi; video içerik yalnızca başlık düzeyinde.",
}
LISTE_DISI_RULE = ("Liste dışı dergi (konu sorgusuyla bulundu); yalnızca torasik cerrahiyle "
                   "doğrudan ilgili makaleler alınır.")


@lru_cache(maxsize=1)
def rows() -> tuple[dict, ...]:
    with open(JOURNALS_CSV, encoding="utf-8") as fh:
        return tuple(csv.DictReader(fh))


@lru_cache(maxsize=1)
def by_issn() -> dict[str, dict]:
    index = {}
    for row in rows():
        for issn in issns_of(row):
            index[issn] = row
    return index


@lru_cache(maxsize=1)
def by_name() -> dict[str, dict]:
    return {row["journal"].strip(): row for row in rows()}


@lru_cache(maxsize=1)
def source_map() -> dict[str, dict]:
    try:
        with open(SOURCES_CSV, encoding="utf-8") as fh:
            return {r["journal"].strip(): r for r in csv.DictReader(fh)}
    except FileNotFoundError:
        return {}


def issns_of(row: dict) -> list[str]:
    raw = [row.get("issn_print", ""), row.get("issn_electronic", "")]
    raw += (row.get("former_issn") or "").split(";")
    return [i.strip() for i in raw if i and i.strip()]


def issn_clause(row: dict) -> str:
    return " OR ".join(f'"{i}"[ISSN]' for i in issns_of(row))


def canonical(record: dict) -> dict | None:
    for issn in record.get("issns") or []:
        hit = by_issn().get(issn)
        if hit:
            return hit
    return None


def name_of(record: dict) -> str:
    hit = canonical(record)
    return hit["journal"] if hit else (record.get("journal") or "").strip()


def group_of(record: dict) -> str:
    hit = canonical(record)
    return (hit.get("group") or "").strip() if hit else ""


def group_rule(group: str) -> str:
    return GROUP_RULE.get(group, LISTE_DISI_RULE)


def listed_names() -> set[str]:
    return {row["journal"].strip() for row in rows()}


def nonpubmed_names() -> list[str]:
    return [row["journal"] for row in rows()
            if not (row.get("issn_print") or row.get("issn_electronic"))]
