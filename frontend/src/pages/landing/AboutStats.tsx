import { useEffect, useRef, useState } from "react";
import { STAT_BARS } from "../../constants";

export default function AboutStats() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [statsIn, setStatsIn] = useState(false);
  const [donutN, setDonutN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setStatsIn(true);
      },
      { threshold: 0.4, rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!statsIn) return;
    const t0 = Date.now();
    const id = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 1300);
      setDonutN(64.1 * (1 - Math.pow(1 - p, 3)));
      if (p >= 1) window.clearInterval(id);
    }, 40);
    return () => window.clearInterval(id);
  }, [statsIn]);

  return (
    <section
      id="about"
      style={{
        background: "#F6FBF8",
        borderTop: "1px solid #DDF5E8",
        borderBottom: "1px solid #DDF5E8",
        padding: "72px 24px",
        scrollMarginTop: "64px",
      }}
    >
      <div
        style={{
          maxWidth: "1024px",
          margin: "0 auto",
          position: "relative",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "48px",
          alignItems: "center",
        }}
      >
        <div>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#10B45F", margin: "0 0 12px" }}>서비스 소개</p>
          <h2 style={{ fontSize: "30px", fontWeight: 700, lineHeight: 1.4, margin: "0 0 16px", letterSpacing: "-0.02em" }}>
            자막이 아니라 수어로,
            <br />
            영상을 있는 그대로.
          </h2>
          <p style={{ fontSize: "15px", color: "#5c655f", lineHeight: 1.9, margin: "0 0 20px" }}>
            한국수어는 한국어와 문법이 다른 독립된 언어입니다. 자막만으로는 채워지지 않는 부분이 남습니다.
          </p>
          <p style={{ fontSize: "15px", color: "#5c655f", lineHeight: 1.9, margin: 0 }}>
            공농은 영상의 발화를 문맥 단위로 이해해 한국수어로 변환하고, 원본 영상과 나란히 보여줍니다.
          </p>
        </div>

        <div
          ref={ref}
          style={{
            background: "#fff",
            border: "1px solid #DDF5E8",
            borderRadius: "24px",
            padding: "28px",
            boxShadow: "0 4px 20px rgba(16,180,95,.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div
              style={{
                position: "relative",
                width: "108px",
                height: "108px",
                flexShrink: 0,
                borderRadius: "999px",
                background: "conic-gradient(#10B45F calc(var(--gn-donut) * 1%), #E9F5EE 0)",
                animation: statsIn ? "gn-donut-sweep 1.3s cubic-bezier(.22,.9,.25,1) forwards" : "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "12px",
                  background: "#fff",
                  borderRadius: "999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: "22px", fontWeight: 700, color: "#10B45F", letterSpacing: "-0.02em" }}>
                  {(statsIn ? donutN : 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <p style={{ fontSize: "14px", color: "#3d4640", lineHeight: 1.7, margin: 0 }}>
              청각·언어장애인 취업자가
              <br />
              <strong style={{ fontWeight: 700 }}>동료·상사와의 의사소통</strong>에서
              <br />
              어려움을 겪습니다.
            </p>
          </div>
          <div style={{ height: "1px", background: "#E5E8E7", margin: "24px 0" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {STAT_BARS.map((c, i) => (
              <div key={c.label} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px" }}>
                  <span style={{ fontSize: "13px", color: "#5c655f" }}>{c.label}</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#171C19" }}>{c.value}</span>
                </div>
                <div style={{ height: "8px", background: "#F0FAF5", borderRadius: "999px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${c.pct}%`,
                      height: "100%",
                      borderRadius: "999px",
                      background: "#10B45F",
                      transformOrigin: "left center",
                      transform: statsIn ? "scaleX(1)" : "scaleX(0)",
                      transition: `transform 1.1s cubic-bezier(.22,.9,.25,1) ${0.35 + i * 0.18}s`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "11px", color: "#8a938d", margin: "20px 0 0" }}>출처: 청각·언어장애인 취업자·한국수어 사용자 실태조사</p>
        </div>
      </div>
    </section>
  );
}
