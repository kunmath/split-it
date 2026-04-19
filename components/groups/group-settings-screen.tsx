"use client";

import { useConvex, useMutation, useQuery } from "convex/react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import {
  ArrowRight,
  ChevronRight,
  Copy,
  Download,
  Mail,
  Pencil,
  TrendingDown,
  TrendingUp,
  Trash2,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { usePlaceholderMode } from "@/components/providers/app-providers";
import { PageContainer } from "@/components/shell/page-container";
import { Button, buttonVariants } from "@/components/ui/button";
import { FilledInput } from "@/components/ui/filled-input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ScreenState } from "@/components/ui/screen-state";
import { SurfaceCard } from "@/components/ui/surface-card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  GROUP_MEMBER_ROLE,
  type ExpenseSplitType,
  type GroupMemberRole,
} from "@/convex/lib/constants";
import { looksLikeConvexId } from "@/lib/convex-ids";
import { ROUTES } from "@/lib/routes";
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
  role: GroupMemberRole;
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
  viewerRole: GroupMemberRole;
  memberBalances: GroupSettingsBalanceMember[];
};

type ExpenseExportRow = {
  amount: string;
  currency: string;
  description: string;
  expense_date: string;
  group_name: string;
  notes: string;
  paid_by: string;
  participant_count: number;
  participants: string;
  split_summary: string;
  split_type: ExpenseSplitType;
};

const CSV_COLUMNS = [
  "group_name",
  "currency",
  "expense_date",
  "description",
  "amount",
  "paid_by",
  "split_type",
  "participant_count",
  "participants",
  "split_summary",
  "notes",
] as const;

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
      role: GROUP_MEMBER_ROLE.MEMBER,
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
    viewerRole: GROUP_MEMBER_ROLE.OWNER,
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to complete that settings action right now.";
}

function formatInviteExpiry(expiresAt: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(expiresAt);
}

function getInviteBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

function buildInviteLink(token: string) {
  const baseUrl = getInviteBaseUrl();

  return baseUrl ? `${baseUrl}/invites/${token}` : `/invites/${token}`;
}

function slugifyGroupName(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "group";
}

function formatExportDate(value: number) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function createExportFileName(groupName: string, generatedAt: number) {
  return `split-it-${slugifyGroupName(groupName)}-expenses-${formatExportDate(generatedAt)}.csv`;
}

