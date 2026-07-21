"""Validate and load the versioned QADAM AI legal corpus."""

from __future__ import annotations

import json
from datetime import date, datetime
from hashlib import sha256
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, model_validator

from qadam_api.domain import ClauseType


class LegalChunk(BaseModel):
    """A source-addressable passage from an official Kazakhstan legal act."""

    id: str = Field(min_length=1)
    act_id: str = Field(min_length=1)
    act_title: str = Field(min_length=1)
    authority: str = Field(min_length=1)
    article_ref: str = Field(min_length=1)
    canonical_url: HttpUrl
    language: Literal["ru", "kz"]
    effective_date: date
    snapshot_date: date
    retrieved_at: datetime
    text: str = Field(min_length=1)
    clause_types: list[ClauseType] = Field(min_length=1)
    status: Literal["active", "superseded"]
    checksum_sha256: str = ""

    @model_validator(mode="after")
    def populate_or_validate_checksum(self) -> LegalChunk:
        expected = sha256(self.text.encode("utf-8")).hexdigest()
        if self.checksum_sha256 and self.checksum_sha256 != expected:
            raise ValueError(f"invalid text checksum for legal chunk {self.id}")
        self.checksum_sha256 = expected
        return self


class CorpusFile(BaseModel):
    """A corpus file pinned by content hash."""

    path: str = Field(min_length=1)
    checksum_sha256: str = Field(min_length=64, max_length=64)


class CorpusManifest(BaseModel):
    """Corpus release metadata."""

    version: str = Field(min_length=1)
    snapshot_date: date
    files: list[CorpusFile] = Field(min_length=1)


def load_manifest(path: Path) -> CorpusManifest:
    """Load a manifest and calculate pinned file hashes from its directory."""

    payload = json.loads(path.read_text(encoding="utf-8"))
    files = []
    for entry in payload["files"]:
        corpus_path = path.parent / entry["path"]
        files.append(
            {
                "path": entry["path"],
                "checksum_sha256": sha256(corpus_path.read_bytes()).hexdigest(),
            }
        )
    payload["files"] = files
    return CorpusManifest.model_validate(payload)


def load_corpus(root: Path) -> list[LegalChunk]:
    """Load all manifest-listed chunks and reject duplicate identifiers."""

    manifest = load_manifest(root / "manifest.json")
    chunks: list[LegalChunk] = []
    for entry in manifest.files:
        payload = json.loads((root / entry.path).read_text(encoding="utf-8"))
        chunks.extend(LegalChunk.model_validate(item) for item in payload["chunks"])

    ids = [chunk.id for chunk in chunks]
    if len(ids) != len(set(ids)):
        raise ValueError("legal corpus contains duplicate chunk IDs")
    return chunks
