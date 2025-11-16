import * as React from "react"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <div
      ref={ref}
      className={[
        "relative h-2 w-full overflow-hidden rounded-full bg-neutral-800",
        className
      ].filter(Boolean).join(" ")}
      {...props}
    >
      <div
        className="h-full bg-[#E2F163] transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </div>
  )
)
Progress.displayName = "Progress"

export { Progress }
