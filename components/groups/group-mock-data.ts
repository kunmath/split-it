import { mockGroups, mockPeople } from "@/components/groups/group-list-data";
import type { GroupEntryDetail, GroupExpense, GroupMember, GroupSceneData } from "@/components/groups/group-types";
import type { SettleUpSuggestion } from "@/components/groups/settle-up-dialog";
import { getGroupDetail, type IconKey } from "@/lib/placeholder-data";

/**
 * Demo data for the group detail screen. Balances are derived from the same mock groups and
 * people shown on Home / Groups, so the numbers agree across screens.
 */

const DAY = 86_400_000;
const CURRENT_USER_NAME = "Alex Rivera";
const FILLER_NAMES = ["Elena Rodriguez", "Kai Mori", "Ana Costa", "Rohan Mehta", "Lena Fischer"];

type Counterparty = { name: string; balanceCents: number };

type ExpenseSeed = {
  description: string;
  amount: number;
  /**
   * How long before now the entry happened. Kept in step with the demo Activity feed
   * (components/activity/mock-activity.ts), which shows the same entries at the same times.
   */
  hoursAgo: number;
  /** 0 = you; n = nth other member (wraps around). */
  payer: number;
  iconKey: IconKey;
  participants?: number;
  /** Explicit participants (same numbering as `payer`); overrides `participants`. */
  splitWith?: number[];
  /** Paid between other members; the viewer has no share. */
  excludesYou?: boolean;
  /** Settlement paid by `payer` to you. */
  settlement?: boolean;
  note?: string;
};

const HOUSEHOLD_SEEDS: ExpenseSeed[] = [
  { description: "Groceries – BigBasket", amount: 2480, hoursAgo: 2, payer: 0, iconKey: "cart" },
  { description: "Settlement", amount: 350, hoursAgo: 26, payer: 1, iconKey: "home", settlement: true, note: "Paid over UPI" },
  { description: "Electricity bill", amount: 3120, hoursAgo: 74, payer: 2, iconKey: "home", note: "Two-month billing cycle" },
  { description: "Dinner at Toit", amount: 2640, hoursAgo: 100, payer: 3, iconKey: "utensils", excludesYou: true, participants: 3 },
  { description: "Internet – October", amount: 1180, hoursAgo: 194, payer: 0, iconKey: "home" },
  { description: "Cleaning supplies", amount: 640, hoursAgo: 360, payer: 1, iconKey: "cart" },
  { description: "Water cans", amount: 360, hoursAgo: 672, payer: 2, iconKey: "home" },
  { description: "Weekend brunch", amount: 1920, hoursAgo: 864, payer: 0, iconKey: "utensils" },
];

const TRIP_SEEDS: ExpenseSeed[] = [
  { description: "Ramen at Ichiran", amount: 1860, hoursAgo: 5, payer: 1, iconKey: "utensils" },
  { description: "Settlement", amount: 500, hoursAgo: 30, payer: 2, iconKey: "plane", settlement: true, note: "Cash at the hotel" },
  { description: "Taxi from Haneda", amount: 2400, hoursAgo: 50, payer: 0, iconKey: "fuel" },
  { description: "teamLab tickets", amount: 5400, hoursAgo: 70, payer: 3, iconKey: "mountain", excludesYou: true, participants: 3 },
  { description: "Shinjuku hotel", amount: 28_800, hoursAgo: 96, payer: 0, iconKey: "home" },
  { description: "JR passes", amount: 12_600, hoursAgo: 120, payer: 1, iconKey: "plane" },
  { description: "Flights to Tokyo", amount: 62_000, hoursAgo: 720, payer: 2, iconKey: "plane" },
];

/**
 * You, Elena (1) and Priya (2). The entries net out exactly to the Home figures for this group:
 * Elena owes you ₹180.50 and Priya owes you ₹100.00 (you're owed ₹280.50).
 */
const GROCERIES_SEEDS: ExpenseSeed[] = [
  { description: "Veggies & fruit – market", amount: 1861.5, hoursAgo: 20, payer: 0, iconKey: "cart" },
  { description: "Settlement", amount: 2000, hoursAgo: 50, payer: 2, iconKey: "cart", settlement: true, note: "UPI" },
  { description: "Cleaning supplies", amount: 540, hoursAgo: 98, payer: 2, iconKey: "cart" },
  { description: "Milk & eggs", amount: 840, hoursAgo: 150, payer: 1, iconKey: "cart" },
  { description: "Settlement", amount: 1500, hoursAgo: 240, payer: 1, iconKey: "cart", settlement: true },
  { description: "Snacks – Instamart", amount: 239, hoursAgo: 400, payer: 0, iconKey: "cart", splitWith: [0, 2], note: "Just Priya and me" },
  { description: "Monthly stock-up – DMart", amount: 4320, hoursAgo: 720, payer: 0, iconKey: "cart" },
];

