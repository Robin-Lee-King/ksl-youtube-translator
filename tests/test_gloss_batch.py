import asyncio
import json
import os
from pathlib import Path
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, call, patch

import httpx
from google.genai.errors import ClientError, ServerError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from services import llm_gloss_service as service
from services import gemini_client as manager
from services.ksl_converter import KSLConversionError
from routers import job

REAL_CLIENT = manager.genai.Client


def response(entries):
    return SimpleNamespace(text=json.dumps({"segments": entries}))


def api_error(code, **kwargs):
    return (ClientError if code < 500 else ServerError)(code, {
        "error": {"code": code, "status": "RESOURCE_EXHAUSTED" if code == 429 else "UNAVAILABLE",
                  "message": "fake-secret", **kwargs}
    })


class GlossBatchFixture(unittest.TestCase):
    def setUp(self):
        self.start(patch.dict(os.environ, {f"GEMINI_API_KEY_{name}": "" for name in manager.KEY_NAMES}))
        self.factory = self.start(patch.object(manager.genai, "Client"))
        self.generate = self.factory.return_value.__enter__.return_value.models.generate_content
        self.sleep = self.start(patch.object(manager.time, "sleep"))
        self.start(patch.object(manager.random, "uniform", return_value=0.25))
        self.start(patch.dict(os.environ, GEMINI_MAX_RETRIES="3", GEMINI_GLOSS_BATCH_SIZE="5", GEMINI_API_KEY="fake-secret"))
        self.generate.return_value = response([{"index": 0, "glosses": ["word"]}])

    def start(self, patcher):
        value = patcher.start()
        self.addCleanup(patcher.stop)
        return value


