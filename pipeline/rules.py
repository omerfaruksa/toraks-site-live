"""Kural katmanı: metin normalleştirme, torasik/cerrahi ölçütleri, kapsam ve branş.

Eskiden prep, prep2, merge_cls, build_issue, scope_tags, merge_external ve
verify_numbers içinde yedi kez tekrarlanan yardımcılar burada toplandı.
"""
from __future__ import annotations

import html
import re

INTEREST_ORDER = {"dogrudan": 0, "video_olgu": 1, "dolayli": 2, "konu_disi": 3, "kardiyak": 4}
INTEREST_TR = {"dogrudan": "Doğrudan", "dolayli": "Dolaylı", "konu_disi": "Konu dışı",
               "video_olgu": "Video/olgu", "kardiyak": "Kardiyak içerik"}
DESIGN_ORDER = ["rct", "meta", "cohort", "casecontrol", "caseseries", "nonclinical", "other"]

ISO_DATE = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")

THORACIC = re.compile(
    r"(lung|pulmonar|pneumon|thorac|pleur|mediastin|thym|esophag|oesophag|chest wall|"
    r"\brib\b|diaphragm|trachea|tracheal|bronch|airway|hilar|hilum|segmentectom|lobectom|"
    r"VATS|mesotheliom|aspergillom|bronchiectas|hydatid|pectus|sternum|empyema|"
    r"lung transplant|air leak|hemothorax|pneumothorax)", re.I)

SURGICAL = re.compile(
    r"(lobectom|segmentectom|pneumonectom|esophagectom|oesophagectom|thymectom|thoracoscop|"
    r"thoracotom|uniportal|VATS|RATS|decorticat|lung transplant|transplantation|"
    r"chest wall resection|rib fixation|mediastinoscop|tracheal resection|sleeve resection|"
    r"bullectomy|sympathectomy|Nuss|fundoplication|hiatal hernia|diaphragmatic hernia|"
    r"carinal resection|bronchoplastic|surgical resection|operative|perioperative|"
    r"postoperative|reoperation|anastomotic)", re.I)

SURGICAL_KEYWORD = re.compile(
    r"(lobectom|segmentectom|pneumonectom|esophagectom|oesophagectom|thymectom|thoracoscop|"
    r"thoracotom|uniportal|decorticat|lung transplant|chest wall resection|rib fixation|"
    r"tracheal resection|sleeve resection)", re.I)

PROTOCOL = re.compile(r"\bprotocol\b|protokol", re.I)

# Klinik araştırma süzgeci: başlıkta torasik cerrahi işareti olmalı, diğer branşlar elenir.
TRIAL_INCLUDE = re.compile(
    r"(lung surgery|lung resection|lobectom|segmentectom|pneumonectom|thoracoscop|VATS|RATS|"
    r"uniportal|esophag|oesophag|thymectom|thymoma|mediastin|pleur|empyema|decorticat|"
    r"chest wall|rib fracture|sternotom|diaphragm|trachea|airway|intercostal|lung transplant|"
    r"thoracic surgery|bronchoscop|hemoptysis|hiatal hernia|fundoplication|pneumothorax)", re.I)
TRIAL_EXCLUDE = re.compile(
    r"(breast|rectal|endometrios|thyroid|bariatric|gastrectomy|sleeve|ankylosing|transcoronary|"
    r"coronary|valve|carotid|orthop|knee|hip|dental|ocular|prostate|hepatic|renal)", re.I)

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
COUNTRY_RE = re.compile(
    r"(?:^|[,\s])(" + "|".join(sorted({re.escape(c) for c in COUNTRIES}, key=len, reverse=True))
    + r")(?:[,\s.]|$)", re.I)

MULTI_TEXT = re.compile(
    r"çok merkezli|iki merkezli|üç merkezli|multicent|multi-cent|ulusal|national|"
    r"çok uluslu|multinational|kayıt çalışması|registry|veri tabanı|database|consortium|collaborat", re.I)
SINGLE_TEXT = re.compile(r"tek merkezli|tek merkez|single[- ]cent|single institut|tek kurum", re.I)
SCOPE_TR = {"tek_merkezli": "Tek merkezli", "cok_merkezli": "Çok merkezli"}

NUM = re.compile(r"\d+(?:[.,]\d+)?")


def clean(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text or "")
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def iso_or_empty(value: str) -> str:
    value = (value or "").strip()
    if ISO_DATE.match(value):
        return value
    m = re.match(r"^(\d{4}-\d{2}-\d{2})T", value)
    return m.group(1) if m else ""


def is_thoracic(text: str) -> bool:
    return bool(THORACIC.search(text or ""))


def is_surgical(text: str) -> bool:
    return bool(SURGICAL.search(text or ""))


def is_protocol(title: str) -> bool:
    return bool(PROTOCOL.search(title or ""))


def branches_of(affiliations) -> list[str]:
    found = []
    for aff in affiliations:
        hay = aff
        match = DEPARTMENT_RE.match(aff.strip())
        if match:
            hay = match.group(1)
        else:
            parts = [p.strip() for p in aff.split(",")]
            deps = [p for p in parts if DEPARTMENT_RE.match(p)]
            if deps:
                hay = " ".join(deps)
        for name, rx in BRANCH_RE:
            if rx.search(hay) and name not in found:
                found.append(name)
    return found


COUNTRY_CANON = {"usa": "USA", "u.s.a": "USA", "u.s.": "USA", "us": "USA", "uk": "UK",
                 "türkiye": "Turkey", "turkiye": "Turkey"}


def countries_of(affiliations) -> list[str]:
    seen = []
    for aff in affiliations:
        for match in COUNTRY_RE.finditer(aff):
            name = match.group(1).strip()
            # title() kısaltmaları bozuyor (USA -> Usa); kanonik adlar korunur.
            name = COUNTRY_CANON.get(name.lower(), name.title())
            if name not in seen:
                seen.append(name)
    return seen


def scope_of(card: dict) -> str:
    text = " ".join(str(card.get(k) or "") for k in
                    ("designLabel", "summary", "titleTr", "titleOrig", "sample", "comparison"))
    if MULTI_TEXT.search(text):
        return "cok_merkezli"
    if SINGLE_TEXT.search(text):
        return "tek_merkezli"
    return ""


def numbers_missing(card: dict, abstract: str) -> list[str]:
    """Karttaki sayılardan özette bulunmayanları döndürür (Türkçe ondalık dahil)."""
    norm = (abstract or "").replace(",", ".").replace(" ", "")
    missing = []
    for field in ("sample", "comparison", "outcomes", "mainResult", "followUp", "dataPeriod"):
        value = str(card.get(field) or "")
        if value.strip().lower().startswith("belirtilmemi"):
            continue
        for token in NUM.findall(value):
            if len(token.replace(".", "")) <= 1 and token not in "012345":
                continue
            variants = {token, token.replace(",", "."), token.replace(".", ",")}
            # Türkçe yazım baştaki sıfırı ekler (".45" -> "0,45"); iki biçim de kabul edilir.
            for v in list(variants):
                if v.startswith("0."):
                    variants.add(v[1:])
                elif v.startswith("."):
                    variants.add("0" + v)
            if not any(v.replace(" ", "") in norm for v in variants):
                missing.append(f"{field}:{token}")
    return missing
