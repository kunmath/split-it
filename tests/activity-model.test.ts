import { describe, expect, it } from "vitest";

import {
  actorLabel,
  formatDayLabel,
  getActivityOutcome,
  groupActivitiesByDay,
  matchesFilter,
  type ActivityItem,
} from "../components/activity/activity-model";
import { MOCK_ACTIVITY_PICKS, buildMockActivityFeed } from "../components/activity/mock-activity";
import type { GroupExpense, GroupSceneData } from "../components/groups/group-types";

const NOW = new Date(2026, 10, 26, 15, 0, 0).getTime();
const hoursBefore = (hours: number) => NOW - hours * 3_600_000;

function activity(overrides: Partial<ActivityItem>): ActivityItem {
  return {
    id: "a",
    groupId: "g",
    groupName: "Trip",
    groupCurrency: "INR",
    groupIconKey: "plane",
    description: "Dinner",
    amountCents: 900,
    expenseAt: NOW,
    kind: "expense",
    paidByName: "Sarah Jenkins",
    paidByCurrentUser: false,
    currentUserNetCents: -300,
    participantCount: 3,
    counterpartyName: null,
    counterpartyIsCurrentUser: false,
    ...overrides,
  };
}

describe("activity day labels", () => {
  it("uses Today / Yesterday, then short dates with a year only for past years", () => {
    expect(formatDayLabel(hoursBefore(1), NOW)).toBe("Today");
    expect(formatDayLabel(hoursBefore(20), NOW)).toBe("Yesterday");
    expect(formatDayLabel(new Date(2026, 9, 24).getTime(), NOW)).toBe("Oct 24");
    expect(formatDayLabel(new Date(2024, 9, 24).getTime(), NOW)).toBe("Oct 24, 2024");
  });

  it("groups consecutive items by calendar day in input order", () => {
    const groups = groupActivitiesByDay(
      [
        activity({ id: "1", expenseAt: hoursBefore(1) }),
        activity({ id: "2", expenseAt: hoursBefore(2) }),
        activity({ id: "3", expenseAt: hoursBefore(20) }),
      ],
      NOW,
    );

    expect(groups.map((group) => [group.label, group.items.map((item) => item.id)])).toEqual([
      ["Today", ["1", "2"]],
      ["Yesterday", ["3"]],
    ]);
  });
});

describe("activity outcome wording", () => {
  it("describes expenses with the group ledger's lent / borrowed wording", () => {
    expect(getActivityOutcome(activity({ currentUserNetCents: -300 }))).toEqual({
      label: "you borrowed",
      cents: -300,
      tone: "negative",
    });
    expect(getActivityOutcome(activity({ currentUserNetCents: 600 }))).toEqual({
      label: "you lent",
      cents: 600,
      tone: "positive",
    });
    expect(getActivityOutcome(activity({ currentUserNetCents: 0 })).label).toBe("not involved");
  });

  it("labels settlements by direction in a neutral tone (never the debt color)", () => {
    const paid = activity({ kind: "settlement", paidByCurrentUser: true, counterpartyName: "Elena" });
    const received = activity({ kind: "settlement", counterpartyIsCurrentUser: true });
    const other = activity({ kind: "settlement" });

    expect(getActivityOutcome(paid)).toEqual({ label: "you paid", cents: 900, tone: "neutral" });
    expect(getActivityOutcome(received)).toEqual({ label: "you received", cents: 900, tone: "neutral" });
    expect(getActivityOutcome(other)).toEqual({ label: "not involved", cents: null, tone: "neutral" });
  });

  it("marks deleted events and uses first names for actors", () => {
    expect(getActivityOutcome(activity({ action: "deleted" })).label).toBe("deleted");
    expect(actorLabel(activity({}))).toBe("Sarah");
    expect(actorLabel(activity({ actorName: "Marcus Vale", actorIsCurrentUser: false }))).toBe("Marcus");
    expect(actorLabel(activity({ paidByCurrentUser: true }))).toBe("You");
  });

  it("filters expenses vs payments", () => {
    expect(matchesFilter(activity({ kind: "settlement" }), "payments")).toBe(true);
    expect(matchesFilter(activity({ kind: "settlement" }), "expenses")).toBe(false);
    expect(matchesFilter(activity({}), "all")).toBe(true);
  });
});

describe("demo activity feed", () => {
  const MOCK_GROUP_IDS = ["modern-loft-4b", "tokyo-trip-24", "shared-groceries", "friday-dinners"];

  function ledgerEntry(description: string, overrides: Partial<GroupExpense> = {}): GroupExpense {
    return {
      id: description.toLowerCase(),
      description,
      amountCents: 248_000,
      expenseAt: 0,
      paidByName: "Alex Rivera",
      paidByCurrentUser: true,
      currentUserNetCents: 186_000,
      splitType: "equal",
      kind: "expense",
      counterpartyName: null,
      counterpartyIsCurrentUser: false,
      participantCount: 4,
      iconKey: "cart",
      ...overrides,
    };
  }

  function scene(groupId: string, recentExpenses: GroupExpense[]) {
    return { groupId, groupName: `Group ${groupId}`, groupCurrency: "INR", iconKey: "home", recentExpenses } as GroupSceneData;
  }

  it("only picks the demo groups listed on Home / Groups", () => {
    expect(new Set(MOCK_ACTIVITY_PICKS.map((pick) => pick.groupId))).toEqual(new Set(MOCK_GROUP_IDS));
  });

  it("copies each ledger entry verbatim and re-dates it relative to now, newest first", () => {
    const settlement = ledgerEntry("Settlement", {
      kind: "settlement",
      amountCents: 35_000,
      paidByName: "Priya Nair",
      paidByCurrentUser: false,
      currentUserNetCents: -35_000,
      counterpartyName: "Alex Rivera",
      counterpartyIsCurrentUser: true,
      participantCount: 1,
    });
    const feed = buildMockActivityFeed((groupId) => scene(groupId, [ledgerEntry("Groceries – BigBasket"), settlement]), NOW, [
      { groupId: "modern-loft-4b", description: "Groceries – BigBasket", hoursAgo: 2 },
      { groupId: "modern-loft-4b", description: "Settlement", hoursAgo: 26 },
      { groupId: "modern-loft-4b", description: "Missing entry", hoursAgo: 30 },
    ]);

    expect(feed).toHaveLength(2);
    expect(feed[0]).toMatchObject({
      groupId: "modern-loft-4b",
      groupName: "Group modern-loft-4b",
      amountCents: 248_000,
      currentUserNetCents: 186_000,
      expenseAt: hoursBefore(2),
    });
    expect(getActivityOutcome(feed[0]!)).toEqual({ label: "you lent", cents: 186_000, tone: "positive" });
    expect(feed[1]).toMatchObject({ kind: "settlement", paidByName: "Priya Nair", counterpartyIsCurrentUser: true });
    expect(getActivityOutcome(feed[1]!)).toEqual({ label: "you received", cents: 35_000, tone: "neutral" });
    expect(groupActivitiesByDay(feed, NOW).map((day) => day.label)).toEqual(["Today", "Yesterday"]);
  });

  it("keeps picks in newest-first order", () => {
    const hours = MOCK_ACTIVITY_PICKS.map((pick) => pick.hoursAgo);
    expect([...hours].sort((left, right) => left - right)).toEqual(hours);
  });
});
