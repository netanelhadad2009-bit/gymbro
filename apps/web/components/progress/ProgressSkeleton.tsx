export function ProgressSkeleton() {
  return (
    <div className="space-y-4 px-4 pb-24">
      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-neutral-900/80 border border-neutral-800 rounded-xl animate-pulse"
          />
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="h-64 bg-neutral-900/80 border border-neutral-800 rounded-xl animate-pulse" />

      {/* Another chart skeleton */}
      <div className="h-48 bg-neutral-900/80 border border-neutral-800 rounded-xl animate-pulse" />

      {/* Insights skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-3/4 bg-neutral-900/80 rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-neutral-900/80 rounded animate-pulse" />
        <div className="h-4 w-4/5 bg-neutral-900/80 rounded animate-pulse" />
      </div>
    </div>
  );
}
