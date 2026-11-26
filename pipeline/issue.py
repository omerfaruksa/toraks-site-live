"""Sayı montajı: tüm bölümler tek geçişte, tek atomik yazmayla üretilir.

Eski hat sayıyı önce build_issue ile yazıp sonra enrich_meta, scope_tags,
merge_external ve coverage ile dört kez yeniden yazıyordu; herhangi bir adım
düşerse yarım kalmış bir sayı kalıyordu. Burada ara sonuçlar bellekte tutulur,
dosya yalnızca sonunda (tmp + rename) yazılır.
"""
from __future__ import annotations

import json
import os
from collections import Counter
from datetime import date, datetime, timedelta, timezone

import fetch
import journals
import net
import rules
import taxonomy
from config import INDEX, ISSUES, WORK, period_label

STATUS_TR = {
    "RECRUITING": "Kayıt açık", "NOT_YET_RECRUITING": "Henüz kayıt almıyor",
    "ENROLLING_BY_INVITATION": "Davetle kayıt", "ACTIVE_NOT_RECRUITING": "Aktif, kayıt almıyor",
    "COMPLETED": "Tamamlandı", "SUSPENDED": "Askıda", "TERMINATED": "Sonlandırıldı",
    "WITHDRAWN": "Geri çekildi", "UNKNOWN": "Bilinmiyor",
}
PHASE_TR = {"PHASE1": "Faz 1", "PHASE2": "Faz 2", "PHASE3": "Faz 3", "PHASE4": "Faz 4",
            "EARLY_PHASE1": "Erken Faz 1", "NA": "Uygulanamaz", "": "belirtilmemiş"}


def _write_json(path, payload) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, path)


def _load(name: str, default):
    path = WORK / name
    if not path.exists():
        return default
    text = path.read_text(encoding="utf-8")
    if name.endswith(".jsonl"):
        rows = [json.loads(line) for line in text.splitlines() if line.strip()]
        return [dict(r, id=r.get("id") or r.get("pmid")) for r in rows]
    return json.loads(text)


def _title_item(rec: dict) -> dict:
    return {
        "title": rules.clean(rec.get("title")),
        "journal": journals.name_of(rec),
        "date": rules.iso_or_empty(rec.get("entry_date")),
        "url": f"https://pubmed.ncbi.nlm.nih.gov/{rec['pmid']}/",
        "pmid": rec["pmid"],
    }


