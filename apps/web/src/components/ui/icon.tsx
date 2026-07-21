import type { LucideIcon } from "lucide-react";

interface IconProps {
  icon: LucideIcon;
  label?: string;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ icon: Glyph, label, size = 20, strokeWidth = 1.8 }: IconProps) {
  return (
    <Glyph
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      size={size}
      strokeWidth={strokeWidth}
    />
  );
}
