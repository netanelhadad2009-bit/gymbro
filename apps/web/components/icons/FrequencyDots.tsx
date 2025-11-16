import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

export const Dot1Icon = ({ size = 24, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props} aria-hidden>
    <circle cx="12" cy="12" r="5" fill="currentColor" />
  </svg>
);

export const Dot3Icon = ({ size = 24, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props} aria-hidden>
    <circle cx="8" cy="12" r="4" fill="currentColor" />
    <circle cx="16" cy="8" r="3.5" fill="currentColor" opacity="0.9" />
    <circle cx="16" cy="16" r="3.5" fill="currentColor" opacity="0.9" />
  </svg>
);

export const Dot6Icon = ({ size = 24, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props} aria-hidden>
    {/* 2x3 grid */}
    {[6, 12, 18].map((y, i) => (
      <React.Fragment key={i}>
        {[8, 16].map((x, j) => (
          <circle key={`${i}-${j}`} cx={x} cy={y} r={2.8} fill="currentColor" />
        ))}
      </React.Fragment>
    ))}
  </svg>
);
