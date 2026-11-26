"""Beş eksenli taksonomi: ilgi durumu, yayın türü, alan, yaklaşım, tema.

Sınıflandırıcı yalnızca ilgi ve konu etiketlerini üretir; eksenler burada,
kayıt metni ve PubMed yayın türlerinden deterministik olarak türetilir. Böylece
aynı kayıt her koşuda aynı etiketleri alır, ek model çağrısı gerekmez.
"""
from __future__ import annotations

import re

# Eksen 1: tarama ve ilgi durumu (tekli)
INTEREST = {
    "dogrudan": "Doğrudan",
    "dolayli": "Dolaylı",
    "inceleme": "İnceleme bekliyor",
    "kardiyak": "Kardiyak (hariç)",
    "konu_disi": "Konu dışı (hariç)",
}

# Eksen 2: yayın türü ve kanıt katmanı (tekli)
PUB_TYPES = {
    "kilavuz": ("Kılavuz / Uzlaşı", "yuksek"),
    "sistematik": ("Sistematik Derleme / Meta-Analiz", "yuksek"),
    "rct": ("Randomize Kontrollü Çalışma", "yuksek"),
    "gozlemsel": ("Gözlemsel / Kayıt Çalışması", "ozgun"),
    "teknik_video": ("Cerrahi Teknik / Video", "teknik"),
    "derleme": ("Anlatımsal Derleme", "derleme"),
    "olgu": ("Olgu Sunumu / Küçük Seri", "olgu"),
    "editorial": ("Editöryal / Yorum / Mektup", "editorial"),
    "temel": ("Temel / Translasyonel / Deneysel", "temel"),
}

# Eksen 3: anatomik ve klinik alan (1 birincil + en fazla 2 ikincil)
AREAS = {
    "akciger_kanseri": "Akciğer Kanseri ve Torasik Onkoloji",
    "benign_akciger": "Benign Akciğer ve Torasik Enfeksiyonlar",
    "plevra": "Plevra ve Mezotelyoma",
    "mediasten": "Mediasten ve Timus",
    "ozofagus": "Özofagus",
    "trakea": "Trakea ve Hava Yolu",
    "gogus_duvari": "Göğüs Duvarı, Deformite ve TOS",
    "diyafram": "Diyafram",
    "travma": "Toraks Travması",
    "nakil": "Akciğer Nakli ve ECMO/ECLS",
    "pediatrik": "Pediyatrik Göğüs Cerrahisi",
    # Anatomik bölgeye oturmayan ama doğrudan cerrahi pratiği ilgilendiren iki alan:
    # analjezi, hava kaçağı, prehabilitasyon ve genel teknik/sonuç çalışmaları.
    "perioperatif": "Perioperatif Bakım, Analjezi ve ERAS",
    "genel_torasik": "Genel Torasik Cerrahi",
}

# Eksen 4: cerrahi yaklaşım ve teknoloji (çoklu, opsiyonel)
APPROACHES = {
    "acik": "Açık Cerrahi",
    "vats": "VATS",
    "robotik": "Robotik Cerrahi",
    "bronkoskopi": "Girişimsel Bronkoskopi",
    "non_entube": "Non-Entübe / Spontan Ventilasyon",
    "genisletilmis": "Genişletilmiş / CPB-ECMO Destekli",
}

# Eksen 5: çapraz kesitli temalar (çoklu, opsiyonel)
THEMES = {
    "eras": "Perioperatif Bakım / ERAS",
    "multidisipliner": "Multidisipliner Onkoloji",
    "evreleme": "Evreleme, Tarama ve Tanı",
    "yapay_zeka": "Yapay Zekâ ve Dijital Cerrahi",
    "egitim": "Cerrahi Eğitim ve İş Gücü",
    "kalite": "Kalite, Veri Tabanı ve PRO",
}

# Eski konu etiketlerinden alan eşlemesi
TAG_TO_AREA = {
    "Akciğer kanseri cerrahisi": "akciger_kanseri",
    "Mediasten": "mediasten",
    "Özofagus": "ozofagus",
    "Göğüs duvarı": "gogus_duvari",
    "Plevra": "plevra",
    "Akciğer nakli": "nakil",
    "Toraks travması": "travma",
    "Trakea ve hava yolu": "trakea",
    "Diyafram": "diyafram",
    "Perioperatif bakım/ERAS": "perioperatif",
}

RE = re.compile


def _has(pattern: str, text: str) -> bool:
    return RE(pattern, re.IGNORECASE).search(text) is not None


