"use client";

import { useQuery } from "convex/react";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowUpRight,
  Download,
  LoaderCircle,
  ReceiptText,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { usePlaceholderMode } from "@/components/providers/app-providers";
import { PageContainer } from "@/components/shell/page-container";
import { buttonVariants } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMoneyFromCents, formatSignedMoneyFromCents } from "@/lib/format";
import { iconMap } from "@/lib/icon-map";
import {
  getGroupDetail,
  groupExpenses,
  type IconKey,
} from "@/lib/placeholder-data";
import { cn, getInitials } from "@/lib/utils";

type GroupScreenProps = {
  groupId: string;
  initialDescription?: string;
  initialName?: string;
};

type GroupSceneData = {
  groupId: string;
  groupName: string;
  groupDescription?: string;
  groupCurrency: string;
  iconKey: IconKey;
  coverImageUrl?: string;
  createdAt: number;
  memberCount: number;
  expenseCount: number;
  currentStanding: {
    balanceCents: number;
    paidCents: number;
    owedCents: number;
  };
  members: Array<{
    id: string;
    name: string;
    email: string;
    imageUrl?: string;
    role: "member" | "owner";
    isCurrentUser: boolean;
    joinedAt: number | null;
    paidCents: number;
    owedCents: number;
    balanceCents: number;
  }>;
  recentExpenses: Array<{
    id: string;
    description: string;
    amountCents: number;
    expenseAt: number;
    paidByName: string;
    paidByCurrentUser: boolean;
    currentUserNetCents: number;
    splitType: "equal" | "exact";
    participantCount: number;
    iconKey: IconKey;
  }>;
  insights: {
    totalSpendCents: number;
    averageExpenseCents: number;
    largestExpenseCents: number;
    largestExpenseLabel: string | null;
    topContributors: Array<{
      id: string;
      name: string;
      paidCents: number;
      percentOfSpend: number;
    }>;
  };
};

const ICON_LABELS: Record<IconKey, string> = {
  home: "Home Base",
  plane: "Trip Ledger",
  utensils: "Dining Run",
  cart: "Shared Groceries",
  mountain: "Adventure",
  fuel: "Road Spend",
};

const HERO_FALLBACKS: Record<IconKey, string> = {
  home:
    "bg-[radial-gradient(circle_at_top_left,rgba(78,222,163,0.2),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,181,158,0.14),transparent_36%),linear-gradient(135deg,rgba(38,38,38,1),rgba(16,16,16,1))]",
  plane:
    "bg-[radial-gradient(circle_at_top,rgba(78,222,163,0.18),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(125,211,252,0.12),transparent_30%),linear-gradient(135deg,rgba(34,34,34,1),rgba(14,14,14,1))]",
  utensils:
    "bg-[radial-gradient(circle_at_top_right,rgba(255,181,158,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(78,222,163,0.14),transparent_30%),linear-gradient(135deg,rgba(35,30,29,1),rgba(14,14,14,1))]",
  cart:
    "bg-[radial-gradient(circle_at_top_left,rgba(78,222,163,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(255,181,158,0.12),transparent_34%),linear-gradient(135deg,rgba(29,32,31,1),rgba(14,14,14,1))]",
  mountain:
    "bg-[radial-gradient(circle_at_top,rgba(78,222,163,0.2),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_32%),linear-gradient(135deg,rgba(31,36,37,1),rgba(12,12,12,1))]",
  fuel:
    "bg-[radial-gradient(circle_at_top_right,rgba(78,222,163,0.2),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,181,158,0.12),transparent_34%),linear-gradient(135deg,rgba(30,33,30,1),rgba(12,12,12,1))]",
};

function formatMonthYear(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(timestamp);
}

function formatDateParts(timestamp: number) {
  return {
    month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(timestamp),
    day: new Intl.DateTimeFormat("en-US", { day: "2-digit" }).format(timestamp),
  };
}

