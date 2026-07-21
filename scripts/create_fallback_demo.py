"""Generate a silent, deterministic QADAM technical walkthrough with ffmpeg."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from scripts.check_release import probe_artifact, sha256_file


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "release" / "QADAM_AI_fallback_demo.mp4"
DEFAULT_MANIFEST = ROOT / "release" / "fallback-demo-manifest.json"
FONT_CANDIDATES = (
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    Path("/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"),
)


@dataclass(frozen=True)
class Segment:
    image: Path
    duration_seconds: int
    label: str


def default_timeline(root: Path = ROOT) -> list[Segment]:
    assets = root / "docs" / "assets"
    return [
        Segment(assets / "qadam-landing.png", 10, "1 / Problem, consent and privacy"),
        Segment(assets / "qadam-report.png", 14, "2 / Risk report with contract evidence"),
        Segment(assets / "qadam-negotiation.png", 12, "3 / A concrete next step for the tenant"),
        Segment(assets / "qadam-report.png", 12, "4 / Grounded and reproducible MVP"),
    ]


def validate_inputs(segments: list[Segment]) -> None:
    if not segments:
        raise ValueError("fallback-demo timeline must contain at least one segment")
    for segment in segments:
        if not segment.image.is_file():
            raise FileNotFoundError(f"missing fallback-demo input: {segment.image}")
        if segment.duration_seconds <= 0:
            raise ValueError(f"segment duration must be positive: {segment.label}")


def _escape_drawtext(value: str) -> str:
    return value.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")


def _font_expression() -> str:
    for font in FONT_CANDIDATES:
        if font.is_file():
            return f"fontfile={font}:"
    return "font='DejaVu Sans':"


def build_ffmpeg_command(
    segments: list[Segment],
    output: Path,
    *,
    width: int = 1920,
    height: int = 1080,
    fps: int = 30,
) -> list[str]:
    validate_inputs(segments)
    command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
    for segment in segments:
        command.extend(
            [
                "-loop",
                "1",
                "-framerate",
                str(fps),
                "-t",
                str(segment.duration_seconds),
                "-i",
                str(segment.image),
            ]
        )

    footer_height = max(40, round(height * 0.13))
    font_size = max(18, round(height * 0.041))
    left_padding = max(18, round(width * 0.036))
    text_y = height - round(footer_height * 0.66)
    filters: list[str] = []
    video_labels: list[str] = []
    for index, segment in enumerate(segments):
        output_label = f"v{index}"
        video_labels.append(f"[{output_label}]")
        filters.append(
            f"[{index}:v]"
            f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=0x0B1220,"
            "format=yuv420p,"
            f"drawbox=x=0:y=ih-{footer_height}:w=iw:h={footer_height}:"
            "color=0x0B1220@0.88:t=fill,"
            f"drawtext={_font_expression()}text='{_escape_drawtext(segment.label)}':"
            f"fontcolor=white:fontsize={font_size}:x={left_padding}:y={text_y},"
            f"setsar=1,setpts=PTS-STARTPTS[{output_label}]"
        )
    filters.append(
        "".join(video_labels) + f"concat=n={len(segments)}:v=1:a=0[outv]"
    )
    command.extend(
        [
            "-filter_complex",
            ";".join(filters),
            "-map",
            "[outv]",
            "-r",
            str(fps),
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-metadata",
            "title=QADAM AI fallback technical walkthrough",
            "-metadata",
            "creation_time=1970-01-01T00:00:00Z",
            str(output),
        ]
    )
    return command


def render_video(
    segments: list[Segment],
    output: Path,
    *,
    width: int = 1920,
    height: int = 1080,
    fps: int = 30,
) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        build_ffmpeg_command(segments, output, width=width, height=height, fps=fps),
        check=True,
    )


def probe_video(path: Path) -> dict[str, Any]:
    return probe_artifact(path, "video")


def write_evidence_manifest(
    segments: list[Segment],
    output: Path,
    manifest_path: Path,
) -> dict[str, Any]:
    metadata = probe_video(output)
    payload: dict[str, Any] = {
        "schema_version": 1,
        "purpose": "silent fallback technical walkthrough; not the final narrated team demo",
        "output": output.relative_to(ROOT).as_posix(),
        "sha256": sha256_file(output),
        **metadata,
        "timeline": [
            {
                "image": segment.image.relative_to(ROOT).as_posix(),
                "image_sha256": sha256_file(segment.image),
                "duration_seconds": segment.duration_seconds,
                "label": segment.label,
            }
            for segment in segments
        ],
    }
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    timeline = default_timeline()
    render_video(timeline, args.output)
    evidence = write_evidence_manifest(timeline, args.output, args.manifest)
    print(
        "Fallback demo generated: "
        f"{args.output} ({evidence['duration_seconds']:.3f}s, {evidence['sha256']})"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
