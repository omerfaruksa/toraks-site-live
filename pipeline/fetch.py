"""Kaynak toplama: PubMed, ClinicalTrials.gov, Crossref/RSS, PMC ve yazar/kurum.

Üç eski betik (fetch_pubmed, fetch_trials, fetch_external) ile enrich_meta ve
scope_tags içindeki efetch çağrıları burada birleşti; hepsi önbellekli ve paralel.
"""
from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from datetime import date
from email.utils import parsedate_to_datetime

import affil
import journals
import net
import rules
from config import WORK

MONTHS = {name: i for i, name in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}

TOPIC_QUERY = """(("Thoracic Surgery"[MeSH] OR "Thoracic Surgical Procedures"[MeSH] OR "Pneumonectomy"[MeSH]
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

TRIAL_TERMS = ('thoracoscopic OR lobectomy OR segmentectomy OR pneumonectomy OR esophagectomy '
               'OR thymectomy OR "lung transplant" OR empyema OR decortication OR "chest wall" '
               'OR "rib fracture" OR "thoracic surgery" OR "tracheal resection" OR "diaphragmatic hernia"')
TRIAL_FIELDS = ("NCTId,BriefTitle,OfficialTitle,Phase,OverallStatus,StudyFirstPostDate,"
                "ResultsFirstPostDate,LastUpdatePostDate,EnrollmentCount,PrimaryOutcomeMeasure,"
                "LeadSponsorName,LocationCountry,StudyType")


# ---------------------------------------------------------------- PubMed
def iso_date(year, month="", day="") -> str:
    year = (year or "").strip()
    if not re.fullmatch(r"\d{4}", year):
        return ""
    month = (month or "").strip()
    if not month:
        return year
    idx = int(month) if month.isdigit() else MONTHS.get(month[:3].lower(), 0)
    if not 1 <= idx <= 12:
        return year
    out = f"{year}-{idx:02d}"
    if (day or "").strip().isdigit() and 1 <= int(day) <= 31:
        out += f"-{int(day):02d}"
    return out


def _text(el, path) -> str:
    node = el.find(path) if el is not None else None
    return "".join(node.itertext()).strip() if node is not None else ""


def _parse_articles(root: ET.Element) -> list[dict]:
    records = []
    for art in root.iter("PubmedArticle"):
        medline = art.find("MedlineCitation")
        article = medline.find("Article") if medline is not None else None
        journal = article.find("Journal") if article is not None else None
        pmid = _text(medline, "PMID")
        title = _text(article, "ArticleTitle")
        abstract_parts = []
        for block in (article.iter("AbstractText") if article is not None else []):
            label = block.get("Label") or ""
            body = "".join(block.itertext()).strip()
            if body:
                abstract_parts.append(f"{label}: {body}" if label else body)
        doi = ""
        issns = []
        for aid in (art.iter("ArticleId")):
            if aid.get("IdType") == "doi" and aid.text:
                doi = aid.text.strip()
        for issn in (art.iter("ISSN")):
            if issn.text and issn.text.strip() not in issns:
                issns.append(issn.text.strip())
        pubdate = ""
        if journal is not None:
            pd = journal.find("JournalIssue/PubDate")
            if pd is not None:
                pubdate = iso_date(_text(pd, "Year"), _text(pd, "Month"), _text(pd, "Day"))
        article_date = ""
        ad = article.find("ArticleDate") if article is not None else None
        if ad is not None:
            article_date = iso_date(_text(ad, "Year"), _text(ad, "Month"), _text(ad, "Day"))
        entry = ""
        for stamp in art.iter("PubMedPubDate"):
            if stamp.get("PubStatus") == "entrez":
                entry = iso_date(_text(stamp, "Year"), _text(stamp, "Month"), _text(stamp, "Day"))
        authors = []
        for a in (article.iter("Author") if article is not None else []):
            last = _text(a, "LastName")
            if last:
                authors.append(f"{last} {_text(a, 'Initials')}".strip())
        records.append({
            "pmid": pmid,
            "title": title,
            "journal": _text(journal, "Title"),
            "abbrev": _text(journal, "ISOAbbreviation"),
            "issns": issns,
            "abstract": "\n".join(abstract_parts),
            "doi": doi,
            "pubdate": pubdate,
            "article_date": article_date,
            "entry_date": entry,
            "pubtypes": [p.text for p in art.iter("PublicationType") if p.text],
            "language": _text(article, "Language"),
            "authors": authors,
            "volume": _text(journal, "JournalIssue/Volume"),
            "issue": _text(journal, "JournalIssue/Issue"),
            "pages": _text(article, "Pagination/MedlinePgn"),
        })
    return records


def pubmed(start: str, end: str) -> dict:
    """Dergi ISSN taraması + liste dışı konu sorgusu; kayıtlar tekilleştirilir."""
    window = f'("{start}"[edat] : "{end}"[edat])'

    def scan(row):
        # ISSN koşulu bir kez kurulur; sorgu ve boş denetimi aynı metni kullanır.
        clause = journals.issn_clause(row)
        term = f"({clause}) AND {window}" if clause else ""
        return row["journal"], (net.esearch(term) if term else [])

    per_journal = dict(net.pmap(scan, journals.rows()))

    topic_ids = net.esearch(f"{TOPIC_QUERY} AND {window}", retmax=1000)
    # Sıra korunur (küme değil sözlük): aynı girdi her koşuda aynı sayıyı üretir.
    listed_order = list(dict.fromkeys(pid for ids in per_journal.values() for pid in ids))
    listed_ids = set(listed_order)
    extra = [pid for pid in topic_ids if pid not in listed_ids]
    all_ids = listed_order + extra
    owner = {}
    for name, ids in per_journal.items():
        for pid in ids:
            owner.setdefault(pid, name)

    def fetch_chunk(chunk):
        root = net.efetch(chunk)
        return _parse_articles(root) if root is not None else []

    records = []
    for part in net.pmap(fetch_chunk, list(net.chunks(all_ids, 150))):
        records.extend(part)
    for rec in records:
        rec["from_journal_list"] = rec["pmid"] in listed_ids
        rec["list_journal"] = owner.get(rec["pmid"], "")

    payload = {"window": [start, end], "per_journal": per_journal, "records": records}
    (WORK / "pubmed.json").write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    return payload


# ---------------------------------------------------------------- ClinicalTrials.gov
def trials(start: str, end: str) -> list[dict]:
    def query(advanced: str, trigger: str):
        params = {"query.term": TRIAL_TERMS, "filter.advanced": advanced,
                  "pageSize": "200", "fields": TRIAL_FIELDS}
        data = json.loads(net.get("https://clinicaltrials.gov/api/v2/studies", params))
        out = []
        for study in data.get("studies", []):
            p = study.get("protocolSection", {})
            ident = p.get("identificationModule", {})
            status = p.get("statusModule", {})
            design = p.get("designModule", {})
            outcomes = p.get("outcomesModule", {}).get("primaryOutcomes", [])
            countries = []
            for loc in p.get("contactsLocationsModule", {}).get("locations", []):
                country = loc.get("country")
                if country and country not in countries:
                    countries.append(country)
            out.append({
                "nct": ident.get("nctId"),
                "title": ident.get("briefTitle") or ident.get("officialTitle") or "",
                "phase": ", ".join(design.get("phases") or []) or "belirtilmemiş",
                "status": status.get("overallStatus", ""),
                "firstPost": (status.get("studyFirstPostDateStruct") or {}).get("date", ""),
                "resultsPost": (status.get("resultsFirstPostDateStruct") or {}).get("date", ""),
                "enrollment": str((design.get("enrollmentInfo") or {}).get("count", "") or ""),
                "primary": outcomes[0].get("measure", "") if outcomes else "",
                "sponsor": (p.get("sponsorCollaboratorsModule", {}).get("leadSponsor") or {}).get("name", ""),
                "countries": countries[:3],
                "type": design.get("studyType", ""),
                "trigger": trigger,
            })
        return out

    merged = {}
    for batch in net.pmap(lambda args: query(*args), [
        (f"AREA[StudyFirstPostDate]RANGE[{start},{end}]", "new"),
        (f"AREA[ResultsFirstPostDate]RANGE[{start},{end}]", "results"),
    ]):
        for item in batch:
            merged.setdefault(item["nct"], item)
    result = list(merged.values())
    (WORK / "trials_raw.json").write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    return result


def trial_relevant(trial: dict) -> bool:
    """Başlık torasik cerrahi işareti taşımalı; diğer branşlar elenir. Sabit NCT listesi yok."""
    title = trial.get("title", "") or ""
    return bool(rules.TRIAL_INCLUDE.search(title)) and not rules.TRIAL_EXCLUDE.search(title)


# ---------------------------------------------------------------- Crossref / RSS
def _crossref(row: dict, start: str, end: str) -> list[dict]:
    issn = (row.get("issn") or "").strip()
    if not issn:
        return []
    out, seen = [], set()
    for basis, filt in (
        ("online yayın", f"from-online-pub-date:{start},until-online-pub-date:{end}"),
        ("basılı yayın", f"from-print-pub-date:{start},until-print-pub-date:{end}"),
    ):
        params = {"filter": filt, "rows": 100,
                  "select": "DOI,title,author,container-title,abstract,created,published,type,URL"}
        try:
            data = json.loads(net.get(f"https://api.crossref.org/journals/{issn}/works", params, ttl=24 * 3600))
        except Exception:
            continue
        for item in data["message"]["items"]:
            doi = (item.get("DOI") or "").lower()
            title = rules.clean((item.get("title") or [""])[0])
            if not doi or doi in seen or not title:
                continue
            seen.add(doi)
            names, affs = [], []
            for author in item.get("author") or []:
                name = " ".join(x for x in [author.get("family"), author.get("given")] if x)
                if name:
                    names.append(name)
                for aff in author.get("affiliation") or []:
                    if aff.get("name"):
                        affs.append(affil.clean(aff["name"]))
            uniq = list(dict.fromkeys(a for a in affs if a))
            turkey, evidence = affil.is_turkey(uniq)
            parts = ((item.get("published") or {}).get("date-parts") or [[None]])[0]
            out.append({
                "id": "doi:" + doi, "source": "crossref", "dateBasis": basis,
                "journal": row["journal"], "title": title,
                "abstract": rules.clean(item.get("abstract") or "")[:2600],
                "doi": item.get("DOI"), "url": f"https://doi.org/{item.get('DOI')}",
                "date": "-".join(f"{p:02d}" if i else str(p) for i, p in enumerate(parts) if p),
                "authors": affil.display_authors(names),
                "institutions": affil.display_institutions(uniq),
                "turkey": turkey, "turkeyEvidence": evidence,
                "pubtypes": [item.get("type") or ""],
            })
    return out


def _rss(row: dict, start: str, end: str) -> list[dict]:
    root = ET.fromstring(net.get(row["feed_url"], ttl=6 * 3600))
    out = []
    for item in root.iter("item"):
        title = rules.clean(item.findtext("title") or "")
        if not title:
            continue
        link = (item.findtext("link") or "").strip()
        desc = rules.clean(item.findtext("description") or "")
        doi_match = re.search(r"10\.\d{4,9}/[^\s\"<]+", link + " " + desc)
        doi = doi_match.group(0).rstrip(".,;)") if doi_match else ""
        raw_date = rules.clean(item.findtext("pubDate") or "")
        try:
            if not (date.fromisoformat(start) <= parsedate_to_datetime(raw_date).date()
                    <= date.fromisoformat(end)):
                continue
        except Exception:
            continue
        out.append({
            "id": "rss:" + (doi or link or title)[:120], "source": "rss", "dateBasis": "RSS",
            "journal": row["journal"], "title": title, "abstract": desc[:1200], "doi": doi,
            "url": link, "date": raw_date,
            "authors": rules.clean(item.findtext("{http://purl.org/dc/elements/1.1/}creator") or "")
            or "belirtilmemiş",
            "institutions": [], "turkey": False, "turkeyEvidence": "",
            "pubtypes": ["Journal Article"],
        })
    return out


def external(start: str, end: str) -> dict:
    rows = [r for r in journals.source_map().values() if r.get("source") in ("crossref", "rss")]

    def one(row):
        try:
            got = _crossref(row, start, end) if row["source"] == "crossref" else _rss(row, start, end)
            return got, {"journal": row["journal"], "source": row["source"], "records": len(got)}
        except Exception as exc:
            return [], {"journal": row["journal"], "source": row["source"],
                        "error": f"{type(exc).__name__}: {exc}"}

    records, report = [], []
    for got, line in net.pmap(one, rows):
        records.extend(got)
        report.append(line)
    unique, seen = [], set()
    for rec in records:
        key = (rec.get("doi") or "").lower() or rec["title"].lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(rec)
    payload = {"window": [start, end], "records": unique, "report": report}
    (WORK / "external.json").write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    return payload


# ---------------------------------------------------------------- PMC ve yazar/kurum
def pmc_ids(pmids) -> dict[str, str]:
    def chunk(part):
        root = net.efetch(part)
        found = {}
        if root is None:
            return found
        for art in root.iter("PubmedArticle"):
            pmid = art.findtext("MedlineCitation/PMID") or ""
            for aid in art.iter("ArticleId"):
                if aid.get("IdType") == "pmc" and aid.text:
                    found[pmid] = aid.text.strip()
        return found

    out = {}
    for part in net.pmap(chunk, list(net.chunks(sorted(set(pmids)), 120))):
        out.update(part)
    return out


def author_meta(pmids) -> dict[str, dict]:
    def chunk(part):
        root = net.efetch(part)
        found = {}
        if root is None:
            return found
        for art in root.iter("PubmedArticle"):
            pmid = art.findtext("MedlineCitation/PMID") or ""
            article = art.find("MedlineCitation/Article")
            if article is None:
                continue
            names, affs = [], []
            for author in article.iter("Author"):
                last = author.findtext("LastName") or ""
                collective = author.findtext("CollectiveName") or ""
                if last:
                    names.append(f"{last} {author.findtext('Initials') or ''}".strip())
                elif collective:
                    names.append(collective)
                for info in author.iter("AffiliationInfo"):
                    text = "".join(info.itertext())
                    if text.strip():
                        affs.append(affil.clean(text))
            uniq = list(dict.fromkeys(a for a in affs if a))
            turkey, evidence = affil.is_turkey(uniq)
            found[pmid] = {
                "authors": affil.display_authors(names),
                "authorCount": len(names),
                "institutions": affil.display_institutions(uniq),
                "affiliations": uniq,
                "turkey": turkey,
                "turkeyEvidence": evidence,
            }
        return found

    path = WORK / "meta.json"
    meta = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    # Yalnızca bellekte olmayan kayıtlar için ağa çıkılır; eski kayıtlar korunur.
    missing = [p for p in sorted(set(pmids)) if p not in meta]
    if missing:
        for part in net.pmap(chunk, list(net.chunks(missing, 150))):
            meta.update(part)
        path.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"  yazar/kurum: {len(meta)} kayıt ({len(missing)} yeni)")
    return meta
