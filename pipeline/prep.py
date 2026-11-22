#!/usr/bin/env python3
"""Ham PubMed kayitlarini triyaj girdisine donusturur."""
import csv, html, json, re

BASE = "/home/ubuntu/torakslit/pipeline/.work"
data = json.load(open(f"{BASE}/pubmed.json", encoding="utf-8"))
rows = {r["journal"]: r for r in csv.DictReader(open(
    "/home/ubuntu/torakslit/pipeline/dergi_listesi.csv", encoding="utf-8"))}


def clean(s):
    s = re.sub(r"<[^>]+>", "", s or "")
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


GROUP_RULE = {
    "A": "A grubu: torasik cerrahi cekirdek dergisi, TUM makaleler degerlendirilir. Kardiyak icerikli makale dislanmaz ama cardiac=true isaretlenir.",
    "B": "B grubu: yalnizca torasik cerrahiyle ilgili olanlar alinir. Kalp nakli, kalp kapagi, koroner ve damar calismalari dislanir (interest=konu_disi).",
    "C": "C grubu: yalnizca konu etiketlerinden birine uyan VE cerrahi yonetimle iliskili olanlar alinir; digerleri konu_disi.",
    "D": "D grubu: video ve olgu sunumu dergisi; yalnizca baslik duzeyinde listelenir (interest=video_olgu).",
    "E": "E grubu: ulusal dergi; ayni kurallar, Turkce kayitlar orijinal dilinde islenir.",
    "F": "F grubu: PubMed disi/kismi indeksli dergi; video icerik yalnizca baslik (interest=video_olgu).",
}

out = []
for r in data["records"]:
    grp = ""
    if r.get("list_journal"):
        grp = rows.get(r["list_journal"], {}).get("group", "")
    out.append({
        "pmid": r["pmid"],
        "journal": clean(r["journal"]),
        "group": grp,
        "group_rule": GROUP_RULE.get(grp, "Liste disi dergi (konu sorgusuyla bulundu); yalnizca torasik cerrahiyle dogrudan ilgili olanlar alinir."),
        "pubtypes": r["pubtypes"],
        "language": r["language"],
        "title": clean(r["title"]),
        "abstract": clean(r["abstract"])[:2200],
        "entry_date": r["entry_date"],
        "doi": r["doi"],
        "in_list": bool(r.get("from_journal_list")),
    })

json.dump(out, open(f"{BASE}/triage_input.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)

# kart uretimi ve sayi olusturma icin temiz kayit dosyasi
records = [{
    "pmid": r["pmid"], "journal": clean(r["journal"]), "title": clean(r["title"]),
    "abstract": clean(r["abstract"])[:2600], "pubtypes": r["pubtypes"],
    "entry_date": r["entry_date"], "doi": r["doi"], "issns": r["issns"],
} for r in data["records"]]
json.dump(records, open(f"{BASE}/pubmed_records.json", "w", encoding="utf-8"), ensure_ascii=False)
print("kayit:", len(out))
print("ozetsiz:", sum(1 for x in out if not x["abstract"]))
