import type { ActivityItem } from "@/components/activity/activity-model";
import type { GroupSceneData } from "@/components/groups/group-types";

/**
 * Demo activity feed. Every entry is taken from the demo group ledgers (group-mock-data.ts), so
 * names, amounts and "you lent / you borrowed" figures match what the group screens show. Only
 * the timestamps are moved relative to now so Today / Yesterday grouping shows up.
 */

type FeedPick = {
  groupId: string;
  description: string;
  /** Hours before now. Keeps each group's ledger order. */
  hoursAgo: number;
};

export const MOCK_ACTIVITY_PICKS: FeedPick[] = [
  { groupId: "modern-loft-4b", description: "Groceries – BigBasket", hoursAgo: 2 },
  { groupId: "tokyo-trip-24", description: "Ramen at Ichiran", hoursAgo: 5 },
  { groupId: "modern-loft-4b", description: "Settlement", hoursAgo: 26 },
  { groupId: "tokyo-trip-24", description: "Settlement", hoursAgo: 30 },
  { groupId: "tokyo-trip-24", description: "Taxi from Haneda", hoursAgo: 50 },
  { groupId: "modern-loft-4b", description: "Electricity bill", hoursAgo: 74 },
  { groupId: "shared-groceries", description: "Cleaning supplies", hoursAgo: 98 },
  { groupId: "friday-dinners", description: "Weekend brunch", hoursAgo: 146 },
  { groupId: "modern-loft-4b", description: "Internet – October", hoursAgo: 194 },
];

/** `loadScene` is `getMockGroupSceneData`; injected so the mapping can be tested in isolation. */
export function buildMockActivityFeed(
  loadScene: (groupId: string) => GroupSceneData,
  now = Date.now(),
  picks: FeedPick[] = MOCK_ACTIVITY_PICKS,
): ActivityItem[] {
  const scenes = new Map<string, GroupSceneData>();

  return picks.flatMap((pick) => {
    const scene = scenes.get(pick.groupId) ?? loadScene(pick.groupId);
    scenes.set(pick.groupId, scene);
    const expense = scene.recentExpenses.find((entry) => entry.description === pick.description);

    if (!expense) {
      return [];
    }

    return [
      {
        id: `activity-${pick.groupId}-${expense.id}`,
        groupId: scene.groupId,
        groupName: scene.groupName,
        groupCurrency: scene.groupCurrency,
        groupIconKey: expense.iconKey,
        description: expense.description,
        amountCents: expense.amountCents,
        expenseAt: now - pick.hoursAgo * 3_600_000,
        kind: expense.kind,
        paidByName: expense.paidByName,
        paidByCurrentUser: expense.paidByCurrentUser,
        currentUserNetCents: expense.currentUserNetCents,
        participantCount: expense.participantCount,
        counterpartyName: expense.counterpartyName,
        counterpartyIsCurrentUser: expense.counterpartyIsCurrentUser,
      },
    ];
  });
}
