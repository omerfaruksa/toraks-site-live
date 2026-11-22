"""Sayı JSON'undan Markdown raporu üretir.

Tek sayı raporu (`render`) ile günlük sayıları birleştiren haftalık rapor
(`render_weekly`) aynı bölüm üreticilerini kullanır; böylece kart, tablo ve
başlık biçimi iki yerde ayrı ayrı bakım gerektirmez.
"""
from __future__ import annotations

import json
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


# ---------------------------------------------------------------- bölümler
def _card(item: dict) -> list[str]:
    lines = [f"#### {item['titleTr']}", f"*{item['titleOrig']}*",
             f"{item['journal']} · giriş {item['entryDate'] or 'belirtilmemiş'} · "
             f"PMID {item['pmid']} / {item['doi'] or 'DOI yok'} · [PubMed]({item['url']})",
             f"Konu etiketi: {', '.join(item['tags']) or 'belirtilmemiş'} · "
             f"Erişim: {'açık tam metin' if item['access'] == 'open' else 'yalnızca özet'}", "",
             f"Özet: {item['summary']}", ""]
    for key, label in CARD_FIELDS:
        lines.append(f"- **{label}:** {item.get(key) or 'belirtilmemiş'}")
    lines.append("")
    return lines


def _direct(direct: list[dict]) -> list[str]:
    out = ["## 2. Doğrudan makaleler", ""]
    for design in rules.DESIGN_ORDER:
        group = [c for c in direct if c.get("design") == design]
        if not group:
            continue
        out += [f"### {DESIGN_TITLE.get(design, design)} ({len(group)})", ""]
        for item in sorted(group, key=lambda c: c.get("entryDate") or "", reverse=True):
            out += _card(item)
    return out


def _trials(trials: list[dict]) -> list[str]:
    out = ["## 3. Klinik araştırmalar", ""]
    if not trials:
        return out + ["Bu dönemde yeni kaydedilen veya sonuçlanan torasik cerrahi çalışması yok.", ""]
    out += ["| NCT | Başlık | Faz | Durum | Kayıt |", "| --- | --- | --- | --- | --- |"]
    for trial in trials:
        out.append(f"| [{trial['nct']}](https://clinicaltrials.gov/study/{trial['nct']}) | "
                   f"{trial['title']} | {trial['phase']} | {trial['status']} | {trial['enrollment']} |")
    return out + [""]


def _indirect(indirect: list[dict]) -> list[str]:
    out = ["## 4. Dolaylı makaleler", ""]
    for item in sorted(indirect, key=lambda c: c.get("entryDate") or "", reverse=True):
        out.append(f"- **{item['title']}** — {item['journal']} · PMID {item['pmid']}"
                   + (f" · {item['oneLiner']}" if item.get("oneLiner") else ""))
    return out + [""]


def _video(video_case: list[dict]) -> list[str]:
    out = ["## 5. Video ve olgu başlıkları", ""]
    for item in sorted(video_case, key=lambda c: c.get("date") or "", reverse=True):
        out.append(f"- [{item['title']}]({item['url']}) — {item['journal']} · "
                   f"{item.get('date') or 'belirtilmemiş'}")
    return out + [""]


def _off_topic(off_topic: list[dict]) -> list[str]:
    out = ["## 6. Konu dışı başlıklar", ""]
    for item in sorted(off_topic, key=lambda c: c.get("date") or "", reverse=True):
        out.append(f"- {item['title']} — {item['journal']}")
    return out + [""]


def _sources(sources: dict, unavailable: list[dict]) -> list[str]:
    out = ["## 7. Taranan kaynaklar ve erişilemeyenler", "", "**Taranan**", ""]
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
    return (_direct(issue["direct"]) + _trials(issue["trials"]) + _indirect(issue["indirect"])
            + _video(issue["videoCase"]) + _off_topic(issue["offTopic"])
            + _sources(issue.get("sources") or {}, issue.get("unavailable") or []))


