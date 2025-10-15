"use client";

type Props = {
  /** 0..100 – current slider percent */
  percent: number;
  /** Optional height of the animals row */
  height?: number; // px
};

export default function AnimalsOverSlider({ percent, height = 84 }: Props) {
  // clamp for safety
  const pct = Math.max(0, Math.min(100, percent));

  return (
    <div dir="rtl" className="w-full max-w-md mx-auto relative pointer-events-none" style={{ height }}>
      {/* Left (sloth) */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 opacity-80">
        <svg width="70" height="70" viewBox="0 0 70 70" fill="none" role="img" aria-label="איטי">
          <circle cx="35" cy="35" r="26" fill="#8B7355" opacity="0.3" />
          <circle cx="26" cy="30" r="3" fill="white" />
          <circle cx="44" cy="30" r="3" fill="white" />
          <path d="M26 42 Q35 44 44 42" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        </svg>
      </div>

      {/* Moving middle (rabbit) – centered at pct% */}
      <div
        className="absolute top-1/2 transition-all duration-200 ease-out"
        style={{
          left: `${pct}%`,
          transform: "translate(-50%, -50%)"
        }}
      >
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" role="img" aria-label="בינוני">
          <ellipse cx="30" cy="18" rx="4.5" ry="12" fill="#A0A0A0" opacity="0.4" />
          <ellipse cx="42" cy="18" rx="4.5" ry="12" fill="#A0A0A0" opacity="0.4" />
          <circle cx="36" cy="39" r="18" fill="#A0A0A0" opacity="0.4" />
          <circle cx="30" cy="36" r="3" fill="white" />
          <circle cx="42" cy="36" r="3" fill="white" />
          <circle cx="36" cy="42" r="2.25" fill="#FFB6C1" opacity="0.8" />
        </svg>
      </div>

      {/* Right (cheetah) */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-80">
        <svg width="88" height="70" viewBox="0 0 88 70" fill="none" role="img" aria-label="מהיר">
          <ellipse cx="44" cy="35" rx="32" ry="24" fill="#D4A574" opacity="0.3" />
          <circle cx="33" cy="32" r="3" fill="white" />
          <circle cx="55" cy="32" r="3" fill="white" />
          <path d="M33 44 Q44 42 55 44" stroke="white" strokeWidth="3" strokeLinecap="round" />
          <circle cx="28" cy="26" r="3" fill="#8B4513" opacity="0.4" />
          <circle cx="44" cy="23" r="3" fill="#8B4513" opacity="0.4" />
          <circle cx="60" cy="26" r="3" fill="#8B4513" opacity="0.4" />
        </svg>
      </div>
    </div>
  );
}
