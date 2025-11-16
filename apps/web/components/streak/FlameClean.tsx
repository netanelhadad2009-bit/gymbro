/**
 * FlameClean - Fire emoji SVG with animations
 * Using the standard fire emoji design with FitJourney green colors
 */

import React from "react";

export default function FlameClean({
  width = 260,
  className,
}: {
  width?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        width,
        height: "auto",
        display: "inline-block",
        overflow: "visible",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox="0 0 128 128"
        style={{ overflow: "visible" }}
      >
        <defs>
          <filter id="fireGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <style>{`
            .fire-outer {
              animation: sway 3s ease-in-out infinite;
              transform-origin: 64px 110px;
              transform-box: fill-box;
            }
            .fire-inner {
              animation: flicker 0.4s ease-in-out infinite;
              transform-origin: 68px 106px;
              transform-box: fill-box;
            }

            @keyframes sway {
              0%, 100% { transform: rotate(-2deg) scaleY(1); }
              50% { transform: rotate(2deg) scaleY(1.03); }
            }

            @keyframes flicker {
              0%, 100% { opacity: 0.9; transform: translateY(0) scale(1); }
              50% { opacity: 1; transform: translateY(-1px) scale(1.02); }
            }

            @media (prefers-reduced-motion: reduce) {
              .fire-outer, .fire-inner { animation: none !important; }
            }
          `}</style>
        </defs>

        {/* Outer flame - Darker Green */}
        <path
          className="fire-outer"
          fill="#B8D645"
          filter="url(#fireGlow)"
          d="M98.59 51.16c-4.23.92-7.88 3.28-9.59 7.35c-1.03 2.47-2.47 8.85-6.42 7.2c-1.89-.78-1.86-3.49-1.64-5.18c.47-3.47 2.03-6.64 3.1-9.94c1.1-3.42 2.05-6.86 2.73-10.4c2.28-11.72 1.65-25.22-6.64-34.59C78.73 4 75.2.3 72.87.22c-1.44-.04-.02 1.66.38 2.23c.81 1.17 1.49 2.44 2.01 3.77c6.13 15.64-8.98 27.55-18.91 36.82c-4.76 4.45-8.56 9.17-11.98 14.68c-.34.53-1.09 2.31-2.06 1.94c-1.15-.44-1.27-3.07-1.63-4.05c-.68-1.88-1.73-3.93-3.08-5.4c-2.61-2.86-6.26-4.79-10.21-4.53c-.15.01-.58.08-1.11.2c-.83.18-3.05.47-2.45 1.81c.31.69 1.22.63 1.87.82c8.34 2.56 8.15 11.3 6.8 18.32c-2.44 12.78-9.2 24.86-4.4 38c5.66 15.49 23.38 25.16 39.46 22.5c4.39-.72 9.45-2.14 13.39-4.26c4.19-2.26 8.78-5.35 12.05-8.83c4.21-4.47 6.89-10.2 7.68-16.27c.93-7.02-1.31-13.64-3.35-20.27c-2.46-8-5.29-21.06 4.93-24.97c.5-.2 1.5-.35 1.85-.88c1.3-1.94-4.94-.81-5.52-.69"
        />

        {/* Inner flame - Muted Light Green */}
        <path
          className="fire-inner"
          fill="#D8E8A0"
          d="M68.13 106.07c2.12 1.78 5.09.91 7.09-.61c1.07-.81 1.99-1.85 2.59-3.06c.25-.52.54-1.18.54-1.77c0-.79-.47-1.57-.27-2.38c1.68-.33 3.76 4.5 3.97 5.62c1.68 8.83-6.64 16.11-14.67 17.52c-13.55 2.37-21.34-9.5-19.78-20.04c.97-6.56 5.37-11.07 9.85-15.57c3.71-3.73 7.15-6.93 8.35-11.78c.21-.86.16-2.18-.09-3.03c-.21-.73-.61-1.4-.63-2.19c-.06-1.66 1.55.51 1.92.93c4.46 5.03 5.73 12.46 4.54 18.96c-.77 4.2-3.77 7.2-4.82 11.22c-.61 2.29-.55 4.52 1.41 6.18"
        />
      </svg>
    </div>
  );
}
