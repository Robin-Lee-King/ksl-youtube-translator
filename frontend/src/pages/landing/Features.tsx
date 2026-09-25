import featurePlayer from "../../assets/feature-player.png";
import feature03Video from "../../assets/feature-03.mp4";
import feature01Video from "../../assets/feature-01.mp4";

const FEATURES_DATA = [
  {
    num: "01",
    title: "영상 링크 하나면,\n수어 영상으로 바꿔드려요.",
    desc: "유튜브 영상 링크를 입력하면\n공농이 음성을 분석해 수어 영상으로 변환해요.",
    ui: (
      <div style={{ width: "100%", aspectRatio: "1730 / 1004", borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,.12)" }}>
        <video
          src={feature01Video}
          autoPlay
          loop
          muted
          playsInline
          style={{ width: "100%", height: "100%", display: "block", objectFit: "cover", transform: "scale(1.08)", transformOrigin: "center center" }}
        />
      </div>
    ),
    reverse: false,
  },
  {
    num: "02",
    title: "영상의 내용을\n수어로 자연스럽게.",
    desc: "수어 영상과 자막을 함께 제공해\n내용을 더 쉽게 이해할 수 있어요.",
    ui: (
      <img
        src={featurePlayer}
        alt="수어 플레이어 화면"
        style={{ width: "100%", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,.12)", display: "block" }}
      />
    ),
    reverse: true,
  },
  {
    num: "03",
    title: "보고 싶은 방식대로,\n더 편안하게 시청하세요.",
    desc: "자막, 재생 속도, 화면 크기 등을\n원하는 방식으로 설정할 수 있어요.",
    ui: (
      <div style={{ width: "100%", aspectRatio: "4 / 3", borderRadius: "16px", overflow: "hidden", position: "relative", boxShadow: "0 4px 24px rgba(0,0,0,.12)" }}>
        <video
          src={feature03Video}
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: "absolute",
            top: "-4.5%",
            left: "-4.5%",
            width: "109%",
            height: "109%",
            display: "block",
            objectFit: "cover",
          }}
        />
      </div>
    ),
    reverse: false,
  },
];

export default function Features() {
  return (
    <section id="features" style={{ background: "linear-gradient(180deg, #F4FBF7 0%, #FFFFFF 30%, #FFFFFF 70%, #F5F8FC 100%)", scrollMarginTop: "64px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 40px" }}>
        <div style={{ padding: "80px 0 0" }} />

        {FEATURES_DATA.map((f, idx) => (
          <div
            key={f.num}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "64px",
              alignItems: "center",
              paddingBottom: idx < FEATURES_DATA.length - 1 ? "96px" : "80px",
              direction: f.reverse ? "rtl" : "ltr",
            }}
          >
            {/* Text */}
            <div style={{ direction: "ltr" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#10B45F", margin: "0 0 16px", letterSpacing: "0.04em" }}>
                {f.num}
              </p>
              <h3
                style={{
                  fontSize: "clamp(22px, 2.8vw, 32px)",
                  fontWeight: 700,
                  color: "#111815",
                  lineHeight: 1.3,
                  letterSpacing: "-0.02em",
                  margin: "0 0 20px",
                  whiteSpace: "pre-line",
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: "16px",
                  color: "#5c655f",
                  lineHeight: 1.85,
                  margin: 0,
                  whiteSpace: "pre-line",
                }}
              >
                {f.desc}
              </p>
            </div>

            {/* UI mockup */}
            <div style={{ direction: "ltr", display: "flex", justifyContent: f.reverse ? "flex-start" : "flex-end" }}>
              {f.ui}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
