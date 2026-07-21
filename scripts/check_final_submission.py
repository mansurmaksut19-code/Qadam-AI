#!/usr/bin/env python3
"""Fail closed until the external hackathon-submission evidence is genuinely ready."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from collections.abc import Callable
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "release" / "final-submission.json"
ALLOWED_DEMO_HOSTS = {"youtube.com", "www.youtube.com", "youtu.be", "drive.google.com"}
SUBMISSION_MARKERS = ("TEAM INPUT REQUIRED", "VIDEO_OR_LIVE_URL")
COMMIT_PATTERN = re.compile(r"[0-9a-f]{40}")
GitState = Callable[[Path], tuple[bool, str]]


def read_git_state(root: Path) -> tuple[bool, str]:
    status = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    )
    head = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    )
    return (not bool(status.stdout.strip()), head.stdout.strip())


def _has_verified_custdev(payload: dict[str, object]) -> bool:
    observations = payload.get("custdev_observations", [])
    if not isinstance(observations, list):
        return False
    verified = [
        item
        for item in observations
        if isinstance(item, dict)
        and item.get("status") == "verified"
        and isinstance(item.get("observation"), str)
        and item["observation"].strip()
    ]
    return len(verified) >= 3


def _has_team(payload: dict[str, object]) -> bool:
    team = payload.get("team", [])
    return (
        isinstance(team, list)
        and bool(team)
        and all(
            isinstance(item, dict)
            and isinstance(item.get("name"), str)
            and item["name"].strip()
            and isinstance(item.get("role"), str)
            and item["role"].strip()
            for item in team
        )
    )


def _has_public_demo_url(payload: dict[str, object]) -> bool:
    demo_url = payload.get("demo_url")
    if not isinstance(demo_url, str):
        return False
    parsed = urlparse(demo_url)
    if parsed.scheme != "https" or not parsed.hostname:
        return False
    return parsed.hostname in ALLOWED_DEMO_HOSTS or payload.get("live_url") is True


def validate_submission(
    root: Path,
    payload: dict[str, object],
    *,
    git_state: GitState = read_git_state,
) -> list[str]:
    """Return every concrete blocker without inventing external evidence."""

    errors: list[str] = []
    if not _has_verified_custdev(payload):
        errors.append("custdev: at least 3 verified anonymised observations are required")
    if not _has_team(payload):
        errors.append("team: at least one real name and role are required")
    if not _has_public_demo_url(payload):
        errors.append("demo_url: public YouTube, Google Drive, or live URL is required")

    pitch_path = payload.get("pitch_path")
    if isinstance(pitch_path, str) and pitch_path:
        path = root / pitch_path
        if path.is_file():
            pitch_text = path.read_text(encoding="utf-8")
            for marker in SUBMISSION_MARKERS:
                if marker in pitch_text:
                    errors.append(f"pitch: unresolved marker '{marker}'")

    clean, head = git_state(root)
    if not clean:
        errors.append("git: repository has uncommitted changes")
    intended_commit = payload.get("intended_commit")
    if not isinstance(intended_commit, str) or not COMMIT_PATTERN.fullmatch(intended_commit):
        errors.append("git: intended commit SHA is required")
    elif intended_commit != head:
        errors.append(f"git: intended commit {intended_commit} does not match HEAD {head}")
    return errors


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument(
        "--intended-commit",
        help="check this current HEAD without persisting a self-referential SHA in the manifest",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    payload = json.loads(args.manifest.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("final-submission manifest must be a JSON object")
    if args.intended_commit:
        payload["intended_commit"] = args.intended_commit
    errors = validate_submission(args.root.resolve(), payload)
    if errors:
        print("Final submission is blocked:")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Final submission evidence is complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
