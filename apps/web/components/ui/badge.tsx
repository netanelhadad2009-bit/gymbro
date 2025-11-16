import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "destructive" | "outline"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClasses = {
    default: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary/10 text-secondary-foreground border-secondary/20",
    success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    outline: "text-foreground border-border",
  }

  return (
    <div
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variantClasses[variant],
        className
      ].filter(Boolean).join(" ")}
      {...props}
    />
  )
}

export { Badge }
