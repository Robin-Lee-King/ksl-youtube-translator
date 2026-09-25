import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function TextField({ label, error, id, style, ...rest }: TextFieldProps) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#747C78", marginBottom: "6px" }}
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className="gn-input"
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: "1px solid #E5E8E7",
          borderRadius: "12px",
          padding: "12px 16px",
          fontSize: "14px",
          ...style,
        }}
        {...rest}
      />
      {error && <p style={{ fontSize: "12px", color: "#EF4444", margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}
