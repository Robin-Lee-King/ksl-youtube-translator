interface LoadingProps {
  size?: number;
  color?: string;
}

// Matches the `gn-spin` keyframe already defined in src/index.css.
export default function Loading({ size = 12, color = "#10B45F" }: LoadingProps) {
  return (
    <span
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: `2px solid ${color}`,
        borderTopColor: "transparent",
        borderRadius: "999px",
        display: "inline-block",
        animation: "gn-spin .8s linear infinite",
      }}
    />
  );
}