class GlossBatchTests(GlossBatchFixture):
    def test_batch_one_request_reorders_and_preserves_empty_gloss(self):
        self.generate.return_value = response([
            {"index": 2, "glosses": []}, {"index": 0, "glosses": ["a"]},
            {"index": 1, "glosses": ["b"]},
        ])
        self.assertEqual(service.convert_batch(["A", "B", "C"]), [["a"], ["b"], []])
        self.generate.assert_called_once()
        args = self.generate.call_args.kwargs
        self.assertEqual(json.loads(args["contents"])["segments"], [
            {"index": i, "text": text} for i, text in enumerate(["A", "B", "C"])
        ])
        self.assertEqual(args["config"].response_mime_type, "application/json")
        self.assertEqual(args["config"].response_json_schema["required"], ["segments"])
        self.assertEqual(self.factory.call_args.kwargs["http_options"].retry_options.attempts, 1)

    def test_single_and_empty_compatibility(self):
        self.assertEqual(service.convert_batch([]), [])
        self.factory.assert_not_called()
        self.assertEqual(service.convert_to_gloss("A"), ["word"])
        self.assertEqual(service.GeminiKSLConverter().convert("A"), ["word"])

    def test_invalid_responses_fail_without_retry(self):
        invalid = [None, "not-json", "[]", json.dumps({"segments": []})]
        for entries in [
            [None], [{"index": True, "glosses": []}], [{"index": -1, "glosses": []}],
            [{"index": 1, "glosses": []}], [{"index": 0, "glosses": [1]}],
            [{"index": 0, "glosses": "bad"}], [{"glosses": []}],
        ]:
            invalid.append(response(entries).text)
        for raw in invalid:
            with self.subTest(raw=raw):
                self.generate.return_value = SimpleNamespace(text=raw)
                with self.assertRaises(KSLConversionError):
                    service.GeminiKSLConverter().convert_batch(["A"])
        self.generate.return_value = response([{"index": 0, "glosses": []}] * 2)
        with self.assertRaises(service.GlossConversionError):
            service.convert_batch(["A", "B"])
        self.sleep.assert_not_called()

    def test_429_and_503_backoff_then_success(self):
        for code in (429, 503):
            with self.subTest(code=code), patch("builtins.print") as log:
                self.sleep.reset_mock()
                self.generate.reset_mock()
                self.generate.side_effect = [api_error(code)] * 3 + [response([{"index": 0, "glosses": []}])]
                self.assertEqual(service.convert_batch(["A"]), [[]])
                self.assertEqual(self.generate.call_count, 4)
                self.assertEqual(self.sleep.call_args_list, [call(2.25), call(4.25), call(8.25)])
                self.assertNotIn("fake-secret", str(log.call_args_list))

    def test_server_delay_precedence_and_invalid_fallback(self):
        error = api_error(429, details=[{"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "7.5s"}])
        self.assertEqual(manager._server_retry_delay(error), 7.5)
        error.response = httpx.Response(429, headers={"Retry-After": "12"})
        self.generate.side_effect = [error, response([{"index": 0, "glosses": []}])]
        service.convert_batch(["A"])
        self.sleep.assert_called_once_with(12)
        error.response = httpx.Response(429, headers={"Retry-After": "bad"})
        self.assertEqual(manager._server_retry_delay(error), 7.5)
        error.details = {"error": {"details": [{"retryDelay": "NaNs"}]}}
        self.assertIsNone(manager._server_retry_delay(error))

    def test_other_errors_fail_immediately_without_secret(self):
        for error in (api_error(400), api_error(500), RuntimeError("fake-secret")):
            self.generate.side_effect = error
            with self.assertRaises(KSLConversionError) as caught:
                service.GeminiKSLConverter().convert_batch(["A"])
            self.assertNotIn("fake-secret", str(caught.exception))
        self.sleep.assert_not_called()

    def test_real_sdk_does_not_multiply_retry_budget(self):
        requests = []
        def respond(request):
            requests.append(request)
            return httpx.Response(429, json={"error": {"code": 429, "status": "RESOURCE_EXHAUSTED"}})
        with httpx.Client(transport=httpx.MockTransport(respond)) as http_client:
            def factory(**kwargs):
                kwargs["http_options"] = kwargs["http_options"].model_copy(update={"httpx_client": http_client})
                return REAL_CLIENT(**kwargs)
            self.factory.side_effect = factory
            with self.assertRaises(KSLConversionError):
                service.GeminiKSLConverter().convert_batch(["A"])
        self.assertEqual(len(requests), 4)
        self.assertEqual(self.sleep.call_count, 3)

    def test_environment_defaults_and_overrides(self):
        for value, expected in [("5", 5), ("4", 4), ("6", 6), ("0", 5), ("bad", 5)]:
            with patch.dict(os.environ, GEMINI_GLOSS_BATCH_SIZE=value):
                self.assertEqual(service.get_gloss_batch_size(), expected)
        with patch.dict(os.environ, GEMINI_MAX_RETRIES="0"):
            self.generate.side_effect = api_error(429)
            with self.assertRaises(service.GlossConversionError):
                service.convert_batch(["A"])
            self.sleep.assert_not_called()


class JobBatchTests(GlossBatchFixture):
    # Reuse fixtures only; keep the service tests in their own class.
    def run_job(self, count, overrides=None, converter=None):
        segments = [{"start": i, "end": i + 1, "text": f"s{i}", "corrected_text": f"c{i}"} for i in range(count)]
        with patch.object(job, "SessionLocal") as session, \
                patch.object(job, "extract_video_id", return_value="video"), \
                patch.object(job, "get_corrected_transcript_data", return_value={"transcript": "full", "segments": segments}), \
                patch.object(job, "job_repository") as repo, \
                patch.object(job, "DEMO_GLOSS_OVERRIDE", overrides or {}), \
                patch.object(job, "build_display_sequence_from_codes", side_effect=lambda codes: [{"code": c} for c in codes]), \
                patch.object(job, "ksl_converter", converter or service.GeminiKSLConverter()), \
                patch.object(job, "_render_job_video", return_value="/static/result.mp4") as render:
            asyncio.run(job.process_job("job", "url"))
            session.return_value.close.assert_called_once()
            return repo, render

    def test_11_segments_5_5_1_order_and_corrected_text(self):
        def generate(**kwargs):
            inputs = json.loads(kwargs["contents"])["segments"]
            return response([{"index": e["index"], "glosses": [e["text"]]} for e in reversed(inputs)])
        self.generate.side_effect = generate
        repo, render = self.run_job(11)
        self.assertEqual([len(json.loads(c.kwargs["contents"])["segments"]) for c in self.generate.call_args_list], [5, 5, 1])
        self.assertEqual(render.call_args.args[1], [{"start": float(i), "end": float(i+1), "gloss_sequence": [f"c{i}"]} for i in range(11)])
        self.assertEqual(repo.update_translation_job_db.call_args.kwargs["status"], job.JobStatus.COMPLETED)

    def test_mixed_and_all_overrides(self):
        converter = Mock()
        converter.convert_batch.side_effect = lambda texts: [[text] for text in texts]
        _, render = self.run_job(8, {"s1": ["WORD1"], "s6": []}, converter)
        self.assertEqual(converter.convert_batch.call_args_list, [call(["c0", "c2", "c3", "c4", "c5"]), call(["c7"])])
        result = render.call_args.args[1]
        self.assertEqual(result[1]["display_sequence"], [{"code": "WORD1"}])
        self.assertEqual(result[6]["display_sequence"], [])
        self.assertEqual([s["start"] for s in result], list(range(8)))
        converter.reset_mock()
        self.run_job(2, {"s0": [], "s1": ["WORD1"]}, converter)
        converter.convert_batch.assert_not_called()
        converter.convert.assert_not_called()

    def test_exhaustion_marks_job_failed_and_does_not_render(self):
        for code in (429, 503):
            self.generate.reset_mock()
            self.sleep.reset_mock()
            self.generate.side_effect = api_error(code)
            repo, render = self.run_job(11)
            self.assertEqual(self.generate.call_count, 4)
            self.assertEqual(self.sleep.call_count, 3)
            failure = repo.update_translation_job_db.call_args.kwargs
            self.assertEqual(failure["status"], job.JobStatus.FAILED)
            self.assertEqual(failure["failed_stage"], "KSL_CONVERTING")
            self.assertEqual(failure["error_code"], "GLOSS_CONVERSION_ERROR")
            render.assert_not_called()

    def test_multi_key_exhaustion_marks_job_failed(self):
        with patch.dict(os.environ, {f"GEMINI_API_KEY_{name}": f"test-only-{name}" for name in manager.KEY_NAMES}):
            self.generate.side_effect = api_error(429)
            repo, render = self.run_job(11)
        self.assertEqual(self.generate.call_count, 16)
        self.assertEqual(self.sleep.call_count, 3)
        failure = repo.update_translation_job_db.call_args.kwargs
        self.assertEqual(failure["status"], job.JobStatus.FAILED)
        self.assertEqual(failure["failed_stage"], "KSL_CONVERTING")
        self.assertEqual(failure["error_code"], "GLOSS_CONVERSION_ERROR")
        render.assert_not_called()

    def test_wrong_batch_length_marks_job_failed(self):
        converter = Mock()
        converter.convert_batch.return_value = []
        repo, render = self.run_job(2, converter=converter)
        self.assertEqual(repo.update_translation_job_db.call_args.kwargs["status"], job.JobStatus.FAILED)
        render.assert_not_called()


if __name__ == "__main__":
    unittest.main()
