import { describe, expect, it } from "vitest";

import {
  actorLabel,
  formatDayLabel,
  getActivityOutcome,
  groupActivitiesByDay,
  matchesFilter,
  type ActivityItem,
} from "../components/activity/activity-model";

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
  it("describes the viewer's net in words, never color alone", () => {
    expect(getActivityOutcome(activity({ currentUserNetCents: -300 }))).toEqual({
      label: "you owe",
      cents: -300,
      tone: "negative",
    });
    expect(getActivityOutcome(activity({ currentUserNetCents: 600 })).label).toBe("you get back");
    expect(getActivityOutcome(activity({ currentUserNetCents: 0 })).label).toBe("not involved");
  });

  it("labels settlements by direction", () => {
    const paid = activity({ kind: "settlement", paidByCurrentUser: true, counterpartyName: "Elena" });
    const received = activity({ kind: "settlement", counterpartyIsCurrentUser: true });
    const other = activity({ kind: "settlement" });

    expect(getActivityOutcome(paid).label).toBe("you paid");
    expect(getActivityOutcome(received).label).toBe("you received");
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
