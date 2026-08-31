import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/cn"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent-muted",
        ghost: "[a&]:hover:bg-accent-muted",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
        // Soft-tint semantic set: our own convention (components/ui/badge.tsx's
        // "tone" prop), not stock shadcn. Registry default/secondary/destructive
        // above are solid fills; these mirror the tinted-bg-plus-coloured-text
        // pattern ("bg-chart-2/10 text-chart-2") without inventing new colours --
        // each maps straight onto this app's own success/warn/error/accent tokens.
        neutral: "border-transparent bg-elevated text-secondary",
        success: "border-transparent bg-success-muted text-success",
        warn: "border-transparent bg-warn-muted text-warn",
        error: "border-transparent bg-error-muted text-error",
        accent: "border-transparent bg-accent-muted text-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
