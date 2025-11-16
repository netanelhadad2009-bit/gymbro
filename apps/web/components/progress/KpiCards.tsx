import { formatKcal, formatGrams, formatKg, formatDelta } from "@/lib/progress/format";
import type { ProgressKPIs } from "@/lib/progress/queries";

type KpiCardsProps = {
  kpis: ProgressKPIs;
};

export function KpiCards({ kpis }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Today Calories */}
      <KpiCard
        label="היום"
        value={formatKcal(kpis.today.calories)}
        subtitle="קלוריות"
        icon="🔥"
      />

      {/* 7d Average */}
      <KpiCard
        label="ממוצע שבועי"
        value={formatKcal(kpis.avg7d.calories)}
        subtitle="קלוריות"
        icon="📊"
      />

      {/* 30d Average */}
      <KpiCard
        label="ממוצע חודשי"
        value={formatKcal(kpis.avg30d.calories)}
        subtitle="קלוריות"
        icon="📈"
      />

      {/* Weight Trend */}
      <KpiCard
        label="משקל נוכחי"
        value={formatKg(kpis.weight.current)}
        subtitle={
          kpis.weight.delta7d !== null
            ? `${formatDelta(kpis.weight.delta7d)} שבוע`
            : "אין נתונים"
        }
        icon={kpis.weight.trend === "down" ? "↓" : kpis.weight.trend === "up" ? "↑" : "→"}
      />
    </div>
  );
}

type KpiCardProps = {
  label: string;
  value: string;
  subtitle: string;
  icon: string;
};

function KpiCard({ label, value, subtitle, icon }: KpiCardProps) {
  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-neutral-400">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-neutral-500">{subtitle}</div>
    </div>
  );
}
