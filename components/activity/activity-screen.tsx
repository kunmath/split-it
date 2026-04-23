"use client";

import { useQuery } from "convex/react";
import { HandCoins } from "lucide-react";
import Link from "next/link";

import { usePlaceholderMode } from "@/components/providers/app-providers";
import { PageContainer } from "@/components/shell/page-container";
import { buttonVariants } from "@/components/ui/button";
import { ScreenState } from "@/components/ui/screen-state";
import { SurfaceCard } from "@/components/ui/surface-card";
import { api } from "@/convex/_generated/api";
import { getExpenseIconKey } from "@/lib/expense-icons";
import { formatMoneyFromCents, formatSignedMoneyFromCents } from "@/lib/format";
import { iconMap } from "@/lib/icon-map";
import { activityFeed, type ActivityPlaceholder } from "@/lib/placeholder-data";
import { cn } from "@/lib/utils";

type ActivityItem = ActivityPlaceholder;

type ActivityDayGroup = {
  key: string;
  label: string;
  items: ActivityItem[];
};

function formatDayLabel(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  }).format(timestamp);
}

function formatDayKey(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDesktopDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(timestamp);
}

function groupActivitiesByDay(activities: ActivityItem[]): ActivityDayGroup[] {
  const groups = new Map<string, ActivityDayGroup>();

  for (const activity of activities) {
    const key = formatDayKey(activity.expenseAt);
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.items.push(activity);
      continue;
    }

    groups.set(key, {
      key,
      label: formatDayLabel(activity.expenseAt),
      items: [activity],
    });
  }

  return Array.from(groups.values());
}

function buildActivityHref(activity: ActivityItem) {
  if (activity.kind === "settlement") {
    return `/groups/${activity.groupId}`;
  }

  return `/groups/${activity.groupId}/expenses/${activity.id}/edit`;
}

function buildSettlementTitle(activity: ActivityItem) {
  const counterpartyLabel = activity.counterpartyName ?? "a member";

  if (activity.paidByCurrentUser) {
    return `You paid ${counterpartyLabel}`;
  }

  if (activity.counterpartyIsCurrentUser) {
    return `${activity.paidByName} paid you`;
  }

  return `${activity.paidByName} paid ${counterpartyLabel}`;
}

function buildMobileMeta(activity: ActivityItem) {
  if (activity.kind === "settlement") {
    if (activity.paidByCurrentUser) {
      return `Settlement recorded • ${activity.groupName}`;
    }

    if (activity.counterpartyIsCurrentUser) {
      return `Settlement received • ${activity.groupName}`;
    }

    return `Settlement between members • ${activity.groupName}`;
  }

  return `Paid by ${activity.paidByName} • ${activity.groupName}`;
}

function buildDesktopDetail(activity: ActivityItem) {
  if (activity.kind === "settlement") {
    if (activity.paidByCurrentUser) {
      return "Settlement recorded";
    }

    if (activity.counterpartyIsCurrentUser) {
      return "Settlement received";
    }

    return "Settlement between members";
  }

  return `${activity.participantCount} participant${activity.participantCount === 1 ? "" : "s"}`;
}

function getAmountTone(valueCents: number) {
  if (valueCents > 0) {
    return "positive" as const;
  }

  if (valueCents < 0) {
    return "negative" as const;
  }

  return "neutral" as const;
}

function mapMockActivities(): ActivityItem[] {
  return activityFeed;
}

export function ActivityScreen() {
  const { mode } = usePlaceholderMode();

  if (mode !== "live") {
    return <ActivityScene activities={mapMockActivities()} isMock />;
  }

  return <LiveActivityScreen />;
}

function LiveActivityScreen() {
  const currentUser = useQuery(api.users.current);
  const activities = useQuery(
    api.activity.listForCurrentUser,
    currentUser ? {} : "skip",
  );

  if (currentUser === null) {
    return (
      <PageContainer className="space-y-6">
        <ScreenState
          state="loading"
          title="Syncing your workspace"
          description="Your account is authenticated, but the ledger record is still finishing setup. Refresh in a moment if this state persists."
        />
      </PageContainer>
    );
  }

  if (currentUser === undefined || activities === undefined) {
    return (
      <PageContainer className="space-y-6">
        <ScreenState
          state="loading"
          title="Loading activity"
          description="Pulling the latest transactions you were part of across every active group."
        />
      </PageContainer>
    );
  }

  if (activities.length === 0) {
    return (
      <PageContainer className="space-y-6">
        <ScreenState
          state="empty"
          title="No activity yet"
          description="Expenses and settlements from the groups you join will appear here once you are part of a recorded transaction."
          actions={
            <Link
              href="/groups"
              className={buttonVariants({ variant: "primary", size: "lg" })}
            >
              Browse Groups
            </Link>
          }
        />
      </PageContainer>
    );
  }

  return <ActivityScene activities={activities} />;
}

