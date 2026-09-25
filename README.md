# KSL-Tube 인수인계 및 실행 가이드

YouTube 자막을 한국수어(KSL) Gloss로 변환하고 아바타 클립을 합성하는 서비스입니다. 이 문서는 `jaeyeong/frontend-backend-convert` 브랜치의 실제 구현을 기준으로 합니다.

## 1. 현재 구현 상태

- **Frontend ↔ Backend 연동 완료**: React/Vite에서 FastAPI의 인증, 온보딩, 번역 Job 생성·조회, 결과 영상 재생, History API를 호출합니다. 전체 외부 서비스 E2E 재검증은 남아 있습니다.
- **공용 DB는 Supabase PostgreSQL**이며 SQLAlchemy로 접근하고 **Alembic으로 schema를 관리**합니다. SQLite는 격리 테스트용입니다.
- Gemini는 YouTube 자막의 **문맥·맞춤법·ASR 오인식 보정**에 사용합니다. 영상 제목·설명과 전체 자막을 함께 전달하고 원문·시간 구간을 유지하며 `corrected_text`를 저장합니다. 교정 호출 실패 시 원문으로 진행합니다.
- **현재 Gloss 변환도 Gemini 기반**입니다. `GeminiKSLConverter`가 교정 문장을 변환합니다. 일부 데모 문장은 `demo_gloss_override.py`의 고정 코드로 대체되며 Gloss 프롬프트에는 임시 구현 TODO가 남아 있습니다.
- `jihyun/local-llm-semantic-integration`의 **Ollama/Qwen Local LLM은 이 브랜치에 아직 통합되지 않았습니다.** 환경변수만 설정해도 변환기가 바뀌지 않습니다.

현재 일반 변환 흐름:

```text
YouTube 자막 → Gemini 자막 교정 → Gemini Gloss → WORD 등 코드 매핑
→ S3 WORD 클립 다운로드 → 타임라인 구성 → FFmpeg → 결과 영상
```

향후 Local LLM 통합 예상 구조:

```text
Gemini 자막 교정 → Ollama/Qwen Gloss → WORD → S3 → FFmpeg
```

## 2. 준비 사항

| 시스템 의존성 | 용도 / 기준 |
| --- | --- |
| Python 3.10 | 백엔드 및 Alembic 실행, 가상환경 사용 |
| Node.js / npm | 프런트엔드 설치·실행. 현재 설치된 Vite 8의 engines 기준 Node.js `^20.19.0` 또는 `>=22.12.0` |
| Git | 브랜치 clone 및 협업 |
| FFmpeg / ffprobe | 길이 측정·합성. 둘 다 PATH 등록, `libx264` 사용 가능 빌드 필요 |
| AWS CLI | 로컬 S3 인증·접근 확인용. 백엔드 다운로드는 boto3 사용 |
| PostgreSQL libpq 또는 psycopg binary extra | PostgreSQL 드라이버 로딩에 필요. 아래 설치 안내 참고 |
| Ollama (향후) | Local LLM 통합 후 Qwen 실행용. 현재 실행에는 불필요 |

팀의 보안 채널로 Supabase 연결 정보, Gemini API key, AWS 접근 권한을 전달받습니다. 실제 비밀번호와 키는 문서·Git·프런트엔드 환경변수에 넣지 않습니다.

## 3. Clone 및 Python 설치

```bash
git clone --branch jaeyeong/frontend-backend-convert https://github.com/ssica16/ksl-tube.git
cd ksl-tube
```

Windows PowerShell:

```powershell
py -3.10 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
Copy-Item frontend/.env.example frontend/.env.local
```

macOS / Linux:

```bash
python3.10 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
cp frontend/.env.example frontend/.env.local
```

기존 환경 파일이 있다면 덮어쓰지 말고 예제와 비교하여 필요한 항목만 추가합니다.

Windows PowerShell 실행 정책으로 `Activate.ps1`이 차단되면 명령 프롬프트(cmd)에서 `.venv\Scripts\activate.bat`로 활성화한 뒤 진행할 수 있습니다. `npm.ps1`이 차단되면 `npm` 대신 `npm.cmd`를 사용합니다(예: `npm.cmd install`, `npm.cmd run dev`, `npm.cmd run build`).

