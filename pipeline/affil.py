#!/usr/bin/env python3
"""Yazar, kurum ve Turkiye kokeni tespiti.

Yalnizca kaynak metindeki (PubMed AffiliationInfo / Crossref affiliation) bilgi kullanilir.
Kurum gosterimi kisaltilir; veri degistirilmez.
"""
import re

# --- ulke belirtecleri -------------------------------------------------------
COUNTRY_TR = re.compile(
    r"(?:^|[,\s])(?:turkey|t[üu]rkiye|turkiye)(?:[,;\s.]|$)", re.I)

# Baska ulke belirtecleri: sehir eslesmesini gecersiz kilmak icin
OTHER_COUNTRY = re.compile(
    r"\b(USA|U\.S\.A|United States|UK|United Kingdom|England|Scotland|Wales|Ireland|Germany|France|"
    r"Italy|Spain|Portugal|Netherlands|Belgium|Switzerland|Austria|Sweden|Norway|Denmark|Finland|"
    r"Poland|Czech|Hungary|Romania|Bulgaria|Greece|Russia|Ukraine|Israel|Egypt|Saudi|Emirates|Qatar|"
    r"Kuwait|Jordan|Lebanon|Iran|Iraq|Pakistan|India|Bangladesh|Sri Lanka|Nepal|China|Taiwan|Japan|"
    r"Korea|Singapore|Malaysia|Thailand|Vietnam|Indonesia|Philippines|Australia|New Zealand|Canada|"
    r"Mexico|Brazil|Argentina|Chile|Colombia|Peru|South Africa|Nigeria|Kenya|Ethiopia|Morocco|Tunisia)\b",
    re.I)

# --- kurum adlari (Turkiye) --------------------------------------------------
TR_INSTITUTIONS = [
    "Hacettepe", "Ege University", "Marmara University", "Koç University", "Koc University",
    "Acıbadem", "Acibadem", "Ankara University", "Gazi University", "Dokuz Eylül", "Dokuz Eylul",
    "Çukurova University", "Cukurova University", "Erciyes University", "Akdeniz University",
    "Karadeniz Technical University", "Uludağ University", "Uludag University",
    "Eskişehir Osmangazi", "Eskisehir Osmangazi", "Sakarya University", "Kocaeli University",
    "Trakya University", "Ondokuz Mayıs", "Ondokuz Mayis", "Atatürk University", "Ataturk University",
    "Fırat University", "Firat University", "İnönü University", "Inonu University",
    "Selçuk University", "Selcuk University", "Necmettin Erbakan", "Bezmialem", "Medipol",
    "Biruni University", "İstinye University", "Istinye University", "Yeditepe University",
    "Maltepe University", "Başkent University", "Baskent University", "TOBB ETU",
    "Gülhane", "Gulhane", "Sağlık Bilimleri University", "Sağlık Bilimleri Üniversitesi",
    "Süreyyapaşa", "Sureyyapasa", "Yedikule", "Heybeliada", "Türk Kızılay", "Turk Kizilay",
    "Ankara Şehir Hastanesi", "Ankara Sehir Hastanesi", "İstanbul University", "Istanbul University",
    "Istanbul Medeniyet", "İstanbul Medeniyet",
]

# --- sehirler (ayirt edici olanlar) -----------------------------------------
TR_CITIES = [
    "Istanbul", "İstanbul", "Ankara", "Izmir", "İzmir", "Bursa", "Antalya", "Adana", "Konya",
    "Gaziantep", "Kayseri", "Mersin", "Eskişehir", "Eskisehir", "Samsun", "Trabzon", "Erzurum",
    "Diyarbakır", "Diyarbakir", "Şanlıurfa", "Sanliurfa", "Malatya", "Elazığ", "Elazig", "Sivas",
    "Rize", "Aydın", "Aydin", "Denizli", "Muğla", "Mugla", "Manisa", "Balıkesir", "Balikesir",
    "Sakarya", "Kocaeli", "Tekirdağ", "Tekirdag", "Edirne", "Çanakkale", "Canakkale",
    "Afyonkarahisar", "Isparta", "Burdur", "Hatay", "Antakya", "Kahramanmaraş", "Kahramanmaras",
    "Osmaniye", "Adıyaman", "Adiyaman", "Mardin", "Şırnak", "Sirnak", "Bitlis", "Muş",
    "Ağrı", "Agri", "Erzincan", "Bayburt", "Gümüşhane", "Gumushane", "Ordu", "Giresun", "Sinop",
    "Kastamonu", "Çorum", "Corum", "Amasya", "Tokat", "Yozgat", "Kırıkkale", "Kirikkale",
    "Kırşehir", "Kirsehir", "Nevşehir", "Nevsehir", "Niğde", "Nigde", "Aksaray", "Karaman",
    "Bartın", "Bartin", "Karabük", "Karabuk", "Düzce", "Duzce", "Bolu", "Zonguldak",
    "Kütahya", "Kutahya", "Uşak", "Usak", "Bilecik", "Yalova", "Kırklareli", "Kirklareli",
]

