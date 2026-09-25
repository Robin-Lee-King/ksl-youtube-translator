"""Gemini-based Korean -> KSL gloss conversion.

Pipeline:

1. Understand the Korean segment.
2. Reconstruct it as a simpler Korean expression whose key concepts
   can be represented with allowed_words.
3. Generate glosses from that reconstructed expression.
4. Validate every gloss against allowed_words.
5. Repair invalid segments once with Gemini.
6. If invalid items still remain, remove them in final validation.

convert_batch() remains backward-compatible:
    list[str] -> list[list[str]]
"""

import json

from dotenv import load_dotenv
from google.genai import types

from services.ksl_converter import KSLConversionError
from .gemini_client import generate_content, _env_int, GeminiConfigurationError
from .gloss_matcher import get_allowed_words


load_dotenv()

_MODEL_NAME = "gemini-flash-lite-latest"

# invalid / 과도한 축약 발생 시 Gemini 재구성은 최대 1회
_MAX_GLOSS_VALIDATION_RETRIES = 1


class GlossConversionError(Exception):
    """Gemini request or response validation failed."""


def get_gloss_batch_size() -> int:
    return _env_int(
        "GEMINI_GLOSS_BATCH_SIZE",
        5,
        1,
    )


# ============================================================
# Main instruction
# ============================================================

