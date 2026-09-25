export interface ProcStepDef {
  label: string;
  desc: string;
  duration: number;
}

// TODO: replace with real step/progress data from the job status endpoint once the backend is connected.
// Until then, ProcessingPage uses these durations to simulate progress client-side.
export const MOCK_PROC_STEPS: ProcStepDef[] = [
  { label: "영상 정보 확인", desc: "제목, 재생 시간 확인 중...", duration: 2000 },
  { label: "음성 추출 (STT)", desc: "영상 음성을 텍스트로 변환 중...", duration: 3000 },
  { label: "문맥 이해 (LLM)", desc: "AI가 문장을 분석하고 정리 중...", duration: 2500 },
  { label: "수어 동작 생성", desc: "수어 동작 시퀀스 생성 중...", duration: 3000 },
  { label: "수어 영상 렌더링", desc: "Sign Avatar 영상을 렌더링 중...", duration: 2000 },
];

export const MOCK_PROC_TOTAL = MOCK_PROC_STEPS.reduce((a, s) => a + s.duration, 0);
