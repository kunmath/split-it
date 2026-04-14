"use client";

import { useQuery } from "convex/react";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  ChevronRight,
  Download,
  LoaderCircle,
  Pencil,
  TrendingDown,
  TrendingUp,
  Trash2,
  UserPlus,
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
import { getGroupDetail, memberBalances as mockMemberBalances } from "@/lib/placeholder-data";
import { cn, getInitials } from "@/lib/utils";

type GroupSettingsScreenProps = {
  groupId: string;
};

type GroupSettingsBalanceMember = {
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
};

type GroupSettingsSceneData = {
  groupId: string;
  groupName: string;
  groupDescription?: string;
  groupCurrency: string;
  memberCount: number;
  expenseCount: number;
  totalSpendCents: number;
  currentUserBalanceCents: number;
  currentUserPaidCents: number;
  currentUserOwedCents: number;
  viewerRole: "owner" | "member";
  memberBalances: GroupSettingsBalanceMember[];
};

const SETTINGS_ACTIONS = [
  {
    label: "Edit Group Name",
    Icon: Pencil,
    tone: "default",
  },
  {
    label: "Add Members",
    Icon: UserPlus,
    tone: "default",
  },
  {
    label: "Export CSV",
    Icon: Download,
    tone: "default",
  },
  {
    label: "Delete Group",
    Icon: Trash2,
    tone: "danger",
  },
] as const;

