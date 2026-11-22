#!/usr/bin/env python3
"""Nihai siniflandirma + kart + arastirma verisinden yayin sayisi JSON'u uretir."""
import json, os, sys, urllib.parse, urllib.request, xml.etree.ElementTree as ET
from collections import Counter
from datetime import date as _date, datetime, timedelta, timezone
import re

sys.path.insert(0, "/home/ubuntu/torakslit/pipeline")
from journal_map import load_map, canonical

DATE = os.environ.get("DATE", "2026-11-22")
START = os.environ.get("WINDOW_START", "2026-11-15")
END = os.environ.get("WINDOW_END", DATE)

AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz",
         "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]


def period_label(start, end):
    s, e = _date.fromisoformat(start), _date.fromisoformat(end)
    if s.month == e.month and s.year == e.year:
        return f"{s.day}–{e.day} {AYLAR[e.month - 1]} {e.year}"
    return f"{s.day} {AYLAR[s.month - 1]} – {e.day} {AYLAR[e.month - 1]} {e.year}"


PERIOD = period_label(START, END)
BASE = "/home/ubuntu/torakslit/pipeline/.work"
OUT = f"/home/ubuntu/torakslit/content/issues/{DATE}.json"

TRIAL_IDS = ["NCT07944469", "NCT07941466", "NCT07941713", "NCT07939997",
             "NCT07949123", "NCT07950865"]

STATUS_TR = {
    "RECRUITING": "Kayıt açık", "NOT_YET_RECRUITING": "Henüz kayıt almıyor",
    "ENROLLING_BY_INVITATION": "Davetle kayıt", "ACTIVE_NOT_RECRUITING": "Aktif, kayıt almıyor",
    "COMPLETED": "Tamamlandı", "SUSPENDED": "Askıda", "TERMINATED": "Sonlandırıldı",
    "WITHDRAWN": "Geri çekildi", "UNKNOWN": "Bilinmiyor",
}
PHASE_TR = {"PHASE1": "Faz 1", "PHASE2": "Faz 2", "PHASE3": "Faz 3", "PHASE4": "Faz 4",
            "EARLY_PHASE1": "Erken Faz 1", "NA": "Uygulanamaz", "": "belirtilmemiş"}

rows, by_issn = load_map()
records = {r["pmid"]: r for r in json.load(open(f"{BASE}/pubmed_records.json", encoding="utf-8"))}
cls = json.load(open(f"{BASE}/final_cls.json", encoding="utf-8"))

cards = {}
for line in open(f"{BASE}/cards.jsonl", encoding="utf-8"):
    r = json.loads(line)
    if not r.get("error") and r.get("card"):
        cards[r["pmid"]] = r


def journal_name(pmid):
    row = canonical(records[pmid], by_issn)
    return row["journal"] if row else records[pmid]["journal"]


# ---- PMC kontrolu (acik tam metin) ----
direct_pmids = [p for p, c in cls.items() if c["interest"] == "dogrudan" and not c["cardiac"]]
pmc = {}
for i in range(0, len(direct_pmids), 120):
    url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?" + urllib.parse.urlencode(
        {"db": "pubmed", "id": ",".join(direct_pmids[i:i + 120]), "retmode": "xml"})
    with urllib.request.urlopen(url, timeout=120) as f:
        root = ET.fromstring(f.read().decode("utf-8", "replace"))
    for art in root.iter("PubmedArticle"):
        pmid = art.findtext("MedlineCitation/PMID") or ""
        for aid in art.iter("ArticleId"):
            if aid.get("IdType") == "pmc" and aid.text:
                pmc[pmid] = aid.text.strip()

direct, indirect, video_case, off_topic, cardiac, unavailable = [], [], [], [], [], []

THORACIC = re.compile(
    r"(lung|pulmonar|pneumon|thorac|pleur|mediastin|thym|esophag|oesophag|chest wall|"
    r"\brib\b|diaphragm|trachea|tracheal|bronch|airway|hilar|hilum|segmentectom|lobectom|"
    r"VATS|mesotheliom|aspergillom|bronchiectas|hydatid|pectus|sternum|empyema|"
    r"lung transplant|air leak|hemothorax|pneumothorax)", re.I)


def is_thoracic(pmid):
    r = records[pmid]
    return bool(THORACIC.search(r["title"] or "") or THORACIC.search(r.get("abstract") or ""))