_SYSTEM_INSTRUCTION = (
    "You convert Korean speech into Korean simplified_text and KSL glosses "
    "that a sign-language avatar can actually express. "

    "For each input segment, follow these steps. "

    "STEP 1 - Understand the full source meaning. "
    "Identify meaningful units such as people, proper nouns, actions, emotions, "
    "causes, reasons, results, time, places, goals, negation, questions, requests, "
    "possibility, quantities, and relationships. "
    "Do not translate word by word, but do not compress a long source into only a few keywords. "

    "STEP 2 - Create simplified_text. "
    "simplified_text is NOT a summary, NOT a keyword list, and NOT merely easy Korean. "
    "It must be natural Korean whose meaningful content can actually be expressed "
    "with the available sign vocabulary. "

    "Keep source meaning as much as possible. "
    "Remove fillers, hesitation, meaningless repetition, and unnecessary politeness, "
    "but preserve real events, people, actions, reasons, emotions, goals, places, time, "
    "causes, results, questions, and negation. "

    "Short input may become one short sentence. "
    "Long input with multiple meaning units may be rewritten as 1 to 4 short natural Korean sentences. "
    "Do not force a long source into one very short sentence. "
    "Preserve roughly 60 to 90 percent of meaningful information when possible. "
    "This refers to semantic information, not character count. "

    "CRITICAL REPRESENTATION RULE: "
    "Every meaning-bearing ordinary lexical concept kept in simplified_text "
    "MUST be expressible directly or compositionally using allowed_words. "

    "Do NOT leave an unsupported ordinary content word in simplified_text. "
    "If an ordinary concept is unavailable, rewrite it using available vocabulary before returning. "

    "Korean grammatical particles and endings may remain for readability even if they are not in allowed_words. "
    "Only meaning-bearing lexical concepts must be signable. "

    "For an unavailable ordinary concept, use this priority: "
    "1. exact allowed concept, "
    "2. semantically close allowed concept, "
    "3. short combination of allowed concepts, "
    "4. broader available concept if the specific distinction is not essential, "
    "5. another natural paraphrase using allowed_words that preserves the communicative intent. "

    "COMPOSITION RULE: "
    "One source concept does NOT need to map to exactly one gloss. "
    "If no single allowed_word expresses a concept well, use two or more allowed_words "
    "whose combined meaning preserves that concept. "
    "Prefer a short meaningful combination over jamo spelling or deleting the concept. "
    "For example, depending on context, a concept such as '팀원' may be represented "
    "using available concepts such as '사람', '친구', '함께', or an appropriate combination. "
    "Likewise, an unavailable action, relationship, or state may be expressed through "
    "multiple available semantic components when that preserves the original meaning. "

    "Do not delete an unavailable concept if a useful broader, related, "
    "compositional, or paraphrased expression can preserve its meaning. "

    "Examples: "
    "If '농구' is unavailable but '경기' or '운동경기' is available, "
    "use that broader concept when basketball-specific identity is not important. "
    "If '금메달' is unavailable but '우승' is available and medal color is not essential, use '우승'. "
    "If '감독' is unavailable but '코치' preserves the role, use '코치'. "
    "If '고생하다' is unavailable but '힘들다' preserves the meaning, use '힘들다'. "
    "If '열심히' or '노력하다' is unavailable but '열심' preserves the meaning, use '열심'. "
    "If '눈물' is unavailable but an available crying-related concept preserves the meaning, use it. "
    "If one word is unavailable but several allowed_words together express it better, use the combination. "

    "Do NOT generalize when the specific distinction is essential. "
    "For example, if the source contrasts basketball and football, do not replace both with '경기'. "

    "ORDINARY-WORD JAMO RULE: "
    "Do NOT use Hangul jamo for ordinary vocabulary. "
    "Do NOT spell ordinary nouns, verbs, adjectives, adverbs, time expressions, "
    "or conversational expressions with jamo just because the exact word is unavailable. "
    "For ordinary concepts, use semantic rewriting, combinations, broader concepts, "
    "or meaning-preserving paraphrases with allowed_words. "
    "If a minor ordinary detail truly cannot be represented reasonably, "
    "omit that minor detail rather than spelling the ordinary word with jamo. "

    "Preserve communicative intent rather than exact surface wording. "
    "For example, an expression such as '다음에 또 봐요' should be reconstructed "
    "using the closest available farewell or future-meeting meaning, "
    "not by spelling ordinary words such as '다음', '또', or '보다' with jamo. "

    "PROPER NOUN RULE: "
    "Important proper nouns such as person names, place names, organizations, teams, competitions, "
    "companies, and products must not disappear or be replaced only by a generic category. "

    "Preserve the full identity of an important proper noun "
    "on its first important mention in simplified_text. "

    "If a proper noun exists in allowed_words, use it directly in glosses. "
    "If it does not exist in allowed_words, preserve its Korean pronunciation "
    "using allowed Hangul jamo in glosses. "
    "A role/category gloss may be added after the jamo when useful. "

    "Example: "
    "'마줄스 감독에게 감사하다' must preserve '마줄스' on its first important mention. "
    "If unavailable, represent the name as ['ㅁ','ㅏ','ㅈ','ㅜ','ㄹ','ㅅ','ㅡ'] "
    "and optionally add '코치' and '감사'. "
    "Do NOT reduce the first important mention of '마줄스 감독' to only '코치'. "

    "REPEATED ENTITY RULE: "
    "Keep the full identity on the first important mention. "
    "For later repeated mentions, if the referent is unambiguous, "
    "use an available role/category or omit the subject when natural Korean allows it. "
    "Use only references expressible with allowed_words. "
    "Do not invent unavailable pronouns or reference words. "
    "Do not repeatedly spell the same proper noun with jamo when an available "
    "role/category or natural subject omission preserves the reference. "
    "If multiple possible referents exist, keep enough identity information to avoid ambiguity. "

    "STEP 3 - Generate glosses from simplified_text. "
    "Glosses must cover ALL meaningful content preserved in simplified_text, in playback order. "
    "Do not output only representative keywords. "
    "No meaningful concept may remain in simplified_text and silently disappear from glosses. "

    "A single concept in simplified_text may produce multiple glosses "
    "when a combination of allowed_words is needed to preserve its meaning. "

    "Required pipeline: "
    "source -> fully signable simplified_text -> glosses covering the full meaning of simplified_text. "

    "The input may include target_min_glosses and target_max_glosses. "
    "Treat them as soft density targets. "
    "The purpose is to prevent long speech from becoming only a few avatar motions followed by long idle time. "

    "For a meaningful long segment, normally produce at least target_min_glosses "
    "unless much of the source is filler or repetition. "
    "Do NOT pad glosses with meaningless repetition. "
    "Do NOT increase gloss count by spelling ordinary words with jamo. "
    "Increase density by preserving more real source meaning instead. "

    "It is acceptable to exceed target_max_glosses when needed for important proper-noun jamo "
    "or accurate meaning preservation. "

    "EVERY individual gloss MUST exactly match one item in allowed_words. "

    "Hangul jamo is reserved for important unsupported proper nouns "
    "or other identity-bearing names that cannot be represented lexically. "
    "When proper-noun jamo is needed, decompose Korean pronunciation into Hangul jamo in pronunciation order. "
    "Example: '김' -> ['ㄱ','ㅣ','ㅁ']. "
    "Each jamo must itself exist in allowed_words. "

    "Before returning, verify all of the following: "
    "1. simplified_text is natural Korean, not a summary or keyword list. "
    "2. Long input preserves enough meaning and may use 1 to 4 short sentences. "
    "3. Every ordinary lexical concept in simplified_text is expressible with allowed_words. "
    "4. No unsupported ordinary content word remains in simplified_text. "
    "5. Missing ordinary concepts were rewritten using close words, combinations, broader concepts, or paraphrases. "
    "6. One unavailable source concept may use multiple allowed glosses when useful. "
    "7. No ordinary vocabulary is spelled with jamo. "
    "8. Important proper nouns preserve their identity on the first important mention. "
    "9. Later repeated entities use available roles/categories or natural subject omission when unambiguous. "
    "10. Jamo is used only for important unsupported proper nouns or identity-bearing names. "
    "11. Glosses cover all meaningful content in simplified_text. "
    "12. Every gloss exists exactly in allowed_words. "
    "13. There is no meaningless gloss repetition. "
    "14. No new facts were invented. "

    "Use nearby segments only for context and reference resolution. "
    "Do not move information from one segment into another. "
    "Include every input index exactly once and preserve input order. "
    "Use an empty gloss list only for blank or meaningless input. "

    "Return both simplified_text and glosses for every segment."
)


