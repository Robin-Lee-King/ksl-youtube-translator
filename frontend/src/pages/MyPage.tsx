import { useNavigate } from "react-router-dom";
import { useApp, useEasyMode } from "../state/AppContext";
import { useModal } from "../state/ModalContext";
import { useAuth } from "../hooks/useAuth";
import { AGE_OPTIONS, ICON, INFO, PREF_OPTIONS, TOPIC_OPTIONS } from "../constants";
import { fmtWatch, parseDur } from "../utils/video";
import { chip, knobStyle, sw } from "../styles";
import avatar from "../assets/avatar.png";
import logo from "../assets/logo.png";

export default function MyPage() {
  const easy = useEasyMode();
  const navigate = useNavigate();
  const { openModal } = useModal();
  const { logout, completeOnboarding } = useAuth();
  const { profile, history, settings, setSettings, onboarding } = useApp();

  const done = history.filter((h) => h.status === "완료");
  const totalWatch = done.reduce((a, h) => a + parseDur(h.duration), 0);

  const stats = [
    { v: `${history.length}회`, l: "총 변환 횟수" },
    { v: `${done.length}개`, l: "완료된 영상" },
    { v: totalWatch > 0 ? fmtWatch(totalWatch) : "0m", l: "총 시청 시간" },
  ];

  const prefHint =
    onboarding.prefs.length >= 2
      ? "2개를 선택했어요. 다른 항목을 누르면 가장 먼저 고른 항목이 바뀝니다."
      : `${onboarding.prefs.length}개 선택 · 최대 2개`;

  return (
    <div style={{ maxWidth: "672px", margin: "0 auto", padding: "32px 16px", width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "16px", zoom: easy ? 1.5 : 1 }}>
      <div style={{ background: "#fff", border: "1px solid #E5E8E7", borderRadius: "16px", overflow: "hidden" }}>
        <div style={{ height: "80px", position: "relative", background: "linear-gradient(135deg, #8DDE98, #10B45F)" }}>
          <div style={{ position: "absolute", bottom: "-32px", left: "20px", width: "64px", height: "64px", borderRadius: "999px", background: "#fff", border: "4px solid #fff", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.12)" }}>
            <img src={avatar} alt="프로필" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        </div>
        <div style={{ padding: "40px 20px 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>{profile.name}</p>
              <p style={{ fontSize: "14px", color: "#747C78", margin: "2px 0 0" }}>{profile.email}</p>
            </div>
            <button
              onClick={() => openModal("profile")}
              className="hover-secondary"
              style={{ fontSize: "12px", fontWeight: 600, color: "#10B45F", background: "#fff", border: "1px solid #10B45F", padding: "6px 12px", borderRadius: "12px", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              프로필 수정
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #E5E8E7" }}>
            {stats.map((st) => (
              <div key={st.l} style={{ textAlign: "center" }}>
                <p style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>{st.v}</p>
                <p style={{ fontSize: "12px", color: "#747C78", margin: "2px 0 0" }}>{st.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E5E8E7", borderRadius: "16px", padding: "16px 20px" }}>
        <p style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 4px" }}>내 맞춤 설정</p>
        <p style={{ fontSize: "12px", color: "#747C78", margin: "0 0 8px" }}>가입할 때 선택한 내용이에요. 언제든 바꿀 수 있어요.</p>

        <div style={{ padding: "14px 0", borderBottom: "1px solid #E5E8E7" }}>
          <p style={{ fontSize: "14px", fontWeight: 500, margin: "0 0 10px" }}>화면 모드</p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => void completeOnboarding({ screenMode: "easy" })} style={chip(onboarding.view === "easy")}>
              쉬운 화면
            </button>
            <button onClick={() => void completeOnboarding({ screenMode: "standard" })} style={chip(onboarding.view === "standard")}>
              기본 화면
            </button>
          </div>
        </div>

        <div style={{ padding: "14px 0", borderBottom: "1px solid #E5E8E7" }}>
          <p style={{ fontSize: "14px", fontWeight: 500, margin: "0 0 10px" }}>연령대</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {AGE_OPTIONS.map((label) => (
              <button
                key={label}
                onClick={() => void completeOnboarding({ age: onboarding.age === label ? "" : label })}
                style={chip(onboarding.age === label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "14px 0", borderBottom: "1px solid #E5E8E7" }}>
          <p style={{ fontSize: "14px", fontWeight: 500, margin: "0 0 4px" }}>관심 영상</p>
          <p style={{ fontSize: "12px", color: "#747C78", margin: "0 0 10px" }}>여러 개 선택할 수 있어요.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {TOPIC_OPTIONS.map((label) => {
              const on = onboarding.topics.includes(label);
              const nextTopics = on ? onboarding.topics.filter((t) => t !== label) : [...onboarding.topics, label];
              return (
                <button key={label} onClick={() => void completeOnboarding({ topics: nextTopics })} style={chip(on)}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "14px 0 4px" }}>
          <p style={{ fontSize: "14px", fontWeight: 500, margin: "0 0 4px" }}>시청 방식</p>
          <p style={{ fontSize: "12px", color: "#747C78", margin: "0 0 10px" }}>{prefHint}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {PREF_OPTIONS.map((label) => {
              const on = onboarding.prefs.includes(label);
              const nextPrefs = on ? onboarding.prefs.filter((p) => p !== label) : [...onboarding.prefs, label].slice(-2);
              return (
                <button
                  key={label}
                  onClick={() => void completeOnboarding({ prefs: nextPrefs })}
                  style={{ ...chip(on), width: "100%", textAlign: "left" }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E5E8E7", borderRadius: "16px", padding: "16px 20px" }}>
        <p style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 4px" }}>환경 설정</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "14px 0", borderBottom: "1px solid #E5E8E7" }}>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 500, margin: 0 }}>자막 표시</p>
            <p style={{ fontSize: "12px", color: "#747C78", margin: "2px 0 0" }}>수어 영상과 함께 한국어 자막 표시</p>
          </div>
          <button
            onClick={() => setSettings({ subtitles: !settings.subtitles })}
            role="switch"
            aria-checked={settings.subtitles}
            aria-label="자막 표시"
            style={sw(settings.subtitles)}
          >
            <span style={knobStyle} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "14px 0", borderBottom: "1px solid #E5E8E7" }}>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 500, margin: 0 }}>신뢰도 낮은 구간 자동 자막 전환</p>
            <p style={{ fontSize: "12px", color: "#747C78", margin: "2px 0 0" }}>수어 변환 신뢰도가 낮은 구간에서 자막으로 자동 전환</p>
          </div>
          <button
            onClick={() => setSettings({ autoSwitch: !settings.autoSwitch })}
            role="switch"
            aria-checked={settings.autoSwitch}
            aria-label="신뢰도 낮은 구간 자동 자막 전환"
            style={sw(settings.autoSwitch)}
          >
            <span style={knobStyle} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "14px 0" }}>
          <p style={{ fontSize: "14px", fontWeight: 500, margin: 0 }}>기본 재생 속도</p>
          <select
            value={settings.defaultSpeed}
            onChange={(e) => setSettings({ defaultSpeed: e.target.value })}
            aria-label="기본 재생 속도"
            style={{ fontSize: "14px", border: "1px solid #E5E8E7", borderRadius: "12px", padding: "6px 12px", background: "#fff", color: "#171C19" }}
          >
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1.0">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2.0">2.0x</option>
          </select>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E5E8E7", borderRadius: "16px", padding: "16px 20px" }}>
        <p style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 4px" }}>서비스 정보</p>
        {Object.keys(INFO).map((label) => (
          <button
            key={label}
            onClick={() => openModal("info", label)}
            className="hover-green"
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", fontSize: "14px", background: "none", border: "none", borderBottom: "1px solid #E5E8E7", cursor: "pointer", color: "#171C19" }}
          >
            <span>{label}</span>
            <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "#747C78" }}>
              <path d={ICON.chevronRight} />
            </svg>
          </button>
        ))}
      </div>

      <button
        onClick={() => {
          logout();
          navigate("/login");
        }}
        className="hover-red-bg"
        style={{ width: "100%", padding: "14px", fontSize: "14px", fontWeight: 600, color: "#EF4444", background: "#fff", border: "1px solid #FEE2E2", borderRadius: "16px", cursor: "pointer" }}
      >
        로그아웃
      </button>

      <div style={{ textAlign: "center", paddingTop: "8px" }}>
        <img src={logo} alt="공농" style={{ height: "28px", width: "auto" }} />
        <p style={{ fontSize: "12px", color: "#747C78", margin: "6px 0 0" }}>© 2026 Gongnong. All rights reserved.</p>
      </div>
    </div>
  );
}
