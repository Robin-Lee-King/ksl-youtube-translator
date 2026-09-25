# 이번 발표 시안 영상 전용 임시 데이터: LLM(Gemini) 호출 없이
# 미리 확인된 word_id 시퀀스로 바로 대체한다.
DEMO_GLOSS_OVERRIDE: dict[str, list[str]] = {
    "첫 번째 별은 사랑 너와 나는 둘이면서 하나":
        ["WORD0058", "WORD2551", "WORD1157", "WORD1351", "WORD0500"],
    "두 번째 별의 소원은 거기 있는 너는 너 여기 있는 나는 나":
        ["WORD0179", "WORD2551", "WORD1351", "WORD0949", "WORD1157",
         "WORD1130", "WORD1351", "WORD1149"],
    "세 번째 별을 생각해 너는 과연 무얼까 그리고 난 무얼까":
        ["WORD0313", "WORD2551", "WORD1157", "WORD1144", "WORD1351",
         "WORD1157", "WORD1584", "WORD1193"],
}


def build_display_sequence_from_codes(word_ids: list[str]) -> list[dict]:
    return [
        {"type": "avatar", "gloss": word_id, "code": word_id, "source": "MANUAL_DEMO"}
        for word_id in word_ids
    ]
