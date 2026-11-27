#!/usr/bin/env python3
"""List recent Manus Library artifacts without downloading or exposing their URLs."""
from __future__ import annotations

import json
import os
import sys
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

API_URL = "https://api.manus.ai/v2/artifact.list?limit=20"


def list_artifacts(api_key: str) -> list[dict[str, Any]]:
    request = Request(
        API_URL,
        headers={"x-manus-api-key": api_key, "Accept": "application/json"},
    )
    with urlopen(request, timeout=30) as response:
        payload = json.load(response)

    if not isinstance(payload, dict) or payload.get("ok") is not True:
        error = payload.get("error", {}) if isinstance(payload, dict) else {}
        code = error.get("code", "unknown") if isinstance(error, dict) else "unknown"
        message = error.get("message", "Invalid API response") if isinstance(error, dict) else "Invalid API response"
        raise RuntimeError(f"Manus API error ({code}): {message}")

    artifacts = payload.get("data")
    if not isinstance(artifacts, list) or not all(isinstance(item, dict) for item in artifacts):
        raise RuntimeError("Manus API response did not contain an artifact list.")
    return artifacts


def _field(value: Any) -> str:
    if value is None or value == "":
        return "-"
    return str(value).replace("\r", " ").replace("\n", " ")


def format_artifacts(artifacts: list[dict[str, Any]]) -> str:
    lines = [f"Son {len(artifacts)} Manus artifact'i (en fazla 20):"]
    if not artifacts:
        lines.append("Artifact bulunamadı.")
        return "\n".join(lines)

    for artifact in artifacts:
        lines.append(
            "- "
            f"filename={_field(artifact.get('filename'))}; "
            f"task_title={_field(artifact.get('task_title'))}; "
            f"type={_field(artifact.get('type'))}/{_field(artifact.get('file_type'))}; "
            f"artifact_id={_field(artifact.get('id'))}; "
            f"task_id={_field(artifact.get('task_id'))}; "
            f"updated_at={_field(artifact.get('updated_at'))}; "
            f"url={'yes' if artifact.get('url') else 'no'}"
        )
    return "\n".join(lines)


def main() -> int:
    api_key = os.environ.get("MANUS_API_KEY")
    if not api_key:
        print("MANUS_API_KEY ortam değişkeni tanımlı değil.", file=sys.stderr)
        return 2

    try:
        print(format_artifacts(list_artifacts(api_key)))
    except HTTPError as error:
        print(f"Manus API HTTP hatası: {error.code}", file=sys.stderr)
        return 1
    except URLError as error:
        print(f"Manus API bağlantı hatası: {error.reason}", file=sys.stderr)
        return 1
    except (TimeoutError, json.JSONDecodeError, RuntimeError) as error:
        print(f"Manus artifact listesi alınamadı: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
