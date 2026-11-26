"""Önbellekli, paralel HTTP katmanı.

Eski hatta her istek sıralı ve beklemesizdi: PubMed'in ~8 sn yanıt süresiyle
58 dergi + kapsama sorguları tek başına 30 dakikayı aşıyordu. Burada aynı istek
disk önbelleğinden döner, bağımsız istekler eşzamanlı gider.
"""
from __future__ import annotations

import hashlib
import json
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from config import CACHE, CACHE_TTL, HTTP_WORKERS

EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
UA = "ToraksLit/2.0 (literatur takibi; mailto:literatur@example.org)"


def _cache_path(key: str) -> Path:
    return CACHE / (hashlib.sha1(key.encode()).hexdigest() + ".txt")


def get(url: str, params: dict | None = None, *, ttl: int = CACHE_TTL, tries: int = 4,
        headers: dict | None = None, force: bool = False) -> str:
    """GET isteği; sonuç diske yazılır. ttl=0 önbelleği atlar."""
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"
    path = _cache_path(url)
    if not force and ttl and path.exists() and time.time() - path.stat().st_mtime < ttl:
        return path.read_text(encoding="utf-8")
    hdrs = {"User-Agent": UA, "Accept": "application/json, application/xml, text/xml, */*"}
    hdrs.update(headers or {})
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=hdrs)
            with urllib.request.urlopen(req, timeout=120) as r:
                body = r.read().decode("utf-8", "replace")
            if ttl:
                path.write_text(body, encoding="utf-8")
            return body
        except Exception as exc:  # ağ hatası: artan bekleme
            last = exc
            if i < tries - 1:
                time.sleep(1.5 * (i + 1))
    raise RuntimeError(f"istek başarısız: {url} ({last})")


def pmap(fn, items, workers: int | None = None):
    """Sırayı koruyan paralel map."""
    items = list(items)
    if not items:
        return []
    with ThreadPoolExecutor(max_workers=workers or HTTP_WORKERS) as pool:
        return list(pool.map(fn, items))


MAX_PMIDS = 5000
EFETCH_CHUNK = 200


def esearch(term: str, retmax: int = 400, **extra) -> list[str]:
    """PMID listesi. Sonuç retmax'tan çoksa retstart ile sayfalanır (üst sınır MAX_PMIDS)."""
    ids: list[str] = []
    total = 0
    while True:
        params = {"db": "pubmed", "term": term, "retmax": retmax, "retstart": len(ids), "retmode": "json"}
        params.update(extra)
        result = json.loads(get(f"{EUTILS}/esearch.fcgi", params))["esearchresult"]
        page = result.get("idlist", [])
        total = int(result.get("count", 0))
        ids.extend(page)
        if not page or len(ids) >= total or len(ids) >= MAX_PMIDS:
            break
    if total > len(ids):
        print(f"  uyarı: sorgu {total} sonuç, {len(ids)} PMID alındı (üst sınır {MAX_PMIDS})")
    return ids


def esearch_count(term: str, **extra) -> int:
    params = {"db": "pubmed", "term": term, "retmax": 0, "retmode": "json"}
    params.update(extra)
    data = json.loads(get(f"{EUTILS}/esearch.fcgi", params))
    return int(data["esearchresult"].get("count", 0))


def efetch(pmids) -> ET.Element | None:
    """PMID listesini parçalara bölerek getirir; tek istekte yüzlerce kimlik 414 hatası verir."""
    pmids = [p for p in pmids if p]
    if not pmids:
        return None
    root = None
    for group in chunks(pmids, EFETCH_CHUNK):
        xml = get(f"{EUTILS}/efetch.fcgi", {"db": "pubmed", "id": ",".join(group), "retmode": "xml"})
        try:
            part = ET.fromstring(xml)
        except ET.ParseError:
            continue
        if root is None:
            root = part
        else:
            root.extend(list(part))
    return root


def chunks(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]
