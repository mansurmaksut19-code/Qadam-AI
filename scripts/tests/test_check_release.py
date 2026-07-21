from __future__ import annotations

import hashlib
import tempfile
import unittest
import urllib.error
from pathlib import Path

from scripts.check_release import validate_public_urls, validate_release


class ReleaseValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_directory.name)

    def tearDown(self) -> None:
        self.temp_directory.cleanup()

    def test_valid_text_artifact_with_expected_hash_is_accepted(self) -> None:
        content = b"verified evidence\n"
        (self.root / "README.md").write_bytes(content)
        manifest = {
            "artifacts": [
                {
                    "path": "README.md",
                    "kind": "text",
                    "required": True,
                    "sha256": hashlib.sha256(content).hexdigest(),
                    "forbid_placeholders": True,
                }
            ]
        }

        errors = validate_release(self.root, manifest, probe=lambda _path, _kind: {})

        self.assertEqual(errors, [])

    def test_missing_required_artifact_is_reported(self) -> None:
        manifest = {
            "artifacts": [{"path": "missing.pdf", "kind": "pdf", "required": True}]
        }

        errors = validate_release(self.root, manifest, probe=lambda _path, _kind: {})

        self.assertEqual(errors, ["missing required artifact: missing.pdf"])

    def test_forbidden_placeholder_is_reported(self) -> None:
        (self.root / "jury.md").write_text("Business model: TBD\n", encoding="utf-8")
        manifest = {
            "artifacts": [
                {
                    "path": "jury.md",
                    "kind": "text",
                    "required": True,
                    "forbid_placeholders": True,
                }
            ]
        }

        errors = validate_release(self.root, manifest, probe=lambda _path, _kind: {})

        self.assertEqual(errors, ["jury.md: forbidden placeholder 'TBD'"])

    def test_pdf_above_page_limit_is_reported(self) -> None:
        (self.root / "pitch.pdf").write_bytes(b"%PDF fixture")
        manifest = {
            "artifacts": [
                {
                    "path": "pitch.pdf",
                    "kind": "pdf",
                    "required": True,
                    "max_pages": 12,
                }
            ]
        }

        errors = validate_release(
            self.root,
            manifest,
            probe=lambda _path, _kind: {"pages": 13},
        )

        self.assertEqual(errors, ["pitch.pdf: 13 pages exceeds limit 12"])

    def test_video_constraints_report_duration_and_stream_errors(self) -> None:
        (self.root / "demo.mp4").write_bytes(b"video fixture")
        manifest = {
            "artifacts": [
                {
                    "path": "demo.mp4",
                    "kind": "video",
                    "required": True,
                    "max_duration_seconds": 180,
                    "video_codec": "h264",
                    "width": 1920,
                    "height": 1080,
                    "audio_streams": 0,
                }
            ]
        }

        errors = validate_release(
            self.root,
            manifest,
            probe=lambda _path, _kind: {
                "duration_seconds": 181.25,
                "video_streams": 1,
                "audio_streams": 1,
                "video_codec": "vp9",
                "width": 1280,
                "height": 720,
            },
        )

        self.assertEqual(
            errors,
            [
                "demo.mp4: duration 181.250s exceeds limit 180s",
                "demo.mp4: expected video codec h264, got vp9",
                "demo.mp4: expected 1920x1080, got 1280x720",
                "demo.mp4: expected 0 audio streams, got 1",
            ],
        )

    def test_public_url_check_retries_a_transient_network_error(self) -> None:
        calls = 0

        class SuccessfulResponse:
            status = 200

            def __enter__(self) -> SuccessfulResponse:
                return self

            def __exit__(self, *_args: object) -> None:
                return None

        def open_url(_request: object, *, timeout: float) -> SuccessfulResponse:
            nonlocal calls
            calls += 1
            self.assertEqual(timeout, 10.0)
            if calls == 1:
                raise urllib.error.URLError("transient TLS timeout")
            return SuccessfulResponse()

        errors = validate_public_urls(
            ["https://example.test/release"],
            attempts=2,
            open_url=open_url,
        )

        self.assertEqual(errors, [])
        self.assertEqual(calls, 2)


if __name__ == "__main__":
    unittest.main()
