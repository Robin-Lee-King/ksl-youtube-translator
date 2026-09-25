import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useModal } from "../state/ModalContext";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../api/client";
import TextField from "../components/common/TextField";
import logo from "../assets/logo.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const { openModal } = useModal();
  const { login, loginDemo } = useAuth();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!id || !pw) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await login({ id, password: pw });
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  // Logs into (or creates, on first use) the shared demo backend account — see loginDemo in
  // useAuth.ts. Always lands on /onboarding since a fresh demo account has never completed it.
  async function demoLogin() {
    setError("");
    setSubmitting(true);
    try {
      await loginDemo();
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "데모 로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F0FAF5",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "384px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img src={logo} alt="공농" style={{ height: "48px", width: "auto" }} />
          <p style={{ fontSize: "14px", color: "#747C78", margin: "8px 0 0" }}>수어로 연결되는 더 넓은 세상</p>
        </div>
        <div
          style={{
            background: "#fff",
            border: "1px solid #E5E8E7",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 1px 2px rgba(0,0,0,.05)",
          }}
        >
          <h1 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 20px" }}>로그인</h1>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label htmlFor="gn-id" style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "6px" }}>
                아이디
              </label>
              <TextField
                id="gn-id"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="아이디를 입력하세요"
              />
            </div>
            <div>
              <label htmlFor="gn-pw" style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "6px" }}>
                비밀번호
              </label>
              <TextField
                id="gn-pw"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="비밀번호를 입력하세요"
              />
            </div>
            {error && <p style={{ fontSize: "14px", color: "#EF4444", margin: 0 }}>{error}</p>}
            <button
              onClick={submit}
              disabled={submitting}
              className="hover-primary"
              style={{
                width: "100%",
                padding: "14px",
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
              로그인
            </button>
          </div>
          <div
            style={{
              marginTop: "16px",
              paddingTop: "16px",
              borderTop: "1px solid #E5E8E7",
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              fontSize: "12px",
              color: "#747C78",
            }}
          >
            <button
              onClick={() => openModal("find-id")}
              className="hover-dark"
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit", fontSize: "inherit" }}
            >
              아이디 찾기
            </button>
            <span>·</span>
            <button
              onClick={() => openModal("find-pw")}
              className="hover-dark"
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit", fontSize: "inherit" }}
            >
              비밀번호 찾기
            </button>
            <span>·</span>
            <button
              onClick={() => openModal("signup")}
              className="hover-green"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: "inherit",
                fontSize: "inherit",
                fontWeight: 500,
              }}
            >
              회원가입
            </button>
          </div>
        </div>
        {import.meta.env.DEV && (
          <button
            onClick={demoLogin}
            disabled={submitting}
            className="hover-outline"
            style={{
              width: "100%",
              marginTop: "16px",
              padding: "12px",
              background: "#fff",
              color: "#0B7A4D",
              border: "1px solid #10B45F",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            데모 계정으로 시작하기
          </button>
        )}
        <p style={{ textAlign: "center", fontSize: "12px", color: "#747C78", margin: "20px 0 0" }}>
          로그인하면 공농 서비스를 이용할 수 있습니다
        </p>
      </div>
    </div>
  );
}