# ============================================================
# Repair instruction
# ============================================================

_REPAIR_INSTRUCTION = (
    "The previous result needs repair because it contains invalid glosses, "
    "is too sparse, is over-compressed, contains unsupported ordinary concepts, "
    "uses unnecessary jamo, or lost an important proper noun. "

    "Re-read the ORIGINAL Korean text. "
    "Do not repair only from previous_simplified_text. "

    "Rebuild simplified_text from the source. "
    "It must be natural Korean, not a summary and not a keyword list. "

    "Preserve as much real source meaning as possible. "
    "For long input with multiple meaning units, use 1 to 4 short natural Korean sentences when helpful. "
    "Do not collapse a long source into one tiny sentence or a few keywords. "

    "Every meaning-bearing ordinary lexical concept in simplified_text "
    "MUST be directly or compositionally expressible using allowed_words. "

    "Do not leave unsupported ordinary content words in simplified_text. "

    "Rewrite unavailable ordinary concepts using this priority: "
    "1. exact allowed word, "
    "2. semantically close allowed word, "
    "3. short combination of allowed words, "
    "4. broader meaning-preserving concept when the specific distinction is not essential, "
    "5. another natural paraphrase using allowed_words that preserves the communicative intent. "

    "COMPOSITION RULE: "
    "One source concept does NOT need to map to one gloss. "
    "If no single allowed_word expresses the concept well, use two or more allowed_words "
    "whose combined meaning preserves it. "
    "Prefer a meaningful multi-word combination over jamo spelling or deletion. "
    "For example, depending on context, '팀원' may be represented with available concepts "
    "such as '사람', '친구', '함께', or an appropriate combination. "

    "Do not delete an unavailable concept if a useful broader, related, "
    "compositional, or paraphrased expression can preserve it. "

    "Examples: "
    "'농구' -> '경기' or '운동경기' when basketball-specific identity is not essential. "
    "'금메달' -> '우승' when medal color is not essential. "
    "'감독' -> '코치' when the role is preserved. "
    "'고생하다' -> '힘들다' when appropriate. "
    "'노력하다' -> '열심' when appropriate. "
    "'눈물' -> an available crying-related concept when appropriate. "
    "'돌아가다' -> '가다' when the homecoming distinction is not essential. "

    "Do not over-generalize when the specific distinction is important. "

    "ORDINARY-WORD JAMO RULE: "
    "Do NOT use Hangul jamo for ordinary vocabulary. "
    "Do NOT spell ordinary nouns, verbs, adjectives, adverbs, time expressions, "
    "or conversational expressions with jamo just because the exact word is unavailable. "

    "For ordinary concepts, always prefer semantic rewriting with allowed_words. "
    "Use an exact word, close alternative, short combination, broader concept, "
    "or natural meaning-preserving paraphrase. "

    "If a minor ordinary detail cannot be expressed reasonably with allowed_words, "
    "omit that minor detail rather than spelling the ordinary word with jamo. "

    "Preserve the overall communicative intent rather than the exact surface wording. "
    "For example, '다음에 또 봐요' should be rewritten into the closest available "
    "farewell or future-meeting meaning using allowed_words, "
    "rather than spelling ordinary words with jamo. "

    "PROPER NOUN RULE: "
    "Preserve the full identity of important person names, places, organizations, teams, "
    "competitions, companies, products, and other identity-bearing names "
    "on their first important mention. "

    "Hangul jamo is reserved for important unsupported proper nouns "
    "or identity-bearing names that cannot be represented with allowed_words. "

    "If an important proper noun is not directly available in allowed_words, "
    "represent its Korean pronunciation using allowed Hangul jamo in glosses. "

    "Do not replace the first important mention of a named person such as "
    "'마줄스 감독' with only '코치'. "
    "Keep '마줄스' and spell it with jamo when necessary, then add '코치' if useful. "

    "REPEATED ENTITY RULE: "
    "Keep the full identity on the first important mention. "
    "For later unambiguous mentions, use an available role/category or omit the subject. "
    "Use only references expressible with allowed_words. "
    "Do not repeat proper-noun jamo unnecessarily. "
    "If the referent could be ambiguous, keep enough identity information to make it clear. "

    "If previous_simplified_text was too short, restore omitted real meaning from the ORIGINAL source. "
    "Restore people, actions, emotions, reasons, causes, results, time, places, goals, relationships, "
    "questions, and negation when they were incorrectly removed. "

    "Use target_min_glosses and target_max_glosses as soft density targets. "
    "If previous_glosses are below target_min_glosses, restore omitted semantic units. "
    "Do NOT pad by meaningless repetition. "
    "Do NOT increase gloss count by spelling ordinary words with jamo. "

    "Glosses must cover ALL meaningful content preserved in simplified_text. "
    "Do not select only representative keywords. "
    "A single concept may use multiple allowed glosses when that better preserves meaning. "
    "Do not leave unsupported words in simplified_text and then silently ignore them in glosses. "

    "Before returning, verify: "
    "1. simplified_text is natural Korean. "
    "2. Long input preserves enough meaning and may use 1 to 4 short sentences. "
    "3. Every ordinary lexical concept is expressible using allowed_words. "
    "4. No unsupported ordinary content word remains. "
    "5. Missing concepts were rewritten using close words, combinations, broader concepts, or paraphrases. "
    "6. One source concept may use multiple allowed glosses when needed. "
    "7. No ordinary vocabulary is spelled with jamo. "
    "8. Important proper nouns preserve their identity on the first important mention. "
    "9. Later repeated entities use available roles/categories or subject omission only when unambiguous. "
    "10. Jamo is used only for important unsupported proper nouns or identity-bearing names. "
    "11. Glosses cover the full meaningful content of simplified_text. "
    "12. Every gloss exists exactly in allowed_words. "
    "13. There is no meaningless repetition. "
    "14. No new facts were invented. "

    "Return both simplified_text and glosses."
)


