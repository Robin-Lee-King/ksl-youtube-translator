import logoImg from "@/imports/______v1_20260904-1.png";

interface GongnongLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function GongnongLogo({ size = "md", className = "" }: GongnongLogoProps) {
  const heights: Record<string, number> = { sm: 28, md: 36, lg: 48 };
  const h = heights[size];
  return (
    <img
      src={logoImg}
      alt="공농"
      style={{ height: h, width: "auto" }}
      className={className}
    />
  );
}
