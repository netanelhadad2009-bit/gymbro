'use client';

export type OnboardingHeaderProps = {
  step?: number;          // current step index (1-based)
  total?: number;         // total steps
  title: string | React.ReactNode;  // main title (Hebrew) - can be string or JSX
  subtitle?: string | React.ReactNode;      // optional supporting line
  className?: string;     // extra styling hooks if needed
};

export default function OnboardingHeader({
  step,
  total,
  title,
  subtitle,
  className = ""
}: OnboardingHeaderProps) {
  return (
    <header
      dir="rtl"
      className={`w-full flex flex-col gap-2 ${className}`}
    >
      {typeof step === "number" && typeof total === "number" && (
        <div className="text-white/60 text-xs md:text-sm text-center">
          שלב {step} מתוך {total}
        </div>
      )}

      {typeof title === 'string' ? (
        <h1 className="text-3xl font-bold text-white text-center">
          {title}
        </h1>
      ) : (
        <div className="text-3xl font-bold text-white text-center">
          {title}
        </div>
      )}

      {subtitle && (
        typeof subtitle === 'string' ? (
          <p className="text-white/80 text-[14px] md:text-base leading-relaxed text-center">
            {subtitle}
          </p>
        ) : (
          <div className="text-white/80 text-[14px] md:text-base leading-relaxed text-center">
            {subtitle}
          </div>
        )
      )}
    </header>
  );
}