`requirements.txt`에는 FastAPI, Uvicorn, SQLAlchemy, Alembic, psycopg, boto3, google-genai, YouTube 자막 추출, JWT/비밀번호 처리에 필요한 Python 의존성이 포함되어 있습니다. FFmpeg나 AWS CLI는 별도 설치합니다. 현재 `psycopg`는 binary extra를 지정하지 않으므로 libpq가 없는 환경에서 `no pq wrapper available` 오류가 발생하면 다음을 실행합니다.

```bash
python -m pip install "psycopg[binary]==3.3.5"
```

## 4. 환경변수 설정

루트 `.env`는 `backend/database.py`에서 로드합니다. 예제의 자리표시자를 실제 로컬 설정으로 바꿉니다.

| 변수 | 설정 |
| --- | --- |
| `DATABASE_URL` | Supabase PostgreSQL URL. 드라이버 `postgresql+psycopg`, SSL `sslmode=require` |
| `JWT_SECRET` | 충분히 긴 무작위 문자열. 예제는 비워 두었으며 미설정 시 서버 시작 불가 |
| `GEMINI_API_KEY` | 자막 교정과 현재 Gloss 변환에 사용 |
| `S3_CLIP_BUCKET` | `ksl-tube-avatar-clips` |
| `AWS_PROFILE`, `AWS_DEFAULT_REGION` | 필요한 경우 사용할 AWS 프로필과 실제 버킷 리전 설정 |

JWT secret은 `python -c "import secrets; print(secrets.token_urlsafe(48))"`로 로컬에서 생성하여 `.env`에만 저장할 수 있습니다. 출력값을 커밋하거나 공유 로그에 남기지 않습니다.

`frontend/.env.local`에는 공개 가능한 API 주소만 설정합니다.

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

끝에 `/`를 붙이지 않습니다. `VITE_` 변수는 브라우저 번들에 노출되므로 DB 비밀번호·AWS/Gemini key·JWT secret을 넣으면 안 됩니다. 변경 후 Vite를 재시작합니다. 현재 Vite에는 API 프록시가 없으므로 로컬에서는 주소를 비워 두지 않습니다.

Local LLM 환경변수는 루트 예제에 주석 처리된 **향후 통합 예정** 항목만 있습니다. 이름·모델 태그는 통합 시 확정해야 하며 현재 코드는 읽지 않습니다.

## 5. Supabase 최초 연결 및 schema 적용

Supabase 프로젝트의 연결 정보에서 실제 사용자명·호스트·포트를 확인합니다. 예제는 session pooler 형태의 자리표시자이며 프로젝트별 주소를 대입해야 합니다. 비밀번호의 `@`, `:`, `/`, `#` 등 특수문자는 비밀번호 부분을 URL 인코딩합니다. Supabase API URL이나 anon key를 `DATABASE_URL`에 넣지 않습니다.

가상환경을 활성화한 **저장소 루트**에서 연결을 먼저 확인합니다. 성공하면 `1`을 출력하며 연결 URL은 출력하지 않습니다.

```bash
python -c "from backend.database import engine; from sqlalchemy import text; c = engine.connect(); print(c.execute(text('SELECT 1')).scalar_one()); c.close()"
alembic current
alembic heads
alembic upgrade head
alembic current
```

`alembic current`가 최종 head와 일치하는지 확인합니다. 공용 DB의 schema 변경은 팀 전체에 반영되므로 대상 프로젝트와 팀의 적용 상태를 확인하고 실행합니다. 이미 head이면 추가 migration이 적용되지 않습니다. 서버를 켜는 것만으로 테이블이 생성되지는 않습니다.

| 주요 테이블 | 역할 |
| --- | --- |
| `users` | 계정, 온보딩 및 사용자 설정 |
| `videos` | YouTube 원본 영상 정보 |
| `translation_jobs` | 사용자별 작업, 상태, 결과 및 그룹 연결 |
| `transcript_segments` | Job별 원문·교정 자막과 시간 구간 |
| `groups` | 사용자별 History 그룹 |
| `alembic_version` | 적용된 migration revision |

schema 변경 시 모델 변경과 migration을 함께 커밋합니다. 루트에서 `alembic revision --autogenerate -m "describe schema change"`로 생성한 내용을 검토한 뒤 적용합니다. 테이블 충돌이나 revision 불일치는 적용 이력을 먼저 확인하고, 임의로 공용 테이블을 삭제하거나 `stamp head`로 건너뛰지 않습니다.

## 6. AWS S3 및 클립 준비

