"""Sayı JSON'undan günlük Markdown raporu üretir.

Haftalık ayrı rapor yoktur: her gün tek sayı üretilir, rapor aynı sayıdan
yazılır ve sohbette bildirilir. Olgu, video ve yorum kayıtları da normal
makale gibi işlenir; türleri yalnızca etiket olarak görünür.
"""
from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

import rules
from config import ROOT

DESIGN_TITLE = {
    "rct": "Randomize kontrollü çalışmalar",
    "meta": "Meta-analiz / sistematik derleme",
    "cohort": "Kohort çalışmaları",
    "casecontrol": "Olgu-kontrol çalışmaları",
    "caseseries": "Olgu serileri",
    "nonclinical": "Klinik dışı çalışmalar",
    "other": "Diğer",
}
CARD_FIELDS = [("designLabel", "Tasarım"), ("sample", "Örneklem"), ("comparison", "Karşılaştırma"),
               ("outcomes", "Sonlanımlar"), ("mainResult", "Ana sonuç"), ("followUp", "Takip"),
               ("dataPeriod", "Veri dönemi")]


# ---------------------------------------------------------------- yardımcılar
def _facets(item: dict) -> str:
    """Kartın tek satırlık taksonomi özeti: tür, alan, yaklaşım, tema."""
    parts = [item.get("pubTypeLabel") or "belirtilmemiş"]
    if item.get("areaLabels"):
        parts.append(" / ".join(item["areaLabels"]))
    if item.get("approachLabels"):
        parts.append(" · ".join(item["approachLabels"]))
    if item.get("themeLabels"):
        parts.append(" · ".join(item["themeLabels"]))
    return " · ".join(parts)


def _direct_items(issue: dict) -> list[dict]:
    """Doğrudan ilgi taşıyan tüm kayıtlar: kartlı makaleler ve olgu/video tanıtımları."""
    cases = [x for x in issue.get("videoCase") or [] if x.get("interest") == "dogrudan"]
    return list(issue.get("direct") or []) + cases


def _indirect_items(issue: dict) -> list[dict]:
    cases = [x for x in issue.get("videoCase") or [] if x.get("interest") == "dolayli"]
    return list(issue.get("indirect") or []) + cases


def _recent(items: list[dict], end: str, days: int = 1) -> list[dict]:
    """Son `days` günde girişi olan kayıtlar; günlük raporda öne çıkarılır."""
    if not end:
        return []
    start = (date.fromisoformat(end) - timedelta(days=days)).isoformat()
    return [x for x in items if (x.get("entryDate") or x.get("date") or "") >= start]


# ---------------------------------------------------------------- bölümler
def _card(item: dict) -> list[str]:
    lines = [f"#### {item.get('titleTr') or item['titleOrig']}", f"*{item['titleOrig']}*",
             f"{item['journal']} · giriş {item['entryDate'] or 'belirtilmemiş'} · "
             f"PMID {item['pmid']} / {item['doi'] or 'DOI yok'} · [PubMed]({item['url']})",
             f"Tür: {_facets(item)} · "
             f"Erişim: {'açık tam metin' if item['access'] == 'open' else 'yalnızca özet'}", "",
             f"Özet: {item.get('summary') or 'belirtilmemiş'}", ""]
    for key, label in CARD_FIELDS:
        lines.append(f"- **{label}:** {item.get(key) or 'belirtilmemiş'}")
    lines.append("")
    return lines


def _brief_card(item: dict) -> list[str]:
    """Olgu, video ve yorum kaydı: çalışma kartı alanları yok, özet ve etiketler var."""
    title_tr = item.get("titleTr") or item.get("title") or ""
    lines = [f"#### {title_tr}"]
    if item.get("titleTr") and item.get("titleTr") != item.get("title"):
        lines.append(f"*{item.get('title')}*")
    lines.append(f"{item['journal']} · giriş {item.get('date') or 'belirtilmemiş'} · "
                 f"PMID {item.get('pmid') or 'yok'} · [Kayıt]({item['url']})")
    lines.append(f"Tür: {_facets(item)}")
    if item.get("summary"):
        lines += ["", f"Özet: {item['summary']}"]
    lines.append("")
    return lines


def _direct(direct: list[dict]) -> list[str]:
    out = ["## 2. Doğrudan makaleler", ""]
    studies = [c for c in direct if c.get("design")]
    briefs = [c for c in direct if not c.get("design")]
    for design in rules.DESIGN_ORDER:
        group = [c for c in studies if c.get("design") == design]
        if not group:
            continue
        out += [f"### {DESIGN_TITLE.get(design, design)} ({len(group)})", ""]
        for item in sorted(group, key=lambda c: c.get("entryDate") or "", reverse=True):
            out += _card(item)
    if briefs:
        # Olgu, video ve yorum kayıtları çalışma kartı almaz; normal akışta kısa kartla yer alır.
        out += [f"### Olgu, video ve yorum tanıtımları ({len(briefs)})", ""]
        for item in sorted(briefs, key=lambda c: c.get("date") or "", reverse=True):
            out += _brief_card(item)
    return out


