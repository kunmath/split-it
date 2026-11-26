import type { ReactNode } from "react";

import { SurfaceCard } from "@/components/ui/surface-card";
import { cn } from "@/lib/utils";

export type StatTone = "positive" | "negative" | "neutral";

type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
  tone?: StatTone;
  icon?: ReactNode;
  className?: string;
};

export function StatCard({
  label,
  value,
  detail,
  tone = "neutral",
  icon,
  className,
}: StatCardProps) {
  return (
    <SurfaceCard variant="low" className={cn("space-y-3 rounded-3xl p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-on-surface-variant">{label}</p>
        {icon ? (
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-on-surface-variant"
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="space-y-1">
        <p
          className={cn(
            "font-headline text-3xl font-bold tracking-tight tabular-nums",
            tone === "positive" && "text-primary",
            tone === "negative" && "text-secondary",
            tone === "neutral" && "text-on-surface",
          )}
        >
          {value}
        </p>
        {detail ? <p className="text-xs leading-5 text-on-surface-variant">{detail}</p> : null}
      </div>
    </SurfaceCard>
  );
}
