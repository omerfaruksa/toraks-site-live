#!/usr/bin/env python3
"""Gogus cerrahisi literatur taramasi - PubMed kayit toplama.

Protokol: dergi_listesi.csv'deki tum ISSN'ler + [edat] penceresi.
"""
import csv, json, os, sys, time, urllib.parse, urllib.request, xml.etree.ElementTree as ET

BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
START = os.environ.get("WINDOW_START", "2026-11-15")
END = os.environ.get("WINDOW_END", "2026-11-22")
OUT = "/home/ubuntu/torakslit/pipeline/.work"
os.makedirs(OUT, exist_ok=True)


def get(url, params, tries=4):
    q = urllib.parse.urlencode(params)
    for i in range(tries):
        try:
            with urllib.request.urlopen(f"{url}?{q}", timeout=90) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:  # noqa
            if i == tries - 1:
                raise
            time.sleep(2 * (i + 1))


def esearch(term, retmax=400):
    txt = get(f"{BASE}/esearch.fcgi", {"db": "pubmed", "term": term, "retmax": retmax, "retmode": "json"})
    return json.loads(txt)["esearchresult"]["idlist"]


def efetch(pmids):
    if not pmids:
        return ""
    return get(f"{BASE}/efetch.fcgi", {"db": "pubmed", "id": ",".join(pmids), "retmode": "xml"})


def txt(el, path):
    if el is None:
        return ""
    x = el.find(path)
    return "".join(x.itertext()).strip() if x is not None else ""


def parse(xml_text):
    recs = []
    if not xml_text.strip():
        return recs
    root = ET.fromstring(xml_text)
    for art in root.iter("PubmedArticle"):
        pmid = txt(art, "MedlineCitation/PMID")
        mc = art.find("MedlineCitation")
        ac = mc.find("Article") if mc is not None else None
        if ac is None:
            continue
        title = txt(ac, "ArticleTitle")
        jr = ac.find("Journal")
        jtitle = txt(jr, "Title")
        abbrev = txt(jr, "ISOAbbreviation")
        issns = [e.text for e in jr.iter("ISSN") if e.text] if jr is not None else []
        # abstract
        abs_parts = []
        for ab in ac.iter("AbstractText"):
            label = ab.get("Label") or ""
            body = "".join(ab.itertext()).strip()
            if body:
                abs_parts.append(f"{label}: {body}" if label else body)
        abstract = "\n".join(abs_parts)
        # ids
        doi = ""
        for aid in art.iter("ArticleId"):
            if aid.get("IdType") == "doi" and aid.text:
                doi = aid.text.strip()
        # dates
        pubdate = ""
        pd = jr.find("JournalIssue/PubDate") if jr is not None else None
        if pd is not None:
            y = txt(pd, "Year"); m = txt(pd, "Month"); d = txt(pd, "Day")
            pubdate = "-".join([p for p in [y, m, d] if p])
        article_date = ""
        ad = ac.find("ArticleDate")
        if ad is not None:
            article_date = "-".join([txt(ad, "Year"), txt(ad, "Month"), txt(ad, "Day")])
        edat = ""
        for h in art.iter("PubMedPubDate"):
            if h.get("PubStatus") == "entrez":
                edat = "-".join([txt(h, "Year"), txt(h, "Month"), txt(h, "Day")])
        ptypes = [p.text for p in ac.iter("PublicationType") if p.text]
        lang = txt(ac, "Language")
        authors = []
        for a in ac.iter("Author"):
            ln = txt(a, "LastName"); ini = txt(a, "Initials")
            if ln:
                authors.append(f"{ln} {ini}".strip())
        vol = txt(jr, "JournalIssue/Volume")
        iss = txt(jr, "JournalIssue/Issue")
        pg = txt(ac, "Pagination/MedlinePgn")
        recs.append({
            "pmid": pmid, "title": title, "journal": jtitle, "abbrev": abbrev,
            "issns": issns, "abstract": abstract, "doi": doi,
            "pubdate": pubdate, "article_date": article_date, "entry_date": edat,
            "pubtypes": ptypes, "language": lang, "authors": authors,
            "volume": vol, "issue": iss, "pages": pg,
        })
    return recs


def main():
    rows = list(csv.DictReader(open("/home/ubuntu/torakslit/pipeline/dergi_listesi.csv", encoding="utf-8")))
    per_journal = {}
    all_ids = {}
    for r in rows:
        issns = [r["issn_print"], r["issn_electronic"]] + r.get("former_issn", "").split(";")
        issns = [i.strip() for i in issns if i and i.strip()]
        if not issns:
            continue
        clause = " OR ".join(f'"{i}"[ISSN]' for i in issns)
        term = f"({clause}) AND (\"{START}\"[edat] : \"{END}\"[edat])"
        try:
            ids = esearch(term)
        except Exception as e:
            print("ERR", r["journal"], e, file=sys.stderr)
            ids = []
        per_journal[r["journal"]] = {"group": r["group"], "ids": ids}
        for i in ids:
            all_ids.setdefault(i, r["journal"])
        print(f'{r["group"]:2} {len(ids):3}  {r["journal"]}')
        time.sleep(0.35)

    # topic-based search for out-of-list journals
    TOPIC = """(("Thoracic Surgery"[MeSH] OR "Thoracic Surgical Procedures"[MeSH] OR "Pneumonectomy"[MeSH]
  OR "Thoracoscopy"[MeSH] OR "Lung Transplantation"[MeSH] OR "Esophagectomy"[MeSH]
  OR "Mediastinal Neoplasms/surgery"[MeSH] OR "Thoracic Injuries"[MeSH]
  OR "Thoracic Wall/surgery"[MeSH] OR "Lung Neoplasms/surgery"[MeSH]
  OR "Robotic Surgical Procedures"[MeSH] OR "Tracheal Diseases/surgery"[MeSH])
 OR (lobectomy[tiab] OR segmentectomy[tiab] OR pneumonectomy[tiab] OR "sleeve resection"[tiab]
  OR uniportal[tiab] OR "video-assisted thoracoscopic"[tiab] OR VATS[tiab] OR RATS[tiab]
  OR thymectomy[tiab] OR thymoma[tiab] OR esophagectomy[tiab] OR "chest wall resection"[tiab]
  OR empyema[tiab] OR decortication[tiab] OR "lung transplant"[tiab] OR "tracheal resection"[tiab]
  OR "diaphragmatic hernia"[tiab] OR "rib fracture"[tiab] OR "surgical stabilization"[tiab]
  OR "air leak"[tiab] OR "enhanced recovery"[tiab]))"""
    topic_term = f"{TOPIC} AND (\"{START}\"[edat] : \"{END}\"[edat])"
    topic_ids = esearch(topic_term, retmax=1000)
    print(f"TOPIC total {len(topic_ids)}")

    known = set(all_ids)
    extra = [i for i in topic_ids if i not in known]

    ids_all = list(all_ids) + extra
    recs = []
    for k in range(0, len(ids_all), 150):
        chunk = ids_all[k:k + 150]
        recs.extend(parse(efetch(chunk)))
        time.sleep(0.4)
    for r in recs:
        r["from_journal_list"] = r["pmid"] in known
        r["list_journal"] = all_ids.get(r["pmid"], "")
    json.dump({"window": [START, END], "per_journal": per_journal, "records": recs},
              open(f"{OUT}/pubmed.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"records: {len(recs)} (liste ici {len(known)}, konu ek {len(extra)})")


if __name__ == "__main__":
    main()
