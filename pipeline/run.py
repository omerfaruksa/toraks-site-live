#!/usr/bin/env python3
"""Göğüs cerrahisi literatür hattı — tek giriş noktası.

Örnekler:
    python3 pipeline/run.py                      # günlük sayı, tüm aşamalar
    python3 pipeline/run.py --date 2026-11-22    # belirli sayı
    python3 pipeline/run.py --from-cache --out /tmp/deneme.json   # ağ/LLM'siz montaj
    python3 pipeline/run.py --stages issue --report               # yalnızca montaj + rapor
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import config  # noqa: E402
import fetch  # noqa: E402
import issue as issue_mod  # noqa: E402
import memo_seed  # noqa: E402
import report as report_mod  # noqa: E402

STAGES = ["scan", "classify", "cards", "briefs", "external", "trials_tr", "issue", "report"]


def log(message: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {message}", flush=True)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Göğüs cerrahisi literatür hattı")
    parser.add_argument("--date", help="sayı tarihi (YYYY-MM-DD); varsayılan: kadansa göre")
    parser.add_argument("--cadence", default=config.DEFAULT_CADENCE, choices=list(config.CADENCE_DAYS))
    parser.add_argument("--window", type=int, help="gün cinsinden pencere (kadans varsayılanı)")
    parser.add_argument("--scan-window", type=int,
                        help="gün cinsinden tarama penceresi (günlükte 1: son 24 saat)")
    parser.add_argument("--stages", default="all", help=f"virgülle: {','.join(STAGES)} veya all")
    parser.add_argument("--from-cache", action="store_true", help="ağ ve LLM çağrısı yapma, .work kullan")
    parser.add_argument("--out", help="sayı JSON'u için farklı yol (dizin güncellenmez)")
    parser.add_argument("--report", action="store_true", help="Markdown raporu da üret")
    args = parser.parse_args(argv)

    config.ensure_dirs()
    restored = memo_seed.restore()
    if restored:
        log(f"bellek geri yüklendi: {', '.join(restored)}")
    issue_date = date.fromisoformat(args.date) if args.date else config.issue_date_for(args.cadence)
    days = args.window or config.CADENCE_DAYS[args.cadence]
    start, end = config.window(issue_date, days)
    scan_days = args.scan_window or config.SCAN_DAYS[args.cadence]
    scan_start = config.window(issue_date, scan_days)[0]
    trials_start = config.window(issue_date, config.TRIALS_DAYS)[0]
    stages = STAGES if args.stages == "all" else [s.strip() for s in args.stages.split(",")]

    log(f"sayı {end} · pencere {start} → {end} · tarama {scan_start} → {end}"
        f" · aşamalar {', '.join(stages)}")

    if args.from_cache:
        stages = [s for s in stages if s in ("trials_tr", "issue", "report")]

    records = json.loads((config.WORK / "pubmed.json").read_text(encoding="utf-8")).get("records", []) \
        if (config.WORK / "pubmed.json").exists() else []

    if "scan" in stages:
        log("PubMed taraması")
        records = fetch.pubmed(scan_start, end, keep_start=start)["records"]
        log(f"  {len(records)} kayıt")
        log("Yazar/kurum bilgisi")
        fetch.author_meta([r["pmid"] for r in records])
        log("ClinicalTrials.gov")
        log(f"  {len(fetch.trials(scan_start, end, keep_start=trials_start))} aday çalışma")
        log("PubMed dışı kaynaklar (Crossref/RSS)")
        external = fetch.external(scan_start, end, keep_start=start)
        log(f"  {len(external['records'])} kayıt")

    if "classify" in stages:
        import classify
        log("Sınıflandırma (iki geçiş)")
        classify.run(records)

    if "cards" in stages:
        import cards as cards_mod
        log("Çalışma kartları")
        cls = json.loads((config.WORK / "final_cls.json").read_text(encoding="utf-8"))
        cards_mod.run(records, cls)

    if "briefs" in stages:
        import briefs as briefs_mod
        log("Olgu ve video tanıtımları")
        cls = json.loads((config.WORK / "final_cls.json").read_text(encoding="utf-8"))
        briefs_mod.run(records, cls)
    if "external" in stages:
        import external as external_mod
        log("PubMed dışı sınıflandırma")
        payload = json.loads((config.WORK / "external.json").read_text(encoding="utf-8"))
        external_mod.run(payload.get("records", []))

    if "trials_tr" in stages:
        import trial_titles
        log("Klinik araştırma başlıkları")
        rows = json.loads((config.WORK / "trials_raw.json").read_text(encoding="utf-8")) \
            if (config.WORK / "trials_raw.json").exists() else []
        trial_titles.run(rows)
    if "issue" in stages:
        log("Sayı montajı")
        issue = issue_mod.build(end, start, end, use_cache=args.from_cache,
                                cadence=args.cadence, scan_start=scan_start,
                                trials_start=trials_start)
        if args.out:
            Path(args.out).write_text(json.dumps(issue, ensure_ascii=False, indent=1), encoding="utf-8")
            path = args.out
        else:
            path = issue_mod.write(issue)
        log(f"  yazıldı: {path}")
        log(f"  {json.dumps(issue['stats'], ensure_ascii=False)}")
        if args.report or "report" in stages:
            report_path = report_mod.write(issue)
            log(f"  rapor: {report_path}")
    saved = memo_seed.persist()
    if saved:
        log(f"bellek depoya yazıldı: {', '.join(saved)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
