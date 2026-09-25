import { useApp } from "../../state/AppContext";

export default function ConfirmDeleteOverlay() {
  const { confirmDelete, cancelDelete, confirmDeleteNow } = useApp();
  if (!confirmDelete) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={cancelDelete}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.4)", backdropFilter: "blur(4px)" }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "340px",
          background: "#fff",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 12px 40px rgba(0,0,0,.18)",
        }}
      >
        <p style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 8px" }}>이 기록을 삭제하시겠습니까?</p>
        <p style={{ fontSize: "13px", color: "#747C78", margin: "0 0 20px", lineHeight: 1.6 }}>{confirmDelete.title}</p>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={cancelDelete}
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
            onClick={confirmDeleteNow}
            style={{
              flex: 1,
              padding: "12px",
              fontSize: "14px",
              fontWeight: 600,
              background: "#EF4444",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
            }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
