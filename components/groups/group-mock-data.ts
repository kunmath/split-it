import { mockGroups, mockPeople } from "@/components/groups/group-list-data";
import type { GroupExpense, GroupMember, GroupSceneData } from "@/components/groups/group-types";
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
  date: string;
  /** 0 = you; n = nth other member (wraps around). */
  payer: number;
  iconKey: IconKey;
  participants?: number;
  /** Paid between other members; the viewer has no share. */
  excludesYou?: boolean;
  /** Settlement paid by `payer` to you. */
  settlement?: boolean;
};

const HOUSEHOLD_SEEDS: ExpenseSeed[] = [
  { description: "Groceries – BigBasket", amount: 2480, date: "2024-10-22", payer: 0, iconKey: "cart" },
  { description: "Settlement", amount: 350, date: "2024-10-20", payer: 1, iconKey: "home", settlement: true },
  { description: "Electricity bill", amount: 3120, date: "2024-10-18", payer: 2, iconKey: "home" },
  { description: "Dinner at Toit", amount: 2640, date: "2024-10-15", payer: 3, iconKey: "utensils", excludesYou: true, participants: 3 },
  { description: "Internet – October", amount: 1180, date: "2024-10-12", payer: 0, iconKey: "home" },
  { description: "Cleaning supplies", amount: 640, date: "2024-10-05", payer: 1, iconKey: "cart" },
  { description: "Water cans", amount: 360, date: "2024-09-28", payer: 2, iconKey: "home" },
  { description: "Weekend brunch", amount: 1920, date: "2024-09-22", payer: 0, iconKey: "utensils" },
];

const TRIP_SEEDS: ExpenseSeed[] = [
  { description: "Ramen at Ichiran", amount: 1860, date: "2024-10-24", payer: 1, iconKey: "utensils" },
  { description: "Settlement", amount: 500, date: "2024-10-23", payer: 2, iconKey: "plane", settlement: true },
  { description: "Taxi from Haneda", amount: 2400, date: "2024-10-22", payer: 0, iconKey: "fuel" },
  { description: "teamLab tickets", amount: 5400, date: "2024-10-21", payer: 3, iconKey: "mountain", excludesYou: true, participants: 3 },
  { description: "Shinjuku hotel", amount: 28_800, date: "2024-10-20", payer: 0, iconKey: "home" },
  { description: "JR passes", amount: 12_600, date: "2024-10-19", payer: 1, iconKey: "plane" },
  { description: "Flights to Tokyo", amount: 62_000, date: "2024-09-30", payer: 2, iconKey: "plane" },
];

function at(isoDate: string) {
  return new Date(`${isoDate}T12:00:00.000Z`).getTime();
}

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

  const seeds = iconKey === "plane" || iconKey === "mountain" || iconKey === "fuel" ? TRIP_SEEDS : HOUSEHOLD_SEEDS;
  const others = people.length - 1;
  const payerIndex = (payer: number) => (payer === 0 || others === 0 ? 0 : 1 + ((payer - 1) % others));
  const paidCents = new Array<number>(people.length).fill(0);

  const recentExpenses: GroupExpense[] = seeds
    .filter((seed) => !(seed.settlement && others === 0))
    .map((seed, index) => {
      const amountCents = Math.round(seed.amount * 100);
      const payer = payerIndex(seed.payer);
      const payerName = people[payer]!.name;

      if (seed.settlement) {
        return {
          id: `mock-${index}-${seed.description.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          description: seed.description,
          amountCents,
          expenseAt: at(seed.date),
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
      const participants = Math.min(seed.participants ?? people.length, people.length);
      const shareCents = Math.round(amountCents / participants);
      const viewerShare = seed.excludesYou ? 0 : shareCents;

      return {
        id: `mock-${index}-${seed.description.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        description: seed.description,
        amountCents,
        expenseAt: at(seed.date),
        paidByName: payerName,
        paidByCurrentUser: payer === 0,
        currentUserNetCents: (payer === 0 ? amountCents : 0) - viewerShare,
        splitType: "equal" as const,
        kind: "expense" as const,
        counterpartyName: null,
        counterpartyIsCurrentUser: false,
        participantCount: participants,
        iconKey: seed.iconKey,
      };
    });

  const createdAt = listed ? at("2024-09-01") : fallback.createdAt;
  const members: GroupMember[] = people.map((person, index) => ({
    id: `mock-member-${person.name.split(" ")[0]!.toLowerCase()}`,
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

  return {
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
}
