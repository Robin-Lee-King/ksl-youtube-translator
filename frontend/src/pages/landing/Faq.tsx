import { useState } from "react";
import { FAQS } from "../../constants";

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" style={{ padding: "64px 24px", background: "#fff", scrollMarginTop: "64px" }}>
      <div style={{ maxWidth: "768px", margin: "0 auto" }}>
        <p style={{ fontSize: "13px", fontWeight: 700, color: "#10B45F", textAlign: "center", margin: "0 0 8px" }}>FAQ</p>
        <h2 style={{ fontSize: "24px", fontWeight: 700, textAlign: "center", margin: "0 0 8px" }}>자주 묻는 질문</h2>
        <p style={{ fontSize: "14px", color: "#747C78", textAlign: "center", margin: "0 0 32px" }}>공농에 대해 궁금한 점을 확인해보세요.</p>
        <div style={{ border: "1px solid #E5E8E7", borderRadius: "16px", overflow: "hidden" }}>
          {FAQS.map((q, i) => {
            const open = openIndex === i;
            return (
              <div key={q.q} style={{ borderBottom: i < FAQS.length - 1 ? "1px solid #E5E8E7" : "none", background: open ? "#F7FBF8" : "#fff" }}>
                <button
                  onClick={() => setOpenIndex((cur) => (cur === i ? null : i))}
                  aria-expanded={open}
                  className="hover-muted"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "16px",
                    padding: "18px 20px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "15px", fontWeight: 600, color: "#171C19", lineHeight: 1.5 }}>{q.q}</span>
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: "18px",
                      lineHeight: 1.3,
                      color: open ? "#10B45F" : "#747C78",
                      transform: open ? "rotate(45deg)" : "rotate(0deg)",
                      transition: "transform .25s ease, color .2s",
                    }}
                  >
                    ＋
                  </span>
                </button>
                <div style={{ display: "grid", gridTemplateRows: open ? "minmax(0, 1fr)" : "minmax(0, 0fr)", overflow: "hidden", transition: "grid-template-rows .28s ease" }}>
                  <div style={{ minHeight: 0, overflow: "hidden" }}>
                    <p style={{ fontSize: "14px", color: "#5c655f", lineHeight: 1.8, margin: 0, padding: "0 20px 20px" }}>{q.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
