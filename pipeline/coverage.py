#!/usr/bin/env python3
"""Dergi bazli kapsama tablosu: PubMed'de var mi, son 30 gunde kayit, son kayit tarihi, ek kaynak."""
import csv, datetime as dt, json, os, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

BASE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(BASE, ".work")
EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
END = os.environ.get("WINDOW_END", "2026-11-22")
START30 = os.environ.get("WINDOW_30D", "2026-10-23")


def get(url, params, tries=3):
    q = urllib.parse.urlencode(params)
    for i in range(tries):
        try:
            with urllib.request.urlopen(f"{url}?{q}", timeout=90) as r:
                return r.read().decode("utf-8", "replace")
        except Exception:
            if i == tries - 1:
                return ""
            time.sleep(1.5 * (i + 1))


def esearch(term, retmax=0, sort="pub_date", extra=None):
    params = {"db": "pubmed", "term": term, "retmode": "json", "retmax": retmax, "sort": sort}
    if extra:
        params.update(extra)
    txt = get(f"{EUTILS}/esearch.fcgi", params)
    if not txt:
        return 0, []
    r = json.loads(txt)["esearchresult"]
    return int(r.get("count", 0)), r.get("idlist", [])


def last_edat(pmids):
    """Verilen PMID'ler arasindaki en yeni giris ([edat]) tarihini dondurur."""
    if not pmids:
        return ""
    xml = get(f"{EUTILS}/efetch.fcgi", {"db": "pubmed", "id": ",".join(pmids), "retmode": "xml"})
    if not xml:
        return ""
    try:
        root = ET.fromstring(xml)
    except Exception:
        return ""
    best = ""
    for art in root.iter("PubmedArticle"):
        for h in art.iter("PubMedPubDate"):
            if h.get("PubStatus") == "entrez":
                parts = [x.text or "" for x in h][:3]
                v = "-".join(f"{int(p):02d}" if i else p for i, p in enumerate(parts) if p)
                if len(parts) < 3:
                    continue
                try:
                    key = (int(parts[0]), int(parts[1]), int(parts[2]))
                except Exception:
                    continue
                if not best or key > best[0]:
                    best = (key, v)
    if not best:
        return ""
    p = best[1].split("-")
    return f"{int(p[0]):04d}-{int(p[1]):02d}-{int(p[2]):02d}"


def latest_entry(clause):
    """Giris ([edat]) tarihine gore geriye dogru genisleyen pencerelerle en yeni kayit tarihini bulur."""
    if not clause:
        return ""
    end = dt.date.fromisoformat(END)
    for days in (7, 30, 90, 365, 1095):
        start = (end - dt.timedelta(days=days)).isoformat()
        cnt, ids = esearch(clause, retmax=50,
                           extra={"datetype": "edat", "mindate": start, "maxdate": END})
        if cnt:
            return last_edat(ids)
        time.sleep(0.34)
    return ""


def main():
    rows = list(csv.DictReader(open(os.path.join(BASE, "dergi_listesi.csv"), encoding="utf-8")))
    try:
        extra = {r["journal"]: r for r in csv.DictReader(open(os.path.join(BASE, "kaynak_esleme.csv"), encoding="utf-8"))}
    except FileNotFoundError:
        extra = {}

    issue_path = sys.argv[1] if len(sys.argv) > 1 else None
    if not issue_path:
        dates = sorted(f[:-5] for f in os.listdir("/home/ubuntu/torakslit/content/issues") if f.endswith(".json"))
        issue_path = f"/home/ubuntu/torakslit/content/issues/{dates[-1]}.json"
    issue = json.load(open(issue_path, encoding="utf-8"))
    counts = {j["name"]: j["count"] for j in issue.get("journals", [])}

    out = []
    for r in rows:
        issns = [r["issn_print"], r["issn_electronic"]] + r.get("former_issn", "").split(";")
        issns = [i.strip() for i in issns if i and i.strip()]
        clause = " OR ".join(f'"{i}"[ISSN]' for i in issns) if issns else ""
        c30, ids = esearch(f"({clause}) AND (\"{START30}\"[edat] : \"{END}\"[edat])") if clause else (0, [])
        time.sleep(0.34)
        c7 = counts.get(r["journal"], 0)
        latest = latest_entry(clause)
        time.sleep(0.34)
        src = extra.get(r["journal"], {}).get("source", "pubmed")
        if c7 > 0:
            status = "kayıt var"
        elif c30 > 0:
            status = "bu dönem yok"
        elif latest:
            status = "seyrek"
        else:
            status = "PubMed'de yok"
        out.append({"journal": r["journal"], "group": r["group"], "issn": (issns[0] if issns else ""),
                    "count7": c7, "count30": c30, "lastEntry": latest, "source": src, "status": status})
        print(f'{r["group"]} {r["journal"][:48]:48} 7g:{c7:3} 30g:{c30:3} son:{latest or "-":10} {status}')

    issue["coverage"] = out
    json.dump(issue, open(issue_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(out, open(f"{WORK}/coverage.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"kapsama: {len(out)} dergi -> {issue_path}")


if __name__ == "__main__":
    main()
