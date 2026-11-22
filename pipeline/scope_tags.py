#!/usr/bin/env python3
"""Calisma kapsami (tek merkezli / cok merkezli / cok uluslu) ve ortak branslari etiketler.

Kaynak: PubMed AffiliationInfo satirlari (brans ve ulke) ile kartin kendi metni
(tasarim etiketi ve ozet). Metinde gecmeyen bilgi uretilmez; bulunamazsa "belirtilmemis".
"""
import json, os, re, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

BASE = os.path.dirname(os.path.abspath(__file__))
EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

# --- brans sozlugu: anahtar ifade -> Turkce etiket ---------------------------
BRANCHES = [
    ("Göğüs cerrahisi", r"thoracic surgery|thoracic and cardiovascular surgery|cardiothoracic surgery|g[öo][ğg]üs cerrahisi"),
    ("Kalp ve damar cerrahisi", r"cardiac surgery|cardiovascular surgery|cardio-?thoracic surgery"),
    ("Genel cerrahi", r"^surgery$|general surgery"),
    ("Medikal onkoloji", r"medical oncology|^oncology$|clinical oncology"),
    ("Cerrahi onkoloji", r"surgical oncology"),
    ("Radyasyon onkolojisi", r"radiation oncology|radiotherapy|radiation therapy"),
    ("Göğüs hastalıkları", r"pulmonology|pulmonary medicine|respiratory medicine|chest medicine|g[öo][ğg]üs hastal[ıi]klar[ıi]"),
    ("Radyoloji", r"radiology|diagnostic imaging|medical imaging"),
    ("Nükleer tıp", r"nuclear medicine"),
    ("Patoloji", r"pathology"),
    ("Anesteziyoloji ve yoğun bakım", r"anesthesiology|anaesthesiology|anaesthesia|anesthesia|critical care|intensive care"),
    ("İç hastalıkları", r"internal medicine"),
    ("Gastroenteroloji", r"gastroenterology|endoscopy"),
    ("Kardiyoloji", r"cardiology"),
    ("Hemşirelik", r"nursing"),
    ("Biyoistatistik ve halk sağlığı", r"biostatistics|statistics|epidemiology|public health"),
    ("Moleküler ve translasyonel bilimler", r"molecular|immunology|cell biology|genetics|genomics|biochemistry"),
    ("Fizyoterapi ve rehabilitasyon", r"rehabilitation|physiotherapy|physical therapy"),
    ("Palyatif bakım", r"palliative"),
    ("Pediatri", r"pediatrics|paediatrics"),
    ("Enfeksiyon hastalıkları", r"infectious disease|microbiology"),
]
BRANCH_RE = [(name, re.compile(pat, re.I)) for name, pat in BRANCHES]

DEPARTMENT_RE = re.compile(
    r"^(?:Department|Division|Section|Unit|Service|Clinic|Institute|Faculty|School|Chair|Center|Centre)"
    r"\s+of\s+([^,;]+)", re.I)

COUNTRIES = [
    "Turkey", "Türkiye", "Turkiye", "USA", "United States", "UK", "United Kingdom", "England",
    "Scotland", "Wales", "Ireland", "Germany", "France", "Italy", "Spain", "Portugal", "Netherlands",
    "Belgium", "Switzerland", "Austria", "Sweden", "Norway", "Denmark", "Finland", "Poland", "Czech",
    "Hungary", "Romania", "Bulgaria", "Greece", "Russia", "Ukraine", "Israel", "Egypt", "Saudi",
    "Emirates", "Qatar", "Kuwait", "Jordan", "Lebanon", "Iran", "Iraq", "Pakistan", "India",
    "Bangladesh", "Sri Lanka", "Nepal", "China", "Taiwan", "Japan", "Korea", "Singapore", "Malaysia",
    "Thailand", "Vietnam", "Indonesia", "Philippines", "Australia", "New Zealand", "Canada", "Mexico",
    "Brazil", "Argentina", "Chile", "Colombia", "Peru", "South Africa", "Nigeria", "Kenya", "Ethiopia",
    "Morocco", "Tunisia", "Serbia", "Croatia", "Slovenia", "Slovakia", "Lithuania", "Latvia", "Estonia",
    "Georgia", "Armenia", "Azerbaijan", "Kazakhstan", "Uzbekistan", "Mongolia", "Cuba", "Ecuador",
    "Uruguay", "Venezuela", "Oman", "Bahrain", "Libya", "Algeria", "Sudan", "Ghana", "Uganda",
]
COUNTRY_RE = re.compile(r"(?:^|[,\s])(" + "|".join(sorted({re.escape(c) for c in COUNTRIES}, key=len, reverse=True)) + r")(?:[,\s.]|$)", re.I)

