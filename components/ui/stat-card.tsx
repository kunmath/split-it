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
    <SurfaceCard variant="high" className={cn("min-h-44 space-y-8 rounded-[2.25rem] p-7", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-on-surface-variant">
        {icon}
      </div>
      <div className="space-y-3">
        <p className="text-[0.68rem] uppercase tracking-[0.28em] text-on-surface-variant">{label}</p>
        <div className="flex flex-wrap items-end gap-2">
          <span
            className={cn(
              "font-headline text-4xl font-extrabold tracking-tight sm:text-5xl",
              tone === "positive" && "text-primary",
              tone === "negative" && "text-secondary",
              tone === "neutral" && "text-on-surface",
            )}
          >
            {value}
          </span>
          {detail ? (
            <span
              className={cn(
                "pb-2 text-sm",
                tone === "positive" && "text-primary/70",
                tone === "negative" && "text-secondary/70",
                tone === "neutral" && "text-on-surface-variant",
              )}
            >
              {detail}
            </span>
          ) : null}
        </div>
      </div>
    </SurfaceCard>
  );
}
