import type { CSSProperties } from "react";

export function chip(on: boolean): CSSProperties {
  return {
    fontSize: "13px",
    fontWeight: 600,
    padding: "9px 14px",
    borderRadius: "999px",
    cursor: "pointer",
    background: on ? "#10B45F" : "#fff",
    color: on ? "#fff" : "#5c655f",
    border: on ? "1px solid #10B45F" : "1px solid #E5E8E7",
    transition: "background .16s, color .16s",
  };
}

export function obChipStyle(on: boolean): CSSProperties {
  return {
    fontSize: "15px",
    fontWeight: 600,
    padding: "12px 20px",
    borderRadius: "999px",
    cursor: "pointer",
    background: on ? "#10B45F" : "#fff",
    color: on ? "#fff" : "#171C19",
    border: on ? "1px solid #10B45F" : "1px solid #E5E8E7",
  };
}

export function obRowStyle(on: boolean, dim: boolean): CSSProperties {
  return {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "16px 18px",
    borderRadius: "16px",
    cursor: "pointer",
    textAlign: "left",
    transition: "background .18s, border-color .18s",
    background: on ? "#F0FAF5" : "#fff",
    color: "#171C19",
    opacity: dim ? 0.5 : 1,
    border: on ? "1px solid #10B45F" : "1px solid #E5E8E7",
  };
}

export function obMark(on: boolean): CSSProperties {
  return {
    flexShrink: 0,
    width: "22px",
    height: "22px",
    borderRadius: "999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: on ? "#10B45F" : "transparent",
    border: on ? "none" : "1px solid #E5E8E7",
  };
}

export function navBtn(active: boolean, easy: boolean): CSSProperties {
  return {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: easy ? "18px 18px" : "12px 16px",
    borderRadius: "16px",
    fontSize: easy ? "19px" : "14px",
    fontWeight: easy ? 600 : 500,
    textAlign: "left",
    border: "none",
    cursor: "pointer",
    background: active ? "#F0FAF5" : "transparent",
    color: active ? "#0B7A4D" : "#171C19",
  };
}

export function navIcon(active: boolean): CSSProperties {
  return { color: active ? "#10B45F" : "#747C78", display: "flex" };
}

export function tabStyle(on: boolean): CSSProperties {
  return {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: 600,
    padding: "8px 14px",
    borderRadius: "12px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    background: on ? "#10B45F" : "#fff",
    color: on ? "#fff" : "#747C78",
    border: on ? "none" : "1px solid #E5E8E7",
  };
}

export function sw(on: boolean): CSSProperties {
  return {
    position: "relative",
    width: "44px",
    height: "24px",
    borderRadius: "999px",
    border: "none",
    cursor: "pointer",
    flexShrink: 0,
    padding: "2px",
    display: "flex",
    justifyContent: on ? "flex-end" : "flex-start",
    background: on ? "#10B45F" : "#E5E8E7",
  };
}

// Exact, byte-identical block repeated in FindIdModal/FindPwModal/SignupModal's simplest confirm
// buttons — extracted verbatim (not parameterized) so it only replaces truly identical usages.
export const primaryButtonStyle: CSSProperties = {
  width: "100%",
  padding: "12px",
  background: "#10B45F",
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

export const knobStyle: CSSProperties = {
  width: "20px",
  height: "20px",
  borderRadius: "999px",
  background: "#fff",
  display: "block",
  boxShadow: "0 1px 3px rgba(0,0,0,.2)",
};

export function modeBtn(on: boolean): CSSProperties {
  return {
    fontSize: "12px",
    fontWeight: 600,
    padding: "6px 12px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    background: on ? "#10B45F" : "transparent",
    color: on ? "#fff" : "rgba(255,255,255,.4)",
  };
}
