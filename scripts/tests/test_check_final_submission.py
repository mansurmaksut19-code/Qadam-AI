from __future__ import annotations

import argparse
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.check_final_submission import main, validate_submission


def ready_payload() -> dict[str, object]:
    return {
        "custdev_observations": [
            {"evidence_id": "CUST-01", "status": "verified", "observation": "Anon A"},
            {"evidence_id": "CUST-02", "status": "verified", "observation": "Anon B"},
            {"evidence_id": "CUST-03", "status": "verified", "observation": "Anon C"},
        ],
        "team": [{"name": "Member One", "role": "Product and AI"}],
        "demo_url": "https://www.youtube.com/watch?v=verified-demo",
        "intended_commit": "a" * 40,
        "pitch_path": "pitch/QADAM_AI_Pitch_Deck.html",
    }


class FinalSubmissionValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_directory.name)

    def tearDown(self) -> None:
        self.temp_directory.cleanup()

    def test_external_requirements_are_reported_independently(self) -> None:
        payload = ready_payload()
        payload["custdev_observations"] = []
        payload["team"] = []
        payload["demo_url"] = ""

        errors = validate_submission(
            self.root,
            payload,
            git_state=lambda _root: (True, "a" * 40),
        )

        self.assertEqual(
            errors,
            [
                "custdev: at least 3 verified anonymised observations are required",
                "team: at least one real name and role are required",
                "demo_url: public YouTube, Google Drive, or live URL is required",
            ],
        )

    def test_dirty_or_wrong_commit_and_pitch_markers_fail(self) -> None:
        pitch = self.root / "pitch" / "QADAM_AI_Pitch_Deck.html"
        pitch.parent.mkdir(parents=True)
        pitch.write_text("TEAM INPUT REQUIRED / VIDEO_OR_LIVE_URL", encoding="utf-8")
        payload = ready_payload()
        payload["intended_commit"] = "b" * 40

        errors = validate_submission(
            self.root,
            payload,
            git_state=lambda _root: (False, "a" * 40),
        )

        self.assertEqual(
            errors,
            [
                "pitch: unresolved marker 'TEAM INPUT REQUIRED'",
                "pitch: unresolved marker 'VIDEO_OR_LIVE_URL'",
                "git: repository has uncommitted changes",
                f"git: intended commit {'b' * 40} does not match HEAD {'a' * 40}",
            ],
        )

    def test_ready_submission_passes(self) -> None:
        pitch = self.root / "pitch" / "QADAM_AI_Pitch_Deck.html"
        pitch.parent.mkdir(parents=True)
        pitch.write_text("QADAM AI verified submission", encoding="utf-8")

        self.assertEqual(
            validate_submission(
                self.root,
                ready_payload(),
                git_state=lambda _root: (True, "a" * 40),
            ),
            [],
        )

    def test_cli_commit_override_avoids_a_self_referential_manifest(self) -> None:
        manifest = self.root / "final-submission.json"
        payload = ready_payload()
        payload["intended_commit"] = ""
        manifest.write_text(json.dumps(payload), encoding="utf-8")
        arguments = argparse.Namespace(
            root=self.root,
            manifest=manifest,
            intended_commit="a" * 40,
        )

        with (
            patch("scripts.check_final_submission.parse_args", return_value=arguments),
            patch("scripts.check_final_submission.validate_submission", return_value=[]) as validate,
        ):
            self.assertEqual(main(), 0)

        self.assertEqual(validate.call_args.args[1]["intended_commit"], "a" * 40)


if __name__ == "__main__":
    unittest.main()