- 버킷: **`ksl-tube-avatar-clips`**
- WORD object key: **`clips/word/WORDxxxx.mp4`** (예: `clips/word/WORD0001.mp4`). CSV 코드의 대소문자·숫자를 그대로 사용합니다.
- boto3 기본 AWS 인증 체인을 사용합니다. 로컬은 팀에서 지정한 CLI 프로필/SSO 또는 로컬 자격 증명을 설정하고, 서버에서는 IAM Role을 사용할 수 있습니다.

팀의 인증 방식에 따라 `aws configure --profile ksl-tube` 또는 SSO 프로필 설정·로그인을 마친 뒤 확인합니다. 아래는 `ksl-tube`라는 로컬 프로필을 만든 경우의 예시입니다.

```bash
aws sts get-caller-identity --profile ksl-tube
aws s3api head-object --bucket ksl-tube-avatar-clips --key clips/word/WORD0001.mp4 --profile ksl-tube
```

두 번째 명령의 코드는 실제 존재하는 코드로 바꿉니다. 계정에는 해당 object를 읽는 `s3:GetObject` 권한이 필요합니다. CLI에서 확인한 프로필을 루트 `.env`의 `AWS_PROFILE`에도 설정합니다. AWS CLI 자체는 루트 `.env`를 자동으로 읽지 않습니다.

`clip_resolver.py`가 중복 WORD 코드를 Job 안에서 한 번씩 **Job별 temporary directory**(`ksl_job_` 접두사)에 다운로드합니다. ffprobe와 FFmpeg는 로컬 파일을 사용하며 작업 종료 시 성공·예외 경로에서 임시 디렉터리를 정리합니다. 프로세스 강제 종료 시까지 정리를 보장하지는 않습니다.

완성 영상은 `backend/static/results/{job_id}.mp4`에 남고 `/static/results/{job_id}.mp4`로 제공됩니다. 현재 결과 영상을 S3로 업로드하지 않습니다. S3 인증 오류나 없는 클립은 경고 후 누락 클립 처리로 넘어가므로 `COMPLETED`만으로 클립이 정상이라고 판단하지 말고 영상도 확인합니다.

SEN 클립은 S3 경로 규칙이 아직 없어 `backend/static/videos/SENxxxx.mp4`를 확인합니다. 필요한 SEN 영상은 별도 전달받아야 합니다. 매핑용 `data/ALL_WORD_ID_MAPPING.csv`, `data/sen_sentence_mapping.csv`, `data/감정단어_매핑결과_대체어포함.csv`는 저장소에 포함되어 있습니다. 원본 데이터셋·모델 가중치·클립 영상은 Git에 추가하지 않습니다.

## 7. Backend / Frontend 실행

터미널 1: 루트에서 Python 가상환경을 활성화한 뒤 실행합니다. static 경로 때문에 **backend 디렉터리에서** 시작합니다.

```bash
cd backend
uvicorn main:app --reload
```

- Backend: `http://127.0.0.1:8000`
- API 문서: `http://127.0.0.1:8000/docs`
- 루트 응답: `{"message":"KSL-Tube backend is running"}`. DB·S3 연결까지 검증하는 health check는 아닙니다.

터미널 2: 저장소 루트에서 실행합니다.

```bash
cd frontend
npm install
npm run dev
```

Frontend 기본 주소는 **`http://localhost:8443`**입니다. `vite.config.ts`의 기본 포트는 8443이며 `PORT` 환경변수가 있으면 그 값을 사용합니다. 포트가 사용 중이면 자동 전환하지 않고 종료합니다.

## 8. History CRUD 및 Job 상태

History는 로그인한 사용자 소유 Job을 대상으로 합니다. 별도 History 생성 API 대신 Job 생성 시 사용자와 연결합니다. 토큰이 없거나 유효하지 않은 상태로 생성한 Job은 익명 작업이어서 개인 History에 표시되지 않습니다.

| 동작 | 현재 API / 동작 |
| --- | --- |
| 생성 (Create) | `POST /translate/jobs` — 로그인 토큰이 있으면 사용자 History에 연결 |
| 조회 (Read) | `GET /history` — 자신의 목록; `GET /translate/jobs/{job_id}` — Job 상태·결과 |
| 수정 (Update) | `PATCH /history/{job_id}/group` — `group_id` 지정 또는 `null`로 해제 |
| 삭제 (Delete) | `DELETE /history/{job_id}` — 자신의 Job 및 종속 자막 삭제 |
| 그룹 관리 | `GET /history/groups`, `POST /history/groups`, `DELETE /history/groups/{group_id}` |

