import { useState } from "react";
import ModalShell from "../../common/ModalShell";
import TextField from "../../common/TextField";
import { useApp } from "../../../state/AppContext";
import { useModal } from "../../../state/ModalContext";
import avatar from "../../../assets/avatar.png";

export default function ProfileModal() {
  const { profile, setProfile } = useApp();
  const { closeModal } = useModal();
  const [draftName, setDraftName] = useState(profile.name);
  const [draftEmail, setDraftEmail] = useState(profile.email);

  function save() {
    if (!draftName.trim()) return;
    setProfile({ name: draftName.trim(), email: draftEmail.trim() });
    closeModal();
  }

  return (
    <ModalShell title="프로필 수정">
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "999px",
            overflow: "hidden",
            border: "4px solid #DDF5E8",
          }}
        >
          <img src={avatar} alt="프로필" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <TextField
          id="pf-name"
          label="이름"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="이름을 입력하세요"
        />
        <TextField
          id="pf-mail"
          label="이메일"
          value={draftEmail}
          onChange={(e) => setDraftEmail(e.target.value)}
          placeholder="이메일을 입력하세요"
        />
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
        <button
          onClick={closeModal}
          className="hover-muted"
          style={{
            flex: 1,
            padding: "12px",
            fontSize: "14px",
            color: "#747C78",
            background: "#fff",
            border: "1px solid #E5E8E7",
            borderRadius: "12px",
            cursor: "pointer",
          }}
        >
          취소
        </button>
        <button
          onClick={save}
          className="hover-primary"
          style={{
            flex: 1,
            padding: "12px",
            fontSize: "14px",
            fontWeight: 600,
            background: "#10B45F",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
          }}
        >
          저장
        </button>
      </div>
    </ModalShell>
  );
}