function getStandingDescriptor(balanceCents: number) {
  if (balanceCents > 0) {
    return {
      label: "You are owed",
      tone: "positive" as const,
      Icon: TrendingUp,
    };
  }

  if (balanceCents < 0) {
    return {
      label: "You owe",
      tone: "negative" as const,
      Icon: TrendingDown,
    };
  }

  return {
    label: "All settled",
    tone: "neutral" as const,
    Icon: Wallet,
  };
}

function getExpenseNetDescriptor(balanceCents: number, currency: string) {
  if (balanceCents > 0) {
    return {
      label: "You are owed",
      tone: "positive" as const,
      valueLabel: formatSignedMoneyFromCents(balanceCents, currency),
    };
  }

  if (balanceCents < 0) {
    return {
      label: "You owe",
      tone: "negative" as const,
      valueLabel: formatSignedMoneyFromCents(balanceCents, currency),
    };
  }

  return {
    label: "Settled",
    tone: "neutral" as const,
    valueLabel: formatMoneyFromCents(0, currency),
  };
}

function getHeroSupportText(description: string | undefined, memberCount: number, currency: string) {
  const trimmedDescription = description?.trim();

  if (trimmedDescription && trimmedDescription.length <= 84) {
    return trimmedDescription;
  }

  return `${memberCount} ${memberCount === 1 ? "member" : "members"} sharing one ${currency} ledger.`;
}

function buildHeroCoverStyle(coverImageUrl: string | undefined): CSSProperties | undefined {
  const trimmedCoverImageUrl = coverImageUrl?.trim();

  if (!trimmedCoverImageUrl) {
    return undefined;
  }

  return {
    backgroundImage: `linear-gradient(180deg, rgba(12,12,12,0.12), rgba(12,12,12,0.78)), url("${trimmedCoverImageUrl}")`,
    backgroundPosition: "center",
    backgroundSize: "cover",
  };
}

function buildMockTimestamp(label: string) {
  return new Date(`${label}, 2024 12:00:00 UTC`).getTime();
}

function getMockGroupSceneData(
  groupId: string,
  initialName?: string,
  initialDescription?: string,
): GroupSceneData {
  const group = getGroupDetail(groupId);
  const mockMembers: GroupSceneData["members"] = [
    {
      id: "mock-member-jordan",
      name: "Jordan Dale",
      email: "jordan@example.com",
      role: "owner",
      isCurrentUser: true,
      joinedAt: group.createdAt,
      paidCents: 224_400,
      owedCents: 140_200,
      balanceCents: 84_200,
    },
    {
      id: "mock-member-sarah",
      name: "Sarah Jenkins",
      email: "sarah@example.com",
      role: "member",
      isCurrentUser: false,
      joinedAt: group.createdAt + 86_400_000,
      paidCents: 132_400,
      owedCents: 91_200,
      balanceCents: 41_200,
    },
    {
      id: "mock-member-elena",
      name: "Elena Rodriguez",
      email: "elena@example.com",
      role: "member",
      isCurrentUser: false,
      joinedAt: group.createdAt + 2 * 86_400_000,
      paidCents: 146_000,
      owedCents: 91_000,
      balanceCents: 55_000,
    },
    {
      id: "mock-member-james",
      name: "James Chen",
      email: "james@example.com",
      role: "member",
      isCurrentUser: false,
      joinedAt: group.createdAt + 3 * 86_400_000,
      paidCents: 68_000,
      owedCents: 80_000,
      balanceCents: -12_000,
    },
    {
      id: "mock-member-marcus",
      name: "Marcus Vale",
      email: "marcus@example.com",
      role: "member",
      isCurrentUser: false,
      joinedAt: group.createdAt + 4 * 86_400_000,
      paidCents: 24_000,
      owedCents: 97_400,
      balanceCents: -73_400,
    },
    {
      id: "mock-member-priya",
      name: "Priya Nair",
      email: "priya@example.com",
      role: "member",
      isCurrentUser: false,
      joinedAt: group.createdAt + 5 * 86_400_000,
      paidCents: 0,
      owedCents: 95_000,
      balanceCents: -95_000,
    },
  ];

  return {
    groupId,
    groupName: initialName?.trim() || group.title,
    groupDescription: initialDescription?.trim() || group.description,
    groupCurrency: group.currency,
    iconKey: group.iconKey,
    coverImageUrl: group.coverImageUrl,
    createdAt: group.createdAt,
    memberCount: mockMembers.length,
    expenseCount: 8,
    currentStanding: {
      balanceCents: 84_200,
      paidCents: 224_400,
      owedCents: 140_200,
    },
    members: mockMembers,
    recentExpenses: groupExpenses.map((expense) => ({
      id: expense.id,
      description: expense.title,
      amountCents: Math.round(expense.total * 100),
      expenseAt: buildMockTimestamp(expense.dateLabel),
      paidByName: expense.paidBy,
      paidByCurrentUser: expense.paidBy === "Jordan Dale",
      currentUserNetCents: Math.round(expense.signedBalance * 100),
      splitType: "equal" as const,
      participantCount: mockMembers.length,
      iconKey: expense.icon,
    })),
    insights: {
      totalSpendCents: 594_800,
      averageExpenseCents: 74_350,
      largestExpenseCents: 288_000,
      largestExpenseLabel: "Luxury Cabin Vik",
      topContributors: mockMembers
        .filter((member) => member.paidCents > 0)
        .sort((left, right) => right.paidCents - left.paidCents)
        .slice(0, 3)
        .map((member) => ({
          id: member.id,
          name: member.name,
          paidCents: member.paidCents,
          percentOfSpend: Math.max(1, Math.round((member.paidCents / 594_800) * 100)),
        })),
    },
  };
}

