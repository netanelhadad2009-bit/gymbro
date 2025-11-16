"use client";

export function KpiCardSkeleton() {
  return (
    <div className="bg-[#141516] border border-white/5 rounded-2xl p-4 animate-pulse">
      <div className="space-y-3">
        {/* Label */}
        <div className="h-3 w-20 bg-white/10 rounded" />

        {/* Value */}
        <div className="h-8 w-24 bg-white/10 rounded" />

        {/* Subtitle */}
        <div className="h-2 w-16 bg-white/10 rounded" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-[#141516] border border-white/5 rounded-2xl p-4 animate-pulse">
      <div className="space-y-4">
        {/* Title */}
        <div className="h-4 w-32 bg-white/10 rounded" />

        {/* Chart area */}
        <div className="h-48 bg-white/5 rounded-xl flex items-end gap-2 p-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-white/10 rounded-t"
              style={{ height: `${Math.random() * 70 + 30}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function InsightsCardSkeleton() {
  return (
    <div className="bg-[#141516] border border-white/5 rounded-2xl p-4 animate-pulse">
      <div className="space-y-3">
        {/* Title */}
        <div className="h-4 w-24 bg-white/10 rounded mb-4" />

        {/* Insights */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-2 h-2 bg-white/10 rounded-full mt-1.5" />
            <div className="flex-1 h-3 bg-white/10 rounded" style={{ width: `${Math.random() * 40 + 60}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0E0F10] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0E0F10] border-b border-white/5 px-4 pt-6 pb-4">
        <div className="space-y-4 animate-pulse">
          <div>
            <div className="h-7 w-32 bg-white/10 rounded mb-2" />
            <div className="h-4 w-40 bg-white/10 rounded" />
          </div>
          <div className="h-12 bg-[#141516] rounded-full" />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>

        {/* Charts */}
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />

        {/* Insights */}
        <InsightsCardSkeleton />
      </div>
    </div>
  );
}
