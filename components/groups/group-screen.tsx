"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { HandCoins, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";

import { GroupBalanceStrip } from "@/components/groups/group-balance-strip";
import { GroupBalancesSheet, GroupMemberBalanceList } from "@/components/groups/group-balances-sheet";
import { GroupExpenseList, type GroupExpensePager } from "@/components/groups/group-expense-list";
import { GroupInsights } from "@/components/groups/group-insights";
import { getMockGroupSceneData } from "@/components/groups/group-mock-data";
import { GroupScreenSkeleton } from "@/components/groups/group-screen-skeleton";
import { formatMemberCount, type GroupSceneData } from "@/components/groups/group-types";
import { SettleUpDialog, type SettleUpPreset } from "@/components/groups/settle-up-dialog";
import { usePlaceholderMode } from "@/components/providers/app-providers";
import { MobileTopBar, topBarIconButtonClass } from "@/components/shell/mobile-top-bar";
import { PageContainer } from "@/components/shell/page-container";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScreenState } from "@/components/ui/screen-state";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { looksLikeConvexId } from "@/lib/convex-ids";
import { iconMap } from "@/lib/icon-map";
import type { IconKey } from "@/lib/placeholder-data";

type GroupScreenProps = {
  groupId: string;
  initialDescription?: string;
  initialName?: string;
};

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

function GroupUnavailable({ description, action }: { description: string; action: ReactNode }) {
  return (
    <PageContainer>
      <MobileTopBar variant="nested" title="Group" backFallbackHref="/groups" />
      <ScreenState
        state="unavailable"
        title="Group unavailable"
        description={description}
        icon={<Users className="h-7 w-7 text-secondary" />}
        actions={action}
      />
    </PageContainer>
  );
}