export function GroupScreen({ groupId, initialDescription, initialName }: GroupScreenProps) {
  const { mode } = usePlaceholderMode();

  if (mode !== "live") {
    return (
      <GroupScene
        group={getMockGroupSceneData(groupId, initialName, initialDescription)}
        isMock
      />
    );
  }

  return (
    <LiveGroupScreen
      groupId={groupId}
      initialDescription={initialDescription}
      initialName={initialName}
    />
  );
}

function LiveGroupScreen({ groupId }: GroupScreenProps) {
  const currentUser = useQuery(api.users.current);
  const group = useQuery(
    api.groups.getDetail,
    currentUser ? { groupId: groupId as Id<"groups"> } : "skip",
  );

  if (currentUser === undefined || group === undefined) {
    return (
      <PageContainer className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
            <LoaderCircle className="h-7 w-7 animate-spin" />
          </div>
          <div>
            <p className="font-headline text-2xl font-bold text-on-surface">Loading group detail</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Pulling members, standing, and the latest expense activity into view.
            </p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (currentUser === null) {
    return (
      <PageContainer className="space-y-6">
        <SurfaceCard variant="high" className="mx-auto max-w-2xl space-y-4 rounded-[2.2rem] text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LoaderCircle className="h-7 w-7 animate-spin" />
          </div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface">Syncing your workspace</h1>
          <p className="text-sm leading-7 text-on-surface-variant">
            Your account is authenticated, but the ledger record is still finishing setup. Refresh in a moment if this state persists.
          </p>
        </SurfaceCard>
      </PageContainer>
    );
  }

  if (group === null) {
    return (
      <PageContainer className="space-y-6">
        <SurfaceCard variant="high" className="mx-auto max-w-2xl space-y-4 rounded-[2.2rem] text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10 text-secondary">
            <Users className="h-7 w-7" />
          </div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface">Group unavailable</h1>
          <p className="text-sm leading-7 text-on-surface-variant">
            You do not have access to this group, or it is no longer active.
          </p>
          <div className="flex justify-center">
            <Link href="/dashboard" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Back to dashboard
            </Link>
          </div>
        </SurfaceCard>
      </PageContainer>
    );
  }

  const groupSceneData: GroupSceneData = {
    ...group,
    groupId: String(group.groupId),
    iconKey: group.iconKey as IconKey,
    members: group.members.map((member) => ({
      ...member,
      id: String(member.id),
    })),
    recentExpenses: group.recentExpenses.map((expense) => ({
      ...expense,
      id: String(expense.id),
      iconKey: expense.iconKey as IconKey,
    })),
    insights: {
      ...group.insights,
      topContributors: group.insights.topContributors.map((member) => ({
        ...member,
        id: String(member.id),
      })),
    },
  };

  return <GroupScene group={groupSceneData} />;
}

type GroupSceneProps = {
  group: GroupSceneData;
  isMock?: boolean;
};

function GroupScene({ group, isMock = false }: GroupSceneProps) {
  return (
    <PageContainer className="page-glow relative space-y-6 lg:space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.82fr)] xl:items-start">
        <div className="space-y-5 lg:space-y-8">
          <GroupHeroCard group={group} />
          <div className="xl:hidden">
            <CurrentStandingCard group={group} />
          </div>
          <RecentExpensesCard group={group} />
          <div className="xl:hidden">
            <GroupInsightsCard group={group} isMock={isMock} />
          </div>
        </div>

        <aside className="hidden xl:block space-y-6">
          <CurrentStandingCard group={group} />
          <GroupInsightsCard group={group} isMock={isMock} />
        </aside>
      </section>
    </PageContainer>
  );
}

function GroupHeroCard({ group }: { group: GroupSceneData }) {
  const coverStyle = buildHeroCoverStyle(group.coverImageUrl);
  const heroMembers = group.members.slice(0, 3);
  const remainingMembers = Math.max(group.memberCount - heroMembers.length, 0);
  const HeroIcon = iconMap[group.iconKey];

  return (
    <SurfaceCard className="rounded-[2rem] p-0 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="relative min-h-[15rem] overflow-hidden rounded-[2rem]">
        <div
          className={cn(
            "absolute inset-0",
            coverStyle ? "bg-black/10" : HERO_FALLBACKS[group.iconKey],
          )}
          style={coverStyle}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,12,12,0.12),rgba(12,12,12,0.82))]" />
        {!coverStyle ? (
          <div className="absolute -right-8 top-8 text-white/8">
            <HeroIcon className="h-40 w-40 sm:h-48 sm:w-48" strokeWidth={1.1} />
          </div>
        ) : null}

        <div className="relative flex min-h-[15rem] flex-col justify-between p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/18 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-primary backdrop-blur-sm">
                {ICON_LABELS[group.iconKey]}
              </span>
              <span className="rounded-full bg-black/28 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-white/80 backdrop-blur-sm">
                {formatMonthYear(group.createdAt)}
              </span>
            </div>
            <Link
              href={`/groups/${group.groupId}/settings`}
              className="hidden min-h-11 items-center justify-center rounded-full border border-white/12 bg-black/18 px-4 text-sm font-medium text-white/80 backdrop-blur-sm transition hover:border-primary/35 hover:text-white sm:inline-flex"
            >
              Totals
            </Link>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="space-y-1">
                <h1 className="font-headline text-[2rem] font-extrabold leading-none tracking-tight text-white sm:text-5xl">
                  {group.groupName}
                </h1>
                <p className="max-w-xl text-sm text-white/80 sm:text-base">
                  {getHeroSupportText(group.groupDescription, group.memberCount, group.groupCurrency)}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-white/85">
                <Users className="h-4.5 w-4.5 text-primary" />
                <span>
                  {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {heroMembers.map((member) => (
                  <MemberOrb key={member.id} member={member} />
                ))}
                {remainingMembers > 0 ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#131313] bg-surface-container-high text-[0.65rem] font-semibold text-on-surface">
                    +{remainingMembers}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}

function MemberOrb({ member }: { member: GroupSceneData["members"][number] }) {
  const backgroundStyle =
    member.imageUrl?.trim()
      ? ({
          backgroundImage: `url("${member.imageUrl}")`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        } satisfies CSSProperties)
      : undefined;

  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#131313] text-[0.65rem] font-bold shadow-[0_10px_30px_rgba(0,0,0,0.24)]",
        backgroundStyle
          ? "bg-surface-container-high text-transparent"
          : member.isCurrentUser
            ? "bg-primary text-on-primary"
            : "bg-surface-container-high text-on-surface",
      )}
      style={backgroundStyle}
      aria-label={member.name}
      title={member.name}
    >
      {backgroundStyle ? null : getInitials(member.name)}
    </div>
  );
}

