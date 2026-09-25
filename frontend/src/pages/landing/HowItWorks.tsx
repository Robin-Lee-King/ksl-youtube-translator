const STEPS = [
  {
    num: "01",
    title: "영상 링크 붙여넣기",
    desc: "유튜브 주소를 복사해\n공농에 붙여넣으세요.",
  },
  {
    num: "02",
    title: "수어로 변환하기",
    desc: "AI가 자동으로 분석해\n수어 영상을 만들어드려요.",
  },
  {
    num: "03",
    title: "완성된 수어 영상 시청하기",
    desc: "원본 영상과 수어 영상을\n나란히 시청하세요.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" style={{ background: "#FFFFFF", padding: "96px 40px", scrollMarginTop: "64px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "72px" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#10B45F", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 14px" }}>
            How it works
          </p>
          <h2
            style={{
              fontSize: "clamp(28px, 3.5vw, 40px)",
              fontWeight: 700,
              color: "#111815",
              margin: 0,
              lineHeight: 1.25,
              letterSpacing: "-0.02em",
            }}
          >
            이렇게 사용해요
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0" }}>
          {STEPS.map((s, idx) => (
            <div
              key={s.num}
              style={{
                padding: "0 40px",
                borderLeft: idx > 0 ? "1px solid #E5E8E7" : "none",
              }}
            >
              <p
                style={{
                  fontSize: "clamp(44px, 5vw, 64px)",
                  fontWeight: 800,
                  color: "#10B45F",
                  margin: "0 0 24px",
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  opacity: 0.85,
                }}
              >
                {s.num}
              </p>
              <h3
                style={{
                  fontSize: "clamp(18px, 2vw, 22px)",
                  fontWeight: 700,
                  color: "#111815",
                  margin: "0 0 14px",
                  lineHeight: 1.3,
                  letterSpacing: "-0.01em",
                }}
              >
                {s.title}
              </h3>
              <p
                style={{
                  fontSize: "15px",
                  color: "#747C78",
                  lineHeight: 1.8,
                  margin: 0,
                  whiteSpace: "pre-line",
                }}
              >
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
