/**
 * ProgressBar - Premium animated progress indicator
 */

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="space-y-1">
      {label && (
        <div className="text-xs text-white/60 font-medium">{label}</div>
      )}
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${clampedValue}%`,
            background: "linear-gradient(90deg, #E2F163, #c7ff4a)"
          }}
        />
      </div>
      <div className="text-xs text-white/40 font-bold text-left">
        {Math.round(clampedValue)}%
      </div>
    </div>
  );
}