function ActivityScene({
  activities,
  isMock = false,
}: {
  activities: ActivityItem[];
  isMock?: boolean;
}) {
  return (
    <PageContainer className="page-glow relative space-y-8 lg:space-y-10">
      <section className="space-y-3">
        <p className="text-[0.68rem] uppercase tracking-[0.28em] text-on-surface-variant">
          Activity
        </p>
        <div className="space-y-4 lg:flex lg:items-end lg:justify-between lg:gap-6 lg:space-y-0">
          <div>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface sm:text-5xl">
              Activity Feed
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant">
              Recent transactions across all groups
            </p>
          </div>
          <div className="rounded-full border border-white/6 bg-surface-container-low px-4 py-2 text-xs uppercase tracking-[0.22em] text-on-surface-variant">
            Latest 20 involved transactions
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-on-surface-variant">
            Showing the latest 20 transactions you were involved in.
            {isMock ? " Mock data preview." : ""}
          </p>
          <div className="hidden text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-on-surface-variant lg:block">
            {activities.length} visible
          </div>
        </div>

        <MobileActivityList activities={activities} />
        <DesktopActivityTable activities={activities} />
      </section>
    </PageContainer>
  );
}

function MobileActivityList({ activities }: { activities: ActivityItem[] }) {
  const dayGroups = groupActivitiesByDay(activities);

  return (
    <div className="space-y-6 lg:hidden">
      {dayGroups.map((dayGroup) => (
        <section key={dayGroup.key} className="space-y-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
            {dayGroup.label}
          </p>
          <div className="space-y-3">
            {dayGroup.items.map((activity) => (
              <MobileActivityRow key={activity.id} activity={activity} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MobileActivityRow({ activity }: { activity: ActivityItem }) {
  const isSettlement = activity.kind === "settlement";
  const Icon = isSettlement
    ? HandCoins
    : iconMap[getExpenseIconKey(activity.description, activity.groupIconKey)];
  const amountTone = getAmountTone(activity.currentUserNetCents);
  const detailLabel = isSettlement ? "Payment" : "Total";

  return (
    <Link
      href={buildActivityHref(activity)}
      className="group block rounded-[1.6rem] bg-surface-container-low px-4 py-4 transition hover:bg-surface-container-high"
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container-highest",
            isSettlement ? "text-primary" : "text-on-surface-variant",
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-headline text-base font-bold tracking-tight text-on-surface">
                {isSettlement ? buildSettlementTitle(activity) : activity.description}
              </p>
              <p className="mt-1 truncate text-xs text-on-surface-variant">
                {buildMobileMeta(activity)}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p
                className={cn(
                  "font-headline text-lg font-bold tracking-tight",
                  amountTone === "positive" && "text-primary",
                  amountTone === "negative" && "text-secondary",
                  amountTone === "neutral" && "text-on-surface",
                )}
              >
                {formatSignedMoneyFromCents(
                  activity.currentUserNetCents,
                  activity.groupCurrency,
                )}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                {detailLabel}:{" "}
                {formatMoneyFromCents(activity.amountCents, activity.groupCurrency)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function DesktopActivityTable({ activities }: { activities: ActivityItem[] }) {
  return (
    <div className="hidden space-y-3 lg:block">
      <SurfaceCard
        variant="low"
        className="rounded-[1.8rem] border border-white/[0.03] bg-surface-container-low/70 p-3 shadow-[0_22px_42px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
      >
        <div className="space-y-2">
          {activities.map((activity) => (
            <DesktopActivityRow key={activity.id} activity={activity} />
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}

function DesktopActivityRow({ activity }: { activity: ActivityItem }) {
  const isSettlement = activity.kind === "settlement";
  const Icon = isSettlement
    ? HandCoins
    : iconMap[getExpenseIconKey(activity.description, activity.groupIconKey)];
  const amountTone = getAmountTone(activity.currentUserNetCents);
  const detailLabel = isSettlement ? "Payment" : "Total";

  return (
    <Link
      href={buildActivityHref(activity)}
      className="group block rounded-[1.45rem] bg-surface-container-high px-5 py-4 transition hover:bg-surface-bright/80"
    >
      <div className="flex items-start gap-4">
        <div className="w-[64px] shrink-0 pt-0.5 text-sm text-on-surface-variant transition group-hover:text-on-surface">
          {formatDesktopDate(activity.expenseAt)}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-lowest ring-1 ring-white/5",
            isSettlement ? "text-primary" : "text-on-surface-variant",
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-4.5">
                <p className="truncate text-[1rem] font-semibold text-on-surface">
                  {isSettlement ? buildSettlementTitle(activity) : activity.description}
                </p>
                <span className="inline-flex max-w-full truncate rounded-full border border-white/[0.04] bg-white/[0.03] px-3 py-1 text-[0.64rem] font-medium uppercase tracking-[0.16em] text-on-surface-variant/80">
                  {activity.groupName}
                </span>
              </div>
              <p className="mt-1 text-xs text-on-surface-variant">
                {buildDesktopDetail(activity)}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <div className="flex items-baseline justify-end gap-3">
                <p
                  className={cn(
                    "font-headline text-lg font-bold tracking-tight",
                    amountTone === "positive" && "text-primary",
                    amountTone === "negative" && "text-secondary",
                    amountTone === "neutral" && "text-on-surface",
                  )}
                >
                  {formatSignedMoneyFromCents(
                    activity.currentUserNetCents,
                    activity.groupCurrency,
                  )}
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                  {detailLabel}:{" "}
                  {formatMoneyFromCents(activity.amountCents, activity.groupCurrency)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