function CurrentStandingCard({ group }: { group: GroupSceneData }) {
  const standing = getStandingDescriptor(group.currentStanding.balanceCents);
  const StandingIcon = standing.Icon;
  const memberRows = getStandingMemberRows(group.members);
  const remainingMembers = Math.max(
    (group.members.filter((member) => !member.isCurrentUser).length || group.members.length) - memberRows.length,
    0,
  );

  return (
    <SurfaceCard className="rounded-[2rem] bg-[radial-gradient(circle_at_top_right,rgba(78,222,163,0.12),transparent_34%),linear-gradient(180deg,rgba(48,52,49,0.92),rgba(35,35,35,0.98))] p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-primary">Current Standing</p>
          <div>
            <p className="text-sm text-on-surface-variant">Overall balance</p>
            <div className="mt-2 flex items-center gap-3">
              <h2
                className={cn(
                  "font-headline text-4xl font-extrabold tracking-tight",
                  standing.tone === "positive" && "text-primary",
                  standing.tone === "negative" && "text-secondary",
                  standing.tone === "neutral" && "text-on-surface",
                )}
              >
                {standing.tone === "neutral"
                  ? formatMoneyFromCents(0, group.groupCurrency)
                  : formatMoneyFromCents(Math.abs(group.currentStanding.balanceCents), group.groupCurrency)}
              </h2>
              <StandingIcon
                className={cn(
                  "h-5 w-5",
                  standing.tone === "positive" && "text-primary",
                  standing.tone === "negative" && "text-secondary",
                  standing.tone === "neutral" && "text-on-surface-variant",
                )}
              />
            </div>
            <p
              className={cn(
                "mt-1 text-sm font-medium",
                standing.tone === "positive" && "text-primary/90",
                standing.tone === "negative" && "text-secondary/90",
                standing.tone === "neutral" && "text-on-surface-variant",
              )}
            >
              {standing.label} in this group
            </p>
          </div>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Wallet className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
        <MetricTile label="Paid by you" value={formatMoneyFromCents(group.currentStanding.paidCents, group.groupCurrency)} />
        <MetricTile label="Your share" value={formatMoneyFromCents(group.currentStanding.owedCents, group.groupCurrency)} />
      </div>

      <div className="mt-6 xl:mt-8 xl:border-t xl:border-white/8 xl:pt-6">
        <div className="hidden space-y-4 xl:block">
          {memberRows.length > 0 ? (
            memberRows.map((member) => (
              <StandingMemberRow key={member.id} member={member} currency={group.groupCurrency} />
            ))
          ) : (
            <div className="rounded-[1.35rem] bg-black/16 px-4 py-4 text-sm text-on-surface-variant">
              Group balances will start taking shape after the first expense lands.
            </div>
          )}

          {remainingMembers > 0 ? (
            <p className="text-xs uppercase tracking-[0.22em] text-on-surface-variant">
              +{remainingMembers} more member{remainingMembers === 1 ? "" : "s"} in totals view
            </p>
          ) : null}
        </div>

        <div className="mt-5 xl:mt-8">
          <Link
            href={`/groups/${group.groupId}/settings`}
            className={cn(
              buttonVariants({ variant: "ghost", size: "lg" }),
              "w-full border-white/10 bg-black/12 text-on-surface hover:bg-white/6",
            )}
          >
            View Totals
            <ArrowUpRight className="h-4.5 w-4.5" />
          </Link>
        </div>
      </div>
    </SurfaceCard>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] bg-black/16 px-4 py-4">
      <p className="text-[0.66rem] uppercase tracking-[0.22em] text-on-surface-variant">{label}</p>
      <p className="mt-2 font-headline text-xl font-bold tracking-tight text-on-surface">{value}</p>
    </div>
  );
}

