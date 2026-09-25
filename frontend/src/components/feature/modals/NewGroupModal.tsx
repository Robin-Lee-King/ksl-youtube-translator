import { useState } from "react";
import ModalShell from "../../common/ModalShell";
import { useApp } from "../../../state/AppContext";
import { useModal } from "../../../state/ModalContext";

export interface NewGroupArg {
  checkedIds: string[];
  onCreated: (groupId: string) => void;
}

export default function NewGroupModal({ arg }: { arg: NewGroupArg }) {
  const { createGroup } = useApp();
  const { closeModal } = useModal();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const hint =
    arg.checkedIds.length > 0 ? `${arg.checkedIds.length}개의 영상으로 그룹을 만듭니다.` : "새 그룹의 이름을 입력하세요.";

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setError("");
    try {
      // The backend assigns the real group id — a client-generated one wouldn't exist on the
      // server for later addItemToGroup/removeItemFromGroup calls to target.
      const group = await createGroup(trimmed, [...arg.checkedIds]);
      arg.onCreated(group.id);
      closeModal();
    } catch {
      setError("그룹을 만들지 못했습니다. 잠시 후 다시 시도해주세요.");
      setCreating(false);
    }
  }

  return (
    <ModalShell title="새 그룹 만들기">
      <p style={{ fontSize: "14px", color: "#747C78", margin: "0 0 12px" }}>{hint}</p>
      <input
        className="gn-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="그룹 이름 입력..."
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: "1px solid #E5E8E7",
          borderRadius: "12px",
          padding: "12px 16px",
          fontSize: "14px",
        }}
      />
      {error && <p style={{ fontSize: "13px", color: "#EF4444", margin: "8px 0 0" }}>{error}</p>}
      <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
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
          onClick={create}
          disabled={creating}
          style={{
            flex: 1,
            padding: "12px",
            fontSize: "14px",
            fontWeight: 600,
            background: "#10B45F",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            cursor: creating ? "default" : "pointer",
            opacity: !name.trim() || creating ? 0.4 : 1,
          }}
        >
          만들기
        </button>
      </div>
    </ModalShell>
  );
}
