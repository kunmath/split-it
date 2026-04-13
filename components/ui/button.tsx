import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "lg" | "icon";

type ButtonVariantOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: ButtonVariantOptions = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-headline text-sm font-semibold transition duration-200 active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
    variant === "primary" &&
      "bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-container))] text-on-primary shadow-[0_18px_50px_rgba(78,222,163,0.18)]",
    variant === "secondary" &&
      "border border-outline-variant/30 bg-surface-container-low text-secondary hover:bg-surface-container-high",
    variant === "ghost" && "border border-white/6 bg-transparent text-on-surface-variant hover:bg-white/4 hover:text-on-surface",
    size === "md" && "min-h-11 px-5",
    size === "lg" && "min-h-14 px-6 text-base",
    size === "icon" && "h-11 w-11 rounded-2xl",
    fullWidth && "w-full",
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonVariantOptions & {
    fullWidth?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, fullWidth, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonVariants({ variant, size, fullWidth, className })}
      {...props}
    />
  );
});