그룹 삭제는 기록의 그룹 연결만 해제하고 기록은 유지합니다. 기록 삭제는 원본 `videos` 행과 결과 MP4 파일까지 삭제하지 않습니다. 현재 그룹 이름 수정 API와 기록 제목 수정 API는 없습니다.

주요 Job status:

```text
QUEUED → TRANSCRIPTING → KSL_CONVERTING → SIGN_MAPPING → TIMELINE_BUILDING → COMPLETED
실패 시 FAILED (failed_stage, error_code, error_message 확인)
```

Job은 FastAPI `BackgroundTasks`로 처리하며 별도 영속 작업 큐는 없습니다. 처리 중 서버 reload/종료 시 자동 복구가 보장되지 않습니다.

## 9. 검증 및 문제 해결

최초 실행 후 회원가입 → 로그인 → 온보딩 → 한국어 자막이 있는 YouTube URL 변환 → 상태 변화 → 결과 영상·자막 재생 → History 조회 → 그룹 생성·이동·해제 → 기록·그룹 삭제를 확인합니다. 새로고침 후에도 DB 기록이 유지되는지 확인합니다.

자동 테스트는 **저장소 루트**에서 실행합니다. 아래 명령은 테스트 프로세스에 SQLite와 테스트 전용 JWT 값을 설정해 공용 DB 사용을 피합니다. 외부 호출은 기존 테스트에서 모킹합니다.

```bash
python -c "import os, unittest; os.environ['DATABASE_URL']='sqlite://'; os.environ['JWT_SECRET']='unit-test-only-not-a-real-secret'; suite=unittest.defaultTestLoader.discover('tests'); result=unittest.TextTestRunner(verbosity=2).run(suite); raise SystemExit(not result.wasSuccessful())"
```

기존 테스트는 S3 클립 다운로드·격리·정리, History 삭제 및 FK migration, Gemini 자막 교정과 관련 endpoint를 확인합니다. `httpx`는 `google-genai`의 의존성으로 설치됩니다. 테스트 통과가 실제 Supabase·YouTube·Gemini·S3·FFmpeg 전체 E2E 성공을 의미하지는 않습니다.

프런트엔드 빌드 및 변경 검사:

```bash
cd frontend
npm run build
cd ..
git diff --check
git status --short
```

| 증상 | 확인할 내용 |
| --- | --- |
| `DATABASE_URL` / `JWT_SECRET` 미설정 | 루트 `.env` 위치·빈 값 여부, 기존 셸 환경변수의 우선 적용 여부 |
| Supabase 접속 실패 | host/port/user, 비밀번호 URL 인코딩, SSL, 네트워크 |
| 테이블·컬럼 없음 | 루트에서 `alembic current`와 `alembic heads` 비교 및 migration 적용 |
| API 요청 실패 | Backend 실행, `VITE_API_BASE_URL`, 프런트엔드 재시작 |
| `ffmpeg` / `ffprobe` 없음 | PATH 설정 후 터미널 재시작, 각각 `-version` 실행 |
| 아바타 누락 | S3 object key·권한·AWS 프로필, clip 경고, SEN 로컬 파일 |
| `FAILED` | Job 실패 단계·코드 확인. 자막 없는 영상, Gemini 인증·호출 제한, FFmpeg 오류 구분 |

## 10. 남은 작업 및 협업

- **Local LLM 통합**: `jihyun/local-llm-semantic-integration`을 검토하고 `KSLConverter.convert(text) -> list[str]` 계약과 `KSLConversionError`에 맞춰 Ollama/Qwen을 연결합니다. Gemini 자막 교정은 유지하고 Gloss 변환기를 교체합니다.
- **전체 E2E 재검증**: 실제 공용 DB와 외부 API/S3/FFmpeg를 사용하는 변환, 인증, History CRUD 및 실패 경로를 재검증합니다.
- **배포환경 성능 측정**: 자막 교정·Gloss·S3·FFmpeg 단계별 시간, 동시 Job의 CPU/메모리·임시 디스크 사용량을 측정합니다. 결과 파일 보관, 작업 큐/재시작 복구, CORS origin 제한도 배포 구성에서 검토합니다.

이 브랜치 작업을 이어갈 때는 `git pull --ff-only origin jaeyeong/frontend-backend-convert`로 동기화합니다. `.env`, `frontend/.env.local` 및 실제 secret이 들어간 파일은 절대 커밋하지 않습니다. 공유 설정은 예제 파일만 수정하고 코드/schema 변경은 관련 migration과 함께 PR로 검토합니다.
