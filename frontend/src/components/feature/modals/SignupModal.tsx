import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ModalShell from "../../common/ModalShell";
import TextField from "../../common/TextField";
import { useModal } from "../../../state/ModalContext";
import { useAuth } from "../../../hooks/useAuth";
import { ApiError } from "../../../api/client";
import { primaryButtonStyle } from "../../../styles";
import { ICON } from "../../../constants";

interface SignupForm {
  name: string;
  id: string;
  email: string;
  pw: string;
  pw2: string;
}

const FIELDS: { key: keyof SignupForm; label: string; type: string; placeholder: string }[] = [
  { key: "name", label: "이름", type: "text", placeholder: "실명을 입력하세요" },
  { key: "id", label: "아이디", type: "text", placeholder: "4자 이상" },
  { key: "email", label: "이메일", type: "email", placeholder: "example@email.com" },
  { key: "pw", label: "비밀번호", type: "password", placeholder: "6자 이상" },
  { key: "pw2", label: "비밀번호 확인", type: "password", placeholder: "비밀번호 재입력" },
];

export default function SignupModal() {
  const { closeModal } = useModal();
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [step, setStep] = useState<"form" | "done">("form");
  const [su, setSu] = useState<SignupForm>({ name: "", id: "", email: "", pw: "", pw2: "" });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof SignupForm | "agree" | "form", string>>>({});
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const e: typeof errors = {};
    if (!su.name.trim()) e.name = "이름을 입력하세요.";
    if (!su.id.trim() || su.id.length < 4) e.id = "아이디는 4자 이상이어야 합니다.";
    if (!su.email.includes("@")) e.email = "올바른 이메일을 입력하세요.";
    if (su.pw.length < 6) e.pw = "비밀번호는 6자 이상이어야 합니다.";
    if (su.pw !== su.pw2) e.pw2 = "비밀번호가 일치하지 않습니다.";
    if (!agree) e.agree = "이용약관에 동의해주세요.";
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await signup({ name: su.name.trim(), id: su.id.trim(), email: su.email.trim(), password: su.pw });
      setStep("done");
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : "회원가입에 실패했습니다. 잠시 후 다시 시도해주세요." });
    } finally {
      setSubmitting(false);
    }
  }

  function goLogin() {
    closeModal();
    navigate("/onboarding", { state: { name: su.name.trim() } });
  }

  return (
    <ModalShell title={step === "done" ? "회원가입 완료" : "회원가입"}>
      {step === "done" ? (
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "#F0FAF5",
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: "28px", height: "28px", fill: "#10B45F" }}>
              <path d={ICON.check} />
            </svg>
          </div>
          <p style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 4px" }}>환영합니다, {su.name}님!</p>
          <p style={{ fontSize: "14px", color: "#747C78", margin: "0 0 24px" }}>공농 회원가입이 완료되었습니다.</p>
          <button onClick={goLogin} className="hover-primary" style={primaryButtonStyle}>
            로그인하기
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {FIELDS.map((f) => (
            <TextField
              key={f.key}
              label={f.label}
              type={f.type}
              value={su[f.key]}
              onChange={(e) => setSu((p) => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              error={errors[f.key]}
            />
          ))}
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", paddingTop: "4px" }}>
            <input
              type="checkbox"
              checked={agree}
              onChange={() => setAgree((a) => !a)}
              style={{ width: "16px", height: "16px", accentColor: "#10B45F" }}
            />
            <span style={{ fontSize: "12px", color: "#747C78" }}>이용약관 및 개인정보처리방침에 동의합니다</span>
          </label>
          {errors.agree && <p style={{ fontSize: "12px", color: "#EF4444", margin: 0 }}>{errors.agree}</p>}
          {errors.form && <p style={{ fontSize: "12px", color: "#EF4444", margin: 0 }}>{errors.form}</p>}
          <button
            onClick={submit}
            disabled={submitting}
            className="hover-primary"
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px",
              background: "#10B45F",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            가입하기
          </button>
        </div>
      )}
    </ModalShell>
  );
}
