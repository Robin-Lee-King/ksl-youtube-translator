import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from unittest.mock import Mock, patch

from botocore.exceptions import ClientError, NoCredentialsError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from routers import job
from services import clip_resolver as resolver, video_merger as merger

ITEM = {"type": "avatar", "code": "WORD0001", "gloss": "고민"}
SEGMENTS = [{"start": 0, "end": 2, "display_sequence": [ITEM, ITEM]}]


class JobClipTests(unittest.TestCase):
    def setUp(self):
        env = patch.dict(os.environ, S3_CLIP_BUCKET="ksl-tube-avatar-clips")
        env.start()
        self.addCleanup(env.stop)
        factory = patch.object(resolver.boto3, "client")
        self.factory = factory.start()
        self.addCleanup(factory.stop)
        self.client = self.factory.return_value
        self.client.download_file.side_effect = lambda bucket, key, path: Path(path).write_bytes(b"clip")

    def test_download_success_and_duplicate_word(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = resolver.resolve_clips([ITEM, ITEM], Path(directory))
            path = Path(directory) / "WORD0001.mp4"
            self.assertEqual(paths, {"WORD0001": path})
            self.assertEqual(path.read_bytes(), b"clip")
            self.factory.assert_called_once_with("s3")
            self.client.download_file.assert_called_once_with(
                "ksl-tube-avatar-clips", "clips/word/WORD0001.mp4", str(path),
            )

    def test_missing_object_and_failed_download_remove_partial_files(self):
        for error in [ClientError({"Error": {"Code": "404"}}, "HeadObject"),
                      NoCredentialsError(), OSError("download failed")]:
            with self.subTest(error=error), tempfile.TemporaryDirectory() as directory:
                def fail(bucket, key, path):
                    Path(path).write_bytes(b"partial")
                    raise error
                self.client.download_file.reset_mock()
                self.client.download_file.side_effect = fail
                paths = resolver.resolve_clips([ITEM, ITEM], Path(directory))
                self.assertEqual(paths, {"WORD0001": None})
                self.assertEqual(list(Path(directory).iterdir()), [])
                self.client.download_file.assert_called_once()
                self.assertEqual(job._get_clip_duration("WORD0001", paths), 1.0)

    def test_missing_bucket_and_client_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ, S3_CLIP_BUCKET=""):
                self.assertEqual(resolver.resolve_clips([ITEM], Path(directory)), {"WORD0001": None})
            self.factory.assert_not_called()
            self.factory.side_effect = NoCredentialsError()
            self.assertEqual(resolver.resolve_clips([ITEM], Path(directory)), {"WORD0001": None})

    def test_sen_keeps_legacy_lookup_without_s3(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(resolver, "VIDEOS_DIR", Path(directory)):
            path = Path(directory) / "SEN0001.mp4"
            path.write_bytes(b"legacy")
            paths = resolver.resolve_clips([
                {"type": "avatar", "code": "SEN0001"},
                {"type": "avatar", "code": "SEN0002"},
            ], Path(directory))
            self.assertEqual(paths, {"SEN0001": path, "SEN0002": None})
            self.factory.assert_not_called()

    def test_probe_and_real_merger_share_path_and_cleanup(self):
        downloaded = []
        def download(bucket, key, path):
            downloaded.append(Path(path))
            Path(path).write_bytes(b"clip")
        self.client.download_file.side_effect = download

        def probe(args, **kwargs):
            self.assertEqual(Path(args[-1]), downloaded[0])
            self.assertTrue(downloaded[0].exists())
            return Mock(stdout="1.0")

        def normalize(tmp, src, idx):
            self.assertEqual(src, downloaded[0])
            self.assertTrue(src.exists())
            return tmp / f"norm_{idx}.mp4"

        with tempfile.TemporaryDirectory() as results, \
                patch.object(merger, "RESULTS_DIR", Path(results)), \
                patch.object(job.subprocess, "run", side_effect=probe) as probe_mock, \
                patch.object(merger, "_normalize_clip", side_effect=normalize) as norm, \
                patch.object(merger, "_run_ffmpeg"):
            self.assertEqual(job._render_job_video("test", SEGMENTS), "/static/results/test.mp4")
            probe_mock.assert_called_once()
            self.assertEqual(norm.call_count, 2)
        self.client.download_file.assert_called_once()
        self.assertFalse(downloaded[0].parent.exists())

    def test_cleanup_after_probe_or_merge_failure(self):
        for stage in ("probe", "merge"):
            with self.subTest(stage=stage):
                paths = []
                def download(bucket, key, path):
                    paths.append(Path(path))
                    Path(path).write_bytes(b"clip")
                self.client.download_file.side_effect = download
                with patch.object(job, "_get_clip_duration", return_value=1.0,
                                  side_effect=RuntimeError("probe") if stage == "probe" else None), \
                        patch.object(job, "merge_timeline_to_video", side_effect=RuntimeError("merge")):
                    with self.assertRaises(RuntimeError):
                        job._render_job_video("failed", SEGMENTS)
                self.assertFalse(paths[0].parent.exists())

    def test_concurrent_jobs_have_separate_temp_files(self):
        barrier = threading.Barrier(2)
        paths = []
        def merge(timeline, filename, mapping):
            path = mapping["WORD0001"]
            paths.append(path)
            barrier.wait(timeout=10)
            self.assertTrue(path.exists())
            return filename
        with patch.object(job, "_get_clip_duration", return_value=1.0), \
                patch.object(job, "merge_timeline_to_video", side_effect=merge), \
                ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(job._render_job_video, name, SEGMENTS) for name in ("a", "b")]
            self.assertEqual([future.result() for future in futures], ["a.mp4", "b.mp4"])
        self.assertNotEqual(paths[0], paths[1])
        self.assertTrue(all(not path.parent.exists() for path in paths))

    def test_download_failure_reaches_merger_fallback(self):
        self.client.download_file.side_effect = NoCredentialsError()
        with tempfile.TemporaryDirectory() as results, \
                patch.object(merger, "RESULTS_DIR", Path(results)), \
                patch.object(job.subprocess, "run") as probe, \
                patch.object(merger, "_make_idle_pose", return_value=Path(results) / "idle.mp4") as idle, \
                patch.object(merger, "_run_ffmpeg"):
            job._render_job_video("fallback", SEGMENTS)
            probe.assert_not_called()
            self.assertEqual(idle.call_count, 2)


if __name__ == "__main__":
    unittest.main()