# ============================================================
# Hangul tables
# ============================================================

_CHOSEONG = [
    "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ",
    "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
    "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ",
    "ㅋ", "ㅌ", "ㅍ", "ㅎ",
]

_JUNGSEONG = [
    "ㅏ", "ㅐ", "ㅑ", "ㅒ",
    "ㅓ", "ㅔ", "ㅕ", "ㅖ",
    "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ",
    "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ",
    "ㅡ", "ㅢ", "ㅣ",
]

_JONGSEONG = [
    "",
    "ㄱ", "ㄲ", "ㄳ",
    "ㄴ", "ㄵ", "ㄶ",
    "ㄷ",
    "ㄹ", "ㄺ", "ㄻ", "ㄼ",
    "ㄽ", "ㄾ", "ㄿ", "ㅀ",
    "ㅁ",
    "ㅂ", "ㅄ",
    "ㅅ", "ㅆ",
    "ㅇ",
    "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
]

_COMPLEX_JONG = {
    "ㄳ": ["ㄱ", "ㅅ"],
    "ㄵ": ["ㄴ", "ㅈ"],
    "ㄶ": ["ㄴ", "ㅎ"],
    "ㄺ": ["ㄹ", "ㄱ"],
    "ㄻ": ["ㄹ", "ㅁ"],
    "ㄼ": ["ㄹ", "ㅂ"],
    "ㄽ": ["ㄹ", "ㅅ"],
    "ㄾ": ["ㄹ", "ㅌ"],
    "ㄿ": ["ㄹ", "ㅍ"],
    "ㅀ": ["ㄹ", "ㅎ"],
    "ㅄ": ["ㅂ", "ㅅ"],
}


# ============================================================
# JSON schema
# ============================================================

def _build_schema(
    item_count: int,
) -> dict:

    return {
        "type": "object",
        "required": [
            "segments",
        ],
        "properties": {
            "segments": {
                "type": "array",
                "minItems": item_count,
                "maxItems": item_count,
                "items": {
                    "type": "object",
                    "required": [
                        "index",
                        "simplified_text",
                        "glosses",
                    ],
                    "properties": {
                        "index": {
                            "type": "integer",
                        },
                        "simplified_text": {
                            "type": "string",
                        },
                        "glosses": {
                            "type": "array",
                            "items": {
                                "type": "string",
                            },
                        },
                    },
                },
            }
        },
    }


# ============================================================
# Gemini request
# ============================================================

def _call_gemini(
    *,
    allowed_words: list[str],
    segments: list[dict],
    system_instruction: str,
):

    schema = _build_schema(
        len(segments)
    )

    try:

        return generate_content(
            model=_MODEL_NAME,

            contents=json.dumps(
                {
                    "allowed_words": allowed_words,
                    "segments": segments,
                },
                ensure_ascii=False,
            ),

            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_json_schema=schema,
            ),
        )

    except Exception as exc:

        code = getattr(
            exc,
            "code",
            None,
        )

        reason = (
            str(exc)
            if isinstance(
                exc,
                GeminiConfigurationError,
            )
            else (
                str(code)
                if isinstance(
                    code,
                    int,
                )
                else type(exc).__name__
            )
        )

        raise GlossConversionError(
            f"Gemini API 호출 실패 ({reason})"
        ) from exc


# ============================================================
# Response parsing
# ============================================================

