import asyncio
import copy
import os
from pathlib import Path
import sys
import threading
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from google.genai.errors import ClientError

BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))
# main.py의 기존 상대경로 static 마운트를 서버 실행 환경과 동일하게 초기화한다.
previous_directory = Path.cwd()
try:
    os.chdir(BACKEND)
    from main import app
finally:
    os.chdir(previous_directory)

from routers import job, youtube
from services import subtitle_pipeline_service as pipeline
from services import llm_subtitle_correction_service as correction


URL = "https://www.youtube.com/watch?v=abcdefghijk"
ENDPOINT = "/translate/subtitle-correction-test"
DATA = {
    "title": "광주 비엔날레",
    "description": "현장 인터뷰",
    "transcript": "광주 비엔날래에 다녀왔습니다. 인상적이었습니다.",
    "segments": [
        {"start": 0.08, "end": 4.21, "text": "광주 비엔날래에 다녀왔습니다.",
         "corrected_text": "광주 비엔날레에 다녀왔습니다."},
        {"start": 4.5, "end": 6.0, "text": "인상적이었습니다.",
         "corrected_text": "인상적이었습니다."},
    ],
}


class SubtitleCorrectionEndpointTests(unittest.TestCase):
    def start_patch(self, patcher):
        value = patcher.start()
        self.addCleanup(patcher.stop)
        return value

    def setUp(self):
        self.start_patch(patch.dict(os.environ, {
            **{f"GEMINI_API_KEY_{name}": "" for name in ("JY", "GYU", "RB", "JH")},
            "GEMINI_API_KEY": "test-only-key",
        }))
        self.client = TestClient(app)
        self.addCleanup(self.client.close)
        self.forbidden = []
        for name in ("process_job", "build_timeline",
                     "resolve_clip_path", "_get_clip_duration", "merge_timeline_to_video"):
            self.forbidden.append(self.start_patch(patch.object(
                job, name, side_effect=AssertionError(f"호출 금지: {name}"),
            )))
        self.forbidden.append(self.start_patch(patch.object(
            job.ksl_converter, "convert",
            side_effect=AssertionError("호출 금지: ksl_converter.convert"),
        )))
        for target in (
            "services.llm_gloss_service.convert_to_gloss",
            "services.timeline_builder.build_timeline",
            "services.clip_resolver.resolve_clip_path",
            "services.video_merger.merge_timeline_to_video",
            "services.job_repository.create_job",
            "services.job_repository.update_job",
        ):
            self.forbidden.append(self.start_patch(patch(
                target, side_effect=AssertionError(f"호출 금지: {target}"),
            )))

    def tearDown(self):
        for function in self.forbidden:
            function.assert_not_called()

    def test_success_preserves_response_and_uses_worker_thread(self):
        data = copy.deepcopy(DATA)
        threads = {}
        original_to_thread = asyncio.to_thread

        async def dispatch(function, *args, **kwargs):
            threads["event_loop"] = threading.get_ident()
            return await original_to_thread(function, *args, **kwargs)

        def fetch(url):
            threads["worker"] = threading.get_ident()
            return data

        with patch.object(youtube, "get_corrected_transcript_data", side_effect=fetch) as fetch_mock, \
                patch.object(youtube.asyncio, "to_thread", side_effect=dispatch) as thread_mock:
            response = self.client.post(ENDPOINT, json={"url": URL})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), DATA)
        self.assertEqual(data, DATA)
        fetch_mock.assert_called_once_with(URL)
        thread_mock.assert_awaited_once_with(fetch_mock, URL)
        self.assertNotEqual(threads["event_loop"], threads["worker"])

    def test_bad_url_validation_matches_existing_api(self):
        with patch.object(youtube, "get_corrected_transcript_data") as fetch:
            for url in ("invalid", "https://example.com/video"):
                with self.subTest(url=url):
                    response = self.client.post(ENDPOINT, json={"url": url})
                    old_response = self.client.post("/translate", json={"url": url})
                    self.assertEqual(response.status_code, 422)
                    self.assertEqual(response.json(), old_response.json())
            fetch.assert_not_called()

    def test_missing_video_id_returns_existing_error_shape(self):
        with patch.object(pipeline, "get_video_metadata") as metadata:
            response = self.client.post(ENDPOINT, json={"url": "https://www.youtube.com/watch"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": "URL에서 영상 ID를 찾을 수 없습니다."})
        metadata.assert_not_called()

    def test_transcript_error_returns_400(self):
        for message in ("이 영상에서 한국어 자막을 찾을 수 없습니다.", "존재하지 않거나 재생할 수 없는 영상입니다."):
            with self.subTest(message=message), \
                    patch.object(pipeline, "get_video_metadata", return_value={"title": "", "description": ""}), \
                    patch.object(pipeline, "get_transcript_data", side_effect=ValueError(message)), \
                    patch.object(pipeline, "correct_segments") as correct:
                response = self.client.post(ENDPOINT, json={"url": URL})
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.json(), {"error": message})
                correct.assert_not_called()

    def test_actual_gemini_fallback_returns_200(self):
        raw = [{k: v for k, v in segment.items() if k != "corrected_text"} for segment in DATA["segments"]]
        with patch.object(pipeline, "get_video_metadata", return_value={"title": "", "description": ""}), \
                patch.object(pipeline, "get_transcript_data", return_value=(DATA["transcript"], raw)), \
                patch.object(correction.genai, "Client") as factory, \
                patch.object(correction.logger, "warning"):
            generate = factory.return_value.__enter__.return_value.models.generate_content
            generate.side_effect = ClientError(429, {"error": {"status": "RESOURCE_EXHAUSTED", "message": "quota"}})
            response = self.client.post(ENDPOINT, json={"url": URL})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "title": "", "description": "", "transcript": DATA["transcript"],
            "segments": [{**segment, "corrected_text": segment["text"]} for segment in raw],
        })
        generate.assert_called_once()

    def test_swagger_documents_request_and_response(self):
        response = self.client.get("/openapi.json")
        self.assertEqual(response.status_code, 200)
        schema = response.json()
        endpoint = schema["paths"][ENDPOINT]["post"]
        self.assertEqual(endpoint["summary"], "LLM 자막 문맥 교정 테스트")
        self.assertIn("개발/검증용", endpoint["description"])
        self.assertEqual(endpoint["requestBody"]["content"]["application/json"]["schema"]["$ref"],
                         "#/components/schemas/YoutubeRequest")
        self.assertEqual(endpoint["responses"]["200"]["content"]["application/json"]["schema"]["$ref"],
                         "#/components/schemas/SubtitleCorrectionResponse")
        self.assertEqual(schema["components"]["schemas"]["SubtitleCorrectionResponse"]["properties"]["segments"]["items"]["$ref"],
                         "#/components/schemas/Segment")


if __name__ == "__main__":
    unittest.main()
