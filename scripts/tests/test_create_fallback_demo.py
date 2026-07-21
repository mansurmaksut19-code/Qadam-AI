from __future__ import annotations

import shutil
import tempfile
import unittest
from pathlib import Path

from scripts.create_fallback_demo import (
    Segment,
    build_ffmpeg_command,
    default_timeline,
    probe_video,
    render_video,
    validate_inputs,
)


ROOT = Path(__file__).resolve().parents[2]


class FallbackDemoTests(unittest.TestCase):
    def test_default_timeline_is_48_seconds_and_uses_verified_assets(self) -> None:
        timeline = default_timeline(ROOT)

        self.assertEqual(sum(segment.duration_seconds for segment in timeline), 48)
        self.assertEqual(len(timeline), 4)
        self.assertTrue(all(segment.image.is_file() for segment in timeline))
        self.assertEqual(
            {segment.image.name for segment in timeline},
            {"qadam-landing.png", "qadam-report.png", "qadam-negotiation.png"},
        )

    def test_missing_input_is_reported_before_ffmpeg_runs(self) -> None:
        missing = ROOT / "docs" / "assets" / "missing.png"

        with self.assertRaisesRegex(FileNotFoundError, "missing fallback-demo input"):
            validate_inputs([Segment(missing, 1, "Missing")])

    def test_ffmpeg_command_is_fixed_to_h264_full_hd_without_audio(self) -> None:
        segment = Segment(ROOT / "docs" / "assets" / "qadam-landing.png", 2, "Problem")
        command = build_ffmpeg_command([segment], Path("demo.mp4"))
        rendered = " ".join(command)

        self.assertIn("scale=1920:1080", rendered)
        self.assertIn("concat=n=1:v=1:a=0", rendered)
        self.assertIn("libx264", command)
        self.assertIn("yuv420p", command)
        self.assertNotIn("-c:a", command)

    @unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "ffmpeg required")
    def test_real_short_render_has_one_h264_video_stream(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory) / "short.mp4"
            segment = Segment(
                ROOT / "docs" / "assets" / "qadam-landing.png",
                1,
                "Verified MVP",
            )

            render_video([segment], output, width=320, height=180, fps=10)
            metadata = probe_video(output)

        self.assertEqual(metadata["video_streams"], 1)
        self.assertEqual(metadata["audio_streams"], 0)
        self.assertEqual(metadata["video_codec"], "h264")
        self.assertEqual((metadata["width"], metadata["height"]), (320, 180))
        self.assertGreaterEqual(metadata["duration_seconds"], 0.9)
        self.assertLessEqual(metadata["duration_seconds"], 1.1)


if __name__ == "__main__":
    unittest.main()
