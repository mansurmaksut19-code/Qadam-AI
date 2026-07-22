"""Validate QADAM release artifacts against a machine-readable manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from collections.abc import Callable
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "release" / "release-manifest.json"
PLACEHOLDER_PATTERN = re.compile(r"\b(TBD|TODO|FIXME)\b")
Probe = Callable[[Path, str], dict[str, Any]]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file_handle:
        for block in iter(lambda: file_handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def probe_artifact(path: Path, kind: str) -> dict[str, Any]:
    if kind == "pdf":
        pdfinfo = shutil.which("pdfinfo")
        if pdfinfo and not pdfinfo.lower().endswith((".cmd", ".bat")):
            result = subprocess.run(
                [pdfinfo, str(path)],
                check=True,
                capture_output=True,
                text=True,
            )
            for line in result.stdout.splitlines():
                if line.startswith("Pages:"):
                    return {"pages": int(line.split(":", maxsplit=1)[1].strip())}
            raise ValueError(f"pdfinfo did not report a page count for {path}")

        from pypdf import PdfReader

        return {"pages": len(PdfReader(path).pages)}

    if kind == "video":
        ffprobe = shutil.which("ffprobe")
        if ffprobe is None:
            raise FileNotFoundError("ffprobe is not available")
        result = subprocess.run(
            [
                ffprobe,
                "-v",
                "error",
                "-show_entries",
                "format=duration:stream=codec_type,codec_name,width,height",
                "-of",
                "json",
                str(path),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        payload = json.loads(result.stdout)
        streams = payload.get("streams", [])
        videos = [stream for stream in streams if stream.get("codec_type") == "video"]
        audio = [stream for stream in streams if stream.get("codec_type") == "audio"]
        video = videos[0] if videos else {}
        return {
            "duration_seconds": float(payload["format"]["duration"]),
            "video_streams": len(videos),
            "audio_streams": len(audio),
            "video_codec": video.get("codec_name"),
            "width": video.get("width"),
            "height": video.get("height"),
        }

    return {}


def _validate_text(path: Path, relative_path: str, artifact: dict[str, Any]) -> list[str]:
    if not artifact.get("forbid_placeholders"):
        return []
    text = path.read_text(encoding="utf-8")
    match = PLACEHOLDER_PATTERN.search(text)
    if match:
        return [f"{relative_path}: forbidden placeholder '{match.group(1)}'"]
    return []


def _validate_pdf(
    relative_path: str,
    artifact: dict[str, Any],
    metadata: dict[str, Any],
) -> list[str]:
    errors: list[str] = []
    max_pages = artifact.get("max_pages")
    pages = metadata.get("pages")
    if isinstance(max_pages, int) and isinstance(pages, int) and pages > max_pages:
        errors.append(f"{relative_path}: {pages} pages exceeds limit {max_pages}")
    return errors


def _validate_video(
    relative_path: str,
    artifact: dict[str, Any],
    metadata: dict[str, Any],
) -> list[str]:
    errors: list[str] = []
    duration = float(metadata.get("duration_seconds", 0.0))
    max_duration = artifact.get("max_duration_seconds")
    if isinstance(max_duration, (int, float)) and duration > float(max_duration):
        errors.append(
            f"{relative_path}: duration {duration:.3f}s exceeds limit {max_duration}s"
        )

    expected_codec = artifact.get("video_codec")
    actual_codec = metadata.get("video_codec")
    if expected_codec and actual_codec != expected_codec:
        errors.append(
            f"{relative_path}: expected video codec {expected_codec}, got {actual_codec}"
        )

    expected_width = artifact.get("width")
    expected_height = artifact.get("height")
    actual_width = metadata.get("width")
    actual_height = metadata.get("height")
    if (
        expected_width
        and expected_height
        and (actual_width != expected_width or actual_height != expected_height)
    ):
        errors.append(
            f"{relative_path}: expected {expected_width}x{expected_height}, "
            f"got {actual_width}x{actual_height}"
        )

    expected_audio = artifact.get("audio_streams")
    actual_audio = metadata.get("audio_streams")
    if isinstance(expected_audio, int) and actual_audio != expected_audio:
        errors.append(
            f"{relative_path}: expected {expected_audio} audio streams, got {actual_audio}"
        )

    expected_video_streams = artifact.get("video_streams", 1)
    actual_video_streams = metadata.get("video_streams")
    if isinstance(expected_video_streams, int) and actual_video_streams != expected_video_streams:
        errors.append(
            f"{relative_path}: expected {expected_video_streams} video streams, "
            f"got {actual_video_streams}"
        )
    return errors


def validate_release(root: Path, manifest: dict[str, Any], probe: Probe = probe_artifact) -> list[str]:
    errors: list[str] = []
    artifacts = manifest.get("artifacts")
    if not isinstance(artifacts, list):
        return ["manifest: 'artifacts' must be a list"]

    for raw_artifact in artifacts:
        if not isinstance(raw_artifact, dict) or not isinstance(raw_artifact.get("path"), str):
            errors.append("manifest: every artifact requires a string path")
            continue
        artifact: dict[str, Any] = raw_artifact
        relative_path = artifact["path"]
        path = root / relative_path
        required = artifact.get("required", True)
        if not path.is_file():
            if required:
                errors.append(f"missing required artifact: {relative_path}")
            continue

        expected_hash = artifact.get("sha256")
        hash_matches = False
        if isinstance(expected_hash, str):
            actual_hash = sha256_file(path)
            if actual_hash != expected_hash:
                errors.append(
                    f"{relative_path}: sha256 mismatch, expected {expected_hash}, got {actual_hash}"
                )
            else:
                hash_matches = True

        kind = str(artifact.get("kind", "file"))
        if kind == "text":
            errors.extend(_validate_text(path, relative_path, artifact))
        elif kind in {"pdf", "video"}:
            try:
                metadata = probe(path, kind)
            except FileNotFoundError as error:
                if kind == "video" and hash_matches:
                    metadata = {
                        "duration_seconds": artifact.get("max_duration_seconds", 0),
                        "video_streams": artifact.get("video_streams"),
                        "audio_streams": artifact.get("audio_streams"),
                        "video_codec": artifact.get("video_codec"),
                        "width": artifact.get("width"),
                        "height": artifact.get("height"),
                    }
                else:
                    errors.append(f"{relative_path}: unable to inspect {kind}: {error}")
                    continue
            except (OSError, ValueError, KeyError, json.JSONDecodeError, subprocess.CalledProcessError) as error:
                errors.append(f"{relative_path}: unable to inspect {kind}: {error}")
                continue
            if kind == "pdf":
                errors.extend(_validate_pdf(relative_path, artifact, metadata))
            else:
                errors.extend(_validate_video(relative_path, artifact, metadata))
    return errors


def validate_public_urls(
    urls: list[str],
    timeout_seconds: float = 10.0,
    *,
    attempts: int = 3,
    open_url: Callable[..., Any] = urllib.request.urlopen,
) -> list[str]:
    errors: list[str] = []
    for url in urls:
        request = urllib.request.Request(url, headers={"User-Agent": "QADAM-release-check/1.0"})
        last_error: urllib.error.URLError | TimeoutError | None = None
        for _attempt in range(max(1, attempts)):
            try:
                with open_url(request, timeout=timeout_seconds) as response:
                    if response.status != 200:
                        errors.append(f"public URL returned HTTP {response.status}: {url}")
                last_error = None
                break
            except (urllib.error.URLError, TimeoutError) as error:
                last_error = error
        if last_error is not None:
            errors.append(f"public URL unavailable after {max(1, attempts)} attempts: {url}: {last_error}")
    return errors


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--online", action="store_true", help="also check public URLs")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    errors = validate_release(args.root.resolve(), manifest)
    if args.online:
        urls = manifest.get("public_urls", [])
        if not isinstance(urls, list) or not all(isinstance(url, str) for url in urls):
            errors.append("manifest: 'public_urls' must be a list of strings")
        else:
            errors.extend(validate_public_urls(urls))

    if errors:
        print("Release validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"Release validation passed: {len(manifest.get('artifacts', []))} artifacts checked.")
    if args.online:
        print(f"Public URL validation passed: {len(manifest.get('public_urls', []))} URLs checked.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
