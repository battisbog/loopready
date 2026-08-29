import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button as ShadcnButton } from "@/components/ui/shadcn/button";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

// Every call site across the app keeps using these names (primary/secondary/
// ghost/danger, sm/md/lg) -- this file maps them onto the real shadcn Button's
// own variant/size vocabulary (components/ui/shadcn/button.tsx) rather than
// every one of those call sites needing to change.
const VARIANT_MAP: Record<ButtonVariant, "accent" | "outline" | "ghost" | "destructive-soft"> = {
  primary: "accent",
  secondary: "outline",
  ghost: "ghost",
  danger: "destructive-soft",
};

const SIZE_MAP: Record<ButtonSize, "sm" | "default" | "lg"> = {
  sm: "sm",
  md: "default",
  lg: "lg",
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  /** Renders a Next.js Link styled as a button. */
  href?: string;
  fullWidth?: boolean;
}

type Props = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps>;

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  fullWidth,
  ...rest
}: Props) {
  const classes = cn(fullWidth && "w-full", className);

  if (href) {
    return (
      <ShadcnButton
        asChild
        variant={VARIANT_MAP[variant]}
        size={SIZE_MAP[size]}
        className={classes}
      >
        <Link href={href}>{children}</Link>
      </ShadcnButton>
    );
  }

  return (
    <ShadcnButton
      variant={VARIANT_MAP[variant]}
      size={SIZE_MAP[size]}
      className={classes}
      {...rest}
    >
      {children}
    </ShadcnButton>
  );
}