def _parse_response(
    response,
    expected_indices: set[int],
) -> dict[int, dict]:

    try:

        payload = json.loads(
            response.text
        )

    except (
        TypeError,
        ValueError,
    ) as exc:

        raise GlossConversionError(
            "응답 파싱 실패: 유효한 JSON이 아닙니다"
        ) from exc

    entries = (
        payload.get("segments")
        if isinstance(
            payload,
            dict,
        )
        else None
    )

    if (
        not isinstance(
            entries,
            list,
        )
        or len(entries)
        != len(expected_indices)
    ):

        raise GlossConversionError(
            "응답 파싱 실패: "
            "입력과 출력 segment 수가 다릅니다"
        )

    ordered: dict[int, dict] = {}

    for entry in entries:

        if not isinstance(
            entry,
            dict,
        ):

            raise GlossConversionError(
                "응답 파싱 실패: "
                "segment 객체가 아닙니다"
            )

        index = entry.get(
            "index"
        )

        simplified_text = entry.get(
            "simplified_text"
        )

        glosses = entry.get(
            "glosses"
        )

        if (
            type(index) is not int
            or index not in expected_indices
            or index in ordered
        ):

            raise GlossConversionError(
                "응답 파싱 실패: "
                "중복 또는 잘못된 index"
            )

        if not isinstance(
            simplified_text,
            str,
        ):

            raise GlossConversionError(
                "응답 파싱 실패: "
                "simplified_text는 문자열이어야 합니다"
            )

        if (
            not isinstance(
                glosses,
                list,
            )
            or not all(
                isinstance(
                    gloss,
                    str,
                )
                for gloss in glosses
            )
        ):

            raise GlossConversionError(
                "응답 파싱 실패: "
                "glosses는 문자열 배열이어야 합니다"
            )

        ordered[index] = {
            "simplified_text": (
                simplified_text.strip()
            ),
            "glosses": [
                gloss.strip()
                for gloss in glosses
                if gloss.strip()
            ],
        }

    if (
        set(
            ordered.keys()
        )
        != expected_indices
    ):

        raise GlossConversionError(
            "응답 파싱 실패: "
            "일부 index가 누락되었습니다"
        )

    return ordered


# ============================================================
# Gloss validation
# ============================================================

def _find_invalid_glosses(
    ordered: dict[int, dict],
    allowed_set: set[str],
) -> dict[int, list[str]]:

    invalid_by_index: dict[
        int,
        list[str],
    ] = {}

    for index, result in ordered.items():

        glosses = result[
            "glosses"
        ]

        invalid = [
            gloss
            for gloss in glosses
            if gloss not in allowed_set
        ]

        if invalid:

            invalid_by_index[
                index
            ] = invalid

    return invalid_by_index


# ============================================================
# Gloss density
# ============================================================

def _estimate_gloss_range(
    text: str,
) -> tuple[int, int]:
    """
    원문 길이를 기준으로 적절한 Gloss 개수 범위를 계산한다.

    이것은 강제 padding 규칙이 아니라 soft target이다.

    긴 음성이 몇 개의 Gloss로만 압축되어
    아바타가 오랫동안 가만히 있는 상황을 감지하기 위해 사용한다.
    """

    tokens = [
        token
        for token in text.replace(
            "\n",
            " ",
        ).split()
        if token.strip()
    ]

    word_count = len(
        tokens
    )

    if word_count == 0:

        return (
            0,
            0,
        )

    if word_count <= 4:

        return (
            1,
            max(
                2,
                word_count,
            ),
        )

    if word_count <= 8:

        minimum = max(
            2,
            round(
                word_count
                * 0.35
            ),
        )

        maximum = max(
            minimum + 1,
            round(
                word_count
                * 0.75
            ),
        )

        return (
            minimum,
            maximum,
        )

    # 한국어 발화에는 조사/군더더기/필러가 많기 때문에
    # 표면 단어 전체를 Gloss 수로 요구하지는 않는다.
    minimum = max(
        3,
        min(
            28,
            round(
                word_count
                * 0.25
            ),
        ),
    )

    maximum = max(
        minimum + 2,
        min(
            40,
            round(
                word_count
                * 0.50
            ),
        ),
    )

    return (
        minimum,
        maximum,
    )


