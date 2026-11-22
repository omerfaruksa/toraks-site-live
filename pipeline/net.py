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


def esearch(term: str, retmax: int = 400, **extra) -> list[str]:
    params = {"db": "pubmed", "term": term, "retmax": retmax, "retmode": "json"}
    params.update(extra)
    data = json.loads(get(f"{EUTILS}/esearch.fcgi", params))
    return data["esearchresult"].get("idlist", [])


def esearch_count(term: str, **extra) -> int:
    params = {"db": "pubmed", "term": term, "retmax": 0, "retmode": "json"}
    params.update(extra)
    data = json.loads(get(f"{EUTILS}/esearch.fcgi", params))
    return int(data["esearchresult"].get("count", 0))


def efetch(pmids) -> ET.Element | None:
    pmids = [p for p in pmids if p]
    if not pmids:
        return None
    xml = get(f"{EUTILS}/efetch.fcgi", {"db": "pubmed", "id": ",".join(pmids), "retmode": "xml"})
    try:
        return ET.fromstring(xml)
    except ET.ParseError:
        return None


def chunks(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]