function getMockGroupSettingsData(groupId: string): GroupSettingsSceneData {
  const group = getGroupDetail(groupId);
  const currentUserBalance =
    mockMemberBalances.find((member) => member.name === "Jordan Dale")?.amount ??
    group.standing;
  const memberBalances = mockMemberBalances
    .filter((member) => member.name !== "Jordan Dale")
    .map((member, index) => ({
      id: `mock-member-balance-${index + 1}`,
      name: member.name,
      email: `${member.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      imageUrl: undefined,
      role: "member" as const,
      isCurrentUser: false,
      joinedAt: null,
      paidCents: member.amount > 0 ? Math.round(member.amount * 180) : Math.round(Math.abs(member.amount) * 30),
      owedCents: member.amount > 0 ? Math.round(member.amount * 80) : Math.round(Math.abs(member.amount) * 130),
      balanceCents: Math.round(member.amount * 100),
    }));

  return {
    groupId,
    groupName: group.title,
    groupDescription: group.description,
    groupCurrency: group.currency,
    memberCount: memberBalances.length + 1,
    expenseCount: 5,
    totalSpendCents: Math.round(group.spend * 100),
    currentUserBalanceCents: Math.round(currentUserBalance * 100),
    currentUserPaidCents: Math.round(group.youAreOwed * 100),
    currentUserOwedCents: Math.round(group.youOwe * 100),
    viewerRole: "owner",
    memberBalances,
  };
}

function getGroupSupportText(
  description: string | undefined,
  memberCount: number,
  expenseCount: number,
) {
  const trimmedDescription = description?.trim();

  if (trimmedDescription) {
    return trimmedDescription;
  }

  return `${memberCount} members and ${expenseCount} tracked expense${expenseCount === 1 ? "" : "s"} in the ledger.`;
}

function buildAvatarStyle(imageUrl: string | undefined): CSSProperties | undefined {
  const trimmedImageUrl = imageUrl?.trim();

  if (!trimmedImageUrl) {
    return undefined;
  }

  return {
    backgroundImage: `url("${trimmedImageUrl}")`,
    backgroundPosition: "center",
    backgroundSize: "cover",
  };
}

function getNetTone(balanceCents: number) {
  if (balanceCents > 0) {
    return "positive" as const;
  }

  if (balanceCents < 0) {
    return "negative" as const;
  }

  return "neutral" as const;
}

function getMemberDescriptor(member: GroupSettingsBalanceMember, currency: string) {
  if (member.balanceCents > 0) {
    return {
      chip: member.paidCents > 0 ? `Fronted ${formatMoneyFromCents(member.paidCents, currency)}` : "Is owed",
      label: "Owed",
      tone: "positive" as const,
      valueLabel: formatSignedMoneyFromCents(member.balanceCents, currency),
    };
  }

  if (member.balanceCents < 0) {
    return {
      chip: "Needs to settle up",
      label: "Owes",
      tone: "negative" as const,
      valueLabel: formatSignedMoneyFromCents(member.balanceCents, currency),
    };
  }

  return {
    chip: "Settled",
    label: "Balance",
    tone: "neutral" as const,
    valueLabel: formatMoneyFromCents(0, currency),
  };
}

export function GroupSettingsScreen({ groupId }: GroupSettingsScreenProps) {
  const { mode } = usePlaceholderMode();

  if (mode !== "live") {
    return <GroupSettingsScene group={getMockGroupSettingsData(groupId)} isMock />;
  }

  return <LiveGroupSettingsScreen groupId={groupId} />;
}

function LiveGroupSettingsScreen({ groupId }: GroupSettingsScreenProps) {
  const currentUser = useQuery(api.users.current);
  const settingsOverview = useQuery(
    api.groups.getSettingsOverview,
    currentUser ? { groupId: groupId as Id<"groups"> } : "skip",
  );

  if (currentUser === undefined || settingsOverview === undefined) {
    return (
      <PageContainer className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
            <LoaderCircle className="h-7 w-7 animate-spin" />
          </div>
          <div>
            <p className="font-headline text-2xl font-bold text-on-surface">Loading group totals</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Pulling the spend summary, member balances, and settings actions into place.
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

  if (settingsOverview === null) {
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

  return (
    <GroupSettingsScene
      group={{
        ...settingsOverview,
        groupId: String(settingsOverview.groupId),
        memberBalances: settingsOverview.memberBalances.map((member) => ({
          ...member,
          id: String(member.id),
        })),
      }}
    />
  );
}

function GroupSettingsScene({
  group,
  isMock = false,
}: {
  group: GroupSettingsSceneData;
  isMock?: boolean;
}) {
  const youAreOwedCents = Math.max(group.currentUserBalanceCents, 0);
  const youOweCents = Math.abs(Math.min(group.currentUserBalanceCents, 0));

  return (
    <PageContainer className="page-glow relative space-y-6 lg:space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.04fr)_minmax(320px,0.72fr)] xl:items-end">
        <div className="hidden max-w-2xl space-y-5 xl:block">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-on-surface-variant">
            <Link href="/dashboard" className="transition hover:text-on-surface">
              Groups
            </Link>{" "}
            <span className="px-2 text-white/16">›</span> {group.groupName}
          </p>
          <div className="space-y-4">
            <h1 className="font-headline text-5xl font-extrabold tracking-tight text-on-surface">
              {group.groupName}
            </h1>
            <p className="max-w-xl text-base leading-8 text-on-surface-variant">
              {getGroupSupportText(group.groupDescription, group.memberCount, group.expenseCount)}
            </p>
          </div>
          {isMock ? (
            <span className="inline-flex rounded-full bg-white/6 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
              Mock mode
            </span>
          ) : null}
        </div>

        <GroupSpendCard
          groupName={group.groupName}
          totalSpendCents={group.totalSpendCents}
          currency={group.groupCurrency}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(300px,0.82fr)_minmax(0,1.18fr)]">
        <div className="xl:col-start-1 xl:row-start-1">
          <CurrentNetPanel
            youAreOwedCents={youAreOwedCents}
            youOweCents={youOweCents}
            currentUserBalanceCents={group.currentUserBalanceCents}
            currency={group.groupCurrency}
          />
        </div>

        <div className="xl:col-start-2 xl:row-span-2">
          <MemberBalancesCard
            currency={group.groupCurrency}
            memberCount={group.memberCount}
            memberBalances={group.memberBalances}
          />
        </div>

        <div className="xl:col-start-1 xl:row-start-2">
          <SettingsActionsCard viewerRole={group.viewerRole} />
        </div>
      </section>
    </PageContainer>
  );
}

function GroupSpendCard({
  groupName,
  totalSpendCents,
  currency,
}: {
  groupName: string;
  totalSpendCents: number;
  currency: string;
}) {
  return (
    <SurfaceCard
      variant="high"
      className="rounded-[2.35rem] bg-[radial-gradient(circle_at_top_right,rgba(78,222,163,0.12),transparent_32%),linear-gradient(180deg,rgba(42,42,42,0.98),rgba(28,27,27,1))] p-6 sm:p-8 xl:min-h-[13.2rem] xl:px-9 xl:py-8"
    >
      <div className="flex h-full flex-col justify-between gap-7">
        <div className="space-y-3 xl:hidden">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-on-surface-variant">
            {groupName}
          </p>
          <h1 className="font-headline text-[2.3rem] font-extrabold leading-[0.95] tracking-tight text-on-surface sm:text-5xl">
            Total Group Spend
          </h1>
        </div>

        <div className="hidden xl:block text-right">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-primary">
            Total Group Spend
          </p>
        </div>

        <div className="xl:text-right">
          <p className="font-headline text-4xl font-extrabold tracking-tight text-primary sm:text-5xl xl:text-[3.6rem] xl:text-on-surface">
            {formatMoneyFromCents(totalSpendCents, currency)}
          </p>
        </div>
      </div>
    </SurfaceCard>
  );
}

function CurrentNetPanel({
  youAreOwedCents,
  youOweCents,
  currentUserBalanceCents,
  currency,
}: {
  youAreOwedCents: number;
  youOweCents: number;
  currentUserBalanceCents: number;
  currency: string;
}) {
  const netTone = getNetTone(currentUserBalanceCents);

  return (
    <>
      <div className="space-y-4 xl:hidden">
        <CompactBalanceCard label="You are owed" valueCents={youAreOwedCents} tone="positive" currency={currency} />
        <CompactBalanceCard label="You owe" valueCents={youOweCents} tone="negative" currency={currency} />
      </div>

      <SurfaceCard variant="low" className="hidden rounded-[2rem] p-7 xl:block">
        <div className="space-y-6">
          <ExpandedBalanceRow label="You are owed" valueCents={youAreOwedCents} tone="positive" currency={currency} />
          <ExpandedBalanceRow label="You owe" valueCents={youOweCents} tone="negative" currency={currency} />
        </div>

        <div className="mt-6 rounded-[1.4rem] bg-black/16 px-4 py-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
            Net position
          </p>
          <p
            className={cn(
              "mt-2 font-headline text-lg font-bold tracking-tight",
              netTone === "positive" && "text-primary",
              netTone === "negative" && "text-secondary",
              netTone === "neutral" && "text-on-surface",
            )}
          >
            {formatSignedMoneyFromCents(currentUserBalanceCents, currency)}
          </p>
        </div>
      </SurfaceCard>
    </>
  );
}

function CompactBalanceCard({
  label,
  valueCents,
  tone,
  currency,
}: {
  label: string;
  valueCents: number;
  tone: "positive" | "negative";
  currency: string;
}) {
  const Icon = tone === "positive" ? TrendingUp : TrendingDown;

  return (
    <SurfaceCard variant="high" className="rounded-[2rem] p-5 sm:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-on-surface-variant">{label}</p>
          <p
            className={cn(
              "mt-4 font-headline text-[2rem] font-extrabold tracking-tight",
              tone === "positive" ? "text-primary" : "text-secondary",
            )}
          >
            {formatMoneyFromCents(valueCents, currency)}
          </p>
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl ring-1",
            tone === "positive"
              ? "bg-primary/10 text-primary ring-primary/15"
              : "bg-secondary/10 text-secondary ring-secondary/15",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </SurfaceCard>
  );
}

function ExpandedBalanceRow({
  label,
  valueCents,
  tone,
  currency,
}: {
  label: string;
  valueCents: number;
  tone: "positive" | "negative";
  currency: string;
}) {
  const Icon = tone === "positive" ? TrendingUp : TrendingDown;

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-2xl ring-1",
          tone === "positive"
            ? "bg-primary/10 text-primary ring-primary/15"
            : "bg-secondary/10 text-secondary ring-secondary/15",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">{label}</p>
        <p
          className={cn(
            "mt-1 font-headline text-[2rem] font-extrabold tracking-tight",
            tone === "positive" ? "text-primary" : "text-secondary",
          )}
        >
          {formatMoneyFromCents(valueCents, currency)}
        </p>
      </div>
    </div>
  );
}

function MemberBalancesCard({
  currency,
  memberCount,
  memberBalances,
}: {
  currency: string;
  memberCount: number;
  memberBalances: GroupSettingsBalanceMember[];
}) {
  return (
    <SurfaceCard variant="low" className="rounded-[2.1rem] p-0">
      <div className="flex items-center justify-between gap-4 px-5 pb-5 pt-5 sm:px-6 sm:pt-6">
        <div>
          <h2 className="font-headline text-xl font-semibold tracking-tight text-on-surface sm:text-2xl xl:hidden">
            Member Balances
          </h2>
          <p className="hidden text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-on-surface-variant xl:block">
            Member Balances
          </p>
        </div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
          {memberCount} member{memberCount === 1 ? "" : "s"}
          <span className="hidden xl:inline"> total</span>
        </p>
      </div>

      <div className="space-y-2 px-2 pb-2 sm:px-3 sm:pb-3">
        {memberBalances.length > 0 ? (
          memberBalances.map((member) => (
            <MemberBalanceRow key={member.id} member={member} currency={currency} />
          ))
        ) : (
          <div className="rounded-[1.65rem] bg-surface-container-high px-5 py-5 text-sm leading-7 text-on-surface-variant">
            No other member balances are visible yet. Add the first shared expense to start the totals table.
          </div>
        )}
      </div>

      <div className="hidden border-t border-white/6 px-6 py-5 xl:block">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            className="inline-flex items-center gap-2 font-headline text-sm font-bold text-primary transition hover:text-on-surface"
          >
            View All Settlement History
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-on-surface-variant">
            Read-only stub for next phase
          </p>
        </div>
      </div>

      <div className="border-t border-white/6 px-5 py-4 xl:hidden">
        <p className="text-xs leading-6 text-on-surface-variant">
          Settlement history stays documented as a read-only stub in this phase.
        </p>
      </div>
    </SurfaceCard>
  );
}

function MemberBalanceRow({
  member,
  currency,
}: {
  member: GroupSettingsBalanceMember;
  currency: string;
}) {
  const descriptor = getMemberDescriptor(member, currency);
  const avatarStyle = buildAvatarStyle(member.imageUrl);

  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.7rem] bg-surface-container-high px-4 py-4 transition hover:bg-surface-container-highest sm:px-5 sm:py-5">
      <div className="flex min-w-0 items-center gap-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/8 font-headline text-sm font-bold sm:h-14 sm:w-14 sm:text-base",
            avatarStyle
              ? "bg-surface-container-high text-transparent"
              : descriptor.tone === "positive"
                ? "bg-[linear-gradient(135deg,rgba(78,222,163,0.4),rgba(16,185,129,0.95))] text-on-primary"
                : descriptor.tone === "negative"
                  ? "bg-[linear-gradient(135deg,rgba(255,181,158,0.4),rgba(127,42,13,0.96))] text-white"
                  : "bg-[linear-gradient(135deg,rgba(57,57,57,1),rgba(42,42,42,1))] text-on-surface",
          )}
          style={avatarStyle}
          aria-label={member.name}
          title={member.name}
        >
          {avatarStyle ? null : getInitials(member.name)}
        </div>

        <div className="min-w-0">
          <p className="truncate font-headline text-[0.98rem] font-bold tracking-tight text-on-surface sm:text-lg">
            {member.name}
          </p>
          <span
            className={cn(
              "mt-1 inline-flex rounded-full px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em]",
              descriptor.tone === "positive" && "bg-primary/12 text-primary",
              descriptor.tone === "negative" && "bg-secondary/12 text-secondary",
              descriptor.tone === "neutral" && "bg-white/6 text-on-surface-variant",
            )}
          >
            {descriptor.chip}
          </span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
          {descriptor.label}
        </p>
        <p
          className={cn(
            "mt-2 font-headline text-lg font-extrabold tracking-tight sm:text-[1.65rem]",
            descriptor.tone === "positive" && "text-primary",
            descriptor.tone === "negative" && "text-secondary",
            descriptor.tone === "neutral" && "text-on-surface",
          )}
        >
          {descriptor.valueLabel}
        </p>
      </div>
    </div>
  );
}

function SettingsActionsCard({ viewerRole }: { viewerRole: "owner" | "member" }) {
  const stubNote =
    viewerRole === "owner"
      ? "Edit name, add members, export, and delete stay visibly staged in Phase 8. Invite emails land next."
      : "These owner-level actions remain visible for layout parity in Phase 8 and wire up in the next phase.";

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="font-headline text-xl font-semibold tracking-tight text-on-surface xl:hidden">
          Settings
        </h2>
      </div>

      <SurfaceCard variant="low" className="rounded-[2rem] p-4 sm:p-5">
        <p className="hidden px-2 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-on-surface-variant xl:block">
          Group Settings
        </p>

        <div className="space-y-2">
          {SETTINGS_ACTIONS.map((action) => {
            const Icon = action.Icon;

            return (
              <button
                key={action.label}
                type="button"
                aria-disabled="true"
                className={cn(
                  "flex w-full items-center justify-between rounded-[1.5rem] px-4 py-4 text-left transition",
                  "hover:bg-surface-container-high active:scale-[0.99]",
                  action.tone === "danger"
                    ? "bg-secondary/6 text-secondary hover:bg-secondary/12"
                    : "text-on-surface",
                )}
              >
                <span className="flex items-center gap-4">
                  <span
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-2xl",
                      action.tone === "danger" ? "bg-secondary/12" : "bg-white/4",
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="font-headline text-[0.98rem] font-bold tracking-tight">
                    {action.label}
                  </span>
                </span>
                <ChevronRight className="h-4.5 w-4.5 text-on-surface-variant" />
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-[1.45rem] bg-black/16 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/6 text-on-surface-variant">
              <Wallet className="h-4.5 w-4.5" />
            </div>
            <p className="text-sm leading-6 text-on-surface-variant">{stubNote}</p>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