def _find_density_issues(
    ordered: dict[int, dict],
    texts: list[str],
) -> dict[int, dict]:
    """
    지나치게 축약된 segment를 찾는다.

    다음 중 하나면 repair 대상:

    1. Gloss 수가 soft minimum보다 적음.
    2. 긴 원문이 너무 짧은 simplified_text로 축약됨.

    개수를 맞추기 위해 로컬에서 Gloss를 반복하지 않는다.
    반드시 Gemini가 원문 의미를 다시 살려서 재구성한다.
    """

    issues: dict[
        int,
        dict,
    ] = {}

    for index, result in ordered.items():

        source_text = texts[
            index
        ]

        target_min, target_max = (
            _estimate_gloss_range(
                source_text
            )
        )

        source_word_count = len(
            [
                token
                for token
                in source_text.split()
                if token.strip()
            ]
        )

        simplified_text = (
            result.get(
                "simplified_text",
                "",
            )
        )

        simplified_word_count = len(
            [
                token
                for token
                in simplified_text.split()
                if token.strip()
            ]
        )

        gloss_count = len(
            result.get(
                "glosses",
                [],
            )
        )

        too_sparse = (
            target_min > 0
            and gloss_count
            < target_min
        )

        # 원문 단어가 12개 이상이면
        # simplified_text가 원문의 35%보다도 짧은 경우
        # 과도한 축약으로 판단한다.
        minimum_simplified_words = (
            max(
                4,
                round(
                    source_word_count
                    * 0.35
                ),
            )
            if source_word_count >= 12
            else 0
        )

        overcompressed_text = (
            minimum_simplified_words > 0
            and simplified_word_count
            < minimum_simplified_words
        )

        if (
            too_sparse
            or overcompressed_text
        ):

            issues[
                index
            ] = {
                "target_min_glosses": (
                    target_min
                ),
                "target_max_glosses": (
                    target_max
                ),
                "actual_glosses": (
                    gloss_count
                ),
                "source_words": (
                    source_word_count
                ),
                "simplified_words": (
                    simplified_word_count
                ),
                "minimum_simplified_words": (
                    minimum_simplified_words
                ),
                "too_sparse": (
                    too_sparse
                ),
                "overcompressed_text": (
                    overcompressed_text
                ),
            }

    return issues


# ============================================================
# Hangul -> jamo
# ============================================================

def _hangul_to_allowed_jamo(
    text: str,
    allowed_set: set[str],
) -> list[str]:
    """
    완성형 한글을 allowed Hangul jamo로 완전히 분해한다.

    중요:

    '구', '달', '오', '목' 등이 allowed_words 안에 있더라도
    fallback 단계에서는 완성형 음절을 그대로 사용하지 않고
    무조건 자모로 분해한다.

    예:

        농구
        -> ㄴ ㅗ ㅇ ㄱ ㅜ

        메달
        -> ㅁ ㅔ ㄷ ㅏ ㄹ
    """

    result: list[
        str
    ] = []

    for char in text:

        if char.isspace():

            continue

        code = ord(
            char
        )

        # ----------------------------------------------------
        # 완성형 한글은 항상 먼저 자모 분해
        # ----------------------------------------------------

        if (
            0xAC00
            <= code
            <= 0xD7A3
        ):

            syllable_index = (
                code
                - 0xAC00
            )

            choseong_index = (
                syllable_index
                // 588
            )

            jungseong_index = (
                (
                    syllable_index
                    % 588
                )
                // 28
            )

            jongseong_index = (
                syllable_index
                % 28
            )

            initial = (
                _CHOSEONG[
                    choseong_index
                ]
            )

            vowel = (
                _JUNGSEONG[
                    jungseong_index
                ]
            )

            final = (
                _JONGSEONG[
                    jongseong_index
                ]
            )

            # 초성
            if initial not in allowed_set:

                return []

            result.append(
                initial
            )

            # 중성
            if vowel not in allowed_set:

                return []

            result.append(
                vowel
            )

            # 종성
            if final:

                if final in allowed_set:

                    result.append(
                        final
                    )

                elif final in _COMPLEX_JONG:

                    parts = (
                        _COMPLEX_JONG[
                            final
                        ]
                    )

                    if not all(
                        part in allowed_set
                        for part in parts
                    ):

                        return []

                    result.extend(
                        parts
                    )

                else:

                    return []

        # ----------------------------------------------------
        # 이미 자모 자체인 경우
        # ----------------------------------------------------

        elif char in allowed_set:

            result.append(
                char
            )

        # ----------------------------------------------------
        # 영어/숫자/특수문자 등
        # 현재 local fallback으로 발음을 추정하지 않는다.
        # ----------------------------------------------------

        else:

            return []

    return result


# ============================================================
# Main detailed converter
# ============================================================

