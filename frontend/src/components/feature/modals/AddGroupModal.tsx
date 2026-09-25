import ModalShell from "../../common/ModalShell";
import { useApp } from "../../../state/AppContext";
import { useModal } from "../../../state/ModalContext";

export interface AddGroupArg {
  itemId: string;
}

export default function AddGroupModal({ arg }: { arg: AddGroupArg }) {
  const { groups, addItemToGroup } = useApp();
  const { closeModal, openModal } = useModal();

  return (
    <ModalShell title="그룹에 추가">
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        {groups.map((g) => {
          const already = g.itemIds.includes(arg.itemId);
          return (
            <button
              key={g.id}
              disabled={already}
              onClick={() => {
                if (already) return;
                addItemToGroup(g.id, arg.itemId);
                closeModal();
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderRadius: "12px",
                border: "1px solid #E5E8E7",
                background: "#fff",
                cursor: already ? "not-allowed" : "pointer",
                opacity: already ? 0.4 : 1,
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 500 }}>{g.name}</span>
              <span style={{ fontSize: "12px", color: "#747C78" }}>{already ? "이미 추가됨" : "+"}</span>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => openModal("new-group", { checkedIds: [arg.itemId], onCreated: () => {} })}
        className="hover-secondary"
        style={{
          width: "100%",
          padding: "10px",
          fontSize: "14px",
          color: "#10B45F",
          fontWeight: 600,
          background: "#fff",
          border: "1px solid #DDF5E8",
          borderRadius: "12px",
          cursor: "pointer",
        }}
      >
        + 새 그룹 만들기
      </button>
    </ModalShell>
  );
}
