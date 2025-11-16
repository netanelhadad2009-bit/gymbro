function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        "animate-pulse rounded-md bg-neutral-800/50",
        className
      ].filter(Boolean).join(" ")}
      {...props}
    />
  )
}

export { Skeleton }