def build_lists(records: list[dict], cls: dict, cards: dict, pmc: dict,
                briefs: dict | None = None) -> dict:
    briefs = briefs or {}
    direct, indirect, video_case, off_topic, cardiac, unavailable = [], [], [], [], [], []
    by_pmid = {r["pmid"]: r for r in records}
    # Liste her kayıt için yeniden kurulmasın: küme bir kez hazırlanır.
    listed_names = journals.listed_names()

    for pmid, hit in cls.items():
        rec = by_pmid.get(pmid)
        if not rec:
            continue
        title = rules.clean(rec.get("title"))
        abstract = rules.clean(rec.get("abstract"))
        text = f"{title} {abstract}"
        tax = taxonomy.describe(rec, hit, pmid in pmc)
        if hit["cardiac"]:
            cardiac.append({**_title_item(rec), **taxonomy.compact(tax)})
            continue
        interest = hit["interest"]

        if interest == "dogrudan":
            card_row = cards.get(pmid)
            if not card_row or not abstract:
                item = {**_title_item(rec), **tax}
                item["note"] = "Tam metne erişilemedi; kart yazılmadı."
                unavailable.append(item)
                continue
            listed = journals.name_of(rec) in listed_names
            group = journals.group_of(rec)
            if not rules.is_thoracic(text):
                off_topic.append({**_title_item(rec), **taxonomy.compact(tax)})
                continue
            if not listed and not rules.is_surgical(text):
                off_topic.append({**_title_item(rec), **taxonomy.compact(tax)})
                continue
            if group == "C" and not rules.is_thoracic(title):
                off_topic.append({**_title_item(rec), **taxonomy.compact(tax)})
                continue
            card = card_row["card"]
            if rules.is_protocol(title) and card.get("mainResult", "").startswith("belirtilmemiş"):
                item = {**_title_item(rec), **tax}
                item["note"] = "Çalışma protokolü; sonuç bildirilmemiş."
                unavailable.append(item)
                continue
            title_tr = (card.get("titleTr") or "").strip()
            if not title_tr or title_tr.lower().startswith("belirtilmemi"):
                title_tr = title
            direct.append({
                "id": pmid,
                "titleTr": title_tr,
                "titleOrig": title,
                "journal": journals.name_of(rec),
                "entryDate": rules.iso_or_empty(rec.get("entry_date")),
                "pmid": pmid,
                "doi": rec.get("doi") or "",
                "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                "tags": hit["tags"],
                "access": "open" if pmid in pmc else "abstract",
                "design": hit["design"],
                "designLabel": card.get("designLabel", "belirtilmemiş"),
                "summary": card.get("summary", ""),
                "sample": card.get("sample", ""),
                "comparison": card.get("comparison", ""),
                "outcomes": card.get("outcomes", ""),
                "mainResult": card.get("mainResult", ""),
                "followUp": card.get("followUp", ""),
                "dataPeriod": card.get("dataPeriod", ""),
                "verified": not card_row.get("mismatches"),
                "note": "",
                **tax,
            })
        elif interest == "dolayli":
            indirect.append({
                "id": pmid,
                "title": title,
                "journal": journals.name_of(rec),
                "pmid": pmid,
                "entryDate": rules.iso_or_empty(rec.get("entry_date")),
                "doi": rec.get("doi") or "",
                "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                "oneLiner": hit["one_liner"],
                "tags": hit["tags"],
                **tax,
            })
        elif interest == "video_olgu":
            # Olgu ve video kayıtları da göğüs cerrahisiyle ilgili olmalı: aksi hâlde
            # akışta başka branşların olgu bildirimleri birikiyor.
            if not rules.is_thoracic(text) or rules.is_animal_case(text):
                off_topic.append({**_title_item(rec), **taxonomy.compact(tax)})
                continue
            types = " ".join(rec.get("pubtypes") or [])
            name = _title_item(rec)["journal"]
            kind = "video" if ("Video-Audio Media" in types or "MMCTS" in name
                               or "Visualized Surgery" in name
                               or "Video-Assisted Thoracic Surgery" in name) else "case"
            brief = briefs.get(pmid) or {}
            # Tanıtım etiketi (olgu, video, editöryal) yayın türünü kesinleştirir.
            tax = taxonomy.describe(rec, hit, pmid in pmc, brief.get("designLabel") or "")
            item = {**_title_item(rec), **tax, "kind": kind}
            title_tr = (brief.get("titleTr") or "").strip()
            if title_tr and not title_tr.lower().startswith("belirtilmemi"):
                item["titleTr"] = title_tr
            summary = (brief.get("summary") or "").strip()
            if summary:
                item["summary"] = summary
            if brief.get("designLabel"):
                item["designLabel"] = brief["designLabel"]
            video_case.append(item)
        else:
            off_topic.append({**_title_item(rec), **taxonomy.compact(tax)})

    return {"direct": direct, "indirect": indirect, "videoCase": video_case,
            "offTopic": off_topic, "cardiac": cardiac, "unavailable": unavailable}


def enrich(lists: dict, meta: dict) -> None:
    """Yazar, kurum ve Türkiye bilgisi (yalnızca PubMed kurum satırlarından).

    Kurum listesi yalnızca çalışma kartlarında (Doğrudan/Dolaylı) gösterilir;
    başlık listelerine taşınmaz, çünkü sayı dosyasının üçte birini şişiriyordu.
    """
    turkey_all = 0
    for key in ("direct", "indirect", "videoCase", "offTopic", "cardiac", "unavailable"):
        card_list = key in ("direct", "indirect")
        for item in lists[key]:
            info = meta.get(item.get("pmid") or "")
            if not info:
                item.setdefault("authors", "belirtilmemiş")
                item.setdefault("turkey", False)
                if card_list:
                    item.setdefault("institutions", [])
                continue
            item["authors"] = info["authors"]
            item["turkey"] = info["turkey"]
            if card_list:
                item["institutions"] = info["institutions"]
            if info["turkey"]:
                item["turkeyNote"] = info["turkeyEvidence"]
                turkey_all += 1
            else:
                item.pop("turkeyNote", None)
    lists["statsTurkey"] = {
        "turkey": sum(1 for x in lists["direct"] if x.get("turkey")),
        "turkeyAll": turkey_all,
    }