def _pubtypes(rec: dict) -> list[str]:
    return [str(p).lower() for p in (rec.get("pubtypes") or [])]


def pub_type(rec: dict, hit: dict, label: str = "") -> str:
    """PubMed yayın türleri, başlık, tasarım ve tanıtım etiketinden tek yayın türü."""
    types = _pubtypes(rec)
    title = str(rec.get("title") or "")
    design = str(hit.get("design") or "")
    joined = " ".join(types)
    low = label.lower()
    if "guideline" in joined or "consensus development conference" in joined:
        return "kilavuz"
    if "meta-analysis" in joined or "systematic review" in joined or "sistematik" in low:
        return "sistematik"
    if "randomized controlled trial" in joined or design == "rct":
        return "rct"
    # Olgu/video tanıtımındaki kısa etiket, PubMed türü eksikken de doğru sınıfı verir.
    if low:
        if "video" in low or "cerrahi teknik" in low:
            return "teknik_video"
        if any(k in low for k in ("editör", "yorum", "mektup", "düzeltme", "yanıt")):
            return "editorial"
        if "olgu" in low:
            return "olgu"
    if "case reports" in joined:
        return "olgu"
    if "editorial" in joined or "comment" in joined or "letter" in joined:
        return "editorial"
    # "Video yardımlı" bir teknik adıdır, video makale değildir: yalnızca açık
    # video/teknik kalıpları ve PubMed video türü bu sınıfa girer.
    if "video-audio media" in joined or _has(
            r"video article|video-assisted thoracic surgery journal|surgical video|"
            r"how i do it|how we do it|operative technique|surgical technique", title):
        return "teknik_video"
    if "review" in joined:
        return "derleme"
    if design == "nonclinical" or "in vitro" in joined or "animals" in joined:
        return "temel"
    if design == "meta":
        return "sistematik"
    if design == "caseseries":
        return "olgu"
    return "gozlemsel"


def areas(rec: dict, hit: dict) -> list[str]:
    """Birincil alan önce gelir; etiket yoksa başlık ve özet kuralları devreye girer."""
    out: list[str] = []
    for tag in hit.get("tags") or []:
        code = TAG_TO_AREA.get(tag)
        if code and code not in out:
            out.append(code)
    text = f"{rec.get('title') or ''} {rec.get('abstract') or ''}"
    limit = 2 if out else 3
    rules = [
        ("benign_akciger", r"hydatid|echinococc|bronchiectas|tuberculo|aspergill|empyema|lung abscess|"
                           r"bullous|emphysema|lung volume reduction|interstitial lung biopsy"),
        ("pediatrik", r"pediatric|paediatric|children|infant|neonat|congenital pulmonary|cpam|"
                      r"sequestration|pulmonary sequestration"),
        ("gogus_duvari", r"pectus|nuss|chest wall|thoracic outlet|sympathectomy|hyperhidrosis|"
                         r"sternal reconstruction|rib fracture fixation"),
        ("mediasten", r"thymoma|thymectomy|myasthenia|mediastinal|pericardial|pericardium"),
        ("plevra", r"pleura|mesothelioma|pneumothorax|pleurodesis|pleural effusion|decortication"),
        ("ozofagus", r"esophag|oesophag|achalasia|hiatal hernia"),
        ("trakea", r"trachea|tracheal|carina|airway stent|bronchoscopy"),
        ("diyafram", r"diaphragm|diaphragmatic"),
        ("travma", r"trauma|traumatic|flail chest|hemothorax|rib fracture|chest injury|thoracic injury"),
        ("nakil", r"transplant|ecmo|ecls|ex vivo lung perfusion|evlp|primary graft dysfunction"),
        ("akciger_kanseri", r"lung cancer|nsclc|sclc|carcinoma|nodule|metastas|segmentectomy|"
                            r"lobectomy|pneumonectomy|thoracic oncology"),
        ("perioperatif", r"analgesi|analgesic|paravertebral|erector spinae|serratus|nerve block|"
                         r"prehabilitation|enhanced recovery|\beras\b|chest tube|air leak|"
                         r"postoperative pain|patient-controlled|opioid"),
        ("genel_torasik", r"lung resection|thoracotomy|thoracoscop|\bvats\b|thoracic surgery|"
                          r"lung surgery|surgical technique|complication|perioperative|outcome"),
    ]
    for code, pattern in rules:
        if len(out) >= limit:
            break
        if code not in out and _has(pattern, text):
            out.append(code)
    return out[:3]


