"""Sayı JSON'undan haftalık Markdown raporu üretir.

Site ile aynı veriyi kullanır; haftalık görevdeki rapor teslimi bu modüle devredildi,
böylece iki ayrı üretim hattı yerine tek kaynak kalır.
"""
from __future__ import annotations

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


def render(issue: dict) -> str:
    stats = issue["stats"]
    out = [f"# Göğüs Cerrahisi Literatür Taraması — {issue['periodLabel']}", "",
           f"Sayı {issue['date']} · pencere {issue['windowStart']} → {issue['windowEnd']}", "",
           "## 1. Genel bakış", "",
           f"- Taranan PubMed kaydı: **{stats['scanned']}**",
           f"- Doğrudan: **{stats['direct']}** · Dolaylı: **{stats['indirect']}** · "
           f"Konu dışı: **{stats['offTopic']}**",
           f"- Kardiyak içerik (kapsam dışı): {len(issue['cardiac'])} · Video/olgu: {len(issue['videoCase'])}",
           f"- Klinik araştırma: {stats['trials']} · PubMed dışı kayıt: {stats['external']}",
           f"- Dergi kapsaması: {stats['journalsScanned']} dergi tarandı, "
           f"{stats['journalsWithRecords']} dergide kayıt var",
           f"- Türkiye bağlantılı doğrudan kart: {stats.get('turkey', 0)}", ""]

    out += ["## 2. Doğrudan makaleler", ""]
    for design in rules.DESIGN_ORDER:
        group = [c for c in issue["direct"] if c.get("design") == design]
        if not group:
            continue
        out += [f"### {DESIGN_TITLE.get(design, design)} ({len(group)})", ""]
        for item in sorted(group, key=lambda c: c.get("entryDate") or "", reverse=True):
            out += _card(item)

    out += ["## 3. Klinik araştırmalar", ""]
    if issue["trials"]:
        out += ["| NCT | Başlık | Faz | Durum | Kayıt |", "| --- | --- | --- | --- | --- |"]
        for trial in issue["trials"]:
            out.append(f"| [{trial['nct']}](https://clinicaltrials.gov/study/{trial['nct']}) | "
                       f"{trial['title']} | {trial['phase']} | {trial['status']} | {trial['enrollment']} |")
    else:
        out.append("Bu dönemde yeni kaydedilen veya sonuçlanan torasik cerrahi çalışması yok.")
    out.append("")

    out += ["## 4. Dolaylı makaleler", ""]
    for item in sorted(issue["indirect"], key=lambda c: c.get("entryDate") or "", reverse=True):
        out.append(f"- **{item['title']}** — {item['journal']} · PMID {item['pmid']}"
                   + (f" · {item['oneLiner']}" if item.get("oneLiner") else ""))
    out.append("")

    out += ["## 5. Video ve olgu başlıkları", ""]
    for item in sorted(issue["videoCase"], key=lambda c: c.get("date") or "", reverse=True):
        out.append(f"- [{item['title']}]({item['url']}) — {item['journal']} · {item.get('date') or 'belirtilmemiş'}")
    out.append("")

    out += ["## 6. Konu dışı başlıklar", ""]
    for item in sorted(issue["offTopic"], key=lambda c: c.get("date") or "", reverse=True):
        out.append(f"- {item['title']} — {item['journal']}")
    out.append("")

    out += ["## 7. Taranan kaynaklar ve erişilemeyenler", "", "**Taranan**", ""]
    out += [f"- {line}" for line in issue["sources"]["scanned"]]
    if issue["sources"].get("failed"):
        out += ["", "**Erişilemeyen**", ""] + [f"- {line}" for line in issue["sources"]["failed"]]
    if issue["sources"].get("note"):
        out += ["", issue["sources"]["note"]]
    if issue.get("unavailable"):
        out += ["", "**Kart yazılamayan doğrudan kayıtlar**", ""]
        out += [f"- {item['title']} — {item['journal']} ({item.get('note', '')})" for item in issue["unavailable"]]
    return "\n".join(out) + "\n"


def write(issue: dict, path: Path | None = None) -> Path:
    path = path or (ROOT / "content" / "reports" / f"{issue['date']}.md")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(render(issue), encoding="utf-8")
    return path