/** Everyone has paid for one dinner of the same size, so all balances are zero. */
const DINNERS_SEEDS: ExpenseSeed[] = [
  { description: "Thai at Soi 7", amount: 1920, hoursAgo: 28, payer: 1, iconKey: "utensils" },
  { description: "Weekend brunch", amount: 1920, hoursAgo: 146, payer: 0, iconKey: "utensils" },
  { description: "Pizza night", amount: 1920, hoursAgo: 340, payer: 2, iconKey: "utensils" },
];

const LEDGER_BY_GROUP: Record<string, ExpenseSeed[]> = {
  "modern-loft-4b": HOUSEHOLD_SEEDS,
  "tokyo-trip-24": TRIP_SEEDS,
  "shared-groceries": GROCERIES_SEEDS,
  "friday-dinners": DINNERS_SEEDS,
};

const HOUR = 3_600_000;

/** Who owes the viewer (positive) or is owed by them (negative) in this group, per the Home mock. */
function getCounterparties(groupId: string, groupBalanceCents: number): Counterparty[] {
  const inGroup = mockPeople.filter((person) => person.groups.some((group) => group.id === groupId));
  const single = inGroup.filter((person) => person.groups.length === 1);
  const multi = inGroup.filter((person) => person.groups.length > 1);
  const singleTotal = single.reduce((sum, person) => sum + person.balanceCents, 0);
  const residual = groupBalanceCents - singleTotal;

  const result: Counterparty[] = single.map((person) => ({ name: person.name, balanceCents: person.balanceCents }));
  if (multi.length > 0 && residual !== 0) {
    // People active in several groups take the remainder of this group's balance.
    const share = Math.round(residual / multi.length);
    multi.forEach((person, index) => {
      result.push({
        name: person.name,
        balanceCents: index === multi.length - 1 ? residual - share * (multi.length - 1) : share,
      });
    });
  }

  return result.sort((left, right) => Math.abs(right.balanceCents) - Math.abs(left.balanceCents));
}

export function getMockGroupSceneData(
  groupId: string,
  initialName?: string,
  initialDescription?: string,
): GroupSceneData {
  return buildMockGroup(groupId, initialName, initialDescription).scene;
}

/** Detail for one demo ledger entry, consistent with the rows on the group screen. */
export function getMockEntryDetail(groupId: string, entryId: string): GroupEntryDetail | null {
  return buildMockGroup(groupId).entryDetails.find((detail) => detail.id === entryId) ?? null;
}