def tag_scope(lists: dict, affiliations: dict[str, list[str]]) -> None:
    for key in ("direct", "indirect"):
        for card in lists[key]:
            affs = affiliations.get(str(card.get("pmid")), [])
            branches = rules.branches_of(affs)
            countries = rules.countries_of(affs)
            scope = rules.scope_of(card)
            card["scope"] = scope
            card["scopeLabel"] = rules.SCOPE_TR.get(scope, "")
            card["disciplines"] = branches
            card["multidisciplinary"] = len(branches) >= 2
            card["international"] = len(countries) >= 2
            if countries:
                card["countries"] = countries


def merge_external(lists: dict, external_rows: list[dict]) -> list[dict]:
    known = {str(x.get("doi") or "").lower() for key, value in lists.items()
             if isinstance(value, list) for x in value if x.get("doi")}
    groups = journals.by_name()
    out = []
    for item in external_rows:
        if (item.get("doi") or "").lower() in known:
            continue
        interest = item.get("interest") or ""
        if item.get("cardiac") and (groups.get(item.get("journal", "").strip(), {}) or {}).get("group") == "A":
            interest = "kardiyak"
        out.append({
            "titleTr": (item.get("title_tr") or "").strip(),
            "title": item["title"],
            "journal": item["journal"],
            "date": item.get("date") or "",
            "dateBasis": item.get("dateBasis") or "",
            "doi": item.get("doi") or "",
            "url": item.get("url") or "",
            "authors": item.get("authors") or "belirtilmemiş",
            "institutions": item.get("institutions") or [],
            "turkey": bool(item.get("turkey")),
            "interest": interest,
            "interestLabel": rules.INTEREST_TR.get(interest, ""),
            "tags": item.get("tags") or [],
            "oneLiner": "" if interest == "kardiyak" else (item.get("one_liner") or ""),
            "source": "Crossref" if item.get("source") == "crossref" else "RSS",
            "note": "Özet metnine erişilemedi; yalnızca başlık düzeyinde listelendi."
            if not (item.get("abstract") or "").strip() else "",
        })
    out.sort(key=lambda r: rules.INTEREST_ORDER.get(r["interest"], 9))
    return out


def build_trials(rows: list[dict], limit: int = 18) -> list[dict]:
    titles_tr = _load("trials_tr.json", {})
    relevant = [t for t in rows if t.get("nct") and fetch.trial_relevant(t)]
    relevant.sort(key=lambda t: (t.get("firstPost") or "", t.get("resultsPost") or ""), reverse=True)
    out = []
    for trial in relevant[:limit]:
        out.append({
            "nct": trial["nct"],
            "title": trial["title"],
            "titleTr": titles_tr.get(trial["nct"], ""),
            "phase": PHASE_TR.get((trial.get("phase") or "").split(",")[0].strip(),
                                  trial.get("phase") or "belirtilmemiş"),
            "status": STATUS_TR.get(trial.get("status"), trial.get("status") or "belirtilmemiş"),
            "date": trial.get("resultsPost") or trial.get("firstPost") or "",
            "dates": f"İlk kayıt {trial.get('firstPost') or 'belirtilmemiş'}"
                     + (f" · sonuç {trial['resultsPost']}" if trial.get("resultsPost") else ""),
            "enrollment": trial.get("enrollment") or "belirtilmemiş",
            "primary": trial.get("primary") or "belirtilmemiş",
            "sponsor": " / ".join(x for x in [trial.get("sponsor"), ", ".join(trial.get("countries") or [])] if x),
        })
    return out


def coverage_table(issue_date: str, counts: dict[str, int], use_cache: bool) -> list[dict]:
    cached = _load("coverage.json", None)
    if use_cache and cached:
        return cached
    end = date.fromisoformat(issue_date)
    start30 = (end - timedelta(days=30)).isoformat()

    def one(row):
        clause = journals.issn_clause(row)
        if not clause:
            return {"journal": row["journal"], "group": row["group"], "issn": "", "count7": 0,
                    "count30": 0, "lastEntry": "", "source": "yok", "status": "PubMed'de yok"}
        count30 = net.esearch_count(f"({clause}) AND (\"{start30}\"[edat] : \"{issue_date}\"[edat])")
        latest = ""
        for days in (30, 365, 1095):
            start = (end - timedelta(days=days)).isoformat()
            ids = net.esearch(f"({clause}) AND (\"{start}\"[edat] : \"{issue_date}\"[edat])", retmax=20)
            if ids:
                root = net.efetch(ids)
                if root is not None:
                    stamps = [fetch.iso_date(s.findtext("Year"), s.findtext("Month"), s.findtext("Day"))
                              for s in root.iter("PubMedPubDate") if s.get("PubStatus") == "entrez"]
                    latest = max([s for s in stamps if s] or [""])
                break
        count7 = counts.get(row["journal"], 0)
        status = ("kayıt var" if count7 else "bu dönem yok" if count30
                  else "seyrek" if latest else "PubMed'de yok")
        return {"journal": row["journal"], "group": row["group"],
                "issn": (journals.issns_of(row) or [""])[0], "count7": count7, "count30": count30,
                "lastEntry": latest, "source": (journals.source_map().get(row["journal"], {}) or {}).get("source", "pubmed"),
                "status": status}

    table = net.pmap(one, journals.rows())
    _write_json(WORK / "coverage.json", table)
    return table


