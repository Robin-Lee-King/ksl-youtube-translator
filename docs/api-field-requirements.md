# API 필드 요구사항 (프론트 → 백엔드)

DB 스키마 설계 시 반영 요청드립니다. 화면 기준으로 정리했습니다.

---

## 1. 회원가입 / 로그인 — `authApi`

**회원가입 시 필요 필드**

| 필드명 | 타입 | 비고 |
|---|---|---|
| name | string | 이름 |
| username | string | 아이디, unique |
| email | string | 이메일, unique |
| password_hash | string | 비밀번호는 해시로 저장 |
| created_at | datetime | 가입일시 |

**로그인 응답 필드**

| 필드명 | 타입 | 비고 |
|---|---|---|
| session_token (or JWT) | string | 세션/토큰 — 저장 방식(쿠키 vs 헤더) 먼저 합의 필요 |
| expires_at | datetime | 만료시간 |
| user_id | string | |

---

## 2. 변환 기록(History) — `historyApi`

| 필드명 | 타입 | 비고 |
|---|---|---|
| job_id | string | PK |
| thumbnail_url | string | 썸네일 |
| title | string | 제목 |
| processed_at | datetime | 처리일시 |
| status | enum | `완료` / `실패` |
| group_id | string \| null | **그룹 관리 기능 때문에 꼭 필요** — null이면 미분류 |
| duration | number | 재생시간(초) |

그룹 자체도 별도 테이블이 필요합니다: `group_id`, `group_name`, `user_id`, `created_at`

---

## 3. 마이페이지 — `userApi`

| 필드명 | 타입 | 비고 |
|---|---|---|
| name | string | |
| email | string | |
| profile_image_url | string \| null | |
| total_conversions | number | **집계값** — 매 요청마다 계산 vs 미리 집계해둘지 논의 필요 |
| completed_videos | number | **집계값** |
| total_watch_time_sec | number | **집계값** |

---

## 4. 설정 영구 저장

| 필드명 | 타입 | 비고 |
|---|---|---|
| user_id | string | FK |
| screen_mode | enum | `쉬운 화면` / `기본 화면` — 필드 하나짜리라 스키마 설계 시 누락되기 쉬우니 꼭 포함 |

---

## 논의가 필요한 것 (스키마 확정 전에 먼저 정하면 좋음)

- [ ] 로그인 세션: 쿠키 방식인지 JWT 토큰 방식인지
- [ ] 마이페이지 통계 3종: 실시간 계산 vs 사전 집계(배치/트리거)
- [ ] group_id는 소프트 삭제(soft delete) 지원할지 (그룹 삭제 시 기록은 유지?)
