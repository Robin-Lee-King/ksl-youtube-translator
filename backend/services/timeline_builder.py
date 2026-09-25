from typing import Callable

from services.gloss_matcher import build_display_sequence


# ============================================================
# Playback speed settings
# ============================================================

# 일반 WORD를 포함한 문장 전체 기본 최대 배속
MAX_SPEEDUP = 2.5

# 자모는 문장 기본 배속보다 추가로 빠르게 재생
JAMO_SPEED_MULTIPLIER = 1.25

# 자모의 최종 실제 최대 배속
MAX_JAMO_SPEED = 3.0


# ============================================================
# Jamo detection
# ============================================================

def _is_jamo_code(code: str) -> bool:
    """
    자모 영상인지 WORD ID 기준으로 판별한다.

    자음:
        WORD3001 ~ WORD3019

    모음:
        WORD4000 ~ WORD4020
    """

    if not isinstance(code, str):
        return False

    if not code.startswith("WORD"):
        return False

    try:
        number = int(code[4:])
    except ValueError:
        return False

    return (
        3001 <= number <= 3019
        or 4000 <= number <= 4020
    )


# ============================================================
# Item playback speed
# ============================================================

def _get_item_playback_speed(
    code: str,
    sentence_speed: float,
) -> float:
    """
    일반 WORD:
        sentence_speed 그대로 사용

    자모:
        sentence_speed * JAMO_SPEED_MULTIPLIER
        단, MAX_JAMO_SPEED를 넘지 않음
    """

    if _is_jamo_code(code):
        return min(
            sentence_speed * JAMO_SPEED_MULTIPLIER,
            MAX_JAMO_SPEED,
        )

    return sentence_speed


# ============================================================
# Duration calculation
# ============================================================

def _rendered_avatar_duration(
    items: list[dict],
    get_duration: Callable[[str], float],
    sentence_speed: float,
) -> float:
    """
    현재 sentence_speed에서 실제로 필요한 수어 영상 시간을 계산한다.

    일반 WORD:
        duration / sentence_speed

    자모:
        duration / 자모 실제 배속
    """

    total = 0.0

    for item in items:

        if item["type"] != "avatar":
            continue

        code = item["code"]

        original_duration = get_duration(code)

        playback_speed = _get_item_playback_speed(
            code,
            sentence_speed,
        )

        total += (
            original_duration
            / playback_speed
        )

    return total


def _total_avatar_duration(
    items: list[dict],
    get_duration: Callable[[str], float],
) -> float:
    """
    배속 적용 전 원본 avatar clip 총 길이.
    디버깅/정보용.
    """

    return sum(
        get_duration(item["code"])
        for item in items
        if item["type"] == "avatar"
    )


# ============================================================
# Required sentence speed
# ============================================================

def _find_required_sentence_speed(
    items: list[dict],
    get_duration: Callable[[str], float],
    available_duration: float,
) -> float:
    """
    자모의 추가 배속까지 고려해서
    문장 시간 안에 들어가기 위한 최소 sentence_speed를 계산한다.

    자모에는 별도 multiplier와 cap이 있으므로 단순히

        total_duration / available_duration

    만으로는 정확하지 않다.

    따라서 binary search로 필요한 기본 문장 배속을 계산한다.
    """

    if available_duration <= 0.0:
        return MAX_SPEEDUP

    # 1배에서도 이미 들어가면 가속 불필요
    duration_at_1x = _rendered_avatar_duration(
        items,
        get_duration,
        1.0,
    )

    if duration_at_1x <= available_duration:
        return 1.0

    # 최대 문장 배속을 써도 안 들어가는 경우
    duration_at_max = _rendered_avatar_duration(
        items,
        get_duration,
        MAX_SPEEDUP,
    )

    if duration_at_max > available_duration:
        return MAX_SPEEDUP

    # 1.0 ~ MAX_SPEEDUP 사이에서
    # 필요한 최소 기본 배속 탐색
    low = 1.0
    high = MAX_SPEEDUP

    for _ in range(40):

        mid = (
            low + high
        ) / 2.0

        rendered_duration = _rendered_avatar_duration(
            items,
            get_duration,
            mid,
        )

        if rendered_duration > available_duration:
            low = mid
        else:
            high = mid

    return high


# ============================================================
# Add playback speed information to each item
# ============================================================

def _attach_item_playback_speeds(
    items: list[dict],
    sentence_speed: float,
) -> list[dict]:
    """
    각 avatar item에 실제 재생해야 할 playback_speed를 기록한다.

    video_merger.py가 이후 이 값을 사용해야 한다.
    """

    output: list[dict] = []

    for item in items:

        copied = dict(item)

        if copied["type"] == "avatar":

            code = copied["code"]

            is_jamo = _is_jamo_code(code)

            playback_speed = _get_item_playback_speed(
                code,
                sentence_speed,
            )

            copied["is_jamo"] = is_jamo
            copied["playback_speed"] = playback_speed

        output.append(copied)

    return output


# ============================================================
# Timeline builder
# ============================================================

