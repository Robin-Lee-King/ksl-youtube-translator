import characterSheet from "@/imports/__________v1_20260904.png";

// Actual delivered sprite sheet size — confirmed via `file`/pixel analysis. The sheet is a
// 1536×1024 landscape PNG; it is NOT 1982×2362 (that stale figure produced wrong crops: the
// scale/position math below assumes the sheet is exactly this size, so a mismatch here silently
// shows the wrong region of the sheet, distorted).
const SHEET_W = 1536;
const SHEET_H = 1024;

/**
 * 캐릭터 시트 (1536×1024px) 에서 픽셀 좌표로 크롭.
 *
 * 시트 레이아웃 (실측):
 *   Row 1 캐릭터 형태 (y 21-350):    FRONT · SIDE · BACK · 3/4 · 3/4 DEVICE
 *   Row 2 표정        (y 405-627):   기본 · 기쁨 · 놀람 · 생각 · 궁금 · 아쉬움 · 활짝
 *   Row 3 활용 예시   (y 667-906):   인사 · 검색/탐색 · 번역 진행 중 · 완료 · 영상 시청 · 도움/안내
 *   Row 4 정보        (y 938-1001)
 */
type Variant = "front" | "wave" | "search" | "loading" | "done" | "watch" | "error";

// [x1, y1, x2, y2] in the real 1536×1024 sheet. Only x1/y1/x2 drive rendering (see cropW below —
// the crop is always rendered as a cropW×cropW square), y2 is kept just to document the box.
const CROPS: Record<Variant, [number, number, number, number]> = {
  front:   [67,   59,  345,  337],  // Row 1 FRONT 전신
  wave:    [55,  705,  235,  885],  // Row 3 인사
  search:  [319, 680,  524,  885],  // Row 3 검색/탐색
  loading: [562, 676,  767,  881],  // Row 3 번역 진행 중
  done:    [807, 672, 1022,  887],  // Row 3 완료!
  watch:   [1042,689, 1240,  887],  // Row 3 영상 시청
  error:   [1078,434, 1249,  605],  // Row 2 아쉬움 표정
};

interface GongnongCharacterProps {
  variant?: Variant;
  size?: number;
  className?: string;
}

export default function GongnongCharacter({
  variant = "front",
  size = 120,
  className = "",
}: GongnongCharacterProps) {
  const [x1, y1, x2] = CROPS[variant];
  const cropW = x2 - x1;
  const scale = size / cropW;
  const imgW = Math.round(SHEET_W * scale);
  const imgH = Math.round(SHEET_H * scale);

  return (
    <div
      className={className}
      style={{ width: size, height: size, overflow: "hidden", position: "relative", flexShrink: 0 }}
      aria-hidden="true"
    >
      <img
        src={characterSheet}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          width: imgW,
          height: imgH,
          top: -Math.round(y1 * scale),
          left: -Math.round(x1 * scale),
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
    </div>
  );
}
