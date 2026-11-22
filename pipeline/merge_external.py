#!/usr/bin/env python3
"""Crossref/RSS kayitlarini sayi JSON'una ekler.

Kart uretilmez: bu kaynaklarda ozet metni cogu zaman yok; yalnizca baslik duzeyinde listelenir.
"""
import csv, json, os, sys

BASE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(BASE, ".work")

INTEREST_TR = {"dogrudan": "Doğrudan", "dolayli": "Dolaylı", "konu_disi": "Konu dışı",
               "video_olgu": "Video/olgu", "kardiyak": "Kardiyak içerik"}
ORDER = {"dogrudan": 0, "video_olgu": 1, "dolayli": 2, "konu_disi": 3, "kardiyak": 4}


def journal_groups():
    """dergi_listesi.csv -> {dergi adi: grup harfi}"""
    path = os.path.join(BASE, "dergi_listesi.csv")
    try:
        rows = list(csv.DictReader(open(path, encoding="utf-8")))
    except FileNotFoundError:
        return {}
    return {r["journal"].strip(): (r.get("group") or "").strip() for r in rows}


def main():
    issue_path = sys.argv[1] if len(sys.argv) > 1 else None
    if not issue_path:
        dates = sorted(f[:-5] for f in os.listdir("/home/ubuntu/torakslit/content/issues") if f.endswith(".json"))
        issue_path = f"/home/ubuntu/torakslit/content/issues/{dates[-1]}.json"
    issue = json.load(open(issue_path, encoding="utf-8"))

    try:
        items = json.load(open(f"{WORK}/external_cls.json", encoding="utf-8"))
    except FileNotFoundError:
        items = []

    known = set()
    for key in ("direct", "indirect", "videoCase", "offTopic", "cardiac", "unavailable"):
        for it in issue.get(key, []):
            if it.get("doi"):
                known.add(it["doi"].lower())

    groups = journal_groups()
    out = []
    for it in items:
        if (it.get("doi") or "").lower() in known:
            continue
        interest = it.get("interest") or ""
        # A grubu kurali: kardiyak icerik dislanmaz, etiketlenir ve listenin sonunda tek satir olarak verilir.
        if it.get("cardiac") and groups.get(it.get("journal", "").strip()) == "A":
            interest = "kardiyak"
        out.append({
            "titleTr": (it.get("title_tr") or "").strip(),
            "title": it["title"],
            "journal": it["journal"],
            "date": it.get("date") or "",
            "dateBasis": it.get("dateBasis") or "",
            "doi": it.get("doi") or "",
            "url": it.get("url") or "",
            "authors": it.get("authors") or "belirtilmemiş",
            "institutions": it.get("institutions") or [],
            "turkey": bool(it.get("turkey")),
            "interest": interest,
            "interestLabel": INTEREST_TR.get(interest, ""),
            "tags": it.get("tags") or [],
            "oneLiner": "" if interest == "kardiyak" else (it.get("one_liner") or ""),
            "source": "Crossref" if it.get("source") == "crossref" else "RSS",
            "note": "Özet metnine erişilemedi; yalnızca başlık düzeyinde listelendi."
            if not (it.get("abstract") or "").strip() else "",
        })

    out.sort(key=lambda r: ORDER.get(r["interest"], 9))
    issue["external"] = out
    issue.setdefault("stats", {})["external"] = len(out)
    json.dump(issue, open(issue_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"external: {len(out)} kayıt eklendi -> {issue_path}")


if __name__ == "__main__":
    main()
