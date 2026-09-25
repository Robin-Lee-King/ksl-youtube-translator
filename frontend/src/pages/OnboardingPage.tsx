import { useEffect, useRef, useState } from "react";
import TransparentImg from "../components/common/TransparentImg";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { useAuth } from "../hooks/useAuth";
import { AGE_OPTIONS, ICON, PREF_OPTIONS, TOPIC_OPTIONS } from "../constants";
import { obChipStyle, obMark, obRowStyle } from "../styles";
import logo from "../assets/logo.png";
import obEasyArt from "../assets/ob-easy-art.png";
import obStdArt from "../assets/ob-std-art.png";
import gnDone from "../assets/gn-done.png";

const CHECK_PATH = ICON.check;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { onboarding, setOnboarding, toggleOnboardingTopic, toggleOnboardingPref, setScreenView, setProfile, settings, setSettings } =
    useApp();
  const { completeOnboarding } = useAuth();

  const initialName = (location.state as { name?: string } | null)?.name ?? "";
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [finishing, setFinishing] = useState(false);
  const pickTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(pickTimer.current), []);

  function prev() {
    if (step === 1) {
      navigate("/login");
      return;
    }
    setStep((s) => s - 1);
    setError("");
  }

  function next() {
    if (step === 1) {
      if (!name.trim()) {
        setError("이름 또는 닉네임을 입력해주세요.");
        return;
      }
      if (!onboarding.age) {
        setError("연령대를 선택해주세요.");
        return;
      }
    }
    if (step === 2 && onboarding.topics.length === 0) {
      setError("관심 있는 항목을 1개 이상 선택해주세요.");
      return;
    }
    if (step === 3 && onboarding.prefs.length === 0) {
      setError("중요한 항목을 1개 이상 선택해주세요.");
      return;
    }
    setStep((s) => s + 1);
    setError("");
  }

  function pickView(view: "easy" | "standard") {
    setScreenView(view);
    setError("");
    window.clearTimeout(pickTimer.current);
    pickTimer.current = window.setTimeout(() => setStep(5), 380);
  }

  async function finish() {
    const trimmed = name.trim();
    if (trimmed) setProfile({ name: trimmed });
    if (onboarding.prefs.includes("자막도 함께 보고 싶어요") && !settings.subtitles) {
      setSettings({ subtitles: true });
    }
    setFinishing(true);
    try {
      await completeOnboarding({
        screenMode: onboarding.view,
        age: onboarding.age,
        topics: onboarding.topics,
        prefs: onboarding.prefs,
      });
      navigate("/home");
    } catch {
      setError("온보딩 완료 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setFinishing(false);
    }
  }

  const doneTitle = `${name.trim() || "회원"}님에게 맞는 공농이 준비됐어요!`;
  const showStep = step <= 4;
  const showNext = step < 4;

  return (
    <div style={{ minHeight: "100vh", background: "#F7F8F8", display: "flex", flexDirection: "column" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #E5E8E7" }}>
        <div
          style={{
            maxWidth: "640px",
            margin: "0 auto",
            padding: "0 24px",
            height: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <img src={logo} alt="공농" style={{ height: "32px", width: "auto" }} />
          {showStep && <span style={{ fontSize: "13px", color: "#747C78" }}>{step} / 4 단계</span>}
        </div>
      </header>

      <div
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "640px",
          margin: "0 auto",
          padding: "32px 24px 48px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {showStep && (
          <div style={{ display: "flex", gap: "6px", marginBottom: "32px" }}>
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: "4px",
                  borderRadius: "999px",
                  background: n <= step ? "#10B45F" : "#E5E8E7",
                  transition: "background .25s",
                }}
              />
            ))}
          </div>
        )}

        {step === 1 && (
          <div style={{ flex: 1, minHeight: "480px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 700, lineHeight: 1.4, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              먼저, 회원님을 알려주세요.
            </h1>
            <p style={{ fontSize: "14px", color: "#747C78", margin: "0 0 32px" }}>공농이 회원님께 맞는 화면을 준비해드립니다.</p>
            <label htmlFor="ob-name" style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
              이름 또는 닉네임
            </label>
            <input
              id="ob-name"
              className="gn-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 김공농"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "14px 16px",
                border: "1px solid #E5E8E7",
                borderRadius: "12px",
                fontSize: "15px",
                background: "#fff",
              }}
            />
            <p style={{ fontSize: "14px", fontWeight: 600, margin: "28px 0 8px" }}>연령대</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {AGE_OPTIONS.map((label) => (
                <button
                  key={label}
                  onClick={() => setOnboarding({ age: label })}
                  style={obChipStyle(onboarding.age === label)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ flex: 1, minHeight: "480px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 700, lineHeight: 1.4, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              어떤 영상을 주로 보고 싶으신가요?
            </h1>
            <p style={{ fontSize: "14px", color: "#747C78", margin: "0 0 28px" }}>관심 있는 항목을 여러 개 선택할 수 있어요.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {TOPIC_OPTIONS.map((label) => {
                const on = onboarding.topics.includes(label);
                return (
                  <button key={label} onClick={() => toggleOnboardingTopic(label)} style={obRowStyle(on, false)}>
                    <span style={{ fontSize: "15px", fontWeight: 500 }}>{label}</span>
                    <span style={obMark(on)}>
                      <svg viewBox="0 0 24 24" style={{ width: "14px", height: "14px", fill: "#fff" }}>
                        <path d={CHECK_PATH} />
                      </svg>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ flex: 1, minHeight: "480px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 700, lineHeight: 1.4, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              영상을 어떻게 보는 게 가장 편하신가요?
            </h1>
            <p style={{ fontSize: "14px", color: "#747C78", margin: "0 0 28px" }}>나에게 중요한 항목을 최대 2개 선택해주세요.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {PREF_OPTIONS.map((label) => {
                const on = onboarding.prefs.includes(label);
                return (
                  <button key={label} onClick={() => toggleOnboardingPref(label)} style={obRowStyle(on, false)}>
                    <span style={{ fontSize: "15px", fontWeight: 500 }}>{label}</span>
                    <span style={obMark(on)}>
                      <svg viewBox="0 0 24 24" style={{ width: "14px", height: "14px", fill: "#fff" }}>
                        <path d={CHECK_PATH} />
                      </svg>
                    </span>
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: "13px", color: "#747C78", margin: "16px 0 0" }}>
              {onboarding.prefs.length >= 2
                ? "2개를 선택했어요. 다른 항목을 누르면 가장 먼저 고른 항목이 바뀝니다."
                : `${onboarding.prefs.length}개 선택 · 최대 2개`}
            </p>
          </div>
        )}

        {step === 4 && (
          <div style={{ flex: 1, minHeight: "480px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 700, lineHeight: 1.4, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              마지막으로, 편한 화면을 선택해주세요.
            </h1>
            <p style={{ fontSize: "14px", color: "#747C78", margin: "0 0 28px" }}>
              선택한 화면은 나중에 설정에서 언제든 변경할 수 있어요.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "290px",
                  background: "#fff",
                  borderRadius: "20px",
                  border: onboarding.view === "easy" ? "2px solid #10B45F" : "1px solid #E4F2EA",
                }}
              >
                <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "22px 22px 0" }}>
                  <p style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 10px", letterSpacing: "-0.01em" }}>쉬운 화면</p>
                  <p style={{ fontSize: "14px", color: "#5c655f", lineHeight: 1.75, margin: 0 }}>
                    큰 글씨와 큰 버튼으로
                    <br />
                    간단하게 이용할 수 있어요.
                  </p>
                  <TransparentImg src={obEasyArt} style={{ width: "128px", height: "auto", display: "block", alignSelf: "flex-end", margin: "8px 0 -18px" }} />
                </div>
                <div style={{ padding: "18px" }}>
                  <button
                    onClick={() => pickView("easy")}
                    style={{
                      width: "100%",
                      padding: "15px",
                      borderRadius: "14px",
                      fontSize: "15px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "background .18s, color .18s",
                      background: onboarding.view === "easy" ? "#10B45F" : "#fff",
                      color: onboarding.view === "easy" ? "#fff" : "#0B7A4D",
                      border: "1.5px solid #10B45F",
                    }}
                  >
                    쉬운 화면 선택 <span style={{ fontSize: "15px" }}>→</span>
                  </button>
                </div>
              </div>

              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "290px",
                  background: "#fff",
                  borderRadius: "20px",
                  border: onboarding.view === "standard" ? "2px solid #10B45F" : "1px solid #E5E8E7",
                }}
              >
                <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "22px 22px 0" }}>
                  <p style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 10px", letterSpacing: "-0.01em" }}>기본 화면</p>
                  <p style={{ fontSize: "14px", color: "#5c655f", lineHeight: 1.75, margin: 0 }}>
                    공농의 모든 기능을
                    <br />
                    기본 화면으로 이용할 수 있어요.
                  </p>
                  <img src={obStdArt} alt="" style={{ width: "134px", height: "auto", display: "block", alignSelf: "flex-end", margin: "8px 0 -18px" }} />
                </div>
                <div style={{ padding: "18px" }}>
                  <button
                    onClick={() => pickView("standard")}
                    style={{
                      width: "100%",
                      padding: "15px",
                      borderRadius: "14px",
                      fontSize: "15px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "background .18s, color .18s",
                      background: onboarding.view === "standard" ? "#10B45F" : "#fff",
                      color: onboarding.view === "standard" ? "#fff" : "#0B7A4D",
                      border: "1.5px solid #10B45F",
                    }}
                  >
                    기본 화면 선택 <span style={{ fontSize: "15px" }}>→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <img src={gnDone} alt="" style={{ width: "128px", height: "auto", margin: "0 auto 16px", display: "block" }} />
            <h1 style={{ fontSize: "24px", fontWeight: 700, lineHeight: 1.45, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              {doneTitle}
            </h1>
            <p style={{ fontSize: "14px", color: "#747C78", margin: "0 0 32px" }}>선택한 설정은 언제든지 변경할 수 있어요.</p>
            {error && (
              <p style={{ fontSize: "14px", color: "#EF4444", background: "#FEF2F2", borderRadius: "12px", padding: "12px 16px", margin: "0 0 20px" }}>
                {error}
              </p>
            )}
            <button
              onClick={finish}
              disabled={finishing}
              className="hover-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#10B45F",
                color: "#fff",
                fontWeight: 700,
                fontSize: "15px",
                padding: "15px 28px",
                border: "none",
                borderRadius: "12px",
                cursor: finishing ? "default" : "pointer",
                opacity: finishing ? 0.7 : 1,
                whiteSpace: "nowrap",
              }}
            >
              공농 시작하기{" "}
              <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "currentColor" }}>
                <path d={ICON.chevronRight} />
              </svg>
            </button>
          </div>
        )}

        {showStep && (
          <div>
            {error && (
              <p
                style={{
                  fontSize: "14px",
                  color: "#EF4444",
                  background: "#FEF2F2",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  margin: "28px 0 0",
                }}
              >
                {error}
              </p>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginTop: "32px" }}>
              <button
                onClick={prev}
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  padding: "10px 18px",
                  borderRadius: "999px",
                  cursor: "pointer",
                  background: "#fff",
                  color: "#747C78",
                  border: "1px solid #E5E8E7",
                }}
              >
                ← 이전
              </button>
              {showNext && (
                <button
                  onClick={next}
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    padding: "10px 22px",
                    borderRadius: "999px",
                    cursor: "pointer",
                    background: "#10B45F",
                    color: "#fff",
                    border: "none",
                  }}
                >
                  다음 →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
