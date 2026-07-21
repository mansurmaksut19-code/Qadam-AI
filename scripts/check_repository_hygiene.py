"""Scan tracked text files for high-confidence credential material."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PRIVATE_KEY_PATTERN = re.compile(r"(?m)^-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")
CREDENTIAL_PATTERN = re.compile(
    r"(?m)^\s*[A-Z][A-Z0-9_]*(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD)\s*[:=]\s*"
    r"(?:\"([^\"\n]{20,})\"|'([^'\n]{20,})'|"
    r"((?:sk-(?:proj-)?|ghp_|github_pat_|AKIA|AIza)[A-Za-z0-9_-]{16,}))"
)
ALLOWED_VALUE_PARTS = ("example", "placeholder", "not-secret", "your-key", "changeme")


def _is_example_or_test(path: Path) -> bool:
    lowered = "/".join(path.parts).lower()
    return (
        path.name.lower().endswith((".example", ".sample", ".template"))
        or "/tests/" in f"/{lowered}/"
        or path.name.lower().startswith("test_")
    )


def scan_files(paths: list[Path], root: Path) -> list[str]:
    findings: list[str] = []
    for path in paths:
        try:
            raw = path.read_bytes()
        except OSError:
            continue
        if b"\x00" in raw:
            continue
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            continue
        relative = path.relative_to(root).as_posix()
        if PRIVATE_KEY_PATTERN.search(text) and not _is_example_or_test(path):
            findings.append(f"{relative}: private key material")
            continue
        if _is_example_or_test(path):
            continue
        for match in CREDENTIAL_PATTERN.finditer(text):
            value = next(group for group in match.groups() if group is not None).lower()
            if not any(part in value for part in ALLOWED_VALUE_PARTS):
                findings.append(f"{relative}: probable credential assignment")
                break
    return findings


def tracked_files(root: Path) -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=root,
        check=True,
        capture_output=True,
    )
    return [root / item.decode("utf-8") for item in result.stdout.split(b"\x00") if item]


def main() -> int:
    findings = scan_files(tracked_files(ROOT), ROOT)
    if findings:
        print("Repository hygiene check failed:")
        for finding in findings:
            print(f"- {finding}")
        return 1
    print("Repository hygiene check passed: no tracked high-confidence secrets found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
