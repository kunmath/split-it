import Link from "next/link";
import type { ReactNode } from "react";

import type { GroupListItem } from "@/components/groups/group-list-data";
import { Money, toneTextClass, toneFromCents } from "@/components/ui/money";
import { SkeletonBlock } from "@/components/ui/skeletons";
import { iconMap } from "@/lib/icon-map";
import { cn } from "@/lib/utils";

/** Inset list container shared by Home and Groups. Rows are separated by hairlines. */
export function GroupList({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <ul className={cn("divide-y divide-white/5 overflow-hidden rounded-3xl bg-surface-container-low", className)}>
      {children}
    </ul>
  );
}

export function GroupRow({ group, highlighted = false }: { group: GroupListItem; highlighted?: boolean }) {
  const Icon = iconMap[group.icon] ?? iconMap.home;
  const tone = toneFromCents(group.balanceCents);

  return (
    <li>
      <Link
        href={group.href}
        className={cn(
          "flex min-h-[4.5rem] items-center gap-3 px-4 py-3 transition hover:bg-white/4 focus-visible:bg-white/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60",
          highlighted && "bg-primary/8",
        )}
      >
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-high",
            tone === "neutral" ? "text-on-surface-variant" : toneTextClass[tone],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-headline text-base font-semibold text-on-surface">{group.name}</span>
          <span className="block truncate text-xs text-on-surface-variant">
            {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
            {highlighted ? " · just created" : ""}
          </span>
        </span>

        {tone === "neutral" ? (
          <span className="shrink-0 text-sm text-on-surface-variant">settled up</span>
        ) : (
          <span className="shrink-0 text-right">
            <span className={cn("block text-xs", toneTextClass[tone])}>
              {tone === "positive" ? "you're owed" : "you owe"}
            </span>
            <Money
              cents={group.balanceCents}
              currency={group.currency}
              tone={tone}
              className="block font-headline text-base font-bold"
            />
          </span>
        )}
      </Link>
    </li>
  );
}

export function GroupRowSkeleton() {
  return (
    <li className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3">
      <SkeletonBlock className="h-11 w-11 shrink-0 rounded-xl" />
      <span className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-32 rounded-md" />
        <SkeletonBlock className="h-3 w-20 rounded-md" />
      </span>
      <span className="space-y-2">
        <SkeletonBlock className="ml-auto h-3 w-12 rounded-md" />
        <SkeletonBlock className="h-4 w-20 rounded-md" />
      </span>
    </li>
  );
}