function getStandingMemberRows(members: GroupSceneData["members"]) {
  const withoutCurrentUser = members.filter((member) => !member.isCurrentUser);
  const candidateMembers = withoutCurrentUser.length > 0 ? withoutCurrentUser : members;

  return candidateMembers
    .filter((member) => member.balanceCents !== 0 || member.role === "owner" || member.isCurrentUser)
    .sort((left, right) => Math.abs(right.balanceCents) - Math.abs(left.balanceCents))
    .slice(0, 4);
}

function StandingMemberRow({
  member,
  currency,
}: {
  member: GroupSceneData["members"][number];
  currency: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <MemberOrb member={member} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-on-surface">{member.name}</p>
          <p className="text-xs text-on-surface-variant">
            {member.role === "owner" ? "Owner" : member.isCurrentUser ? "You" : "Member"}
          </p>
        </div>
      </div>
      <span
        className={cn(
          "text-sm font-bold",
          member.balanceCents > 0 && "text-primary",
          member.balanceCents < 0 && "text-secondary",
          member.balanceCents === 0 && "text-on-surface-variant",
        )}
      >
        {member.balanceCents > 0 ? "+" : member.balanceCents < 0 ? "-" : ""}
        {formatMoneyFromCents(Math.abs(member.balanceCents), currency)}
      </span>
    </div>
  );
}