function buildMockGroup(
  groupId: string,
  initialName?: string,
  initialDescription?: string,
): { scene: GroupSceneData; entryDetails: GroupEntryDetail[] } {
  const fallback = getGroupDetail(groupId);
  const listed = mockGroups.find((group) => group.id === groupId);
  const iconKey: IconKey = listed?.icon ?? fallback.iconKey;
  const currency = listed?.currency ?? fallback.currency;

  const counterparties: Counterparty[] = listed
    ? getCounterparties(groupId, listed.balanceCents)
    : [
        { name: "Priya Nair", balanceCents: 95_000 },
        { name: "Marcus Vale", balanceCents: -12_500 },
      ];
  const memberCount = Math.max(listed?.memberCount ?? 4, counterparties.length + 1);
  const viewerBalanceCents = counterparties.reduce((sum, person) => sum + person.balanceCents, 0);

  const usedNames = new Set([CURRENT_USER_NAME, ...counterparties.map((person) => person.name)]);
  const fillers = FILLER_NAMES.filter((name) => !usedNames.has(name)).slice(
    0,
    memberCount - 1 - counterparties.length,
  );
  const people = [
    { name: CURRENT_USER_NAME, balanceCents: viewerBalanceCents },
    // A counterparty who owes you has a negative group balance, and vice versa.
    ...counterparties.map((person) => ({ name: person.name, balanceCents: -person.balanceCents })),
    ...fillers.map((name) => ({ name, balanceCents: 0 })),
  ];

  const seeds =
    LEDGER_BY_GROUP[groupId] ??
    (iconKey === "plane" || iconKey === "mountain" || iconKey === "fuel" ? TRIP_SEEDS : HOUSEHOLD_SEEDS);
  const now = Date.now();
  const at = (hoursAgo: number) => now - hoursAgo * HOUR;
  const others = people.length - 1;
  const payerIndex = (payer: number) => (payer === 0 || others === 0 ? 0 : 1 + ((payer - 1) % others));
  const paidCents = new Array<number>(people.length).fill(0);
  const createdAt = listed ? now - 60 * DAY : fallback.createdAt;
  const memberIdAt = (index: number) => `mock-member-${people[index]!.name.split(" ")[0]!.toLowerCase()}`;
  const entryDetails: GroupEntryDetail[] = [];

  const recentExpenses: GroupExpense[] = seeds
    .filter((seed) => !(seed.settlement && others === 0))
    .map((seed, index) => {
      const id = `mock-${index}-${seed.description.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const amountCents = Math.round(seed.amount * 100);
      const payer = payerIndex(seed.payer);
      const payerName = people[payer]!.name;
      const detailBase = {
        id,
        groupId,
        description: seed.description,
        amountCents,
        expenseAt: at(seed.hoursAgo),
        notes: seed.note ?? null,
        paidBy: { id: memberIdAt(payer), name: payerName, isCurrentUser: payer === 0 },
        // The demo viewer owns every mock group, so they may edit anything.
        canEdit: true,
      };

      if (seed.settlement) {
        entryDetails.push({
          ...detailBase,
          kind: "settlement",
          splitType: "exact",
          shares: [{ userId: memberIdAt(0), name: CURRENT_USER_NAME, shareCents: amountCents, isCurrentUser: true }],
          currentUserNetCents: -amountCents,
        });

        return {
          id,
          description: seed.description,
          amountCents,
          expenseAt: at(seed.hoursAgo),
          paidByName: payerName,
          paidByCurrentUser: false,
          currentUserNetCents: -amountCents,
          splitType: "exact" as const,
          kind: "settlement" as const,
          counterpartyName: CURRENT_USER_NAME,
          counterpartyIsCurrentUser: true,
          participantCount: 1,
          iconKey: seed.iconKey,
        };
      }

      paidCents[payer]! += amountCents;
      const participantCount = Math.min(seed.participants ?? people.length, people.length);
      const candidates = seed.splitWith
        ? seed.splitWith.map(payerIndex)
        : seed.excludesYou
          ? [payer, ...people.keys()].filter((person) => person !== 0)
          : [0, payer, ...people.keys()];
      const participants = [...new Set(candidates)].slice(0, seed.splitWith ? undefined : participantCount);
      // Equal split; leftover paise go to the first participants, like splitEvenly on the server.
      const baseShare = Math.floor(amountCents / participants.length);
      const remainder = amountCents - baseShare * participants.length;
      const shares = participants.map((person, position) => ({
        userId: memberIdAt(person),
        name: people[person]!.name,
        shareCents: baseShare + (position < remainder ? 1 : 0),
        isCurrentUser: person === 0,
      }));
      const viewerShare = shares.find((share) => share.isCurrentUser)?.shareCents ?? 0;
      const currentUserNetCents = (payer === 0 ? amountCents : 0) - viewerShare;

      entryDetails.push({
        ...detailBase,
        kind: "expense",
        splitType: "equal",
        shares,
        currentUserNetCents,
      });

      return {
        id,
        description: seed.description,
        amountCents,
        expenseAt: at(seed.hoursAgo),
        paidByName: payerName,
        paidByCurrentUser: payer === 0,
        currentUserNetCents,
        splitType: "equal" as const,
        kind: "expense" as const,
        counterpartyName: null,
        counterpartyIsCurrentUser: false,
        participantCount: participants.length,
        iconKey: seed.iconKey,
      };
    });

  const members: GroupMember[] = people.map((person, index) => ({
    id: memberIdAt(index),
    name: person.name,
    email: `${person.name.split(" ")[0]!.toLowerCase()}@example.com`,
    role: index === 0 ? "owner" : "member",
    isCurrentUser: index === 0,
    joinedAt: createdAt + index * DAY,
    paidCents: paidCents[index]!,
    owedCents: Math.max(0, paidCents[index]! - person.balanceCents),
    balanceCents: person.balanceCents,
  }));
  const memberId = (name: string) => members.find((member) => member.name === name)!.id;

  const suggestedSettlements: SettleUpSuggestion[] = counterparties
    .filter((person) => person.balanceCents !== 0)
    .map((person) => ({
      counterpartyId: memberId(person.name),
      counterpartyName: person.name,
      amountCents: Math.abs(person.balanceCents),
      direction: person.balanceCents > 0 ? ("youReceive" as const) : ("youPay" as const),
    }));

  const spend = recentExpenses.filter((expense) => expense.kind === "expense");
  const totalSpendCents = spend.reduce((sum, expense) => sum + expense.amountCents, 0);
  const largest = [...spend].sort((left, right) => right.amountCents - left.amountCents)[0];

  const scene: GroupSceneData = {
    groupId,
    groupName: initialName?.trim() || listed?.name || fallback.title,
    groupDescription: initialDescription?.trim() || fallback.description,
    groupCurrency: currency,
    iconKey,
    coverImageUrl: undefined,
    createdAt,
    memberCount: members.length,
    expenseCount: recentExpenses.length,
    currentStanding: {
      balanceCents: viewerBalanceCents,
      paidCents: members[0]!.paidCents,
      owedCents: members[0]!.owedCents,
    },
    members,
    recentExpenses,
    suggestedSettlements,
    insights: {
      totalSpendCents,
      averageExpenseCents: spend.length === 0 ? 0 : Math.round(totalSpendCents / spend.length),
      largestExpenseCents: largest?.amountCents ?? 0,
      largestExpenseLabel: largest?.description ?? null,
      topContributors: members
        .filter((member) => member.paidCents > 0)
        .sort((left, right) => right.paidCents - left.paidCents)
        .slice(0, 3)
        .map((member) => ({
          id: member.id,
          name: member.name,
          paidCents: member.paidCents,
          percentOfSpend: Math.max(1, Math.round((member.paidCents / Math.max(totalSpendCents, 1)) * 100)),
        })),
    },
  };

  return { scene, entryDetails };
}