SURGICAL = re.compile(
    r"(lobectom|segmentectom|pneumonectom|esophagectom|oesophagectom|thymectom|thoracoscop|"
    r"thoracotom|uniportal|VATS|RATS|decorticat|lung transplant|transplantation|"
    r"chest wall resection|rib fixation|mediastinoscop|tracheal resection|sleeve resection|"
    r"bullectomy|sympathectomy|Nuss|fundoplication|hiatal hernia|diaphragmatic hernia|"
    r"carinal resection|bronchoplastic|surgical resection|operative|perioperative|"
    r"postoperative|reoperation|anastomotic)", re.I)

LISTED = {r["journal"] for r in rows}


def listed_journal(pmid):
    return journal_name(pmid) in LISTED


def group_of(pmid):
    row = canonical(records[pmid], by_issn)
    return row["group"] if row else ""


def is_surgical_text(pmid):
    r = records[pmid]
    return bool(SURGICAL.search(r["title"] or "") or SURGICAL.search(r.get("abstract") or ""))


def is_protocol(pmid):
    r = records[pmid]
    return bool(re.search(r"\bprotocol\b|protokol", (r["title"] or ""), re.I))


def title_item(pmid):
    r = records[pmid]
    return {
        "title": r["title"],
        "journal": journal_name(pmid),
        "date": r.get("entry_date") or "",
        "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
        "pmid": pmid,
    }


for pmid, c in cls.items():
    r = records.get(pmid)
    if not r:
        continue
    interest = c["interest"]
    if c["cardiac"]:
        cardiac.append(title_item(pmid))
        continue
    if interest == "dogrudan":
        card = cards.get(pmid)
        if not card or not r.get("abstract"):
            item = title_item(pmid)
            item["note"] = "Tam metne erişilemedi; kart yazılmadı."
            unavailable.append(item)
            continue
        if not is_thoracic(pmid):
            off_topic.append(title_item(pmid))
            continue
        if not listed_journal(pmid) and not is_surgical_text(pmid):
            off_topic.append(title_item(pmid))
            continue
        if group_of(pmid) == "C" and not THORACIC.search(r["title"] or ""):
            off_topic.append(title_item(pmid))
            continue
        if is_protocol(pmid) and card["card"].get("mainResult", "").startswith("belirtilmemiş"):
            item = title_item(pmid)
            item["note"] = "Çalışma protokolü; sonuç bildirilmemiş."
            unavailable.append(item)
            continue
        cd = card["card"]
        title_tr = cd["titleTr"].strip()
        if not title_tr or title_tr.lower().startswith("belirtilmemi"):
            title_tr = r["title"]
        direct.append({
            "id": pmid,
            "titleTr": title_tr,
            "titleOrig": r["title"],
            "journal": journal_name(pmid),
            "entryDate": r.get("entry_date") or "",
            "pmid": pmid,
            "doi": r.get("doi") or "",
            "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
            "tags": c["tags"],
            "access": "open" if pmid in pmc else "abstract",
            "design": c["design"],
            "designLabel": cd["designLabel"],
            "summary": cd["summary"],
            "sample": cd["sample"],
            "comparison": cd["comparison"],
            "outcomes": cd["outcomes"],
            "mainResult": cd["mainResult"],
            "followUp": cd["followUp"],
            "dataPeriod": cd["dataPeriod"],
            "verified": not card.get("mismatches"),
            "note": "",
        })
    elif interest == "dolayli":
        indirect.append({
            "id": pmid,
            "title": r["title"],
            "journal": journal_name(pmid),
            "pmid": pmid,
            "doi": r.get("doi") or "",
            "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
            "oneLiner": c["one_liner"],
            "tags": c["tags"],
        })
    elif interest == "video_olgu":
        item = title_item(pmid)
        pt = " ".join(r.get("pubtypes") or [])
        jn = item["journal"]
        item["kind"] = "video" if ("Video-Audio Media" in pt or "MMCTS" in jn or "Visualized Surgery" in jn
                                  or "Video-Assisted Thoracic Surgery" in jn) else "case"
        video_case.append(item)
    else:
        off_topic.append(title_item(pmid))

