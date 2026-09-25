import type { CSSProperties, ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  titleWeight?: CSSProperties["fontWeight"];
  description?: string;
  descriptionColor?: string;
  padding?: string;
  color?: string;
}

// No defaults on padding/color/titleWeight: each call site passes exactly what its original
// inline markup had (or omits it), so swapping in this component doesn't shift anything visually.
export default function EmptyState({ icon, title, titleWeight, description, descriptionColor, padding, color }: EmptyStateProps) {
  return (
    <div style={{ textAlign: "center", padding, color }}>
      {icon}
      <p style={{ fontSize: "14px", fontWeight: titleWeight, margin: 0 }}>{title}</p>
      {description && <p style={{ fontSize: "12px", color: descriptionColor, margin: "4px 0 0" }}>{description}</p>}
    </div>
  );
}
