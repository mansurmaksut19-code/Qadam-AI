from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from scripts.check_repository_hygiene import scan_files


class RepositoryHygieneTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_directory.name)

    def tearDown(self) -> None:
        self.temp_directory.cleanup()

    def test_private_key_header_is_rejected(self) -> None:
        candidate = self.root / "leak.pem"
        candidate.write_text("-----BEGIN PRIVATE KEY-----\n", encoding="utf-8")

        findings = scan_files([candidate], self.root)

        self.assertEqual(findings, ["leak.pem: private key material"])

    def test_assignment_style_secret_is_rejected_without_echoing_value(self) -> None:
        candidate = self.root / "settings.py"
        candidate.write_text(
            'OPENAI_API_KEY = "sk-proj-abcdefghijklmnopqrstuvwxyz123456"\n',
            encoding="utf-8",
        )

        findings = scan_files([candidate], self.root)

        self.assertEqual(findings, ["settings.py: probable credential assignment"])

    def test_example_and_test_values_are_allowed(self) -> None:
        example = self.root / ".env.example"
        example.write_text("OPENAI_API_KEY=your-key-here\n", encoding="utf-8")
        fixture = self.root / "test_config.py"
        fixture.write_text('token = "test-token-not-secret"\n', encoding="utf-8")

        findings = scan_files([example, fixture], self.root)

        self.assertEqual(findings, [])

    def test_binary_files_are_ignored(self) -> None:
        candidate = self.root / "image.png"
        candidate.write_bytes(b"\x89PNG\x00-----BEGIN PRIVATE KEY-----")

        findings = scan_files([candidate], self.root)

        self.assertEqual(findings, [])

    def test_runtime_token_expressions_and_response_fields_are_allowed(self) -> None:
        candidate = self.root / "api.py"
        candidate.write_text(
            "access_token = secrets.token_urlsafe(32)\n"
            'payload = {"access_token": accepted.access_token}\n',
            encoding="utf-8",
        )

        findings = scan_files([candidate], self.root)

        self.assertEqual(findings, [])

    def test_private_key_example_inside_documentation_is_allowed(self) -> None:
        candidate = self.root / "plan.md"
        candidate.write_text(
            'candidate.write_text("-----BEGIN PRIVATE KEY-----\\n")\n',
            encoding="utf-8",
        )

        findings = scan_files([candidate], self.root)

        self.assertEqual(findings, [])


if __name__ == "__main__":
    unittest.main()