_CITY_RE = re.compile(
    r"\b(" + "|".join(sorted({re.escape(c) for c in TR_CITIES}, key=len, reverse=True)) + r")\b")
_INST_RE = re.compile("|".join(re.escape(i) for i in sorted(TR_INSTITUTIONS, key=len, reverse=True)), re.I)

INSTITUTION_KEY = re.compile(
    r"(Universit|Hospital|Hosp\.|Institute|Instituto|Centre|Center|Clinic|Foundation|Ministry|"
    r"Medical Center|Health Sciences|School of Medicine|College|Akademi|Üniversitesi|Universitesi|"
    r"Hastanesi|Fakültesi|Fakultesi|Eğitim ve Araştırma|Egitim ve Arastirma)", re.I)


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip().strip(",;")


def scrub(text: str) -> str:
    """E-posta, 'Electronic address' ve posta kodu artiklarini temizler."""
    t = text or ""
    t = re.sub(r"Electronic address:.*$", "", t, flags=re.I)
    t = re.sub(r"\S+@\S+", "", t)
    t = re.sub(r"\.\s*\d{3,6}\b", "", t)          # "USA.5309"
    t = re.sub(r"\b\d{4,6}\b", "", t)             # yalin posta kodlari
    t = re.sub(r"\s{2,}", " ", t)
    return t.strip(" ,;.")


def is_turkey(texts) -> tuple:
    """(bool, kanit) dondurur. Kanit: eslesen ulke/kurum/il metni."""
    joined = " || ".join(t for t in texts if t)
    if not joined:
        return False, ""
    m = COUNTRY_TR.search(joined)
    if m:
        return True, "ülke alanı: " + m.group(0).strip(" ,.")
    m = _INST_RE.search(joined)
    if m:
        return True, "kurum: " + m.group(0)
    m = _CITY_RE.search(joined)
    if m and not OTHER_COUNTRY.search(joined):
        return True, "il: " + m.group(0)
    return False, ""


def short_institution(aff: str) -> str:
    """Uzun kurum metnini okunabilir bicime indirger (bilgi kaybi olmadan kisaltma)."""
    aff = scrub(clean(aff))
    if not aff:
        return ""
    parts = [clean(p) for p in aff.split(",") if clean(p)]
    if not parts:
        return aff
    keep = []
    for p in parts:
        if INSTITUTION_KEY.search(p):
            keep.append(p)
            break
    tail = [p for p in parts[-2:]
            if p not in keep and not re.match(r"^(Department|Division|Section|Unit|Service|Clinic of)", p, re.I)]
    if keep:
        out = ", ".join(keep + [t for t in tail if t not in keep])
    else:
        out = ", ".join(parts[-2:])
    return scrub(out)[:160]


def display_authors(names, limit=3) -> str:
    names = [n for n in names if n]
    if not names:
        return "belirtilmemiş"
    if len(names) <= limit:
        return ", ".join(names)
    return ", ".join(names[:limit]) + f" ve ark. ({len(names)} yazar)"


def display_institutions(affiliations, limit=3) -> list:
    out, seen = [], set()
    for a in affiliations:
        s = short_institution(a)
        key = re.sub(r"[^a-z]", "", s.lower())
        if s and key not in seen:
            seen.add(key)
            out.append(s)
        if len(out) >= limit:
            break
    return out
