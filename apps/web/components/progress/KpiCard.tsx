"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type KpiTrend = "up" | "down" | "neutral";
export type KpiVariant = "success" | "danger" | "warning" | "neutral";

interface KpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
  delta?: string;
  trend?: KpiTrend;
  variant?: KpiVariant;
  sparklineData?: number[];
  icon?: React.ReactNode;
}

const VARIANT_STYLES: Record<KpiVariant, { border: string; accent: string; glow: string }> = {
  success: {
    border: "border-green-500/20",
    accent: "text-green-400",
    glow: "shadow-green-500/10",
  },
  danger: {
    border: "border-red-500/20",
    accent: "text-red-400",
    glow: "shadow-red-500/10",
  },
  warning: {
    border: "border-yellow-500/20",
    accent: "text-yellow-400",
    glow: "shadow-yellow-500/10",
  },
  neutral: {
    border: "border-white/5",
    accent: "text-[#A5A7AA]",
    glow: "shadow-white/5",
  },
};

export function KpiCard({
  label,
  value,
  subtitle,
  delta,
  trend = "neutral",
  variant = "neutral",
  sparklineData,
  icon,
}: KpiCardProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={`
        relative overflow-hidden
        bg-[#141516] border ${styles.border} rounded-2xl p-4
        shadow-lg ${styles.glow}
        transition-all duration-200
        hover:bg-[#1A1B1C] hover:border-white/10
        active:translate-y-1 active:brightness-90
      `}
    >
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#A5A7AA] uppercase tracking-wide">
            {label}
          </span>
          {icon && <div className="text-[#E2F163]">{icon}</div>}
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white leading-none">{value}</span>
          {delta && (
            <div className={`flex items-center gap-1 ${styles.accent}`}>
              {trend === "up" && <TrendingUp size={14} strokeWidth={2.5} />}
              {trend === "down" && <TrendingDown size={14} strokeWidth={2.5} />}
              {trend === "neutral" && <Minus size={14} strokeWidth={2.5} />}
              <span className="text-xs font-semibold">{delta}</span>
            </div>
          )}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs text-[#A5A7AA] leading-relaxed">{subtitle}</p>
        )}

        {/* Sparkline */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-8 flex items-end gap-0.5 px-4 pb-2 opacity-20">
            <Sparkline data={sparklineData} accent={variant} />
          </div>
        )}
      </div>
    </div>
  );
}

// Micro sparkline component
function Sparkline({ data, accent }: { data: number[]; accent: KpiVariant }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const accentColor = {
    success: "bg-green-400",
    danger: "bg-red-400",
    warning: "bg-yellow-400",
    neutral: "bg-[#E2F163]",
  }[accent];

  return (
    <>
      {data.map((value, idx) => {
        const height = ((value - min) / range) * 100;
        return (
          <div
            key={idx}
            className={`flex-1 ${accentColor} rounded-t transition-all duration-200`}
            style={{ height: `${Math.max(height, 5)}%` }}
          />
        );
      })}
    </>
  );
}