def convert_batch_detailed(
    texts: list[str],
) -> list[dict]:
    """
    Returns:

    [
        {
            "simplified_text": "...",
            "glosses": [...]
        },
        ...
    ]

    Gemini가 먼저 의미를 충분히 보존한 수어용 한국어 문장을
    재구성한 후 Gloss를 생성한다.
    """

    if not texts:

        return []

    allowed_words = (
        get_allowed_words()
    )

    allowed_set = set(
        allowed_words
    )

    # ========================================================
    # 1. Initial reconstruction + gloss generation
    # ========================================================

    initial_segments: list[
        dict
    ] = []

    for index, text in enumerate(
        texts
    ):

        target_min, target_max = (
            _estimate_gloss_range(
                text
            )
        )

        initial_segments.append(
            {
                "index": (
                    index
                ),
                "text": (
                    text
                ),
                "target_min_glosses": (
                    target_min
                ),
                "target_max_glosses": (
                    target_max
                ),
            }
        )

    response = _call_gemini(
        allowed_words=(
            allowed_words
        ),
        segments=(
            initial_segments
        ),
        system_instruction=(
            _SYSTEM_INSTRUCTION
        ),
    )

    expected_indices = set(
        range(
            len(texts)
        )
    )

    ordered = _parse_response(
        response,
        expected_indices,
    )

    # ========================================================
    # 2. Validate + one semantic/density repair
    # ========================================================

    for attempt in range(
        1,
        _MAX_GLOSS_VALIDATION_RETRIES
        + 1,
    ):

        invalid_by_index = (
            _find_invalid_glosses(
                ordered,
                allowed_set,
            )
        )

        density_by_index = (
            _find_density_issues(
                ordered,
                texts,
            )
        )

        repair_indices = sorted(
            set(
                invalid_by_index.keys()
            )
            |
            set(
                density_by_index.keys()
            )
        )

        if not repair_indices:

            break

        print(
            "[Gloss Validation] "
            f"attempt={attempt} "
            f"invalid_segments="
            f"{len(invalid_by_index)} "
            f"density_segments="
            f"{len(density_by_index)}",
            flush=True,
        )

        for index in repair_indices:

            invalid = (
                invalid_by_index.get(
                    index,
                    [],
                )
            )

            density_issue = (
                density_by_index.get(
                    index
                )
            )

            if invalid:

                print(
                    "[Gloss Validation] "
                    f"index={index} "
                    f"invalid={invalid}",
                    flush=True,
                )

            if density_issue:

                print(
                    "[Gloss Density] "
                    f"index={index} "
                    f"actual="
                    f"{density_issue['actual_glosses']} "
                    f"target="
                    f"{density_issue['target_min_glosses']}-"
                    f"{density_issue['target_max_glosses']} "
                    f"source_words="
                    f"{density_issue['source_words']} "
                    f"simplified_words="
                    f"{density_issue['simplified_words']}",
                    flush=True,
                )

        # invalid이 있거나
        # 의미/Gloss 밀도가 너무 낮은 segment만
        # Gemini에게 한 번 더 보낸다.
        repair_segments: list[
            dict
        ] = []

        for index in repair_indices:

            invalid = (
                invalid_by_index.get(
                    index,
                    [],
                )
            )

            target_min, target_max = (
                _estimate_gloss_range(
                    texts[
                        index
                    ]
                )
            )

            density_issue = (
                density_by_index.get(
                    index
                )
            )

            repair_segments.append(
                {
                    "index": (
                        index
                    ),

                    "text": (
                        texts[
                            index
                        ]
                    ),

                    "previous_simplified_text": (
                        ordered[
                            index
                        ][
                            "simplified_text"
                        ]
                    ),

                    "previous_glosses": (
                        ordered[
                            index
                        ][
                            "glosses"
                        ]
                    ),

                    "invalid_glosses": (
                        invalid
                    ),

                    "density_issue": (
                        density_issue
                    ),

                    "target_min_glosses": (
                        target_min
                    ),

                    "target_max_glosses": (
                        target_max
                    ),

                    "repair_request": (
                        "Reconstruct from the ORIGINAL text. "
                        "Do not summarize into keywords. "
                        "Restore omitted real semantic units so simplified_text remains "
                        "reasonably close in information content to the source. "

                        "For unavailable ordinary concepts, use allowed semantic alternatives, "
                        "broader concepts, paraphrases, or combinations of multiple allowed_words. "
                        "One source concept may be represented by multiple glosses. "

                        "Do NOT spell ordinary vocabulary with Hangul jamo. "
                        "Do NOT use jamo merely to increase gloss density. "

                        "Use Hangul jamo only for important unsupported proper nouns "
                        "or identity-bearing names. "

                        "Preserve important proper nouns on their first important mention. "
                        "Later unambiguous mentions may use an available role/category "
                        "or natural subject omission. "

                        "Do not pad by repetition."
                    ),
                }
            )

        repair_response = (
            _call_gemini(
                allowed_words=(
                    allowed_words
                ),
                segments=(
                    repair_segments
                ),
                system_instruction=(
                    _REPAIR_INSTRUCTION
                ),
            )
        )

        repaired = (
            _parse_response(
                repair_response,
                set(
                    repair_indices
                ),
            )
        )

        for (
            index,
            result,
        ) in repaired.items():

            ordered[
                index
            ] = result

    # ========================================================
    # 3. Final validation
    # ========================================================
    #
    # IMPORTANT:
    #
    # Gemini는 이미 중요한 고유명사를 필요한 경우
    # allowed Hangul jamo 각각으로 출력하도록 지시받았다.
    #
    # 따라서 repair 이후 남아 있는 invalid gloss를
    # Python에서 무조건 자모로 변환하면 안 된다.
    #
    # 예:
    #   팀원 -> ㅌ ㅣ ㅁ ㅇ ㅝ ㄴ   X
    #   노력 -> ㄴ ㅗ ㄹ ㅕ ㄱ      X
    #   다음 -> ㄷ ㅏ ㅇ ㅡ ㅁ      X
    #
    # 이런 일반어는 Gemini 단계에서
    # allowed_words의 근접어 / 조합 / 상위개념으로
    # 재구성되어야 한다.
    #
    # 중요한 고유명사의 자모는 Gemini가 이미
    # ['ㅁ','ㅏ','ㅈ', ...]처럼 개별 allowed gloss로
    # 반환하므로 여기서는 invalid로 잡히지 않는다.
    # ========================================================

    final_invalid = _find_invalid_glosses(
        ordered,
        allowed_set,
    )

    if final_invalid:

        print(
            "[Gloss Validation] "
            "Gemini semantic repair 후에도 invalid gloss 존재 "
            "-> ordinary-word local jamo fallback 금지, invalid gloss 제거",
            flush=True,
        )

        for index, invalid_glosses in final_invalid.items():

            print(
                "[Gloss Validation] "
                f"index={index} "
                f"invalid={invalid_glosses} "
                "-> SKIP",
                flush=True,
            )

            ordered[index]["glosses"] = [
                gloss
                for gloss in ordered[index]["glosses"]
                if gloss in allowed_set
            ]

    # ========================================================
    # 4. Absolute safety cleanup
    # ========================================================

    remaining_invalid = (
        _find_invalid_glosses(
            ordered,
            allowed_set,
        )
    )

    if remaining_invalid:

        print(
            "[Gloss Validation] "
            "WARNING: "
            "remaining invalid glosses removed: "
            f"{remaining_invalid}",
            flush=True,
        )

        for (
            index,
            result,
        ) in ordered.items():

            result[
                "glosses"
            ] = [
                gloss
                for gloss
                in result[
                    "glosses"
                ]
                if gloss
                in allowed_set
            ]

    # ========================================================
    # 5. Final density diagnostics
    # ========================================================

    # repair 이후에도 너무 짧은 경우 로그에 경고만 남긴다.
    # 의미 없는 Gloss를 로컬에서 억지로 반복하지 않는다.
    final_density_issues = (
        _find_density_issues(
            ordered,
            texts,
        )
    )

    if final_density_issues:

        for (
            index,
            issue,
        ) in final_density_issues.items():

            print(
                "[Gloss Density] WARNING "
                f"index={index} "
                f"actual="
                f"{issue['actual_glosses']} "
                f"target="
                f"{issue['target_min_glosses']}-"
                f"{issue['target_max_glosses']} "
                "(semantic repair 1회 후에도 짧음)",
                flush=True,
            )

    # ========================================================
    # 6. Debug output
    # ========================================================

    for index in range(
        len(texts)
    ):

        result = (
            ordered[
                index
            ]
        )

        print(
            f"[Gloss Simplified] "
            f"index={index} "
            f"{result['simplified_text']}",
            flush=True,
        )

        print(
            f"[Gloss Result] "
            f"index={index} "
            f"{result['glosses']}",
            flush=True,
        )

    print(
        "[Gloss Validation] PASS "
        f"segments={len(texts)} "
        f"allowed_words="
        f"{len(allowed_words)}",
        flush=True,
    )

    # 입력 순서 복구
    return [
        ordered[
            index
        ]
        for index
        in range(
            len(texts)
        )
    ]