def sources_manifest(records_count: int, failed: list[str], scan_start: str = "",
                     start: str = "", end: str = "") -> dict:
    issn_total = sum(len(journals.issns_of(row)) for row in journals.rows())
    scanned = [
        f"PubMed — dergi bazlı tarama: {len(journals.rows())} derginin {issn_total} ISSN kaydı (basılı, e-ISSN, eski ISSN) + [edat]",
        "PubMed — konu sorgusu (MeSH + [tiab]) ile liste dışı dergiler",
        "ClinicalTrials.gov — StudyFirstPostDate ve ResultsFirstPostDate",
        "Europe PMC — ön baskılar (SRC:PPR)",
        "Crossref — kaynak_esleme.csv dergileri için DOI kayıtları (online ve basılı yayın tarihi)",
        "Dergi RSS — Elsevier akışları",
        "A grubu dergilerde kardiyak içerik ayrı listelendi",
    ]
    if scan_start and start and scan_start != start:
        scanned.insert(0, f"Günlük tarama: {scan_start} → {end} (son 24 saat); "
                          f"kayıtlar {start} → {end} kayan penceresine eklenir")
    return {"scanned": scanned, "failed": failed, "empty": [], "note": ""}


LIST_KEYS = ("direct", "indirect", "videoCase", "offTopic", "cardiac", "unavailable")


def check_lists(lists: dict, records: list[dict], cls: dict) -> list[str]:
    """Listelerin kayıt kümesini birebir böldüğünü doğrular.

    Her kayıt tam olarak bir listeye düşmeli; sayılmadığı ya da iki kez
    yazıldığı durum sessizce sayıyı bozuyordu. Sonuç boşsa dağıtım tutarlı.
    """
    known = {r["pmid"] for r in records}
    expected = sum(1 for pmid in cls if pmid in known)
    counted = sum(len(lists.get(key, [])) for key in LIST_KEYS)
    problems: list[str] = []
    if counted != expected:
        problems.append(f"liste toplamı {counted}, sınıflandırılan kayıt {expected}")
    seen: dict[str, str] = {}
    for key in LIST_KEYS:
        for item in lists.get(key, []):
            pmid = str(item.get("pmid") or "")
            if pmid in seen:
                problems.append(f"PMID {pmid} hem {seen[pmid]} hem {key} listesinde")
                break
            seen[pmid] = key
    return problems


