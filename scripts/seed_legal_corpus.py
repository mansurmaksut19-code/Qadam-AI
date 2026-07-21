#!/usr/bin/env python3
"""Validate the immutable legal corpus before startup or a demo."""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api/src"))

from qadam_api.legal.corpus import load_corpus, load_manifest  # noqa: E402


def main() -> None:
    corpus_root = ROOT / "corpus/legal"
    manifest = load_manifest(corpus_root / "manifest.json")
    chunks = load_corpus(corpus_root)
    families = Counter(family.value for chunk in chunks for family in chunk.clause_types)
    print(
        json.dumps(
            {
                "version": manifest.version,
                "snapshot_date": manifest.snapshot_date.isoformat(),
                "chunks": len(chunks),
                "families": dict(sorted(families.items())),
            },
            ensure_ascii=False,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