# ---------------------------------------------------------------- tek sayı
def render(issue: dict) -> str:
    stats = issue["stats"]
    head = [f"# Göğüs Cerrahisi Literatür Taraması — {issue['periodLabel']}", "",
            f"Sayı {issue['date']} · pencere {issue['windowStart']} → {issue['windowEnd']}", ""]
    overview = _overview([
        f"Taranan PubMed kaydı: **{stats['scanned']}**",
        f"Doğrudan: **{stats['direct']}** · Dolaylı: **{stats['indirect']}** · "
        f"Konu dışı: **{stats['offTopic']}**",
        f"Kardiyak içerik (kapsam dışı): {len(issue['cardiac'])} · "
        f"Video/olgu: {len(issue['videoCase'])}",
        f"Klinik araştırma: {stats['trials']} · PubMed dışı kayıt: {stats['external']}",
        f"Dergi kapsaması: {stats['journalsScanned']} dergi tarandı, "
        f"{stats['journalsWithRecords']} dergide kayıt var",
        f"Türkiye bağlantılı doğrudan kart: {stats.get('turkey', 0)}",
    ])
    return "\n".join(head + overview + _body(issue)) + "\n"


def write(issue: dict, path: Path | None = None) -> Path:
    path = path or (ROOT / "content" / "reports" / f"{issue['date']}.md")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(render(issue), encoding="utf-8")
    return path


# ---------------------------------------------------------------- haftalık
def _key(item: dict) -> str:
    return (item.get("pmid") or "").strip() or (item.get("doi") or "").strip() or \
        (item.get("url") or item.get("nct") or item.get("title") or "").strip()


def merge(issues: list[dict]) -> dict:
    """Günlük sayıları tek haftalık demete indirger; PMID/DOI ile tekilleştirir."""
    ordered = sorted(issues, key=lambda i: i["date"], reverse=True)
    names = ("direct", "indirect", "trials", "videoCase", "offTopic", "cardiac", "unavailable",
             "external")
    merged: dict[str, list[dict]] = {name: [] for name in names}
    seen: dict[str, set[str]] = {name: set() for name in names}
    for issue in ordered:
        for name, bucket in merged.items():
            for item in issue.get(name) or []:
                key = _key(item)
                if key in seen[name]:
                    continue
                seen[name].add(key)
                bucket.append(item)
    latest = ordered[0]
    return {
        "date": latest["date"],
        "cadence": "weekly-report",
        "windowStart": min(i["windowStart"] for i in ordered),
        "windowEnd": max(i["windowEnd"] for i in ordered),
        "issues": [i["date"] for i in ordered],
        "scannedSum": sum((i.get("stats") or {}).get("scanned", 0) for i in ordered),
        "journalsScanned": max((i.get("stats") or {}).get("journalsScanned", 0) for i in ordered),
        "turkey": sum(1 for c in merged["direct"] if c.get("turkey")),
        "sources": latest.get("sources") or {},
        **merged,
    }


def render_weekly(merged: dict) -> str:
    evaluated = (len(merged["direct"]) + len(merged["indirect"])
                 + len(merged["offTopic"]) + len(merged["cardiac"]))
    head = [f"# Göğüs Cerrahisi Literatür Raporu — {merged['windowStart']} → {merged['windowEnd']}",
            "",
            f"Haftalık rapor · {len(merged['issues'])} günlük sayı birleştirildi "
            f"({', '.join(merged['issues'])}). Tekilleştirme PMID/DOI ile yapıldı.", ""]
    overview = _overview([
        f"Günlük taramalarda toplanan PubMed kaydı (pencereler örtüşür): **{merged['scannedSum']}**",
        f"Tekilleştirilmiş değerlendirilen kayıt: **{evaluated}**",
        f"Doğrudan: **{len(merged['direct'])}** · Dolaylı: **{len(merged['indirect'])}** · "
        f"Konu dışı: **{len(merged['offTopic'])}**",
        f"Kardiyak içerik (kapsam dışı): {len(merged['cardiac'])} · "
        f"Video/olgu: {len(merged['videoCase'])}",
        f"Klinik araştırma: {len(merged['trials'])} · PubMed dışı kayıt: {len(merged['external'])}",
        f"Dergi kapsaması: {merged['journalsScanned']} dergi",
        f"Türkiye bağlantılı doğrudan kart: {merged['turkey']}",
    ])
    return "\n".join(head + overview + _body(merged)) + "\n"


def write_weekly(days: int = 7, path: Path | None = None) -> Path:
    """Son `days` günlük sayıyı birleştirip haftalık raporu yazar."""
    files = sorted((ROOT / "content" / "issues").glob("*.json"), reverse=True)[:days]
    issues = [json.loads(f.read_text(encoding="utf-8")) for f in files]
    if not issues:
        raise SystemExit("Haftalık rapor için sayı bulunamadı.")
    merged = merge(issues)
    path = path or (ROOT / "content" / "reports" / f"haftalik-{merged['date']}.md")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(render_weekly(merged), encoding="utf-8")
    return path