# ============================================================
# Backward-compatible API
# ============================================================

def convert_batch(
    texts: list[str],
) -> list[list[str]]:
    """
    기존 코드와 호환.

    외부에는:

        [
            ["감사", "사람"],
            ["우승", "기쁘다"],
        ]

    형태만 반환한다.

    내부적으로는 simplified_text를 먼저 생성하고
    그 결과에서 glosses를 만든다.
    """

    detailed = (
        convert_batch_detailed(
            texts
        )
    )

    return [
        item[
            "glosses"
        ]
        for item
        in detailed
    ]


def convert_to_gloss(
    korean_text: str,
) -> list[str]:

    return convert_batch(
        [
            korean_text
        ]
    )[0]


class GeminiKSLConverter:

    def convert(
        self,
        korean_text: str,
    ) -> list[str]:

        return self.convert_batch(
            [
                korean_text
            ]
        )[0]

    def convert_batch(
        self,
        texts: list[str],
    ) -> list[list[str]]:

        try:

            return convert_batch(
                texts
            )

        except GlossConversionError as exc:

            raise KSLConversionError(
                str(exc)
            ) from exc

    def convert_batch_detailed(
        self,
        texts: list[str],
    ) -> list[dict]:
        """
        job.py에서 simplified_text와 glosses를
        함께 받을 때 사용하는 API.
        """

        try:

            return convert_batch_detailed(
                texts
            )

        except GlossConversionError as exc:

            raise KSLConversionError(
                str(exc)
            ) from exc
