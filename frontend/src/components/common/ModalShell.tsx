import type { ReactNode } from "react";
import { useModal } from "../../state/ModalContext";
import { ICON } from "../../constants";

export default function ModalShell({
  title,
  wide,
  children,
}: {
  title: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const { closeModal } = useModal();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={closeModal}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.4)", backdropFilter: "blur(4px)" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-shell-title"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: wide ? "512px" : "384px",
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0 20px 50px rgba(0,0,0,.25)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "85vh",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #E5E8E7",
            flexShrink: 0,
          }}
        >
          <p id="modal-shell-title" style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>{title}</p>
          <button
            onClick={closeModal}
            aria-label="닫기"
            className="hover-muted"
            style={{
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#747C78",
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: "20px", height: "20px", fill: "currentColor" }}>
              <path d={ICON.close} />
            </svg>
          </button>
        </div>
        <div style={{ padding: "20px", overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