function escapeCsvField(value: string | number) {
  const text = String(value);

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildExpenseExportCsv(rows: ExpenseExportRow[]) {
  return [
    CSV_COLUMNS.join(","),
    ...rows.map((row) =>
      CSV_COLUMNS.map((column) => escapeCsvField(row[column])).join(","),
    ),
  ].join("\n");
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
  const hasValidGroupId = looksLikeConvexId(groupId);
  const settingsOverview = useQuery(
    api.groups.getSettingsOverview,
    currentUser && hasValidGroupId ? { groupId: groupId as Id<"groups"> } : "skip",
  );

  if (!hasValidGroupId) {
    return (
      <PageContainer className="space-y-6">
        <ScreenState
          state="unavailable"
          title="Group unavailable"
          description="This group route is invalid or no longer points at an active ledger."
          icon={<Users className="h-7 w-7 text-secondary" />}
          actions={
            <Link href={ROUTES.groups} className={buttonVariants({ variant: "primary", size: "lg" })}>
              Back to groups
            </Link>
          }
        />
      </PageContainer>
    );
  }

  if (currentUser === undefined) {
    return (
      <PageContainer className="flex min-h-[60vh] items-center justify-center">
        <ScreenState
          state="loading"
          title="Loading group totals"
          description="Pulling the spend summary, member balances, and settings actions into place."
        />
      </PageContainer>
    );
  }

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

  if (settingsOverview === undefined) {
    return (
      <PageContainer className="flex min-h-[60vh] items-center justify-center">
        <ScreenState
          state="loading"
          title="Loading group totals"
          description="Pulling the spend summary, member balances, and settings actions into place."
        />
      </PageContainer>
    );
  }

  if (settingsOverview === null) {
    return (
      <PageContainer className="space-y-6">
        <ScreenState
          state="unavailable"
          title="Group unavailable"
          description="You do not have access to this group, or it is no longer active."
          icon={<Users className="h-7 w-7 text-secondary" />}
          actions={
            <Link href={ROUTES.dashboard} className={buttonVariants({ variant: "primary", size: "lg" })}>
              Back to dashboard
            </Link>
          }
        />
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
      actions={
        <LiveSettingsActionsCard
          groupCurrency={settingsOverview.groupCurrency}
          groupId={String(settingsOverview.groupId)}
          groupName={settingsOverview.groupName}
          viewerRole={settingsOverview.viewerRole}
        />
      }
    />
  );
}

function GroupSettingsScene({
  actions,
  group,
  isMock = false,
}: {
  actions?: ReactNode;
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
            <Link href={ROUTES.dashboard} className="transition hover:text-on-surface">
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
          {actions ?? <StaticSettingsActionsCard viewerRole={group.viewerRole} />}
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

function SettingsSectionFrame({
  children,
}: {
  children: ReactNode;
}) {
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
        {children}
      </SurfaceCard>
    </div>
  );
}

function SettingsActionButton({
  badge,
  detail,
  disabled = false,
  Icon,
  label,
  onClick,
  tone = "default",
}: {
  badge?: string;
  detail: string;
  disabled?: boolean;
  Icon: typeof Pencil;
  label: string;
  onClick?: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-[1.55rem] px-4 py-4 text-left transition",
        "hover:bg-surface-container-high active:scale-[0.99] disabled:cursor-not-allowed disabled:active:scale-100",
        tone === "danger"
          ? "bg-secondary/6 text-secondary hover:bg-secondary/12"
          : "text-on-surface",
      )}
    >
      <span className="flex min-w-0 items-center gap-4">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            tone === "danger" ? "bg-secondary/12" : "bg-white/4",
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0 space-y-1">
          <span className="block font-headline text-[0.98rem] font-bold tracking-tight">
            {label}
          </span>
          <span className="block text-xs leading-6 text-on-surface-variant">{detail}</span>
        </span>
      </span>

      <span className="ml-4 flex shrink-0 items-center gap-3">
        {badge ? (
          <span className="rounded-full bg-white/6 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-on-surface-variant">
            {badge}
          </span>
        ) : null}
        <ChevronRight className="h-4.5 w-4.5 text-on-surface-variant" />
      </span>
    </button>
  );
}

function DialogNotice({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "error" | "neutral" | "success";
}) {
  return (
    <div
      className={cn(
        "rounded-[1.4rem] border px-4 py-3 text-sm leading-6",
        tone === "error" && "border-error/20 bg-error/8 text-error",
        tone === "success" && "border-primary/20 bg-primary/10 text-on-surface",
        tone === "neutral" && "border-white/6 bg-white/[0.03] text-on-surface-variant",
      )}
    >
      {children}
    </div>
  );
}

function StaticSettingsActionsCard({
  viewerRole,
}: {
  viewerRole: GroupMemberRole;
}) {
  const stubNote =
    viewerRole === GROUP_MEMBER_ROLE.OWNER
      ? "Settings actions stay live-only in the configured workspace. Mock mode keeps the same layout without running destructive flows."
      : "Owner-only controls stay visible for layout parity. In live mode, export remains available while protected actions stay disabled.";

  return (
    <SettingsSectionFrame>
      <div className="space-y-2">
        {SETTINGS_ACTIONS.map((action) => (
          <SettingsActionButton
            key={action.label}
            Icon={action.Icon}
            label={action.label}
            tone={action.tone}
            detail="Mock mode preview"
            disabled
            badge={action.label === "Export CSV" ? "Live only" : "Owner only"}
          />
        ))}
      </div>

      <div className="mt-4 rounded-[1.45rem] bg-black/16 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/6 text-on-surface-variant">
            <Wallet className="h-4.5 w-4.5" />
          </div>
          <p className="text-sm leading-6 text-on-surface-variant">{stubNote}</p>
        </div>
      </div>
    </SettingsSectionFrame>
  );
}

function LiveSettingsActionsCard({
  groupCurrency,
  groupId,
  groupName,
  viewerRole,
}: {
  groupCurrency: string;
  groupId: string;
  groupName: string;
  viewerRole: GroupMemberRole;
}) {
  const router = useRouter();
  const convex = useConvex();
  const renameGroup = useMutation(api.groups.rename);
  const createInvite = useMutation(api.invites.create);
  const sendEmailInvite = useMutation(api.invites.sendEmailInvite);
  const archiveGroup = useMutation(api.groups.archive);
  const [openDialog, setOpenDialog] = useState<"archive" | "members" | "rename" | null>(null);
  const [renameDraft, setRenameDraft] = useState(groupName);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [inviteEmailDraft, setInviteEmailDraft] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [isCopyingInvite, setIsCopyingInvite] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [archiveConfirmation, setArchiveConfirmation] = useState("");
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const isOwner = viewerRole === GROUP_MEMBER_ROLE.OWNER;
  const composerData = useQuery(
    api.invites.getGroupComposerData,
    openDialog === "members" ? { groupId: groupId as Id<"groups"> } : "skip",
  );
  const inviteLink = composerData?.activeInvite
    ? buildInviteLink(composerData.activeInvite.token)
    : null;
  const inviteActionLabel = composerData?.activeInvite
    ? "Copy current invite link"
    : "Generate and copy invite link";
  const emailActionLabel = composerData?.activeInvite
    ? "Send invite email"
    : "Generate and send invite";
  const matchesArchiveConfirmation = archiveConfirmation.trim() === groupName;

  function closeDialog() {
    setOpenDialog(null);
    setRenameError(null);
    setInviteError(null);
    setArchiveError(null);
  }

  function openRenameDialog() {
    if (!isOwner) {
      return;
    }

    setRenameDraft(groupName);
    setRenameError(null);
    setOpenDialog("rename");
  }

  function openMembersDialog() {
    if (!isOwner) {
      return;
    }

    setInviteEmailDraft("");
    setInviteError(null);
    setInviteNotice(null);
    setOpenDialog("members");
  }

  function openArchiveDialog() {
    if (!isOwner) {
      return;
    }

    setArchiveConfirmation("");
    setArchiveError(null);
    setOpenDialog("archive");
  }

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsRenaming(true);
    setRenameError(null);

    try {
      await renameGroup({
        groupId: groupId as Id<"groups">,
        name: renameDraft,
      });
      closeDialog();
    } catch (error) {
      setRenameError(getErrorMessage(error));
    } finally {
      setIsRenaming(false);
    }
  }

  async function handleCopyInviteLink() {
    setIsCopyingInvite(true);
    setInviteError(null);
    setInviteNotice(null);

    try {
      const activeInvite = composerData?.activeInvite;
      const invite =
        activeInvite ??
        (await createInvite({
          groupId: groupId as Id<"groups">,
        }));

      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable in this browser session.");
      }

      await navigator.clipboard.writeText(buildInviteLink(invite.token));
      setInviteNotice(
        activeInvite
          ? "Copied the current single-use invite link."
          : "Generated and copied a fresh single-use invite link.",
      );
    } catch (error) {
      setInviteError(getErrorMessage(error));
    } finally {
      setIsCopyingInvite(false);
    }
  }

  async function handleSendInviteEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSendingInvite(true);
    setInviteError(null);
    setInviteNotice(null);

    try {
      const email = inviteEmailDraft.trim();

      if (!email) {
        throw new Error("Enter an email address to send an invite.");
      }

      const hadActiveInvite = Boolean(composerData?.activeInvite);

      await sendEmailInvite({
        groupId: groupId as Id<"groups">,
        email,
      });

      setInviteEmailDraft("");
      setInviteNotice(
        hadActiveInvite
          ? `Sent the current invite link to ${email}.`
          : `Generated and emailed a fresh invite link to ${email}.`,
      );
    } catch (error) {
      setInviteError(getErrorMessage(error));
    } finally {
      setIsSendingInvite(false);
    }
  }

  async function handleExportCsv() {
    setIsExporting(true);
    setExportError(null);

    try {
      const exportData = await convex.query(api.exports.getGroupExpenseExport, {
        groupId: groupId as Id<"groups">,
      });
      const csv = buildExpenseExportCsv(exportData.rows as ExpenseExportRow[]);
      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = createExportFileName(exportData.groupName, exportData.generatedAt);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setExportError(getErrorMessage(error));
    } finally {
      setIsExporting(false);
    }
  }

  async function handleArchiveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!matchesArchiveConfirmation) {
      setArchiveError(`Type "${groupName}" to confirm archiving this group.`);
      return;
    }

    setIsArchiving(true);
    setArchiveError(null);

    try {
      await archiveGroup({
        groupId: groupId as Id<"groups">,
      });

      startTransition(() => {
        router.push(ROUTES.dashboard);
      });
    } catch (error) {
      setArchiveError(getErrorMessage(error));
    } finally {
      setIsArchiving(false);
    }
  }

  const footerNote = isOwner
    ? "This group uses one current single-use invite link. Copying or emailing reuses the current pending link when possible, and generating or sending a fresh invite later rotates the previous pending one."
    : "Only the group owner can rename the group, manage invites, or archive it. Expense CSV export stays available to every active member.";

  return (
    <>
      <SettingsSectionFrame>
        <div className="space-y-2">
          <SettingsActionButton
            Icon={Pencil}
            label="Edit Group Name"
            detail={
              isOwner
                ? "Rename the group everywhere it appears."
                : "Only the group owner can rename this group."
            }
            badge={isOwner ? undefined : "Owner only"}
            disabled={!isOwner}
            onClick={openRenameDialog}
          />
          <SettingsActionButton
            Icon={UserPlus}
            label="Add Members"
            detail={
              isOwner
                ? "Review the roster, copy the invite link, or send one email invite."
                : "Only the group owner can manage the roster and invite link."
            }
            badge={isOwner ? undefined : "Owner only"}
            disabled={!isOwner}
            onClick={openMembersDialog}
          />
          <SettingsActionButton
            Icon={Download}
            label="Export CSV"
            detail={`Download an expense-level ${groupCurrency} CSV export.`}
            badge={isExporting ? "Working" : undefined}
            disabled={isExporting}
            onClick={handleExportCsv}
          />
          <SettingsActionButton
            Icon={Trash2}
            label="Delete Group"
            detail={
              isOwner
                ? "Archive the group and remove it from the active dashboard."
                : "Only the group owner can archive this group."
            }
            tone="danger"
            badge={isOwner ? undefined : "Owner only"}
            disabled={!isOwner}
            onClick={openArchiveDialog}
          />
        </div>

        {exportError ? (
          <div className="mt-4">
            <DialogNotice tone="error">{exportError}</DialogNotice>
          </div>
        ) : null}

        <div className="mt-4 rounded-[1.45rem] bg-black/16 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/6 text-on-surface-variant">
              <Wallet className="h-4.5 w-4.5" />
            </div>
            <p className="text-sm leading-6 text-on-surface-variant">{footerNote}</p>
          </div>
        </div>
      </SettingsSectionFrame>

      <ResponsiveDialog
        open={openDialog === "rename"}
        onClose={closeDialog}
        eyebrow="Edit Group Name"
        title="Rename this group"
        description="Keep the name short and clear. The updated title appears on the dashboard, detail screen, and settings page."
      >
        <form className="space-y-5" onSubmit={handleRename}>
          <FilledInput
            label="Group Name"
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            maxLength={60}
            placeholder="Iceland Expedition"
            autoFocus
          />

          {renameError ? <DialogNotice tone="error">{renameError}</DialogNotice> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" size="lg" onClick={closeDialog} disabled={isRenaming}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={isRenaming}>
              {isRenaming ? "Saving..." : "Save Name"}
            </Button>
          </div>
        </form>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={openDialog === "members"}
        onClose={closeDialog}
        eyebrow="Add Members"
        title="Invite new members"
        description="Review the current roster, copy the current invite link, or send one invite email when delivery is configured."
      >
        {composerData === undefined ? (
          <ScreenState
            state="loading"
            title="Loading members"
            description="Checking the active roster and current invite-link status."
            className="max-w-none rounded-[1.8rem]"
          />
        ) : composerData === null || !composerData.canInvite ? (
          <ScreenState
            state="unavailable"
            title="Invite tools unavailable"
            description="This group is no longer available, or you no longer have permission to manage invites."
            className="max-w-none rounded-[1.8rem]"
          />
        ) : (
          <div className="space-y-5">
            {inviteError ? <DialogNotice tone="error">{inviteError}</DialogNotice> : null}
            {inviteNotice ? <DialogNotice tone="success">{inviteNotice}</DialogNotice> : null}

            <SurfaceCard variant="low" className="space-y-4 rounded-[1.75rem] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <p className="text-[0.68rem] uppercase tracking-[0.24em] text-primary">Invite Status</p>
                  <h3 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
                    {composerData.activeInvite ? "Current invite link is ready" : "No pending invite link yet"}
                  </h3>
                  <p className="text-sm leading-7 text-on-surface-variant">
                    This group uses one current single-use invite link. Copying or emailing reuses the current pending link when available. Generating or sending a fresh invite later rotates the previous pending one.
                  </p>
                </div>
                <div className="rounded-[1.2rem] bg-white/[0.03] px-4 py-3 text-sm text-on-surface-variant">
                  {composerData.activeInvite
                    ? `Expires ${formatInviteExpiry(composerData.activeInvite.expiresAt)}`
                    : "Created only when you copy or send"}
                </div>
              </div>

              {inviteLink ? (
                <div className="rounded-[1.25rem] border border-white/6 bg-surface-container-lowest/70 px-4 py-3 text-sm text-on-surface-variant break-all">
                  {inviteLink}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  size="lg"
                  onClick={handleCopyInviteLink}
                  disabled={isCopyingInvite || isSendingInvite}
                >
                  <Copy className="h-4.5 w-4.5" />
                  {isCopyingInvite ? "Copying..." : inviteActionLabel}
                </Button>
                <p className="text-xs leading-6 text-on-surface-variant">
                  One pending token per group, reused until it is accepted, expires, or you rotate it.
                </p>
              </div>
            </SurfaceCard>

            <SurfaceCard variant="low" className="rounded-[1.75rem] p-5">
              {composerData.inviteEmailEnabled ? (
                <form className="space-y-5" onSubmit={handleSendInviteEmail}>
                  <FilledInput
                    label="Invite by Email"
                    type="email"
                    value={inviteEmailDraft}
                    onChange={(event) => setInviteEmailDraft(event.target.value)}
                    placeholder="teammate@example.com"
                    hint="Sending by email uses the same current single-use invite token."
                  />
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={isSendingInvite || isCopyingInvite}
                    >
                      <Mail className="h-4.5 w-4.5" />
                      {isSendingInvite ? "Sending..." : emailActionLabel}
                    </Button>
                  </div>
                </form>
              ) : (
                <DialogNotice>
                  Invite email delivery is unavailable in this Convex environment. Copy-link fallback is still fully supported.
                </DialogNotice>
              )}
            </SurfaceCard>

            <SurfaceCard variant="low" className="rounded-[1.75rem] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.24em] text-primary">Current Roster</p>
                  <h3 className="mt-2 font-headline text-2xl font-bold tracking-tight text-on-surface">
                    {composerData.memberCount} member{composerData.memberCount === 1 ? "" : "s"}
                  </h3>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {composerData.members.map((member) => {
                  const avatarStyle = buildAvatarStyle(member.imageUrl);

                  return (
                    <div
                      key={String(member.id)}
                      className="flex items-center justify-between gap-4 rounded-[1.35rem] bg-surface-container-high px-4 py-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/8 font-headline text-sm font-bold",
                            avatarStyle
                              ? "bg-surface-container-high text-transparent"
                              : "bg-[linear-gradient(135deg,rgba(78,222,163,0.32),rgba(16,185,129,0.94))] text-on-primary",
                          )}
                          style={avatarStyle}
                          aria-label={member.name}
                          title={member.name}
                        >
                          {avatarStyle ? null : getInitials(member.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-headline text-lg font-bold tracking-tight text-on-surface">
                            {member.name}
                          </p>
                          <p className="truncate text-sm text-on-surface-variant">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        {member.role === GROUP_MEMBER_ROLE.OWNER ? (
                          <span className="rounded-full bg-primary/12 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-primary">
                            Owner
                          </span>
                        ) : null}
                        {member.isCurrentUser ? (
                          <span className="rounded-full bg-white/6 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-on-surface-variant">
                            You
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SurfaceCard>
          </div>
        )}
      </ResponsiveDialog>

      <ResponsiveDialog
        open={openDialog === "archive"}
        onClose={closeDialog}
        tone="danger"
        eyebrow="Delete Group"
        title="Archive this group"
        description="Delete is a soft archive in this MVP. Memberships, invites, expenses, and shares stay stored, but the group leaves active queries and the dashboard."
      >
        <form className="space-y-5" onSubmit={handleArchiveGroup}>
          <DialogNotice>
            Type the exact group name to confirm. After archiving, the active invite link will stop working and you’ll return to the dashboard.
          </DialogNotice>

          <FilledInput
            label="Type Group Name"
            value={archiveConfirmation}
            onChange={(event) => setArchiveConfirmation(event.target.value)}
            placeholder={groupName}
            autoFocus
          />

          {archiveError ? <DialogNotice tone="error">{archiveError}</DialogNotice> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" size="lg" onClick={closeDialog} disabled={isArchiving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              disabled={isArchiving || !matchesArchiveConfirmation}
              className="border-secondary/30 bg-secondary/12 text-secondary hover:bg-secondary/18"
            >
              {isArchiving ? "Archiving..." : "Archive Group"}
            </Button>
          </div>
        </form>
      </ResponsiveDialog>
    </>
  );
}