def build(issue_date: str, start: str, end: str, *, use_cache: bool = False,
          cadence: str = 'daily', scan_start: str = "", trials_start: str = "") -> dict:
    records = _load("pubmed.json", {}).get("records", [])
    cls = _load("final_cls.json", {})
    card_rows = {r["id"]: r for r in _load("cards.jsonl", []) if not r.get("error") and r.get("card")}
    briefs = {r["id"]: r["brief"] for r in _load("briefs.jsonl", [])
              if not r.get("error") and r.get("brief")}
    trials_raw = _load("trials_raw.json", [])
    external_cls = _load("external_cls.json", [])
    meta = _load("meta.json", {})

    pmids = [r["pmid"] for r in records]
    unclassified = [pmid for pmid in pmids if pmid not in cls]
    if unclassified:
        # Sınıflandırılamayan kayıt listelere girmez; sayı sessizce eksik kalır.
        # Sayıyı yazmak yerine durup nedeni bildiriyoruz.
        raise RuntimeError(
            f"{len(unclassified)} kayıt sınıflandırılmamış (ör. {', '.join(unclassified[:5])}); "
            "sayı yazılmadı, classify aşamasını yeniden çalıştırın")
    pmc = fetch.pmc_ids([p for p, hit in cls.items()
                         if hit["interest"] == "dogrudan" and not hit["cardiac"]])
    affiliations = {pmid: (meta.get(pmid) or {}).get("affiliations", []) for pmid in pmids}

    lists = build_lists(records, cls, card_rows, pmc, briefs)
    enrich(lists, meta)
    tag_scope(lists, affiliations)
    external = merge_external(lists, external_cls)
    trials = build_trials(trials_raw)

    for problem in check_lists(lists, records, cls):
        print(f"  uyarı: liste tutarsızlığı — {problem}", flush=True)

    counts = Counter(journals.name_of(r) for r in records)
    listed = [row["journal"] for row in journals.rows()]
    journal_rows = [{"name": name,
                     "group": (journals.by_name().get(name, {}) or {}).get("group", ""),
                     "count": counts.get(name, 0)} for name in listed]
    journal_rows.sort(key=lambda x: (-x["count"], x["name"]))
    empty = [row["journal"] for row in journals.rows()
             if counts.get(row["journal"], 0) == 0 and journals.issns_of(row)]
    nonpubmed = journals.nonpubmed_names()

    coverage = coverage_table(issue_date, counts, use_cache)
    failed = [
        "TR Dizin — arama API'si kimlik doğrulama istiyor (HTTP 401); dergiler Crossref DOI kayıtları üzerinden izleniyor.",
    ]
    report = _load("external.json", {}).get("report", [])
    feed_errors = [f"{r['journal']} ({r['source']})" for r in report if r.get("error")]
    if feed_errors:
        failed.append("PubMed dışı akış hataları: " + ", ".join(sorted(feed_errors)))
    sources = sources_manifest(len(records), failed, scan_start=scan_start, start=start, end=end)
    sources["empty"] = empty
    sources["note"] = ("PubMed'de indeksli olmayan ulusal dergiler bu sayıda taranamadı: "
                       + ", ".join(nonpubmed) + ".") if nonpubmed else ""

    issue = {
        "date": issue_date,
        "cadence": cadence,
        "windowStart": start,
        "windowEnd": end,
        "scanStart": scan_start or start,
        "periodLabel": period_label(start, end),
        "generatedAt": datetime.now(timezone(timedelta(hours=3))).isoformat(timespec="seconds"),
        "stats": {
            "scanned": len(records),
            "direct": len(lists["direct"]),
            "indirect": len(lists["indirect"]),
            "offTopic": len(lists["offTopic"]),
            "trials": len(trials),
            "journalsScanned": len(journals.rows()),
            "journalsWithRecords": sum(1 for j in journal_rows if j["count"] > 0),
            "externalRecords": sum(counts[n] for n in counts if n not in listed),
            "externalJournals": len([n for n in counts if n not in listed]),
            "turkey": lists["statsTurkey"]["turkey"],
            "turkeyAll": lists["statsTurkey"]["turkeyAll"],
            "external": len(external),
        },
        "journals": journal_rows,
        "direct": lists["direct"],
        "trials": trials,
        "indirect": lists["indirect"],
        "videoCase": lists["videoCase"],
        "offTopic": lists["offTopic"],
        "cardiac": lists["cardiac"],
        "unavailable": lists["unavailable"],
        "sources": sources,
        "external": external,
        "coverage": coverage,
    }
    return issue


def write(issue: dict, *, update_index: bool = True) -> str:
    ISSUES.mkdir(parents=True, exist_ok=True)
    path = ISSUES / f"{issue['date']}.json"
    _write_json(path, issue)
    if update_index:
        try:
            index = json.loads(INDEX.read_text(encoding="utf-8"))
        except Exception:
            index = []
        index = [x for x in index if x.get("date") != issue["date"]]
        # Dizin sayıları akıştaki toplamı gösterir: olgu ve video kayıtları da
        # ilgi eksenine göre doğrudan veya dolaylı sayılır.
        cases = issue.get("videoCase") or []
        direct_n = issue["stats"]["direct"] + sum(1 for c in cases if c.get("interest") == "dogrudan")
        indirect_n = issue["stats"]["indirect"] + sum(1 for c in cases if c.get("interest") == "dolayli")
        index.append({
            "date": issue["date"],
            "cadence": issue.get("cadence"),
            "periodLabel": issue["periodLabel"],
            "direct": direct_n,
            "indirect": indirect_n,
            "scanned": issue["stats"]["scanned"],
            "trials": issue["stats"]["trials"],
        })
        index.sort(key=lambda x: x["date"], reverse=True)
        _write_json(INDEX, index)
    return str(path)