function RecentExpensesCard({ group }: { group: GroupSceneData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-headline text-[1.65rem] font-bold tracking-tight text-on-surface">
            <span className="sm:hidden">Recent Transactions</span>
            <span className="hidden sm:inline">Recent Expenses</span>
          </h2>
          <p className="text-sm text-on-surface-variant">
            {group.expenseCount === 0
              ? "No shared spend has been recorded yet."
              : `${group.expenseCount} tracked expense${group.expenseCount === 1 ? "" : "s"} in this group.`}
          </p>
        </div>

        {group.recentExpenses.length > 0 ? (
          <>
            <div className="hidden items-center gap-2 sm:flex">
              <VisualActionButton label="Filter expenses">
                <SlidersHorizontal className="h-4.5 w-4.5" />
              </VisualActionButton>
              <VisualActionButton label="Export expenses">
                <Download className="h-4.5 w-4.5" />
              </VisualActionButton>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary sm:hidden">
              View All
            </span>
          </>
        ) : null}
      </div>

      {group.recentExpenses.length > 0 ? (
        <div className="space-y-3">
          {group.recentExpenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              currency={group.groupCurrency}
              expense={expense}
            />
          ))}
        </div>
      ) : (
        <SurfaceCard variant="low" className="rounded-[1.9rem] p-6 sm:p-8">
          <div className="mx-auto max-w-xl space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <ReceiptText className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
                Nothing recorded yet
              </h3>
              <p className="text-sm leading-7 text-on-surface-variant">
                The first expense will populate this ledger, start member balances, and anchor the standing card.
              </p>
            </div>
            <div className="flex justify-center">
              <Link
                href={`/groups/${group.groupId}/expenses/new`}
                className={buttonVariants({ variant: "primary", size: "lg" })}
              >
                Add First Expense
              </Link>
            </div>
          </div>
        </SurfaceCard>
      )}
    </div>
  );
}

function VisualActionButton({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-container-low text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
    >
      {children}
    </button>
  );
}

