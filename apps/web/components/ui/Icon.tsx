/**
 * Icon - Standardized icon wrapper for consistent sizing and styling
 */

import type { LucideIcon } from "lucide-react";

interface IconProps {
  as: LucideIcon;
  className?: string;
}

export function Icon({ as: IconComponent, className }: IconProps) {
  const classes = className ? `w-6 h-6 ${className}` : "w-6 h-6";

  return (
    <IconComponent
      className={classes}
      aria-hidden="true"
    />
  );
}