MULTI_TEXT = re.compile(
    r"çok merkezli|çok merkezli|iki merkezli|üç merkezli|multicent|multi-cent|ulusal|national|"
    r"çok uluslu|multinational|kayıt çalışması|registry|veri tabanı|database|consortium|collaborat", re.I)
SINGLE_TEXT = re.compile(r"tek merkezli|tek merkez|single[- ]cent|single institut|tek kurum", re.I)


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


def affiliations(pmids):
    """{pmid: [AffiliationInfo metinleri]}"""
    out = {}
    for i in range(0, len(pmids), 100):
        chunk = pmids[i:i + 100]
        xml = get(f"{EUTILS}/efetch.fcgi", {"db": "pubmed", "id": ",".join(chunk), "retmode": "xml"})
        if not xml:
            continue
        try:
            root = ET.fromstring(xml)
        except Exception:
            continue
        for art in root.iter("PubmedArticle"):
            pmid = art.findtext(".//PMID") or ""
            affs = []
            for a in art.iter("AffiliationInfo"):
                txt = (a.findtext("Affiliation") or "").strip()
                if txt:
                    affs.append(txt)
            out[pmid] = affs
        time.sleep(0.4)
    return out


def branches_of(affs):
    found = []
    for aff in affs:
        hay = aff
        m = DEPARTMENT_RE.match(aff.strip())
        if m:
            hay = m.group(1)
        else:
            parts = [p.strip() for p in aff.split(",")]
            dep = [p for p in parts if DEPARTMENT_RE.match(p)]
            if dep:
                hay = " ".join(dep)
        for name, rx in BRANCH_RE:
            if rx.search(hay) and name not in found:
                found.append(name)
    return found


def countries_of(affs):
    seen = []
    for aff in affs:
        for m in COUNTRY_RE.finditer(aff):
            c = m.group(1).strip().title()
            if c.lower() in ("türkiye", "turkiye"):
                c = "Turkey"
            if c not in seen:
                seen.append(c)
    return seen


def scope_of(card):
    """Kapsam yalnizca metinden okunur; uluslararasi isbirligi ayri bir bayraktir."""
    text = " ".join(str(card.get(k) or "") for k in ("designLabel", "summary", "titleTr", "titleOrig", "sample", "comparison"))
    multi = bool(MULTI_TEXT.search(text))
    single = bool(SINGLE_TEXT.search(text))
    if multi:
        return "cok_merkezli"
    if single:
        return "tek_merkezli"
    return ""


SCOPE_TR = {"tek_merkezli": "Tek merkezli", "cok_merkezli": "Çok merkezli"}


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else None
    if not path:
        dates = sorted(f[:-5] for f in os.listdir("/home/ubuntu/torakslit/content/issues") if f.endswith(".json"))
        path = f"/home/ubuntu/torakslit/content/issues/{dates[-1]}.json"
    issue = json.load(open(path, encoding="utf-8"))

    pmids = [str(s.get("pmid")) for s in issue.get("direct", []) if s.get("pmid")]
    pmids += [str(s.get("pmid")) for s in issue.get("indirect", []) if s.get("pmid")]
    affs = affiliations(sorted(set(pmids)))
    print(f"kurum satırı çekilen kayıt: {len(affs)}")

    stats = {"tek_merkezli": 0, "cok_merkezli": 0, "": 0}
    n_intl = n_multi = 0
    branch_counts = {}
    for key in ("direct", "indirect"):
        for card in issue.get(key, []):
            a = affs.get(str(card.get("pmid")), [])
            br = branches_of(a)
            co = countries_of(a)
            scope = scope_of(card)
            card["scope"] = scope
            card["scopeLabel"] = SCOPE_TR.get(scope, "")
            card["disciplines"] = br
            card["multidisciplinary"] = len(br) >= 2
            card["international"] = len(co) >= 2
            if co:
                card["countries"] = co
            n_intl += 1 if len(co) >= 2 else 0
            n_multi += 1 if len(br) >= 2 else 0
            stats[scope] = stats.get(scope, 0) + 1
            for b in br:
                branch_counts[b] = branch_counts.get(b, 0) + 1

    json.dump(issue, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("kapsam:", stats)
    print(f"multidisipliner: {n_multi}, uluslararası işbirliği: {n_intl}")
    print("branş:", sorted(branch_counts.items(), key=lambda x: -x[1]))


if __name__ == "__main__":
    main()
