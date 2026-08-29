import Link from "next/link"
import React, { type CSSProperties, type ReactNode } from "react"

import { cn } from "@/lib/cn"

export interface ShimmerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string
  shimmerSize?: string
  borderRadius?: string
  shimmerDuration?: string
  background?: string
  className?: string
  children?: ReactNode
  /** Renders as a Next.js Link styled the same as the button, matching the
   *  href convention every other button in this codebase (components/ui/
   *  button.tsx) already uses. */
  href?: string
}

export const ShimmerButton = React.forwardRef<
  HTMLButtonElement,
  ShimmerButtonProps
>(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "0.05em",
      shimmerDuration = "3s",
      borderRadius = "100px",
      // Registry default was flat black -- this is our "glowing CTA"
      // treatment, so the base fill is our own accent green rather than a
      // color this component invented, with the shimmer travelling over it.
      background = "var(--accent)",
      className,
      children,
      href,
      ...props
    },
    ref
  ) => {
    // Polymorphic root (button vs. Link) means TypeScript can't narrow the
    // shared prop set between the two element types -- cast to sidestep
    // that rather than duplicating this whole render for each tag.
    const Comp = (href ? Link : "button") as React.ElementType;
    return (
      <Comp
        href={href}
        style={
          {
            "--spread": "90deg",
            "--shimmer-color": shimmerColor,
            "--radius": borderRadius,
            "--speed": shimmerDuration,
            "--cut": shimmerSize,
            "--bg": background,
          } as CSSProperties
        }
        className={cn(
          "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden [border-radius:var(--radius)] border border-white/10 px-6 py-3 whitespace-nowrap text-accent-fg [background:var(--bg)]",
          "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
          className
        )}
        ref={ref as never}
        {...props}
      >
        {/* spark container */}
        <div
          className={cn(
            "-z-30 blur-[2px]",
            "@container-[size] absolute inset-0 overflow-visible"
          )}
        >
          {/* spark */}
          <div className="animate-shimmer-slide absolute inset-0 aspect-[1] h-[100cqh] rounded-none [mask:none]">
            {/* spark before */}
            <div className="animate-spin-around absolute -inset-full w-auto [translate:0_0] rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))]" />
          </div>
        </div>
        {children}

        {/* Highlight */}
        <div
          className={cn(
            "absolute inset-0 size-full",

            "rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f]",

            // transition
            "transform-gpu transition-all duration-300 ease-in-out",

            // on hover
            "group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]",

            // on click
            "group-active:shadow-[inset_0_-10px_10px_#ffffff3f]"
          )}
        />

        {/* backdrop */}
        <div
          className={cn(
            "absolute inset-(--cut) -z-20 [border-radius:var(--radius)] [background:var(--bg)]"
          )}
        />
      </Comp>
    )
  }
)

ShimmerButton.displayName = "ShimmerButton"
