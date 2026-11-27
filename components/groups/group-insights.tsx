import { ChevronDown } from "lucide-react";

import type { GroupSceneData } from "@/components/groups/group-types";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";

/** Spend breakdown from real group totals. Collapsed by default; tucked at the end of the page. */
export function GroupInsights({ group, className }: { group: GroupSceneData; className?: string }) {
  const { insights, groupCurrency: currency } = group;

  if (insights.totalSpendCents === 0) {
    return null;
  }

  return (
    <details className={cn("group/insights rounded-3xl bg-surface-container-low ring-1 ring-white/5", className)}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-3xl px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-on-surface">Spending</span>
          <span className="block text-xs text-on-surface-variant">
            <Money cents={insights.totalSpendCents} currency={currency} /> total across the group
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-on-surface-variant transition-transform group-open/insights:rotate-180"
        />
      </summary>

      <div className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-surface-container-high px-3 py-2.5">
            <dt className="text-xs text-on-surface-variant">Average expense</dt>
            <dd className="mt-0.5 font-headline text-base font-bold text-on-surface">
              <Money cents={insights.averageExpenseCents} currency={currency} />
            </dd>
          </div>
          <div className="rounded-2xl bg-surface-container-high px-3 py-2.5">
            <dt className="text-xs text-on-surface-variant">Largest expense</dt>
            <dd className="mt-0.5 font-headline text-base font-bold text-on-surface">
              <Money cents={insights.largestExpenseCents} currency={currency} />
            </dd>
            {insights.largestExpenseLabel ? (
              <dd className="truncate text-xs text-on-surface-variant">{insights.largestExpenseLabel}</dd>
            ) : null}
          </div>
        </dl>

        {insights.topContributors.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-on-surface-variant">Who paid the most</h3>
            <ul className="space-y-3">
              {insights.topContributors.map((member) => (
                <li key={member.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-on-surface">{member.name}</span>
                    <span className="shrink-0 text-xs text-on-surface-variant">
                      <Money cents={member.paidCents} currency={currency} /> · {member.percentOfSpend}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-highest">
                    <div className="h-full rounded-full bg-primary/80" style={{ width: `${member.percentOfSpend}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
}
