interface ConfidenceBannerProps {
  onShowSubtitle: () => void;
  onDismiss: () => void;
}

export default function ConfidenceBanner({ onShowSubtitle, onDismiss }: ConfidenceBannerProps) {
  return (
    <div style={{ position: "absolute", top: "8px", left: "8px", right: "8px", display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", borderRadius: "12px", background: "rgba(30,16,4,.85)", border: "1px solid rgba(249,115,22,.35)", backdropFilter: "blur(8px)", zIndex: 20 }}>
      <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "#fb923c", flexShrink: 0 }}>
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#fdba74", margin: 0 }}>정확하지 않을 수 있어요</p>
        <p style={{ fontSize: "12px", color: "rgba(251,146,60,.7)", margin: 0 }}>이 구간은 수어 변환 신뢰도가 낮습니다</p>
      </div>
      <button onClick={onShowSubtitle} style={{ fontSize: "12px", background: "#f97316", color: "#fff", padding: "6px 12px", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
        자막 보기
      </button>
      <button onClick={onDismiss} aria-label="닫기" style={{ background: "none", border: "none", color: "rgba(251,146,60,.5)", cursor: "pointer", flexShrink: 0, display: "flex" }}>
        <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "currentColor" }}>
          <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>
    </div>
  );
}
