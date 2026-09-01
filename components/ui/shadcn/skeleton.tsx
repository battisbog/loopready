import { cn } from "@/lib/cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      // bg-elevated, not the registry's bg-accent: --accent is now a
      // near-white neutral, so a solid accent fill would render skeletons as
      // bright white blocks rather than the quiet placeholder they should be.
      className={cn("animate-pulse rounded-md bg-elevated", className)}
      {...props}
    />
  )
}

export { Skeleton }
