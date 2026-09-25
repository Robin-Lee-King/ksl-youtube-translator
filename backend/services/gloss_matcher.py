import csv
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"

WORD_CSV_PATH = DATA_DIR / "ALL_WORD_ID_MAPPING.csv"
SEN_CSV_PATH = DATA_DIR / "sen_sentence_mapping.csv"
EMOTION_CSV_PATH = DATA_DIR / "감정단어_매핑결과_대체어포함.csv"

CODE_PATTERN = re.compile(r"(WORD\d+|SEN\d+)")


def _extract_code(raw_code: str) -> str | None:
    """코드 컬럼에 'SEN0280(표지판 보다 찾다)' 처럼 부가 설명이 붙은 경우가 있어
    WORD/SEN 코드 부분만 뽑아낸다."""
    if not raw_code:
        return None

    match = CODE_PATTERN.search(raw_code)

    return match.group(1) if match else None


def _load_word_map() -> dict[str, str]:
    """ALL_WORD_ID_MAPPING.csv: word -> word_id (동일 단어가 여러 행에 있으면 먼저 나온 것을 사용)"""
    word_map: dict[str, str] = {}

    with open(WORD_CSV_PATH, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            word = (row.get("word") or "").strip()
            word_id = (row.get("word_id") or "").strip()

            if not word or not word_id:
                continue

            if word not in word_map:
                word_map[word] = word_id

    return word_map


def _load_sen_token_map() -> dict[str, str]:
    """sen_sentence_mapping.csv: sentence를 공백으로 나눈 토큰 -> sen_id
    (동일 토큰이 여러 문장에 있으면 먼저 나온 것을 사용)"""
    token_map: dict[str, str] = {}

    with open(SEN_CSV_PATH, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        for row in reader:
            sen_id = (row.get("sen_id") or "").strip()
            sentence = row.get("sentence") or ""

            if not sen_id or not sentence:
                continue

            for token in sentence.split():
                token = token.strip()

                if token and token not in token_map:
                    token_map[token] = sen_id

    return token_map


def _load_emotion_maps() -> tuple[
    dict[str, tuple[str, str]],
    dict[str, tuple[str, str]],
]:
    """감정단어_매핑결과_대체어포함.csv에서 두 개의 맵을 만든다.

    - found_map: gloss -> (발견단어, 코드)  ("발견단어"가 채워진 행만)
    - alt_map: gloss -> (대체어, 코드)    ("대체어"가 채워진 행만, 코드는 대체어 옆의 빈 이름 컬럼)

    같은 gloss가 여러 행에 걸쳐 있으면 먼저 나온 것을 사용한다.
    """
    found_map: dict[str, tuple[str, str]] = {}
    alt_map: dict[str, tuple[str, str]] = {}

    with open(EMOTION_CSV_PATH, encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        next(reader, None)  # header (빈 이름 컬럼 포함, 인덱스로 직접 접근)

        for row in reader:
            if len(row) < 7:
                row = row + [""] * (7 - len(row))

            (
                group_raw,
                _status,
                found_word,
                found_code,
                _blank1,
                alt_word,
                alt_code,
            ) = row[:7]

            group_words = [
                w.strip()
                for w in group_raw.split("/")
                if w.strip()
            ]

            found_word = found_word.strip()
            found_code = _extract_code(found_code.strip())

            alt_word = alt_word.strip()
            alt_code = _extract_code(alt_code.strip())

            for word in group_words:
                if found_word and found_code and word not in found_map:
                    found_map[word] = (found_word, found_code)

                if alt_word and alt_code and word not in alt_map:
                    alt_map[word] = (alt_word, alt_code)

    return found_map, alt_map


_WORD_MAP = _load_word_map()
_SEN_TOKEN_MAP = _load_sen_token_map()
_EMOTION_FOUND_MAP, _EMOTION_ALT_MAP = _load_emotion_maps()


def get_allowed_words() -> list[str]:
    """Gemini에 전달할 ALL_WORD_ID_MAPPING.csv의 사용 가능한 단어 목록."""
    return list(_WORD_MAP.keys())


def _match_single_gloss(gloss: str) -> dict:
    result = {
        "gloss": gloss,
        "matched": False,
        "matched_word": None,
        "source": None,
        "code": None,
    }

    # 1. ALL_WORD_ID_MAPPING.csv 직접 일치
    word_id = _WORD_MAP.get(gloss)
    if word_id:
        result.update(
            matched=True,
            matched_word=gloss,
            source="WORD",
            code=word_id,
        )
        return result

    # 2. sen_sentence_mapping.csv 토큰 일치
    sen_id = _SEN_TOKEN_MAP.get(gloss)
    if sen_id:
        result.update(
            matched=True,
            matched_word=gloss,
            source="SEN",
            code=sen_id,
        )
        return result

    # 3. 감정단어 매핑 - 발견단어
    found = _EMOTION_FOUND_MAP.get(gloss)
    if found:
        found_word, code = found

        result.update(
            matched=True,
            matched_word=found_word,
            source="SYNONYM_FOUND",
            code=code,
        )

        return result

    # 4. 감정단어 매핑 - 대체어
    alt = _EMOTION_ALT_MAP.get(gloss)
    if alt:
        alt_word, code = alt

        result.update(
            matched=True,
            matched_word=alt_word,
            source="SYNONYM_ALTERNATIVE",
            code=code,
        )

        return result

    # 5. 매칭 실패
    return result


def match_gloss_sequence(gloss_list: list[str]) -> list[dict]:
    return [
        _match_single_gloss(gloss)
        for gloss in gloss_list
    ]


def build_display_sequence(gloss_list: list[str]) -> list[dict]:
    """Frontend에 전달할 화면 표시 순서를 만든다.

    매칭 성공한 gloss는 아바타 클립으로,
    매칭 실패한 gloss는 원본 텍스트를 그대로 보여주는 자막으로 변환한다.
    """
    matches = match_gloss_sequence(gloss_list)

    sequence: list[dict] = []

    for match in matches:
        if match["matched"]:
            sequence.append({
                "type": "avatar",
                "gloss": match["gloss"],
                "code": match["code"],
                "source": match["source"],
            })

        else:
            sequence.append({
                "type": "caption",
                "text": match["gloss"],
            })

    return sequence


if __name__ == "__main__":
    import json

    sample = match_gloss_sequence(
        ["오늘", "슬프다", "미안", "기쁨"]
    )

    print(
        json.dumps(
            sample,
            ensure_ascii=False,
            indent=2,
        )
    )

    display_sample = build_display_sequence(
        ["오늘", "슬프다", "미안", "기쁨"]
    )

    print(
        json.dumps(
            display_sample,
            ensure_ascii=False,
            indent=2,
        )
    )
