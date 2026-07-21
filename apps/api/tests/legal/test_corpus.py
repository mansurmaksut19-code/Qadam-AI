from hashlib import sha256
from pathlib import Path
from urllib.parse import urlparse

from qadam_api.legal.corpus import load_corpus, load_manifest

CORPUS_ROOT = Path(__file__).parents[4] / "corpus/legal"
OFFICIAL_HOSTS = {"adilet.zan.kz", "www.adilet.zan.kz", "egov.kz"}


def test_loads_curated_corpus_with_unique_ids() -> None:
    chunks = load_corpus(CORPUS_ROOT)

    assert len(chunks) >= 10
    assert len({chunk.id for chunk in chunks}) == len(chunks)
    assert {chunk.language for chunk in chunks} >= {"ru"}


def test_every_chunk_has_official_provenance_and_current_metadata() -> None:
    chunks = load_corpus(CORPUS_ROOT)

    for chunk in chunks:
        assert urlparse(str(chunk.canonical_url)).hostname in OFFICIAL_HOSTS
        assert chunk.article_ref.strip()
        assert chunk.text.strip()
        assert chunk.effective_date is not None
        assert chunk.snapshot_date.isoformat() == "2026-07-17"
        assert chunk.status == "active"
        assert chunk.clause_types


def test_housing_chunks_use_post_july_2026_snapshot() -> None:
    chunks = load_corpus(CORPUS_ROOT)
    housing_chunks = [chunk for chunk in chunks if chunk.act_id == "housing-relations-94"]

    assert housing_chunks
    assert all(chunk.effective_date.isoformat() >= "2026-07-01" for chunk in housing_chunks)


def test_chunk_text_checksums_are_correct() -> None:
    chunks = load_corpus(CORPUS_ROOT)

    for chunk in chunks:
        expected = sha256(chunk.text.encode("utf-8")).hexdigest()
        assert chunk.checksum_sha256 == expected


def test_manifest_hashes_every_corpus_file() -> None:
    manifest = load_manifest(CORPUS_ROOT / "manifest.json")

    assert manifest.snapshot_date.isoformat() == "2026-07-17"
    assert {entry.path for entry in manifest.files} == {
        "housing_relations.json",
        "civil_code_lease.json",
        "personal_data.json",
    }
    for entry in manifest.files:
        content = (CORPUS_ROOT / entry.path).read_bytes()
        assert entry.checksum_sha256 == sha256(content).hexdigest()
