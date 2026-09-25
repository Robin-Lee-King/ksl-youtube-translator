import { useState } from "react";
import ModalShell from "../../common/ModalShell";
import TextField from "../../common/TextField";
import { useModal } from "../../../state/ModalContext";
import { primaryButtonStyle } from "../../../styles";

type Step = "input" | "sent" | "reset";

export default function FindPwModal() {
  const { closeModal } = useModal();
  const [step, setStep] = useState<Step>("input");
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [error, setError] = useState("");

  const btnStyle = primaryButtonStyle;

  function sendCode() {
    if (!id.trim() || !email.trim()) return;
    setStep("sent");
  }
  function verifyCode() {
    if (code.trim().length < 4) return;
    setStep("reset");
  }
  function resetPw() {
    if (newPw !== newPw2) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (newPw.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    closeModal();
  }

  return (
    <ModalShell title="비밀번호 찾기">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {step === "input" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ fontSize: "14px", color: "#747C78", margin: 0 }}>
              아이디와 가입 이메일을 입력하면 인증 코드를 보내드립니다.
            </p>
            <TextField id="fp-id" label="아이디" value={id} onChange={(e) => setId(e.target.value)} placeholder="아이디" />
            <TextField
              id="fp-mail"
              label="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
            />
            <button onClick={sendCode} className="hover-primary" style={btnStyle}>
              인증 코드 발송
            </button>
          </div>
        )}

        {step === "sent" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#F0FAF5",
                borderRadius: "12px",
                padding: "12px 16px",
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", fill: "#10B45F", flexShrink: 0 }}>
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
              <p style={{ fontSize: "12px", color: "#0B7A4D", margin: 0 }}>{email}로 인증 코드를 발송했습니다.</p>
            </div>
            <TextField
              id="fp-code"
              label="인증 코드 (6자리)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              style={{ textAlign: "center", letterSpacing: ".25em" }}
            />
            <button onClick={verifyCode} className="hover-primary" style={btnStyle}>
              확인
            </button>
          </div>
        )}

        {step === "reset" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ fontSize: "14px", color: "#747C78", margin: 0 }}>새로운 비밀번호를 설정하세요.</p>
            <TextField
              id="np1"
              type="password"
              label="새 비밀번호"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="6자 이상"
            />
            <TextField
              id="np2"
              type="password"
              label="새 비밀번호 확인"
              value={newPw2}
              onChange={(e) => setNewPw2(e.target.value)}
              placeholder="비밀번호 재입력"
            />
            {error && <p style={{ fontSize: "12px", color: "#EF4444", margin: 0 }}>{error}</p>}
            <button onClick={resetPw} className="hover-primary" style={btnStyle}>
              비밀번호 변경
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
