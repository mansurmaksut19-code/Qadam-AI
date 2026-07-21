"""Fail when a relative Markdown link points to a missing repository artifact."""

from __future__ import annotations

import os
import re
from pathlib import Path
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {".git", ".next", ".venv", "node_modules", "playwright-report", "test-results"}
LINK_PATTERN = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")


def markdown_files() -> list[Path]:
    files: list[Path] = []
    for directory, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [name for name in dirnames if name not in SKIP_DIRS]
        base = Path(directory)
        files.extend(base / name for name in filenames if name.endswith(".md"))
    return sorted(files)


def local_target(raw_target: str) -> str | None:
    target = raw_target.strip().split(maxsplit=1)[0].strip("<>")
    if target.startswith(("http://", "https://", "mailto:", "tel:", "#")):
        return None
    return unquote(target.split("#", maxsplit=1)[0])


def main() -> int:
    checked = 0
    missing: list[str] = []
    for markdown in markdown_files():
        text = markdown.read_text(encoding="utf-8")
        for match in LINK_PATTERN.finditer(text):
            target = local_target(match.group(1))
            if not target:
                continue
            checked += 1
            resolved = (markdown.parent / target).resolve()
            if not resolved.exists():
                missing.append(f"{markdown.relative_to(ROOT)} -> {target}")

    if missing:
        print("Missing local Markdown links:")
        for item in missing:
            print(f"- {item}")
        return 1

    print(f"Checked {checked} local Markdown links: all targets exist.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
