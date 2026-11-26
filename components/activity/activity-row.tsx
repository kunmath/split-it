import { HandCoins } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Money } from "@/components/ui/money";
import { getExpenseIconKey } from "@/lib/expense-icons";
import { formatMoneyFromCents } from "@/lib/format";
import { iconMap } from "@/lib/icon-map";
import { cn } from "@/lib/utils";

import {
  actorLabel,
  getActivityOutcome,
  payeeLabel,
  payerLabel,
  type ActivityItem,
} from "./activity-model";

function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-on-surface">{children}</strong>;
}

function buildSentence(activity: ActivityItem): ReactNode {
  const money = formatMoneyFromCents(activity.amountCents, activity.groupCurrency);

  if (activity.kind === "settlement") {
    if (activity.action === "deleted") {
      return (
        <>
          <Strong>{actorLabel(activity)}</Strong> deleted a {money} payment from <Strong>{payerLabel(activity)}</Strong>{" "}
          to <Strong>{payeeLabel(activity)}</Strong>
        </>
      );
    }

    return (
      <>
        <Strong>{payerLabel(activity)}</Strong> paid <Strong>{payeeLabel(activity)}</Strong>{" "}
        <span className="whitespace-nowrap font-semibold text-on-surface tabular-nums">{money}</span>
      </>
    );
  }

  const verb = activity.action === "updated" ? "edited" : activity.action === "deleted" ? "deleted" : "added";
  const preposition = activity.action === "deleted" ? "from" : "in";

  return (
    <>
      <Strong>{actorLabel(activity)}</Strong> {verb} <Strong>{activity.description}</Strong> {preposition}{" "}
      <Strong>{activity.groupName}</Strong>
    </>
  );
}

function buildMeta(activity: ActivityItem) {
  const currency = activity.groupCurrency;

  if (activity.kind === "settlement") {
    return activity.groupName;
  }

  const parts = [
    `${formatMoneyFromCents(activity.amountCents, currency)} total`,
    `${activity.participantCount} ${activity.participantCount === 1 ? "person" : "people"}`,
  ];

  if (
    activity.action === "updated" &&
    activity.previousAmountCents != null &&
    activity.previousAmountCents !== activity.amountCents
  ) {
    parts.push(`was ${formatMoneyFromCents(activity.previousAmountCents, currency)}`);
  }

  return parts.join(" · ");
}

export function ActivityRow({ activity }: { activity: ActivityItem }) {
  const isSettlement = activity.kind === "settlement";
  const Icon = isSettlement ? HandCoins : iconMap[getExpenseIconKey(activity.description, activity.groupIconKey)];
  const outcome = getActivityOutcome(activity);
  const isDeleted = activity.action === "deleted";

  return (
    <Link
      href={`/groups/${activity.groupId}`}
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
        <span className="line-clamp-3 text-sm leading-5 text-on-surface-variant">
          {buildSentence(activity)}
        </span>
        <span className="mt-0.5 block truncate text-xs leading-5 text-on-surface-variant tabular-nums">
          {buildMeta(activity)}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end text-right">
        <span className="text-xs leading-4 text-on-surface-variant">{outcome.label}</span>
        {outcome.cents !== null ? (
          <Money
            cents={outcome.cents}
            currency={activity.groupCurrency}
            tone={outcome.tone}
            className={cn("font-headline text-[0.95rem] font-bold", outcome.tone === "none" && "text-on-surface-variant")}
          />
        ) : null}
      </span>
    </Link>
  );
}