def _trials(trials: list[dict]) -> list[str]:
    out = ["## 3. Klinik araştırmalar", "",
           "ClinicalTrials.gov iki haftada bir taranır; yeni kayıt ve sonuç bildirimleri burada listelenir.", ""]
    if not trials:
        return out + ["Bu dönemde yeni kaydedilen veya sonuçlanan torasik cerrahi çalışması yok.", ""]
    out += ["| NCT | Başlık | Faz | Durum | Kayıt |", "| --- | --- | --- | --- | --- |"]
    for trial in trials:
        title = trial.get("titleTr") or trial["title"]
        out.append(f"| [{trial['nct']}](https://clinicaltrials.gov/study/{trial['nct']}) | "
                   f"{title} | {trial['phase']} | {trial['status']} | {trial['enrollment']} |")
    return out + [""]


def _indirect(indirect: list[dict]) -> list[str]:
    out = ["## 4. Dolaylı makaleler", ""]
    for item in sorted(indirect, key=lambda c: c.get("entryDate") or c.get("date") or "", reverse=True):
        title = item.get("titleTr") or item.get("title") or ""
        line = (f"- **{title}** — {item['journal']} · "
                f"PMID {item.get('pmid') or 'yok'} · Tür: {_facets(item)}")
        if item.get("oneLiner") or item.get("summary"):
            line += f" · {item.get('oneLiner') or item.get('summary')}"
        out.append(line)
    return out + [""]


def _off_topic(off_topic: list[dict]) -> list[str]:
    out = ["## 5. Konu dışı başlıklar", ""]
    if not off_topic:
        return out + ["Bu sayıda konu dışı kayıt yok.", ""]
    for item in sorted(off_topic, key=lambda c: c.get("date") or "", reverse=True):
        out.append(f"- {item['title']} — {item['journal']}")
    return out + [""]


def _sources(sources: dict, unavailable: list[dict]) -> list[str]:
    out = ["## 6. Taranan kaynaklar ve erişilemeyenler", "", "**Taranan**", ""]
    out += [f"- {line}" for line in sources.get("scanned", [])]
    if sources.get("failed"):
        out += ["", "**Erişilemeyen**", ""] + [f"- {line}" for line in sources["failed"]]
    if sources.get("note"):
        out += ["", sources["note"]]
    if unavailable:
        out += ["", "**Kart yazılamayan doğrudan kayıtlar**", ""]
        out += [f"- {item['title']} — {item['journal']} ({item.get('note', '')})"
                for item in unavailable]
    return out


def _overview(rows: list[str]) -> list[str]:
    return ["## 1. Genel bakış", ""] + [f"- {row}" for row in rows] + [""]


def _body(issue: dict) -> list[str]:
    return (_direct(_direct_items(issue)) + _trials(issue.get("trials") or [])
            + _indirect(_indirect_items(issue)) + _off_topic(issue.get("offTopic") or [])
            + _sources(issue.get("sources") or {}, issue.get("unavailable") or []))


# ---------------------------------------------------------------- tek sayı
def render(issue: dict) -> str:
    stats = issue["stats"]
    direct = _direct_items(issue)
    fresh = _recent(direct, issue.get("windowEnd") or "")
    head = [f"# Göğüs Cerrahisi Literatür Taraması — {issue['periodLabel']}", "",
            f"Sayı {issue['date']} · tarama {issue.get('scanStart') or issue['windowStart']} → "
            f"{issue['windowEnd']}", ""]
    overview = _overview([
        f"Taranan PubMed kaydı: **{stats['scanned']}**",
        f"Doğrudan: **{len(direct)}** (son 24 saatte eklenen {len(fresh)}) · "
        f"Dolaylı: **{len(_indirect_items(issue))}** · Konu dışı: **{stats['offTopic']}**",
        f"Kardiyak içerik (kapsam dışı): {len(issue.get('cardiac') or [])}",
        f"Klinik araştırma: {stats['trials']} (iki haftada bir taranır) · "
        f"PubMed dışı kayıt: {stats['external']}",
        f"Dergi kapsaması: {stats['journalsScanned']} dergi tarandı, "
        f"{stats['journalsWithRecords']} dergide kayıt var",
        f"Türkiye bağlantılı doğrudan kayıt: {stats.get('turkey', 0)}",
    ])
    return "\n".join(head + overview + _body(issue)) + "\n"


def write(issue: dict, path: Path | None = None) -> Path:
    path = path or (ROOT / "content" / "reports" / f"{issue['date']}.md")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(render(issue), encoding="utf-8")
    return path
