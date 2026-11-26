"""LLM işçisini (llm.mjs) Python'dan çağıran ince köprü. Sağlayıcı seçimi provider.mjs içindedir."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import time

from config import PIPELINE, WORK

WORKER = PIPELINE / "llm.mjs"


def node_binary() -> str:
    """Manus ortamında manus-node, başka yerde düz node (Node 18+)."""
    explicit = os.environ.get("LLM_NODE")
    if explicit:
        return explicit
    provider = os.environ.get("LLM_PROVIDER", "").strip().lower()
    if provider in ("openai", "gemini", "custom"):
        return shutil.which("node") or "node"
    return shutil.which("manus-node") or shutil.which("node") or "node"


def run_worker(mode: str, items: list[dict], out_name: str, model: str,
               conc: int | None = None) -> list[dict]:
    """İşçiyi çalıştırır ve JSONL sonucunu döndürür.

    conc verilirse eşzamanlılık o çağrı için düşürülür; onarım geçişi tek
    istekle çalışıp sağlayıcının eşzamanlı istek sınırına takılmaz.
    """
    WORK.mkdir(parents=True, exist_ok=True)
    in_path = WORK / f"{mode}_input.json"
    out_path = WORK / out_name
    in_path.write_text(json.dumps(items, ensure_ascii=False), encoding="utf-8")
    cmd = [node_binary(), str(WORKER), mode, str(in_path), str(out_path), model]
    print(f"  $ {' '.join(cmd[1:])}", flush=True)
    env = dict(os.environ)
    if conc:
        env["CONC"] = str(conc)
    proc = subprocess.run(cmd, cwd=str(PIPELINE.parent), env=env)
    if proc.returncode != 0:
        print(f"  uyarı: işçi {proc.returncode} koduyla döndü", file=sys.stderr)
    rows = []
    if out_path.exists():
        for line in out_path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rows.append(json.loads(line))
    return rows


def run_worker_reliable(mode: str, items: list[dict], out_name: str, model: str,
                        label: str = "", attempts: int = 3) -> list[dict]:
    """İşçiyi çalıştırır; eksik kalan kayıtları tek istekli onarım geçişiyle toplar.

    Sağlayıcı eşzamanlı istek sınırına takıldığında kayıtlar sessizce
    düşüyordu (bir günlük koşuda 101 kayıt). Onarım geçişi eşzamanlılığı 1'e
    indirir, artan bekleme uygular ve kalan eksikleri açıkça bildirir.
    """
    done = {r["id"]: r for r in run_worker(mode, items, out_name, model)
            if not r.get("error")}
    for attempt in range(1, attempts + 1):
        missing = [it for it in items if it["id"] not in done]
        if not missing:
            break
        print(f"  {label or mode}: {len(missing)} kayıt eksik, onarım {attempt}/{attempts}",
              flush=True)
        time.sleep(4 * attempt)
        done.update({r["id"]: r for r in
                     run_worker(mode, missing, out_name, model, conc=1)
                     if not r.get("error")})
    missing = [it for it in items if it["id"] not in done]
    if missing:
        print(f"  HATA: {label or mode} {len(missing)} kayıt üretilemedi", flush=True)
    return list(done.values())
