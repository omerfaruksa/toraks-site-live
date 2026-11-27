from __future__ import annotations

import io
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from tools.manus_artifacts import format_artifacts, list_artifacts  # noqa: E402


class TestManusArtifacts(unittest.TestCase):
    def test_lists_artifacts_with_api_key_header(self):
        payload = {
            "ok": True,
            "data": [{"id": "a1", "filename": "content.zip", "url": "https://private.example/file"}],
            "has_more": True,
            "next_cursor": "cursor",
        }
        response = io.BytesIO(json.dumps(payload).encode())

        with patch("tools.manus_artifacts.urlopen", return_value=response) as open_url:
            artifacts = list_artifacts("test-secret")

        request = open_url.call_args.args[0]
        self.assertEqual(request.get_header("X-manus-api-key"), "test-secret")
        self.assertEqual(artifacts, payload["data"])

    def test_rejects_malformed_artifact_list(self):
        response = io.BytesIO(json.dumps({"ok": True, "data": {}}).encode())
        with patch("tools.manus_artifacts.urlopen", return_value=response):
            with self.assertRaisesRegex(RuntimeError, "artifact list"):
                list_artifacts("test-secret")

    def test_output_never_includes_download_url(self):
        output = format_artifacts(
            [{
                "id": "a1",
                "task_id": "t1",
                "filename": "content.zip",
                "task_title": "Daily content",
                "url": "https://private.example/signed-download-token",
            }]
        )

        self.assertIn("filename=content.zip", output)
        self.assertIn("artifact_id=a1", output)
        self.assertIn("url=yes", output)
        self.assertNotIn("private.example", output)
        self.assertNotIn("signed-download-token", output)


if __name__ == "__main__":
    unittest.main()