function LiveGroupScreen({ groupId }: GroupScreenProps) {
  const currentUser = useQuery(api.users.current);
  const hasValidGroupId = looksLikeConvexId(groupId);
  const group = useQuery(
    api.groups.getDetail,
    currentUser && hasValidGroupId ? { groupId: groupId as Id<"groups"> } : "skip",
  );
  const expensePages = usePaginatedQuery(
    api.expenses.listPageForGroup,
    currentUser && hasValidGroupId && group ? { groupId: groupId as Id<"groups"> } : "skip",
    { initialNumItems: 30 },
  );

  if (!hasValidGroupId) {
    return (
      <GroupUnavailable
        description="This link doesn't point to a group you can open."
        action={
          <Link href="/groups" className={buttonVariants({ variant: "primary", size: "lg" })}>
            Back to groups
          </Link>
        }
      />
    );
  }

  if (currentUser === null) {
    return (
      <PageContainer>
        <MobileTopBar variant="nested" title="Group" backFallbackHref="/groups" />
        <ScreenState
          state="loading"
          title="Finishing account setup"
          description="Your account is signed in but still syncing. Refresh in a moment if this persists."
        />
      </PageContainer>
    );
  }

  if (currentUser === undefined || group === undefined) {
    return <GroupScreenSkeleton />;
  }

  if (group === null) {
    return (
      <GroupUnavailable
        description="You don't have access to this group, or it has been archived."
        action={
          <Link href="/groups" className={buttonVariants({ variant: "primary", size: "lg" })}>
            Back to groups
          </Link>
        }
      />
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
    // Prefer the paginated ledger once loaded; getDetail's recent slice renders instantly meanwhile.
    recentExpenses: (expensePages.status === "LoadingFirstPage" ? group.recentExpenses : expensePages.results).map((expense) => ({
      ...expense,
      id: String(expense.id),
      iconKey: expense.iconKey as IconKey,
    })),
    suggestedSettlements: (group.suggestedSettlements ?? []).map((settlement) => ({
      counterpartyId: String(settlement.counterpartyId),
      counterpartyName: settlement.counterpartyName,
      counterpartyImageUrl: settlement.counterpartyImageUrl,
      amountCents: settlement.amountCents,
      direction: settlement.direction,
    })),
    insights: {
      ...group.insights,
      topContributors: group.insights.topContributors.map((member) => ({
        ...member,
        id: String(member.id),
      })),
    },
  };

  const pager: GroupExpensePager = {
    status: expensePages.status,
    loadMore: () => expensePages.loadMore(30),
  };

  return <GroupScene group={groupSceneData} pager={pager} />;
}

function GroupScene({
  group,
  isMock = false,
  pager,
}: {
  group: GroupSceneData;
  isMock?: boolean;
  pager?: GroupExpensePager;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shouldAutoOpen = searchParams.get("settle") === "1";
  const withParam = searchParams.get("with");
  const [localSettleOpen, setLocalSettleOpen] = useState(false);
  const [localPreset, setLocalPreset] = useState<SettleUpPreset | null>(null);
  const [balancesOpen, setBalancesOpen] = useState(false);
  const isSettleOpen = shouldAutoOpen || localSettleOpen;

  const urlPreset: SettleUpPreset | null =
    shouldAutoOpen && withParam
      ? {
          counterpartyId: withParam,
          direction:
            group.suggestedSettlements.find((suggestion) => suggestion.counterpartyId === withParam)
              ?.direction ?? "youPay",
        }
      : null;
  const settlePreset = localSettleOpen ? localPreset : urlPreset;

  const canSettle = group.memberCount > 1;
  const settingsHref = `/groups/${group.groupId}/settings`;
  const GroupIcon = iconMap[group.iconKey];

  const openSettle = (preset?: SettleUpPreset) => {
    setBalancesOpen(false);
    setLocalPreset(preset ?? null);
    setLocalSettleOpen(true);
  };
  const closeSettle = () => {
    setLocalSettleOpen(false);
    if (shouldAutoOpen) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("settle");
      next.delete("with");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }
  };

  return (
    <PageContainer>
      <MobileTopBar
        variant="nested"
        title={group.groupName}
        subtitle={formatMemberCount(group.memberCount)}
        backFallbackHref="/groups"
        actions={
          <Link href={settingsHref} aria-label="Group settings" className={topBarIconButtonClass}>
            <Settings className="h-5 w-5" />
          </Link>
        }
      />

      <header className="mb-8 hidden items-center gap-4 lg:flex">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-container-high text-primary">
          <GroupIcon aria-hidden="true" className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-headline text-3xl font-bold tracking-tight text-on-surface">
            {group.groupName}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {formatMemberCount(group.memberCount)} · {group.groupCurrency}
            {isMock ? " · Demo data" : null}
          </p>
        </div>
        <Link href={settingsHref} className={buttonVariants({ variant: "ghost" })}>
          <Settings aria-hidden="true" className="h-4 w-4" />
          Settings
        </Link>
        <Button variant="primary" onClick={() => openSettle()} disabled={!canSettle} aria-haspopup="dialog">
          <HandCoins aria-hidden="true" className="h-4 w-4" />
          Settle up
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-start lg:gap-8">
        <div className="min-w-0 space-y-4">
          <GroupBalanceStrip
            className="lg:hidden"
            group={group}
            onSettleUp={openSettle}
            onShowBalances={() => setBalancesOpen(true)}
          />
          <GroupExpenseList group={group} pager={pager} />
          <GroupInsights className="lg:hidden" group={group} />
        </div>

        <aside className="hidden space-y-4 lg:block" aria-label="Balances">
          <GroupBalanceStrip
            group={group}
            onSettleUp={openSettle}
            onShowBalances={() => setBalancesOpen(true)}
            showActions={false}
          />
          <section className="rounded-3xl bg-surface-container-low px-5 pb-3 pt-4 ring-1 ring-white/5">
            <h2 className="text-sm font-semibold text-on-surface">Member balances</h2>
            <GroupMemberBalanceList members={group.members} currency={group.groupCurrency} className="mt-1" />
          </section>
          <GroupInsights group={group} />
        </aside>
      </div>

      <GroupBalancesSheet
        open={balancesOpen}
        onClose={() => setBalancesOpen(false)}
        members={group.members}
        currency={group.groupCurrency}
        onSettleUp={() => openSettle()}
        canSettle={canSettle}
      />

      <SettleUpDialog
        open={isSettleOpen}
        onClose={closeSettle}
        groupId={group.groupId}
        groupCurrency={group.groupCurrency}
        members={group.members.map((member) => ({
          id: member.id,
          name: member.name,
          imageUrl: member.imageUrl,
          isCurrentUser: member.isCurrentUser,
        }))}
        suggestions={group.suggestedSettlements}
        preset={settlePreset}
        isMock={isMock}
      />
    </PageContainer>
  );
}
