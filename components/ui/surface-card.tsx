import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type SurfaceVariant = "low" | "high" | "glass" | "hero";

type SurfaceCardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: SurfaceVariant;
};

export function SurfaceCard({
  className,
  variant = "high",
  ...props
}: SurfaceCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[2rem] p-6 text-on-surface",
        variant === "low" && "bg-surface-container-low",
        variant === "high" && "bg-surface-container-high",
        variant === "glass" && "glass-panel",
        variant === "hero" &&
          "bg-[radial-gradient(circle_at_top_right,rgba(78,222,163,0.14),transparent_38%),linear-gradient(180deg,rgba(53,53,52,0.9),rgba(28,27,27,0.98))]",
        className,
      )}
      {...props}
    />
  );
}