function ExpenseRow({
  currency,
  expense,
}: {
  currency: string;
  expense: GroupSceneData["recentExpenses"][number];
}) {
  const { month, day } = formatDateParts(expense.expenseAt);
  const Icon = iconMap[expense.iconKey];
  const net = getExpenseNetDescriptor(expense.currentUserNetCents, currency);

  return (
    <div className="group rounded-[1.6rem] border border-transparent bg-surface-container-low px-4 py-4 transition hover:border-white/6 hover:bg-surface-container-high sm:px-5 sm:py-5">
      <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto_auto] md:items-center">
        <div className="flex w-10 flex-col items-center justify-center">
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
            {month}
          </span>
          <span className="font-headline text-lg font-extrabold leading-none text-on-surface">
            {day}
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-highest text-on-surface-variant transition group-hover:scale-[1.03]">
            <Icon className="h-5 w-5" strokeWidth={2.1} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-headline text-[0.98rem] font-bold tracking-tight text-on-surface">
              {expense.description}
            </p>
            <p className="text-[0.68rem] uppercase tracking-[0.2em] text-on-surface-variant">
              Paid by {expense.paidByName}
              <span className="hidden md:inline"> · {expense.participantCount} participants</span>
            </p>
          </div>
        </div>

        <div className="hidden text-right md:block">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
            Total Expense
          </p>
          <p className="mt-1 font-headline text-xl font-bold tracking-tight text-on-surface">
            {formatMoneyFromCents(expense.amountCents, currency)}
          </p>
        </div>

        <div className="ml-auto text-right">
          <p
            className={cn(
              "hidden text-[0.68rem] font-semibold uppercase tracking-[0.2em] md:block",
              net.tone === "positive" && "text-primary",
              net.tone === "negative" && "text-secondary",
              net.tone === "neutral" && "text-on-surface-variant",
            )}
          >
            {net.label}
          </p>
          <p
            className={cn(
              "font-headline text-base font-bold tracking-tight sm:text-xl",
              net.tone === "positive" && "text-primary",
              net.tone === "negative" && "text-secondary",
              net.tone === "neutral" && "text-on-surface",
            )}
          >
            {net.valueLabel}
          </p>
          <p className="text-xs text-on-surface-variant md:hidden">
            {formatMoneyFromCents(expense.amountCents, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}

function GroupInsightsCard({
  group,
  isMock,
}: {
  group: GroupSceneData;
  isMock: boolean;
}) {
  return (
    <SurfaceCard variant="low" className="rounded-[2rem] p-6 sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Group Insights</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Derived from what members have fronted so far.
          </p>
        </div>
        {isMock ? (
          <span className="rounded-full bg-white/6 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
            Mock
          </span>
        ) : null}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        <InsightStat label="Tracked total" value={formatMoneyFromCents(group.insights.totalSpendCents, group.groupCurrency)} />
        <InsightStat label="Average expense" value={formatMoneyFromCents(group.insights.averageExpenseCents, group.groupCurrency)} />
        <InsightStat
          label="Largest expense"
          value={
            group.insights.largestExpenseCents > 0
              ? formatMoneyFromCents(group.insights.largestExpenseCents, group.groupCurrency)
              : "None yet"
          }
        />
      </div>

      {group.insights.topContributors.length > 0 ? (
        <div className="mt-6 space-y-5">
          {group.insights.topContributors.map((member) => (
            <div key={member.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                <span>{member.name}</span>
                <span>{member.percentOfSpend}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-container-highest">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary),rgba(78,222,163,0.55))]"
                  style={{ width: `${member.percentOfSpend}%` }}
                />
              </div>
              <p className="text-sm text-on-surface-variant">
                Fronted {formatMoneyFromCents(member.paidCents, group.groupCurrency)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/8 bg-white/[0.02] px-4 py-5 text-sm leading-7 text-on-surface-variant">
          No contribution breakdown yet. Once the first expense is added, this panel will show who fronted the most spend.
        </div>
      )}

      {group.insights.largestExpenseLabel ? (
        <p className="mt-6 text-sm text-on-surface-variant">
          Largest line item so far:{" "}
          <span className="font-medium text-on-surface">{group.insights.largestExpenseLabel}</span>
        </p>
      ) : null}
    </SurfaceCard>
  );
}

function InsightStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] bg-surface-container-high px-4 py-4">
      <p className="text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-variant">{label}</p>
      <p className="mt-2 font-headline text-lg font-bold tracking-tight text-on-surface">{value}</p>
    </div>
  );
}
