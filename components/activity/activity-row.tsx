import { HandCoins } from "lucide-react";
import Link from "next/link";

import { Money, toneTextClass } from "@/components/ui/money";
import { getExpenseIconKey } from "@/lib/expense-icons";
import { iconMap } from "@/lib/icon-map";
import { cn } from "@/lib/utils";

import { activityHref, activityMeta, activityTitle, getActivityOutcome, type ActivityItem } from "./activity-model";

export function ActivityRow({ activity }: { activity: ActivityItem }) {
  const isSettlement = activity.kind === "settlement";
  const Icon = isSettlement ? HandCoins : iconMap[getExpenseIconKey(activity.description, activity.groupIconKey)];
  const outcome = getActivityOutcome(activity);
  const isDeleted = activity.action === "deleted";

  return (
    <Link
      href={activityHref(activity)}
      className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3 transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          isSettlement ? "bg-primary/12 text-primary" : "bg-surface-container-highest text-on-surface-variant",
          isDeleted && "opacity-60",
        )}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "line-clamp-2 font-headline text-[0.95rem] font-semibold leading-5",
            isDeleted ? "text-on-surface-variant" : "text-on-surface",
          )}
        >
          {activityTitle(activity)}
        </span>
        <span className="mt-0.5 line-clamp-2 text-xs leading-4 text-on-surface-variant tabular-nums">
          {activityMeta(activity)}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end text-right">
        <span
          className={cn("text-xs leading-4", outcome.tone === "none" ? "text-on-surface-variant" : toneTextClass[outcome.tone])}
        >
          {outcome.label}
        </span>
        {outcome.cents !== null ? (
          <Money
            cents={outcome.cents}
            currency={activity.groupCurrency}
            tone={outcome.tone}
            className={cn(
              "font-headline text-[0.95rem] font-bold",
              outcome.tone === "none" && "text-on-surface-variant",
              isSettlement && outcome.tone === "neutral" && "text-on-surface",
            )}
          />
        ) : null}
      </span>
    </Link>
  );
}
