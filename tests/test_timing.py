import asyncio
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from services import timing, subtitle_pipeline_service as pipeline
from services.ksl_converter import KSLConversionError
from routers import job


class TimingTests(unittest.TestCase):
    def test_elapsed_and_exception_do_not_log_error_contents(self):
        with patch.object(timing.time, "perf_counter", side_effect=[10, 12.345]), patch("builtins.print") as log:
            with self.assertRaisesRegex(ValueError, "private-value"):
                with timing.time_stage("SIGN_MAPPING", "job-1"):
                    raise ValueError("private-value")
        messages = [c.args[0] for c in log.call_args_list]
        self.assertEqual(messages, ["[Timing][job-1] SIGN_MAPPING 시작", "[Timing][job-1] SIGN_MAPPING 실패/중단 - 2.35s"])

    def test_job_context_reaches_worker_and_resets_on_error(self):
        @timing.time_job
        async def process(job_id):
            def worker():
                with timing.time_stage("TRANSCRIPTING"):
                    raise ValueError("failure")
            await asyncio.to_thread(worker)
        with patch("builtins.print") as log:
            with self.assertRaises(ValueError):
                asyncio.run(process("thread-job"))
        messages = [c.args[0] for c in log.call_args_list]
        self.assertTrue(all("[thread-job]" in text for text in messages))
        self.assertIn("TOTAL -", messages[-1])
        self.assertIsNone(timing._job_id.get())

    def test_pipeline_stages_are_separate_and_preserve_output(self):
        segments = [{"text": "source", "start": 0, "end": 1}]
        corrected = [{**segments[0], "corrected_text": "corrected"}]
        with patch.object(pipeline, "extract_video_id", return_value="id"), \
                patch.object(pipeline, "get_video_metadata", return_value={"title": "title", "description": "desc"}), \
                patch.object(pipeline, "get_transcript_data", return_value=("source", segments)), \
                patch.object(pipeline, "correct_segments", return_value=corrected), \
                patch("builtins.print") as log:
            result = pipeline.get_corrected_transcript_data("url")
        self.assertEqual(result["segments"], corrected)
        self.assertEqual([c.args[0].split()[1] for c in log.call_args_list],
                         ["TRANSCRIPTING", "TRANSCRIPTING", "SUBTITLE_CORRECTION", "SUBTITLE_CORRECTION"])

    def test_render_failure_closes_current_stage(self):
        with patch.object(job, "build_display_sequence", return_value=[]), \
                patch.object(job, "resolve_clips", side_effect=ValueError("private-value")), \
                patch("builtins.print") as log:
            with self.assertRaises(ValueError):
                job._render_job_video("render-job", [{"start": 0, "end": 1, "gloss_sequence": []}])
        messages = [c.args[0] for c in log.call_args_list]
        self.assertIn("SIGN_MAPPING 완료", messages[1])
        self.assertTrue(any("TIMELINE_BUILDING 실패/중단" in message for message in messages))
        self.assertTrue(all("[render-job]" in message for message in messages))

    def test_handled_gloss_failure_emits_failed_stage_and_total(self):
        with patch.object(job, "SessionLocal"), \
                patch.object(job, "extract_video_id", return_value="id"), \
                patch.object(job, "get_corrected_transcript_data", return_value={
                    "transcript": "source", "segments": [{"text": "source", "start": 0, "end": 1}]}), \
                patch.object(job, "job_repository") as repo, \
                patch.object(job, "DEMO_GLOSS_OVERRIDE", {}), \
                patch.object(job, "ksl_converter", Mock(convert_batch=Mock(side_effect=KSLConversionError("failure")))), \
                patch("builtins.print") as log:
            asyncio.run(job.process_job("failed-job", "url"))
        messages = [c.args[0] for c in log.call_args_list]
        self.assertTrue(any("KSL_CONVERTING 실패/중단" in message for message in messages))
        self.assertIn("[failed-job] TOTAL -", messages[-1])
        self.assertEqual(repo.update_translation_job_db.call_args.kwargs["status"], job.JobStatus.FAILED)

    def test_logging_failure_does_not_change_success(self):
        with patch("builtins.print", side_effect=OSError("closed output")):
            with timing.time_stage("TRANSCRIPTING"):
                pass


if __name__ == "__main__":
    unittest.main()
