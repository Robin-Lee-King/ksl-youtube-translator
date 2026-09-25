import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from routers import job
from services import timing, clip_resolver as resolver, video_merger as merger


def avatar(code):
    return {"type": "avatar", "code": code}


class RenderTimingTests(unittest.TestCase):
    def test_s3_counts_attempts_success_failure_and_unique_words(self):
        items = [avatar("WORD0001"), avatar("WORD0001"), avatar("WORD0002"), avatar("SEN0001")]
        with tempfile.TemporaryDirectory() as directory, \
                patch.dict(os.environ, S3_CLIP_BUCKET="test-bucket"), \
                patch.object(resolver.boto3, "client") as factory, \
                patch("builtins.print") as log:
            factory.return_value.download_file.side_effect = [None, OSError("failure")]
            result = resolver.resolve_clips(items, Path(directory))
        self.assertIsNotNone(result["WORD0001"])
        self.assertIsNone(result["WORD0002"])
        factory.return_value.download_file.assert_called()
        self.assertEqual(factory.return_value.download_file.call_count, 2)
        message = log.call_args.args[0]
        self.assertIn("avatar_items=4 unique_words=2 downloads=2 success=1 failed=1", message)
        self.assertEqual(log.call_count, 1)

    def test_missing_bucket_is_not_counted_as_download_attempt(self):
        with tempfile.TemporaryDirectory() as directory, \
                patch.dict(os.environ, S3_CLIP_BUCKET=""), patch("builtins.print") as log:
            resolver.resolve_clips([avatar("WORD0001")], Path(directory))
        self.assertIn("unique_words=1 downloads=0 success=0 failed=0", log.call_args.args[0])

    def test_probe_cache_and_missing_item_counters(self):
        items = [avatar("WORD0001"), avatar("WORD0001"), avatar("WORD0002")]
        with patch.object(job, "resolve_clips", return_value={"WORD0001": Path("test.mp4"), "WORD0002": None}), \
                patch.object(job.subprocess, "run", return_value=Mock(stdout="1.0")) as probe, \
                patch.object(job, "merge_timeline_to_video", return_value="result.mp4"), \
                patch("builtins.print") as log:
            self.assertEqual(job._render_job_video("counter-job", [{"start": 0, "end": 4, "display_sequence": items}]), "result.mp4")
        probe.assert_called_once()
        messages = "\n".join(c.args[0] for c in log.call_args_list)
        self.assertIn("executions=1 cache_hits=1", messages)
        self.assertIn("segments=1 avatar_items=3 unique_avatar_codes=2 missing_clips=1", messages)
        for name in ("DISPLAY_SEQUENCE_PREP", "S3_CLIP_RESOLVE", "FFPROBE_DURATION", "TIMELINE_CALC", "VIDEO_MERGE"):
            self.assertIn(f"[Render Timing][counter-job] {name}", messages)
        self.assertIsNone(timing.render_metrics.get())

    def test_ffmpeg_repeated_sources_speed_concat_and_black_fallback(self):
        timeline = [{"stt_start": 1, "actual_end": 5, "speed": 1.1, "idle_duration": 1,
                     "items": [avatar("WORD0001"), avatar("WORD0001"), avatar("WORD0002")]}]
        with tempfile.TemporaryDirectory() as directory, \
                patch.object(merger, "RESULTS_DIR", Path(directory)), \
                patch.object(merger, "IDLE_IMAGE_PATH", Path(directory) / "absent.png"), \
                patch.object(merger, "_run_ffmpeg") as ffmpeg, patch("builtins.print") as log:
            result = merger.merge_timeline_to_video(timeline, "result.mp4", {"WORD0001": Path("source.mp4"), "WORD0002": None})
        self.assertEqual(result, "/static/results/result.mp4")
        self.assertEqual(ffmpeg.call_count, 9)
        self.assertEqual(log.call_count, 1)
        message = log.call_args.args[0]
        for expected in ("normalize: count=2", "idle_pose: count=3", "black: count=3", "speed: count=1", "concat: count=3",
                         "normalize_calls=2 normalize_unique_sources=1", "merge_total="):
            self.assertIn(expected, message)
        self.assertIsNone(timing.ffmpeg_metrics.get())

    def test_ffmpeg_failure_still_emits_summary_and_propagates(self):
        timeline = [{"stt_start": 0, "actual_end": 1, "speed": 1, "idle_duration": 0,
                     "items": [avatar("WORD0001")]}]
        with tempfile.TemporaryDirectory() as directory, \
                patch.object(merger, "RESULTS_DIR", Path(directory)), \
                patch.object(merger, "_run_ffmpeg", side_effect=RuntimeError("private-path")), \
                patch("builtins.print") as log:
            with self.assertRaisesRegex(RuntimeError, "private-path"):
                merger.merge_timeline_to_video(timeline, "result.mp4", {"WORD0001": Path("source.mp4")})
        self.assertIn("normalize: count=1", log.call_args.args[0])
        self.assertNotIn("private-path", log.call_args.args[0])
        self.assertIsNone(timing.ffmpeg_metrics.get())

    def test_accumulation_uses_perf_counter_on_success_and_failure(self):
        metrics = timing.Metrics()
        with patch.object(timing.time, "perf_counter", side_effect=[1, 3, 4, 7]):
            with metrics.measure("operation"):
                pass
            with self.assertRaises(ValueError):
                with metrics.measure("operation"):
                    raise ValueError()
        self.assertEqual(metrics.counts["operation"], 2)
        self.assertEqual(metrics.seconds["operation"], 5)


if __name__ == "__main__":
    unittest.main()