# ---- arastirmalar ----
trials_raw = {t["nct"]: t for t in json.load(open(f"{BASE}/trials_raw.json", encoding="utf-8"))}
trials = []
for nid in TRIAL_IDS:
    t = trials_raw.get(nid)
    if not t:
        continue
    trials.append({
        "nct": nid,
        "title": t["title"],
        "phase": PHASE_TR.get((t["phase"] or "").split(",")[0].strip(), t["phase"] or "belirtilmemiş"),
        "status": STATUS_TR.get(t["status"], t["status"]),
        "dates": f"İlk kayıt {t['firstPost']}" + (f" · sonuç {t['resultsPost']}" if t.get("resultsPost") else ""),
        "enrollment": t["enrollment"] or "belirtilmemiş",
        "primary": t["primary"] or "belirtilmemiş",
        "sponsor": " / ".join([x for x in [t["sponsor"], ", ".join(t["countries"])] if x]),
    })

# ---- dergi sayilari ----
jcount = Counter(journal_name(p) for p in records)
listed = [r["journal"] for r in rows]
journals = [{"name": n, "group": next((r["group"] for r in rows if r["journal"] == n), ""),
             "count": jcount.get(n, 0)} for n in listed]
journals.sort(key=lambda x: (-x["count"], x["name"]))
external = [n for n in jcount if n not in listed]

empty = [r["journal"] for r in rows if jcount.get(r["journal"], 0) == 0 and (r["issn_print"] or r["issn_electronic"])]
nonpubmed = [r["journal"] for r in rows if not (r["issn_print"] or r["issn_electronic"])]

issue = {
    "date": DATE,
    "windowStart": START,
    "windowEnd": END,
    "periodLabel": PERIOD,
    "generatedAt": datetime.now(timezone(timedelta(hours=3))).isoformat(timespec="seconds"),
    "stats": {
        "scanned": len(records),
        "direct": len(direct),
        "indirect": len(indirect),
        "offTopic": len(off_topic),
        "trials": len(trials),
        "journalsScanned": len(rows),
        "journalsWithRecords": len([j for j in journals if j["count"] > 0]),
        "externalRecords": sum(jcount[n] for n in external),
        "externalJournals": len(external),
    },
    "journals": journals,
    "direct": direct,
    "trials": trials,
    "indirect": indirect,
    "videoCase": video_case,
    "offTopic": off_topic,
    "cardiac": cardiac,
    "unavailable": unavailable,
    "sources": {
        "scanned": [
            "PubMed — dergi bazlı tarama: 58 derginin tüm ISSN'leri (basılı, e-ISSN, eski ISSN) + [edat]",
            "PubMed — konu sorgusu (MeSH + [tiab]) ile liste dışı dergiler",
            "ClinicalTrials.gov — StudyFirstPostDate ve ResultsFirstPostDate",
            "Europe PMC — ön baskılar (SRC:PPR)",
            "Crossref — kaynak_esleme.csv'deki dergiler için DOI kayıtları (online ve basılı yayın tarihi)",
            "Dergi RSS — Elsevier akışları (Seminars in TCVS, JTCVS Open, JTCVS Techniques, Operative Techniques)",
            "A grubu dergilerde kardiyak içerik ayrı listelendi",
        ],
        "failed": [
            "TR Dizin — arama API'si kimlik doğrulama istiyor (yonetim.trdizin.gov.tr HTTP 401); OAI-PMH ve toplu indirme yolu bulunamadı. TR Dizin dergileri Crossref DOI kayıtları üzerinden izleniyor.",
            "F grubu dergi siteleri (MMCTS, JOVS, VATS, Shanghai Chest, Respiratory Case Reports, Open Journal of Thoracic Surgery) — RSS akışı alınamadı; yalnızca PubMed kayıtları değerlendirildi",
        ],
        "empty": empty,
        "note": "PubMed'de indeksli olmayan ulusal dergiler bu sayıda taranamadı: " + ", ".join(nonpubmed) + ".",
    },
}

json.dump(issue, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# --- sayi dizinini guncelle ---
INDEX = "/home/ubuntu/torakslit/content/index.json"
try:
    index = json.load(open(INDEX, encoding="utf-8"))
except Exception:
    index = []
index = [x for x in index if x.get("date") != DATE]
index.append({
    "date": DATE,
    "periodLabel": PERIOD,
    "direct": len(direct),
    "indirect": len(indirect),
    "scanned": len(records),
    "trials": len(trials),
})
index.sort(key=lambda x: x["date"], reverse=True)
json.dump(index, open(INDEX, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("yazildi:", OUT)
print(issue["stats"])
print("erisilemedi:", len(unavailable), "| kardiyak:", len(cardiac), "| video/olgu:", len(video_case))
print("bos dergi:", len(empty))
