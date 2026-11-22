#!/usr/bin/env python3
"""Ikinci gecis siniflandirma girdisi: dogru grup bilgisi + hedef secimi."""
import html, json, re, sys

sys.path.insert(0, "/home/ubuntu/torakslit/pipeline")
from journal_map import load_map, canonical

BASE = "/home/ubuntu/torakslit/pipeline/.work"
rows, by_issn = load_map()

data = json.load(open(f"{BASE}/pubmed.json", encoding="utf-8"))
triage = {}
for line in open(f"{BASE}/triage_out.jsonl", encoding="utf-8"):
    r = json.loads(line)
    if not r.get("error"):
        triage[r["pmid"]] = r

GROUP_RULE = {
    "A": "A grubu: torasik cerrahi cekirdek dergisi, TUM makaleler degerlendirilir. Kardiyak icerikli makale dislanmaz ama cardiac=true isaretlenir ve raporun sonunda tek satir olarak listelenir.",
    "B": "B grubu: yalnizca torasik cerrahiyle ilgili olanlar alinir. Kalp nakli, kalp kapagi, koroner ve damar calismalari konu_disi sayilir.",
    "C": "C grubu: yalnizca konu etiketlerinden birine uyan VE cerrahi yonetimle iliskili olanlar alinir; digerleri konu_disi.",
    "D": "D grubu: video ve olgu sunumu dergisi; yalnizca baslik duzeyinde listelenir (interest=video_olgu).",
    "E": "E grubu: ulusal dergi; ayni kurallar.",
}

KW = re.compile(r"(lobectom|segmentectom|pneumonectom|esophagectom|oesophagectom|thymectom|thoracoscop|thoracotom|uniportal|decorticat|lung transplant|chest wall resection|rib fixation|tracheal resection|sleeve resection)", re.I)


def clean(s):
    s = re.sub(r"<[^>]+>", "", s or "")
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


out = []
for r in data["records"]:
    t = triage.get(r["pmid"])
    if not t:
        continue
    row = canonical(r, by_issn)
    grp = row["group"] if row else ""
    jname = row["journal"] if row else clean(r["journal"])
    interest = t["interest"]
    target = interest in ("dogrudan", "dolayli") or (interest == "konu_disi" and KW.search(r["title"] + " " + r["abstract"]))
    if not target:
        continue
    out.append({
        "pmid": r["pmid"],
        "journal": jname,
        "group": grp or "liste_disi",
        "group_rule": GROUP_RULE.get(grp, "Liste disi dergi (konu sorgusuyla bulundu); yalnizca torasik cerrahiyle dogrudan ilgili olanlar alinir."),
        "pubtypes": r["pubtypes"],
        "title": clean(r["title"]),
        "abstract": clean(r["abstract"])[:2400],
        "prev_interest": interest,
        "prev_design": t.get("design"),
    })

json.dump(out, open(f"{BASE}/recheck_input.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print("hedef:", len(out))
from collections import Counter
print(Counter((o["group"], o["prev_interest"]) for o in out))
