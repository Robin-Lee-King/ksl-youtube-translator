import copy
import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import httpx
from google.genai.errors import ClientError, ServerError

from backend.services import llm_subtitle_correction_service as service

REAL_CLIENT = service.genai.Client
SINGLE_CORRECTION = service.correct_subtitle


class CorrectSegmentsTests(unittest.TestCase):
    def setUp(self):
        self.start_patch(patch.dict(os.environ, {f"GEMINI_API_KEY_{name}": "" for name in ("JY", "GYU", "RB", "JH")}))
        self.segments = [
            {"start": 0.08, "end": 2.0, "text": "오늘 광주에 왔습니다."},
            {"start": 2.0, "end": 4.21, "text": "광주 비엔날래에 다녀왔습니다."},
            {"start": 4.21, "end": 7.0, "text": "인상적이었습니다.", "corrected_text": "이전 교정"},
        ]
        self.metadata = {"video_title": "광주 비엔날레", "video_description": "현장 인터뷰"}
        self.factory = self.start_patch(patch.object(service.genai, "Client"))
        self.generate = self.factory.return_value.__enter__.return_value.models.generate_content
        self.start_patch(patch.dict(os.environ, {"GEMINI_API_KEY": "fake-secret"}))
        self.start_patch(patch.object(service, "correct_subtitle", side_effect=AssertionError("개별 호출 금지")))
        self.start_patch(patch.object(service.logger, "warning"))

    def start_patch(self, patcher):
        value = patcher.start()
        self.addCleanup(patcher.stop)
        return value

    def run_corrections(self, corrections):
        self.generate.return_value = SimpleNamespace(text=json.dumps({"corrections": corrections}))
        return service.correct_segments(self.segments, **self.metadata)

    def assert_original(self, result):
        self.assertEqual(result, [{**s, "corrected_text": s["text"]} for s in self.segments])

    def test_one_request_full_input_and_shuffled_index_mapping(self):
        original = copy.deepcopy(self.segments)
        result = self.run_corrections([
            {"index": 2, "corrected_text": "교정 2"},
            {"index": 0, "corrected_text": "교정 0"},
            {"index": 1, "corrected_text": "광주 비엔날레에 다녀왔습니다."},
        ])
        self.generate.assert_called_once()
        args = self.generate.call_args.kwargs
        self.assertEqual(json.loads(args["contents"]), {
            **self.metadata,
            "segments": [{"index": i, "text": s["text"]} for i, s in enumerate(original)],
        })
        self.assertEqual(args["config"].response_mime_type, "application/json")
        self.assertEqual(args["config"].response_json_schema["required"], ["corrections"])
        self.assertEqual([s["corrected_text"] for s in result], ["교정 0", "광주 비엔날레에 다녀왔습니다.", "교정 2"])
        self.assertEqual(len(result), len(original))
        self.assertEqual(self.segments, original)
        for actual, source in zip(result, self.segments):
            self.assertIsNot(actual, source)
            self.assertEqual({k: v for k, v in actual.items() if k != "corrected_text"},
                             {k: v for k, v in source.items() if k != "corrected_text"})

    def test_missing_index_falls_back_only_for_missing_segments(self):
        result = self.run_corrections([{"index": 1, "corrected_text": "교정"}])
        self.assertEqual([s["corrected_text"] for s in result], [self.segments[0]["text"], "교정", self.segments[2]["text"]])

    def test_duplicate_index_always_falls_back(self):
        for values in (["첫 교정", "둘째 교정", "셋째 교정"], [None, "교정"], ["교정", ""]):
            with self.subTest(values=values):
                result = self.run_corrections([
                    *[{"index": 0, "corrected_text": value} for value in values],
                    {"index": 1, "corrected_text": "정상 교정"},
                ])
                self.assertEqual(result[0]["corrected_text"], self.segments[0]["text"])
                self.assertEqual(result[1]["corrected_text"], "정상 교정")

    def test_invalid_items_and_indices_are_ignored(self):
        result = self.run_corrections([
            None, "invalid", {}, {"corrected_text": "index 없음"},
            *[{"index": index, "corrected_text": "오류"} for index in (-1, 3, 999, True, False, 0.0, "0", None)],
            {"index": 0, "corrected_text": "정상 교정"},
        ])
        self.assertEqual(result[0]["corrected_text"], "정상 교정")
        self.assertEqual(result[1]["corrected_text"], self.segments[1]["text"])
        self.assertEqual(len(result), 3)

    def test_invalid_corrected_text_only_falls_back_for_that_segment(self):
        for fields in ({}, {"corrected_text": ""}, {"corrected_text": " \n"},
                       {"corrected_text": None}, {"corrected_text": 1},
                       {"corrected_text": False}, {"corrected_text": []}, {"corrected_text": {}}):
            with self.subTest(fields=fields):
                result = self.run_corrections([{"index": 0, **fields}, {"index": 1, "corrected_text": "교정"}])
                self.assertEqual(result[0]["corrected_text"], self.segments[0]["text"])
                self.assertEqual(result[1]["corrected_text"], "교정")

    def test_invalid_response_falls_back_all(self):
        for raw in (None, "", "not json", "[]", "null", "{}", '{"corrections": null}', '{"corrections": {}}'):
            with self.subTest(raw=raw):
                self.generate.return_value = SimpleNamespace(text=raw)
                self.assert_original(service.correct_segments(self.segments, **self.metadata))

    def test_api_errors_no_retry_and_masked_log(self):
        for error in (ClientError(429, {"error": {"status": "RESOURCE_EXHAUSTED", "message": "quota fake-secret"}}),
                      ServerError(503, {"error": {"message": "unavailable fake-secret"}})):
            with self.subTest(error_type=type(error).__name__):
                self.generate.reset_mock()
                self.generate.side_effect = error
                self.assert_original(service.correct_segments(self.segments, **self.metadata))
                self.generate.assert_called_once()
                self.assertEqual(self.factory.call_args.kwargs["http_options"].retry_options.attempts, 1)
                log = service.logger.warning.call_args
                message = log.args[0] % log.args[1:]
                self.assertIn(type(error).__name__, message)
                self.assertIn(str(error.code), message)
                self.assertIn("[REDACTED]", message)
                self.assertNotIn("fake-secret", message)

    def test_client_creation_failure_falls_back(self):
        self.factory.side_effect = ValueError("missing key")
        self.assert_original(service.correct_segments(self.segments, **self.metadata))
        self.generate.assert_not_called()

    def test_sdk_http_429_is_requested_once_without_retry(self):
        requests = []

        def respond(request):
            requests.append(request)
            return httpx.Response(429, json={
                "error": {"code": 429, "status": "RESOURCE_EXHAUSTED", "message": "quota exceeded"},
            })

        with httpx.Client(transport=httpx.MockTransport(respond)) as http_client:
            def create_client(**kwargs):
                kwargs["http_options"] = kwargs["http_options"].model_copy(
                    update={"httpx_client": http_client},
                )
                return REAL_CLIENT(**kwargs)

            self.factory.side_effect = create_client
            self.assert_original(service.correct_segments(self.segments, **self.metadata))
        self.assertEqual(len(requests), 1)

    def test_single_sentence_function_still_works(self):
        self.generate.return_value = SimpleNamespace(text='{"corrected_text": "교정문"}')
        self.assertEqual(SINGLE_CORRECTION(
            **self.metadata, previous_text="", current_text="원문", next_text="",
        ), "교정문")
        self.generate.side_effect = RuntimeError("failure fake-secret")
        self.assertEqual(SINGLE_CORRECTION(
            **self.metadata, previous_text="", current_text="원문", next_text="",
        ), "원문")
        log = service.logger.warning.call_args
        self.assertNotIn("fake-secret", log.args[0] % log.args[1:])

    def test_empty_segments_skip_client(self):
        self.assertEqual(service.correct_segments([], **self.metadata), [])
        self.factory.assert_not_called()

    def test_large_segment_count_still_uses_one_request(self):
        self.segments = [{"start": i, "end": i + 1, "text": f"문장 {i}"} for i in range(250)]
        result = self.run_corrections([])
        self.generate.assert_called_once()
        self.assertEqual(len(json.loads(self.generate.call_args.kwargs["contents"])["segments"]), 250)
        self.assert_original(result)

    def test_usage_metadata_numbers_are_logged(self):
        self.generate.return_value = SimpleNamespace(
            text='{"corrections": [{"index": 0, "corrected_text": "교정문"}]}',
            usage_metadata=SimpleNamespace(
                prompt_token_count=8421, candidates_token_count=4217, total_token_count=12638,
            ),
        )
        with self.assertLogs(service.logger, level="INFO") as logs:
            result = service.correct_segments(self.segments, **self.metadata)
        self.assertEqual(result[0]["corrected_text"], "교정문")
        self.assertEqual(logs.records[0].getMessage(),
                         "Gemini 자막 교정 토큰 사용량 - segments=3, input_tokens=8421, "
                         "output_tokens=4217, total_tokens=12638")

    def test_missing_usage_fields_do_not_affect_correction(self):
        for fields, expected in (
            ({}, ("unknown", "unknown", "unknown")),
            ({"usage_metadata": None}, ("unknown", "unknown", "unknown")),
            ({"usage_metadata": SimpleNamespace(prompt_token_count=0)}, ("0", "unknown", "unknown")),
        ):
            with self.subTest(fields=fields):
                self.generate.return_value = SimpleNamespace(
                    text='{"corrections": [{"index": 0, "corrected_text": "교정문"}]}', **fields,
                )
                with self.assertLogs(service.logger, level="INFO") as logs:
                    result = service.correct_segments(self.segments, **self.metadata)
                self.assertEqual(result[0]["corrected_text"], "교정문")
                for field, value in zip(("input_tokens", "output_tokens", "total_tokens"), expected):
                    self.assertIn(f"{field}={value}", logs.records[0].getMessage())

    def test_usage_logs_do_not_include_sensitive_or_text_values(self):
        self.generate.return_value = SimpleNamespace(
            text='{"corrections": []}',
            usage_metadata=SimpleNamespace(
                prompt_token_count="fake-secret", candidates_token_count=self.segments[0]["text"],
                total_token_count={"secret": "fake-secret"},
            ),
        )
        with self.assertLogs(service.logger, level="INFO") as logs:
            service.correct_segments(self.segments, **self.metadata)
        message = "\n".join(logs.output)
        for value in ("fake-secret", self.segments[0]["text"], self.metadata["video_title"]):
            self.assertNotIn(value, message)
        self.assertIn("input_tokens=unknown", message)

    def test_usage_access_or_logger_failure_does_not_discard_correction(self):
        class BrokenUsageResponse:
            text = '{"corrections": [{"index": 0, "corrected_text": "교정문"}]}'

            @property
            def usage_metadata(self):
                raise RuntimeError("metadata error")

        self.generate.return_value = BrokenUsageResponse()
        result = service.correct_segments(self.segments, **self.metadata)
        self.assertEqual(result[0]["corrected_text"], "교정문")

        self.generate.return_value = SimpleNamespace(text=BrokenUsageResponse.text)
        with patch.object(service.logger, "info", side_effect=RuntimeError("logging error")) as log:
            result = service.correct_segments(self.segments, **self.metadata)
        log.assert_called_once()
        self.assertEqual(result[0]["corrected_text"], "교정문")


if __name__ == "__main__":
    unittest.main()
