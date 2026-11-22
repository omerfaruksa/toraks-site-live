"""manus-node LLM işçisini Python'dan çağıran ince köprü."""
from __future__ import annotations

import json
import subprocess
import sys

from config import PIPELINE, WORK

WORKER = PIPELINE / "llm.mjs"


def run_worker(mode: str, items: list[dict], out_name: str, model: str) -> list[dict]:
    """İşçiyi çalıştırır ve JSONL sonucunu döndürür."""
    WORK.mkdir(parents=True, exist_ok=True)
    in_path = WORK / f"{mode}_input.json"
    out_path = WORK / out_name
    in_path.write_text(json.dumps(items, ensure_ascii=False), encoding="utf-8")
    cmd = ["manus-node", str(WORKER), mode, str(in_path), str(out_path), model]
    print(f"  $ {' '.join(cmd[1:])}", flush=True)
    proc = subprocess.run(cmd, cwd=str(PIPELINE.parent))
    if proc.returncode != 0:
        print(f"  uyarı: işçi {proc.returncode} koduyla döndü", file=sys.stderr)
    rows = []
    if out_path.exists():
        for line in out_path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rows.append(json.loads(line))
    return rows
