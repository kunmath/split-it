"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { getMockGroupSceneData } from "@/components/groups/group-mock-data";
import { usePlaceholderMode } from "@/components/providers/app-providers";
import { MobileTopBar } from "@/components/shell/mobile-top-bar";
import { PageContainer } from "@/components/shell/page-container";
import { buttonVariants } from "@/components/ui/button";
import { ScreenState } from "@/components/ui/screen-state";
import { SkeletonBlock } from "@/components/ui/skeletons";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

import {
  ACTIVITY_FILTERS,
  type ActivityFilter,
  type ActivityItem,
  groupActivitiesByDay,
  matchesFilter,
} from "./activity-model";
import { ActivityRow } from "./activity-row";
import { buildMockActivityFeed } from "./mock-activity";

export function ActivityScreen() {
  const { mode } = usePlaceholderMode();

  if (mode !== "live") {
    return <MockActivityScreen />;
  }

  return <LiveActivityScreen />;
}

function MockActivityScreen() {
  const [activities] = useState(() => buildMockActivityFeed(getMockGroupSceneData));

  return <ActivityScene activities={activities} />;
}

function LiveActivityScreen() {
  const currentUser = useQuery(api.users.current);
  const activities = useQuery(api.activity.listForCurrentUser, currentUser ? {} : "skip");

  if (currentUser === null) {
    return (
      <ActivityFrame>
        <ScreenState
          state="loading"
          title="Finishing setup"
          description="Your account is signed in and still syncing. Refresh in a moment if this persists."
        />
      </ActivityFrame>
    );
  }

  if (currentUser === undefined || activities === undefined) {
    return (
      <ActivityFrame>
        <ActivitySkeleton />
      </ActivityFrame>
    );
  }

  return <ActivityScene activities={activities} />;
}

function ActivityFrame({ children }: { children: ReactNode }) {
  return (
    <PageContainer size="narrow">
      <MobileTopBar variant="tab" title="Activity" />
      <header className="mb-6 hidden lg:block">
        <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface">Activity</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Expenses and payments you were part of, across all your groups.
        </p>
      </header>
      {children}
    </PageContainer>
  );
}

function getLocalDayStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Start of the local day, updated at midnight so "Today"/"Yesterday" headings roll over. */
function useLocalDayStart() {
  const [dayStart, setDayStart] = useState(getLocalDayStart);

  useEffect(() => {
    const nextMidnight = new Date(dayStart);
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    const timeout = window.setTimeout(
      () => setDayStart(getLocalDayStart()),
      Math.max(0, nextMidnight.getTime() - Date.now()) + 1_000,
    );

    return () => window.clearTimeout(timeout);
  }, [dayStart]);

  return dayStart;
}

function ActivityScene({ activities }: { activities: ActivityItem[] }) {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const dayStart = useLocalDayStart();
  const dayGroups = useMemo(
    () =>
      groupActivitiesByDay(
        activities.filter((activity) => matchesFilter(activity, filter)),
        dayStart,
      ),
    [activities, filter, dayStart],
  );

  if (activities.length === 0) {
    return (
      <ActivityFrame>
        <ScreenState
          state="empty"
          title="No activity yet"
          description="Expenses and payments from your groups will show up here."
          actions={
            <Link href="/groups" className={buttonVariants({ variant: "primary" })}>
              Go to groups
            </Link>
          }
        />
      </ActivityFrame>
    );
  }

  return (
    <ActivityFrame>
      <div role="group" aria-label="Filter activity" className="mb-4 flex gap-2">
        {ACTIVITY_FILTERS.map((option) => {
          const active = option.value === filter;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(option.value)}
              className={cn(
                "relative h-9 rounded-full px-4 text-sm font-medium transition after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                active
                  ? "bg-on-surface text-surface"
                  : "bg-surface-container-high text-on-surface-variant hover:text-on-surface",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {dayGroups.length === 0 ? (
        <p className="rounded-3xl bg-surface-container-low px-5 py-8 text-center text-sm text-on-surface-variant">
          {filter === "payments" ? "No payments recorded yet." : "No expenses recorded yet."}
        </p>
      ) : (
        <div className="space-y-6">
          {dayGroups.map((dayGroup) => (
            <section key={dayGroup.key} aria-labelledby={`activity-day-${dayGroup.key}`} className="space-y-2">
              <h2
                id={`activity-day-${dayGroup.key}`}
                className="px-1 text-sm font-semibold text-on-surface-variant"
              >
                {dayGroup.label}
              </h2>
              <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-3xl bg-surface-container-low">
                {dayGroup.items.map((activity) => (
                  <li key={activity.id}>
                    <ActivityRow activity={activity} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {filter === "all" ? (
            <p className="px-1 pb-2 text-center text-xs text-on-surface-variant">
              Showing your {activities.length} most recent transactions.
            </p>
          ) : null}
        </div>
      )}
    </ActivityFrame>
  );
}

function ActivitySkeleton() {
  return (
    <div role="status" aria-label="Loading activity" className="space-y-6">
      <div className="flex gap-2">
        <SkeletonBlock className="h-9 w-14 rounded-full" />
        <SkeletonBlock className="h-9 w-24 rounded-full" />
        <SkeletonBlock className="h-9 w-24 rounded-full" />
      </div>
      {[3, 2].map((rows, groupIndex) => (
        <div key={groupIndex} className="space-y-2">
          <SkeletonBlock className="h-4 w-20 rounded-md" />
          <div className="space-y-1 rounded-3xl bg-surface-container-low p-2">
            {Array.from({ length: rows }, (_, index) => (
              <div key={index} className="flex items-center gap-3 px-2 py-2.5">
                <SkeletonBlock className="h-11 w-11 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-4 w-4/5 rounded-md" />
                  <SkeletonBlock className="h-3 w-2/5 rounded-md" />
                </div>
                <div className="space-y-2">
                  <SkeletonBlock className="ml-auto h-3 w-12 rounded-md" />
                  <SkeletonBlock className="h-4 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
