#!/usr/bin/env python3
"""Sayi JSON'undaki kayitlara yazar, kurum ve Turkiye bilgisi ekler (PubMed efetch).

Kullanim: python3 enrich_meta.py [content/issues/YYYY-MM-DD.json]
"""
import json, os, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import affil

BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
WORK = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".work")
LISTS = ["direct", "indirect", "videoCase", "offTopic", "cardiac", "unavailable"]


def get(url, params, tries=4):
    q = urllib.parse.urlencode(params)
    for i in range(tries):
        try:
            with urllib.request.urlopen(f"{url}?{q}", timeout=120) as r:
                return r.read().decode("utf-8", "replace")
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2 * (i + 1))


def parse_meta(xml_text):
    out = {}
    root = ET.fromstring(xml_text)
    for art in root.iter("PubmedArticle"):
        pmid = art.findtext("MedlineCitation/PMID") or ""
        ac = art.find("MedlineCitation/Article")
        if ac is None:
            continue
        names, affs = [], []
        for a in ac.iter("Author"):
            ln = a.findtext("LastName") or ""
            ini = a.findtext("Initials") or ""
            coll = a.findtext("CollectiveName") or ""
            if ln:
                names.append(f"{ln} {ini}".strip())
            elif coll:
                names.append(coll)
            for ai in a.iter("AffiliationInfo"):
                t = "".join(ai.itertext())
                if t and t.strip():
                    affs.append(affil.clean(t))
        if not affs:  # bazi kayitlarda Affiliation alani dogrudan Author altinda
            for t in ac.iter("Affiliation"):
                if t.text:
                    affs.append(affil.clean("".join(t.itertext())))
        uniq, seen = [], set()
        for a in affs:
            if a.lower() not in seen:
                seen.add(a.lower())
                uniq.append(a)
        tr, evidence = affil.is_turkey(uniq)
        out[pmid] = {
            "authors": affil.display_authors(names),
            "authorCount": len(names),
            "institutions": affil.display_institutions(uniq),
            "affiliations": uniq,
            "turkey": tr,
            "turkeyEvidence": evidence,
        }
    return out


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else None
    if not path:
        dates = sorted(f[:-5] for f in os.listdir("/home/ubuntu/torakslit/content/issues") if f.endswith(".json"))
        path = f"/home/ubuntu/torakslit/content/issues/{dates[-1]}.json"
    issue = json.load(open(path, encoding="utf-8"))

    pmids = []
    for key in LISTS:
        for it in issue.get(key, []):
            p = it.get("pmid")
            if p and p not in pmids:
                pmids.append(p)
    print(f"{len(pmids)} PMID için yazar/kurum çekiliyor")

    meta = {}
    for i in range(0, len(pmids), 150):
        chunk = pmids[i:i + 150]
        meta.update(parse_meta(get(f"{BASE}/efetch.fcgi", {"db": "pubmed", "id": ",".join(chunk), "retmode": "xml"})))
        print(f"  {min(i + 150, len(pmids))}/{len(pmids)}")
        time.sleep(0.4)

    os.makedirs(WORK, exist_ok=True)
    json.dump(meta, open(f"{WORK}/meta.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    missing = 0
    turkey = 0
    for key in LISTS:
        for it in issue.get(key, []):
            m = meta.get(it.get("pmid") or "")
            if not m:
                missing += 1
                it.setdefault("authors", "belirtilmemiş")
                it.setdefault("institutions", [])
                it.setdefault("turkey", False)
                continue
            it["authors"] = m["authors"]
            it["institutions"] = m["institutions"]
            it["turkey"] = m["turkey"]
            if m["turkey"]:
                it["turkeyNote"] = m["turkeyEvidence"]
                turkey += 1
            else:
                it.pop("turkeyNote", None)

    issue.setdefault("stats", {})["turkey"] = sum(1 for it in issue.get("direct", []) if it.get("turkey"))
    issue.setdefault("stats", {})["turkeyAll"] = turkey
    json.dump(issue, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"yazıldı: {path}")
    print(f"meta: {len(meta)} | eşleşmeyen: {missing} | Türkiye: {turkey} (doğrudan: {issue['stats']['turkey']})")


if __name__ == "__main__":
    main()
