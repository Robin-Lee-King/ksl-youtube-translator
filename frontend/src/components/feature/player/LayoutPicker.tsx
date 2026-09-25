import { LAYOUTS, LAYOUT_SHAPES, type LayoutId } from "../../../constants";

interface LayoutPickerProps {
  layout: LayoutId;
  onSelect: (id: LayoutId) => void;
  onClose: () => void;
}

export default function LayoutPicker({ layout, onSelect, onClose }: LayoutPickerProps) {
  return (
    <div style={{ margin: "12px 16px 0", borderRadius: "16px", padding: "16px", background: "#1a1f2e", border: "1px solid rgba(255,255,255,.1)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff", margin: 0 }}>레이아웃 선택</p>
        <button
          onClick={onClose}
          aria-label="레이아웃 선택 닫기"
          className="hover-white"
          style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", fontSize: "18px", lineHeight: 1, cursor: "pointer" }}
        >
          ✕
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))", gap: "8px" }}>
        {LAYOUTS.map((l) => {
          const on = layout === l.id;
          const shapes = LAYOUT_SHAPES[l.id];
          const origFill = "#2d3748";
          const signFill = on ? "#8DDE98" : "#4a7c59";
          return (
            <button
              key={l.id}
              onClick={() => onSelect(l.id)}
              aria-pressed={on}
              style={{ display: "flex", flexDirection: "column", gap: "6px", background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              <div style={{ borderRadius: "12px", overflow: "hidden", outline: on ? "2px solid #10B45F" : "2px solid transparent", outlineOffset: "1px" }}>
                <svg viewBox="0 0 56 36" style={{ width: "100%", display: "block", background: on ? "#10B45F" : "#1e2530", borderRadius: "8px" }}>
                  <rect x={shapes[0].x} y={shapes[0].y} width={shapes[0].w} height={shapes[0].h} rx={2} fill={origFill} />
                  <rect x={shapes[1].x} y={shapes[1].y} width={shapes[1].w} height={shapes[1].h} rx={2} fill={signFill} />
                </svg>
              </div>
              <p style={{ fontSize: "10px", fontWeight: 600, textAlign: "center", lineHeight: 1.2, margin: 0, color: on ? "#10B45F" : "rgba(255,255,255,.5)" }}>{l.label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
