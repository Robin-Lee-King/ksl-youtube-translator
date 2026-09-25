// TODO: extend with real fields once the backend user schema is confirmed (avatarUrl, role, createdAt, etc.)
//
// 백엔드 확정: 마이페이지 통계 3종(총 변환 횟수/완료된 영상/총 시청 시간)은 매번 COUNT 쿼리로
// 실시간 계산한다 (사전 집계는 추후 도입 예정). 응답 필드명은 바뀌지 않으므로 프론트 쪽 변경은 없다.
import type { ScreenView } from "./domain";

export interface User {
  id: string;
  email: string;
  name: string;
  onboardingCompleted: boolean;
  // Backend's screen_mode (null until chosen) mapped to "" for the unset case — see ScreenView.
  screenMode: ScreenView;
  // Backend's age (null until chosen) mapped to "" for the unset case.
  age: string;
  topics: string[];
  prefs: string[];
}