def approaches(rec: dict) -> list[str]:
    text = f"{rec.get('title') or ''} {rec.get('abstract') or ''}"
    found: list[str] = []
    table = [
        ("robotik", r"\brats\b|robot"),
        ("vats", r"\bvats\b|uniportal|video-assisted|thoracoscop"),
        ("non_entube", r"non-intubated|nonintubated|awake|spontaneous ventilation"),
        ("bronkoskopi", r"ebus|bronchoscop|endobronchial|airway stent|robotic bronchoscop"),
        ("genisletilmis", r"cardiopulmonary bypass|\bcpb\b|ecmo|vascular reconstruction|"
                          r"extended resection|sleeve resection"),
        ("acik", r"thoracotomy|sternotomy|open surgery|clamshell"),
    ]
    for code, pattern in table:
        if _has(pattern, text):
            found.append(code)
    return found[:2]


def themes(rec: dict) -> list[str]:
    text = f"{rec.get('title') or ''} {rec.get('abstract') or ''}"
    found: list[str] = []
    table = [
        ("eras", r"\beras\b|enhanced recovery|analgesi|paravertebral|serratus|chest tube|"
                 r"prehabilitation|postoperative pain"),
        ("multidisipliner", r"neoadjuvant|adjuvant|immunotherapy|chemotherapy|targeted therapy|"
                            r"\btki\b|chemoradi|sbrt|stereotactic"),
        ("evreleme", r"\btnm\b|staging|mediastinoscopy|ebus|pet-?ct|screening|biomarker|"
                     r"radiomic|ct screening"),
        ("yapay_zeka", r"artificial intelligence|machine learning|deep learning|3d print|"
                       r"virtual reality|augmented reality|digital"),
        ("egitim", r"simulation|training|learning curve|cusum|competence|workforce|burnout|"
                   r"education"),
        ("kalite", r"quality improvement|quality indicator|registry|database|patient-reported|"
                   r"\bproms?\b|outcomes research|benchmark|audit"),
    ]
    for code, pattern in table:
        if _has(pattern, text):
            found.append(code)
    return found[:2]


def access_status(rec: dict, pmc: bool) -> str:
    if not str(rec.get("abstract") or "").strip():
        return "ozet_eksik"
    return "tam" if pmc else "ozet"


def compact(tax: dict) -> dict:
    """Arşiv listeleri (kardiyak, konu dışı) için yalnız ilgi ve tür alanları.
    Bu listeler varsayılan akışta görünmez; alan/yaklaşım/tema dizileri sayı
    dosyasını gereksiz şişiriyordu.
    """
    return {key: tax[key] for key in ("interest", "interestLabel", "pubType", "pubTypeLabel", "evidence")}


def describe(rec: dict, hit: dict, pmc: bool = False, label: str = "") -> dict:
    """Kayda beş ekseni ekler; liste üretimi bu sözlüğü doğrudan kullanır."""
    interest = str(hit.get("interest") or "konu_disi")
    if interest == "video_olgu":
        interest = "dogrudan"
    if hit.get("cardiac"):
        interest = "kardiyak"
    ptype = pub_type(rec, hit, label)
    # Editöryal, yorum ve mektuplar yeni veri bildirmez: doğrudan uygulama
    # sayılmaz, dolaylı katmana düşer. Olgu ve video kayıtları doğrudan kalır.
    if ptype == "editorial" and interest == "dogrudan":
        interest = "dolayli"
    area_codes = areas(rec, hit)
    # Hiçbir kural eşleşmezse kayıt etiketsiz kalmasın: genel torasik cerrahi en alt kova.
    if not area_codes:
        area_codes = ["genel_torasik"]
    approach_codes = approaches(rec)
    theme_codes = themes(rec)
    return {
        "interest": interest,
        "interestLabel": INTEREST.get(interest, interest),
        "pubType": ptype,
        "pubTypeLabel": PUB_TYPES[ptype][0],
        "evidence": PUB_TYPES[ptype][1],
        "areas": area_codes,
        "areaLabel": AREAS[area_codes[0]] if area_codes else "",
        "areaLabels": [AREAS[c] for c in area_codes],
        # Kartta görünen konu etiketleri artık modelin serbest metnine değil,
        # alan eksenine dayanır; böylece etiketsiz kart oluşmaz.
        "tags": [AREAS[c] for c in area_codes[:2]],
        "approaches": approach_codes,
        "approachLabels": [APPROACHES[c] for c in approach_codes],
        "themes": theme_codes,
        "themeLabels": [THEMES[c] for c in theme_codes],
        "video": ptype == "teknik_video" or "video-audio media" in _pubtypes(rec),
        "accessStatus": access_status(rec, pmc),
    }
