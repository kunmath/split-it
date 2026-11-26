import type { ActivityPlaceholder } from "@/lib/placeholder-data";

export type ActivityItem = ActivityPlaceholder & {
  action?: "created" | "updated" | "deleted";
  expenseId?: string | null;
  actorName?: string;
  actorIsCurrentUser?: boolean;
  previousDescription?: string | null;
  previousAmountCents?: number | null;
};

export type ActivityFilter = "all" | "expenses" | "payments";

export const ACTIVITY_FILTERS: Array<{ value: ActivityFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "expenses", label: "Expenses" },
  { value: "payments", label: "Payments" },
];

export function matchesFilter(activity: ActivityItem, filter: ActivityFilter) {
  if (filter === "all") {
    return true;
  }

  return filter === "payments" ? activity.kind === "settlement" : activity.kind === "expense";
}

export type ActivityDayGroup = {
  key: string;
  label: string;
  items: ActivityItem[];
};

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function formatDayLabel(timestamp: number, now = Date.now()) {
  const dayDiff = Math.round((startOfDay(now) - startOfDay(timestamp)) / 86_400_000);

  if (dayDiff === 0) {
    return "Today";
  }

  if (dayDiff === 1) {
    return "Yesterday";
  }

  const sameYear = new Date(timestamp).getFullYear() === new Date(now).getFullYear();

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(timestamp);
}

function formatDayKey(timestamp: number) {
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

export function groupActivitiesByDay(activities: ActivityItem[], now = Date.now()): ActivityDayGroup[] {
  const groups = new Map<string, ActivityDayGroup>();

  for (const activity of activities) {
    const key = formatDayKey(activity.expenseAt);
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.items.push(activity);
      continue;
    }

    groups.set(key, { key, label: formatDayLabel(activity.expenseAt, now), items: [activity] });
  }

  return Array.from(groups.values());
}

/** First name for compact sentences ("Sarah added …"). */
export function shortName(name: string | null | undefined) {
  const trimmed = name?.trim();

  if (!trimmed) {
    return "A member";
  }

  return trimmed.split(/\s+/)[0]!;
}

/** Who performed the event: the explicit actor when known, otherwise the payer. */
export function actorLabel(activity: ActivityItem) {
  if (activity.actorName !== undefined) {
    return activity.actorIsCurrentUser ? "You" : shortName(activity.actorName);
  }

  return activity.paidByCurrentUser ? "You" : shortName(activity.paidByName);
}

export function payerLabel(activity: ActivityItem) {
  return activity.paidByCurrentUser ? "You" : shortName(activity.paidByName);
}

export function payeeLabel(activity: ActivityItem) {
  if (activity.counterpartyIsCurrentUser) {
    return "you";
  }

  return shortName(activity.counterpartyName);
}

export type ActivityOutcome = {
  label: string;
  cents: number | null;
  tone: "positive" | "negative" | "neutral" | "none";
};

/** Right-hand summary: what this event means for the viewer, in words + amount. */
export function getActivityOutcome(activity: ActivityItem): ActivityOutcome {
  if (activity.action === "deleted") {
    return { label: "deleted", cents: activity.amountCents, tone: "none" };
  }

  if (activity.kind === "settlement") {
    if (activity.paidByCurrentUser) {
      return { label: "you paid", cents: activity.amountCents, tone: "negative" };
    }

    if (activity.counterpartyIsCurrentUser) {
      return { label: "you received", cents: activity.amountCents, tone: "positive" };
    }

    return { label: "not involved", cents: null, tone: "neutral" };
  }

  if (activity.currentUserNetCents > 0) {
    return { label: "you get back", cents: activity.currentUserNetCents, tone: "positive" };
  }

  if (activity.currentUserNetCents < 0) {
    return { label: "you owe", cents: activity.currentUserNetCents, tone: "negative" };
  }

  return { label: "not involved", cents: null, tone: "neutral" };
}
