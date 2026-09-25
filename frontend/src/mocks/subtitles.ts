export interface Subtitle {
  start: number;
  end: number;
  text: string;
  lowConf?: boolean;
}

// TODO: replace with real subtitle data returned by the convert job result once the backend is connected.
export const MOCK_SUBTITLES: Subtitle[] = [
  { start: 2, end: 6, text: "안녕하세요, 오늘은 AI 수어 통역 서비스를 소개하겠습니다." },
  { start: 7, end: 12, text: "유튜브 영상 링크를 입력하면 자동으로 수어로 변환됩니다.", lowConf: true },
  { start: 13, end: 18, text: "원본 영상과 수어 영상이 나란히 동기화되어 재생됩니다." },
  { start: 19, end: 24, text: "농인 사용자가 영상 콘텐츠를 수어로 이해할 수 있습니다.", lowConf: true },
  { start: 25, end: 30, text: "Sign Avatar가 자연스러운 수어 동작을 표현합니다." },
];
