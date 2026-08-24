import Link from "next/link";

import { SurfaceCard } from "@/components/ui/surface-card";
import { iconMap } from "@/lib/icon-map";
import type { IconKey, StatTone } from "@/lib/placeholder-data";
import { cn } from "@/lib/utils";

type CompactGroupCardProps = {
  href: string;
  icon: IconKey;
  name: string;
  memberLabel: string;
  balanceLabel: string;
  balanceTone: StatTone;
  highlighted?: boolean;
};

export function CompactGroupCard({
  href,
  icon,
  name,
  memberLabel,
  balanceLabel,
  balanceTone,
  highlighted = false,
}: CompactGroupCardProps) {
  const Icon = iconMap[icon];

  return (
    <Link href={href} className="group block sm:hidden">
      <SurfaceCard
        variant="high"
        className={cn(
          "rounded-[1.25rem] p-3 transition duration-200 hover:bg-surface-bright",
          highlighted && "ring-1 ring-primary/45 shadow-[0_22px_50px_rgba(78,222,163,0.14)]",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.85rem] bg-surface-container-low text-on-surface-variant">
            <Icon
              className={cn(
                "h-4.5 w-4.5",
                balanceTone === "negative" ? "text-secondary" : "text-primary",
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-headline text-base font-bold tracking-tight text-on-surface">
              {name}
            </h3>
            <p className="truncate text-xs text-on-surface-variant">{memberLabel}</p>
          </div>
          <span
            className={cn(
              "max-w-28 shrink-0 truncate rounded-full px-2.5 py-1 font-headline text-sm font-bold",
              balanceTone === "positive" && "bg-primary/12 text-primary",
              balanceTone === "negative" && "bg-secondary/14 text-secondary",
              balanceTone === "neutral" && "bg-white/6 text-on-surface-variant",
            )}
          >
            {balanceLabel}
          </span>
        </div>
      </SurfaceCard>
    </Link>
  );
}
