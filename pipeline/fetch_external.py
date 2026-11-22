#!/usr/bin/env python3
"""PubMed disi kaynaklar: Crossref DOI kayitlari ve dergi RSS akislari.

kaynak_esleme.csv'de source=crossref|rss olan dergiler icin calisir.
Cikti: .work/external.json  (PubMed kayit semasina yakin, pmid yerine id)
"""
import csv, html, json, os, re, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import affil

START = os.environ.get("WINDOW_START", "2026-11-15")
END = os.environ.get("WINDOW_END", "2026-11-22")
BASE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(BASE, ".work")
os.makedirs(WORK, exist_ok=True)
UA = "ToraksLit/1.0 (literatur takibi; mailto:literatur@example.org)"


def http(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA,
                                                       "Accept": "application/json, application/xml, text/xml, */*"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read().decode("utf-8", "replace")
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2 * (i + 1))


def clean(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def crossref(row):
    """Yayin tarihine gore tarar: once online, sonra print yayin tarihi."""
    issn = row["issn"].strip()
    out, seen = [], set()
    for basis, filt in (
        ("online", f"from-online-pub-date:{START},until-online-pub-date:{END}"),
        ("print", f"from-print-pub-date:{START},until-print-pub-date:{END}"),
    ):
        q = urllib.parse.urlencode({
            "filter": filt,
            "rows": 100,
            "select": "DOI,title,author,container-title,abstract,created,published,type,URL",
        })
        try:
            data = json.loads(http(f"https://api.crossref.org/journals/{issn}/works?{q}"))
        except Exception:
            continue
        for it in data["message"]["items"]:
            doi = it["DOI"].lower()
            if doi in seen:
                continue
            seen.add(doi)
            title = clean((it.get("title") or [""])[0])
            if not title:
                continue
            names, affs = [], []
            for a in it.get("author") or []:
                nm = " ".join(x for x in [a.get("family"), a.get("given")] if x)
                if nm:
                    names.append(nm)
                for af in a.get("affiliation") or []:
                    if af.get("name"):
                        affs.append(affil.clean(af["name"]))
            uniq, aseen = [], set()
            for a in affs:
                if a.lower() not in aseen:
                    aseen.add(a.lower())
                    uniq.append(a)
            tr, ev = affil.is_turkey(uniq)
            parts = (it.get("published") or {}).get("date-parts", [[None]])[0]
            date = "-".join(f"{p:02d}" if i else str(p) for i, p in enumerate(parts) if p)
            out.append({
                "id": "doi:" + doi,
                "source": "crossref",
                "dateBasis": "online yayın" if basis == "online" else "basılı yayın",
                "journal": row["journal"],
                "title": title,
                "abstract": clean(it.get("abstract") or "")[:2600],
                "doi": it["DOI"],
                "url": f"https://doi.org/{it['DOI']}",
                "date": date,
                "authors": affil.display_authors(names),
                "institutions": affil.display_institutions(uniq),
                "turkey": tr,
                "turkeyEvidence": ev,
                "pubtypes": [it.get("type") or ""],
            })
        time.sleep(0.3)
    return out


def rss(row):
    xml_text = http(row["feed_url"])
    root = ET.fromstring(xml_text)
    out = []
    items = root.iter("item")
    for it in items:
        title = clean(it.findtext("title") or "")
        link = (it.findtext("link") or "").strip()
        desc = clean(it.findtext("description") or "")
        creator = clean(it.findtext("{http://purl.org/dc/elements/1.1/}creator") or "")
        pub = clean(it.findtext("pubDate") or "")
        doi = ""
        m = re.search(r"10\.\d{4,9}/[^\s\"<]+", link + " " + desc)
        if m:
            doi = m.group(0).rstrip(".,;)")
        if not title:
            continue
        out.append({
            "id": "rss:" + (doi or link or title)[:120],
            "source": "rss",
            "journal": row["journal"],
            "title": title,
            "abstract": desc[:1200],
            "doi": doi,
            "url": link,
            "date": pub,
            "authors": creator or "belirtilmemiş",
            "institutions": [],
            "turkey": False,
            "turkeyEvidence": "",
            "pubtypes": ["Journal Article"],
        })
    return out


def in_window(date_str):
    """RFC822 tarihli RSS kayitlarini [START, END] penceresine gore suzer."""
    from datetime import date, datetime
    from email.utils import parsedate_to_datetime
    try:
        d = parsedate_to_datetime(date_str).date()
    except Exception:
        return False
    return date.fromisoformat(START) <= d <= date.fromisoformat(END)


def main():
    rows = [r for r in csv.DictReader(open(os.path.join(BASE, "kaynak_esleme.csv"), encoding="utf-8"))
            if r["source"] in ("crossref", "rss")]
    records, report = [], []
    for row in rows:
        try:
            got = crossref(row) if row["source"] == "crossref" else rss(row)
            if row["source"] == "rss":
                got = [g for g in got if in_window(g["date"])]
        except Exception as e:
            report.append({"journal": row["journal"], "source": row["source"], "error": f"{type(e).__name__}: {e}"})
            print(f"ERR {row['journal']}: {e}", file=sys.stderr)
            continue
        records.extend(got)
        report.append({"journal": row["journal"], "source": row["source"], "records": len(got)})
        print(f"{row['source']:8} {len(got):3}  {row['journal']}")
        time.sleep(0.4)

    # DOI ile tekille
    seen, uniq = set(), []
    for r in records:
        key = (r.get("doi") or "").lower() or r["title"].lower()
        if key in seen:
            continue
        seen.add(key)
        uniq.append(r)

    json.dump({"window": [START, END], "records": uniq, "report": report},
              open(os.path.join(WORK, "external.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"external kayit: {len(uniq)} | dergi: {len(report)} | hata: {sum(1 for r in report if r.get('error'))}")


if __name__ == "__main__":
    main()