def build_timeline(
    stt_segments: list[dict],
    get_duration: Callable[[str], float],
) -> list[dict]:
    """
    문장(segment)의 절대 start/end를 기준으로
    최종 수어 타임라인을 계산한다.

    핵심 정책

    1. 이전 문장이 제시간에 끝났거나 원본에 공백이 있으면
       현재 문장은 원래 start에 시작한다.

    2. 이전 문장 overflow 때문에 늦게 시작하면,
       남은 시간 안에 들어가도록 필요한 배속을 다시 계산한다.

    3. 일반 WORD의 기본 문장 배속은 최대 MAX_SPEEDUP(2.5x)이다.

    4. 자모 WORD는 기본 문장 배속에
       JAMO_SPEED_MULTIPLIER(1.25x)를 추가 적용한다.

    5. 자모의 실제 최종 배속은
       MAX_JAMO_SPEED(3.0x)를 넘지 않는다.

    6. 수어가 일찍 끝나면 idle로 원래 문장 end까지 채운다.

    7. 최대 배속으로도 문장 안에 들어가지 못하면
       실제 초과 시간만 다음 문장으로 전달한다.

    예:

        sentence_speed = 2.0x

        일반 WORD:
            2.0x

        자모:
            2.0 * 1.25
            = 2.5x

        sentence_speed = 2.5x

        일반 WORD:
            2.5x

        자모:
            2.5 * 1.25
            = 3.125x

            하지만 MAX_JAMO_SPEED = 3.0이므로
            실제 자모 재생속도 = 3.0x
    """

    items_per_segment = [
        (
            seg["display_sequence"]
            if "display_sequence" in seg
            else build_display_sequence(
                seg["gloss_sequence"]
            )
        )
        for seg in stt_segments
    ]

    timeline: list[dict] = []

    cursor = 0.0

    for segment, original_items in zip(
        stt_segments,
        items_per_segment,
    ):

        stt_start = float(
            segment["start"]
        )

        stt_end = float(
            segment["end"]
        )

        if stt_end < stt_start:
            stt_end = stt_start

        # ----------------------------------------------------
        # 실제 시작 시점
        # ----------------------------------------------------

        actual_start = max(
            cursor,
            stt_start,
        )

        available_duration = max(
            0.0,
            stt_end - actual_start,
        )

        # ----------------------------------------------------
        # 원본 수어 총 길이
        # ----------------------------------------------------

        total_sign_duration = _total_avatar_duration(
            original_items,
            get_duration,
        )

        # ----------------------------------------------------
        # 문장 기본 배속 계산
        # ----------------------------------------------------

        if total_sign_duration <= 0.0:

            sentence_speed = 1.0
            rendered_sign_duration = 0.0

        else:

            sentence_speed = _find_required_sentence_speed(
                original_items,
                get_duration,
                available_duration,
            )

            rendered_sign_duration = _rendered_avatar_duration(
                original_items,
                get_duration,
                sentence_speed,
            )

        # ----------------------------------------------------
        # 각 item에 실제 playback_speed 기록
        # ----------------------------------------------------

        items = _attach_item_playback_speeds(
            original_items,
            sentence_speed,
        )

        # ----------------------------------------------------
        # 실제 수어 종료 시점
        # ----------------------------------------------------

        sign_end = (
            actual_start
            + rendered_sign_duration
        )

        # ----------------------------------------------------
        # 남는 시간은 idle
        # ----------------------------------------------------

        if sign_end < stt_end:

            idle_duration = (
                stt_end
                - sign_end
            )

            actual_end = stt_end

        else:

            idle_duration = 0.0
            actual_end = sign_end

        # ----------------------------------------------------
        # 문장 end를 초과한 시간
        # ----------------------------------------------------

        overflow_seconds = max(
            0.0,
            actual_end - stt_end,
        )

        # ----------------------------------------------------
        # Debug statistics
        # ----------------------------------------------------

        jamo_count = sum(
            1
            for item in items
            if (
                item["type"] == "avatar"
                and item.get("is_jamo", False)
            )
        )

        avatar_count = sum(
            1
            for item in items
            if item["type"] == "avatar"
        )

        # ----------------------------------------------------
        # Timeline output
        # ----------------------------------------------------

        timeline.append(
            {
                "stt_start": stt_start,
                "stt_end": stt_end,

                "actual_start": actual_start,
                "actual_end": actual_end,

                # 기존 video_merger 호환을 위해
                # speed 필드는 문장 기본 배속으로 유지
                "speed": sentence_speed,

                "rendered_sign_duration": (
                    rendered_sign_duration
                ),

                "idle_duration": idle_duration,

                "overflow_seconds": (
                    overflow_seconds
                ),

                "avatar_count": avatar_count,
                "jamo_count": jamo_count,

                "items": items,
            }
        )

        cursor = actual_end

    return timeline


# ============================================================
# Simple local test
# ============================================================

if __name__ == "__main__":

    import json

    dummy_durations = {
        "WORD1000": 2.0,
        "WORD3001": 1.0,
        "WORD4008": 1.0,
        "WORD3012": 1.0,
        "WORD4018": 1.0,
        "WORD3004": 1.0,
    }

    def dummy_get_duration(code):
        return dummy_durations.get(
            code,
            1.0,
        )

    def avatar(code):
        return {
            "type": "avatar",
            "code": code,
        }

    sample = [
        {
            "start": 0.0,
            "end": 4.0,
            "display_sequence": [
                # 일반 WORD
                avatar("WORD1000"),

                # 자모 예시
                avatar("WORD3001"),
                avatar("WORD4008"),
                avatar("WORD3012"),
                avatar("WORD4018"),
                avatar("WORD3004"),
            ],
        }
    ]

    print(
        json.dumps(
            build_timeline(
                sample,
                dummy_get_duration,
            ),
            ensure_ascii=False,
            indent=2,
        )
    )
