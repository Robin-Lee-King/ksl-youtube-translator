# Gloss 매칭 파이프라인 (jaeyeong/gloss-matcher)

## 1. 요약

이 브랜치는 유튜브 자막을 받아 Gemini로 KSL Gloss로 변환하고, Gloss를 아바타 영상 코드에 매칭한 뒤 타임라인을 계산해서 최종 수어 영상 파일로 병합하는 Backend 파이프라인을 구현했다. `POST /translate/jobs` ~ `GET /translate/jobs/{job_id}` 비동기 job으로 동작한다.

## 2. 전체 흐름

```
YouTube 자막(youtube_service)
  -> LLM Gloss 변환(llm_gloss_service, Gemini)
  -> Gloss 매칭(gloss_matcher: word/sen/감정단어 CSV -> code)
  -> 타임라인 계산(timeline_builder: segment별 재생시간 정책)
  -> 영상 병합(video_merger: ffmpeg concat)
  -> 결과 URL(JobResult.video_url)
```

`routers/job.py`의 `process_job`이 이 전체 흐름을 순서대로 실행하며, job 상태를 `TRANSCRIPTING -> KSL_CONVERTING -> SIGN_MAPPING -> TIMELINE_BUILDING -> COMPLETED`로 갱신한다.

## 3. 모듈별 역할

| 파일 | 역할 |
|---|---|
| `services/gloss_matcher.py` | Gloss 단어를 `ALL_WORD_ID_MAPPING.csv` / `sen_sentence_mapping.csv` / 감정단어 CSV 순서로 조회해 아바타 클립 코드(WORD/SEN)로 매칭하고, 매칭 실패 시 원문을 자막(caption)으로 대체한 표시 시퀀스를 만든다. |
| `services/timeline_builder.py` | segment별 목표 재생시간과 실제 수어 클립 총 길이를 비교해 그대로 재생(case1, 남는 시간은 idle)/배속 조절(case2, 1.2배 이내)/초과(case3, 다음 segment의 idle을 빌려쓰고 남으면 overflow)를 계산한다. |
| `services/clip_resolver.py` | gloss 코드(WORD/SEN)를 `static/videos/{code}.mp4` 실제 파일 경로로 변환한다. 파일이 없으면 `None`을 반환한다. |
| `services/video_merger.py` | 계산된 타임라인을 받아 ffmpeg로 클립 정규화(1920x1080/30fps)·배속 조절·검은 화면(gap/idle/누락 클립) 삽입·concat까지 수행해 최종 mp4를 만든다. |
| `services/llm_gloss_service.py` | Gemini API(`gemini-flash-lite-latest`)를 호출해 한국어 문장을 KSL Gloss 문자열 배열로 변환한다. 프롬프트는 아직 더미이며 팀원이 규칙 확정 후 교체 예정. |
| `services/demo_gloss_override.py` | **시연 전용 임시 파일.** 특정 발표 영상의 3개 자막 문장을 LLM 호출 없이 미리 확인된 word_id 시퀀스로 바로 치환한다. |

## 4. 필요 환경

- **FFmpeg** 설치 및 PATH 등록 필요 (`video_merger.py`가 `ffmpeg`/`ffprobe`를 subprocess로 직접 호출).
- **`GEMINI_API_KEY`** 환경변수 필요 (`.env`, `.env.example` 참고). `llm_gloss_service.py`가 `python-dotenv`로 로드해 `google-genai` 클라이언트에 사용.
- **`backend/static/videos/`** 에 `{code}.mp4` (예: `WORD0058.mp4`, `SEN0253.mp4`) 형식의 실제 클립 파일 필요. 없는 코드는 검은 화면으로 대체된다.

## 5. 테스트 방법

1. `POST /translate/jobs` 에 `{"url": "<유튜브 URL>"}` 전송 → `job_id` 반환 (202).
2. `GET /translate/jobs/{job_id}` 로 상태 polling (`QUEUED` → ... → `COMPLETED`/`FAILED`).
3. `COMPLETED`이면 `result.video_url` (`/static/results/presentation_demo.mp4`)로 결과 영상 확인.

## 6. 알려진 한계

- `demo_gloss_override.py`는 특정 시연 영상(자막 3문장) 전용이며, 그 외 모든 문장은 실제 LLM(Gemini) 경로만 사용된다.
- idle 구간은 아직 검은 화면으로 채워진다 (기본 포즈 사진 준비되면 교체 예정).
- 결과 파일명이 `presentation_demo.mp4`로 고정되어 있어 동시에 여러 job이 돌면 서로 덮어쓴다 (`routers/job.py`의 `DEMO_OUTPUT_FILENAME`). job_id 기반 파일명으로 개선 필요.

## 7. 다른 팀원이 이 파이프라인을 재현하는 방법

### 영상 파일은 git으로 전달되지 않음

`backend/static/videos/`의 실제 mp4 클립과 병합 결과물은 `.gitignore`(`*.mp4`)에 의해 git에 포함되지 않는다. 코드(`gloss_matcher.py` 등)와 CSV(`ALL_WORD_ID_MAPPING.csv` 등)는 git pull로 받아지지만, 영상 파일 자체는 별도로 전달받아야 한다.

### 재현 순서

1. 이 브랜치(`jaeyeong/gloss-matcher`)를 git pull
2. 영상 파일을 담당자에게 별도로 전달받기 (압축 파일 등)
3. 전달받은 mp4 파일들을 `backend/static/videos/` 경로에 그대로 배치
4. FFmpeg 설치 및 PATH 등록 확인 (`ffmpeg -version`으로 확인)
5. 프로젝트 루트에 `.env` 파일 생성, `GEMINI_API_KEY` 값 채우기 (`.env`는 git에 포함되지 않아 각자 만들어야 함)
6. 서버 실행: `cd backend && uvicorn main:app --reload`
7. `POST /translate/jobs`로 테스트 URL 전송, `GET /translate/jobs/{job_id}`로 `COMPLETED`까지 확인
8. `scripts/sync_test.html`은 git으로 전달되므로 pull만 받으면 그대로 사용 가능 (Live Server 등으로 열어서 결과 확인)
