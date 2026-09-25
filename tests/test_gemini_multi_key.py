import json
import os
import sys
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, call, patch

from google.genai.errors import ClientError, ServerError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from services import gemini_client as manager
from services import llm_gloss_service as gloss
from services import llm_subtitle_correction_service as subtitle
from services.ksl_converter import KSLConversionError


class MultiKeyTests(unittest.TestCase):
    def setUp(self):
        self.keys = {name: f"test-only-credential-{name}" for name in manager.KEY_NAMES}
        self.start(patch.dict(os.environ, {
            **{f"GEMINI_API_KEY_{name}": value for name, value in self.keys.items()},
            "GEMINI_API_KEY": "test-only-legacy", "GEMINI_MAX_RETRIES": "3",
        }))
        self.clients = {name: MagicMock() for name in self.keys}
        for client in self.clients.values():
            client.__enter__.return_value = client
        self.factory = self.start(patch.object(manager.genai, "Client", side_effect=self.make_client))
        self.sleep = self.start(patch.object(manager.time, "sleep"))
        self.start(patch.object(manager.random, "uniform", return_value=0.25))
        self.log = self.start(patch("builtins.print"))
        self.used = []
        for name, client in self.clients.items():
            client.models.generate_content.side_effect = self.success(name)

    def start(self, patcher):
        result = patcher.start()
        self.addCleanup(patcher.stop)
        return result

    def make_client(self, **kwargs):
        self.assertEqual(kwargs["http_options"].retry_options.attempts, 1)
        return self.clients[next(n for n, k in self.keys.items() if k == kwargs["api_key"])]

    def success(self, name):
        def generate(**kwargs):
            self.used.append(name)
            return SimpleNamespace(text=json.dumps({"segments": [{"index": 0, "glosses": [name]}]}))
        return generate

    def fail(self, name, code=429, delay=None):
        def generate(**kwargs):
            self.used.append(name)
            details = {"message": " ".join(self.keys.values())}
            if delay is not None:
                details["details"] = [{"retryDelay": f"{delay}s"}]
            raise (ClientError if code < 500 else ServerError)(code, {"error": details})
        self.clients[name].models.generate_content.side_effect = generate

    def request(self, **kwargs):
        return manager.generate_content(model="test-model", contents="same request", config=None, **kwargs)

    def test_load_four_in_order_and_multi_precedes_legacy(self):
        self.assertEqual(manager.load_api_keys(), list(self.keys.items()))

    def test_blank_keys_excluded_and_values_trimmed(self):
        with patch.dict(os.environ, GEMINI_API_KEY_JY=" ", GEMINI_API_KEY_RB="", GEMINI_API_KEY_JH="\t", GEMINI_API_KEY_GYU=" test-value "):
            self.assertEqual(manager.load_api_keys(), [("GYU", "test-value")])

    def test_legacy_fallback(self):
        with patch.dict(os.environ, {f"GEMINI_API_KEY_{n}": "" for n in self.keys}):
            self.assertEqual(manager.load_api_keys(), [("LEGACY", "test-only-legacy")])

    def test_missing_keys_is_explicit_configuration_error(self):
        with patch.dict(os.environ, {**{f"GEMINI_API_KEY_{n}": "" for n in self.keys}, "GEMINI_API_KEY": ""}):
            with self.assertRaisesRegex(manager.GeminiConfigurationError, "GEMINI_API_KEY"):
                self.request()
            with self.assertRaisesRegex(KSLConversionError, "GEMINI_API_KEY"):
                gloss.GeminiKSLConverter().convert("text")
        self.factory.assert_not_called()

    def test_jy_success_does_not_create_other_clients_and_next_request_starts_jy(self):
        self.request()
        self.request()
        self.assertEqual(self.used, ["JY", "JY"])
        for name in ("GYU", "RB", "JH"):
            self.clients[name].models.generate_content.assert_not_called()
        self.sleep.assert_not_called()

    def test_jy_429_gyu_success_same_request(self):
        self.fail("JY")
        self.request()
        self.assertEqual(self.used, ["JY", "GYU"])
        self.assertEqual(self.clients["JY"].models.generate_content.call_args, self.clients["GYU"].models.generate_content.call_args)
        self.sleep.assert_not_called()
        for name in self.used:
            self.clients[name].__exit__.assert_called_once()

    def test_two_429_then_rb_success(self):
        self.fail("JY")
        self.fail("GYU")
        self.assertEqual(gloss.GeminiKSLConverter().convert("text"), ["RB"])
        self.assertEqual(self.used, ["JY", "GYU", "RB"])
        self.sleep.assert_not_called()

    def test_all_quota_backoff_then_restart_first_key(self):
        for name in self.keys:
            self.fail(name)
        def resume(_):
            self.clients["JY"].models.generate_content.side_effect = self.success("JY")
        self.sleep.side_effect = resume
        self.request()
        self.assertEqual(self.used, ["JY", "GYU", "RB", "JH", "JY"])
        self.sleep.assert_called_once_with(2.25)

    def test_all_retries_exhausted_bounded_and_closed(self):
        for name in self.keys:
            self.fail(name)
        with self.assertRaises(KSLConversionError) as caught:
            gloss.GeminiKSLConverter().convert_batch(["text"])
        self.assertEqual(self.used, list(self.keys) * 4)
        self.assertEqual(self.sleep.call_args_list, [call(2.25), call(4.25), call(8.25)])
        for client in self.clients.values():
            client.__exit__.assert_called_once()
        for value in self.keys.values():
            self.assertNotIn(value, str(caught.exception))

    def test_503_retries_same_key_without_failover(self):
        self.fail("JY", 503)
        with self.assertRaises(ServerError):
            self.request()
        self.assertEqual(self.used, ["JY"] * 4)
        self.assertEqual(self.sleep.call_args_list, [call(2.25), call(4.25), call(8.25)])
        self.assertEqual(self.factory.call_count, 1)

    def test_mixed_429_503_shares_bounded_retry_budget(self):
        self.fail("JY")
        self.fail("GYU", 503)
        with self.assertRaises(ServerError):
            self.request()
        self.assertEqual(self.used, ["JY"] + ["GYU"] * 4)

    def test_server_delay_from_earlier_key_is_preserved(self):
        for name in self.keys:
            self.fail(name, delay=12 if name == "JY" else 3)
        with self.assertRaises(ClientError):
            self.request(max_retries=1)
        self.sleep.assert_called_once_with(12)

    def test_non_retryable_error_does_not_failover(self):
        self.fail("JY", 400)
        with self.assertRaises(ClientError):
            self.request()
        self.assertEqual(self.used, ["JY"])
        self.sleep.assert_not_called()

    def test_subtitle_failover_success_and_exhaustion_fallback(self):
        self.fail("JY")
        self.clients["GYU"].models.generate_content.side_effect = None
        self.clients["GYU"].models.generate_content.return_value = SimpleNamespace(text='{"corrections": [{"index": 0, "corrected_text": "corrected"}]}')
        inputs = [{"text": "original", "start": 0, "end": 1}]
        self.assertEqual(subtitle.correct_segments(inputs, video_title="", video_description="")[0]["corrected_text"], "corrected")
        for name in self.keys:
            self.fail(name)
        self.used.clear()
        with patch.object(subtitle.logger, "warning") as warning:
            result = subtitle.correct_segments(inputs, video_title="", video_description="")
        self.assertEqual(result[0]["corrected_text"], "original")
        self.assertEqual(self.used, list(self.keys))
        self.sleep.assert_not_called()
        for value in self.keys.values():
            self.assertNotIn(value, str(warning.call_args_list))
            self.assertNotIn(value, str(self.log.call_args_list))

    def test_single_subtitle_uses_failover(self):
        self.fail("JY")
        self.clients["GYU"].models.generate_content.side_effect = None
        self.clients["GYU"].models.generate_content.return_value = SimpleNamespace(text='{"corrected_text": "corrected"}')
        self.assertEqual(subtitle.correct_subtitle(video_title="", video_description="", previous_text="", current_text="original", next_text=""), "corrected")
        self.clients["GYU"].models.generate_content.assert_called_once()

    def test_logs_contain_only_key_labels(self):
        self.fail("JY")
        self.fail("GYU")
        self.request()
        logs = str(self.log.call_args_list)
        self.assertIn("Gemini Failover", logs)
        for name, value in self.keys.items():
            self.assertNotIn(value, logs)
        self.assertIn("JY", logs)
        self.assertIn("GYU", logs)
        self.assertIn("RB", logs)


if __name__ == "__main__":
    unittest.main()
