"use client";

import { useQuery } from "convex/react";
import { Coins, Plus } from "lucide-react";
import Link from "next/link";

import { usePlaceholderMode } from "@/components/providers/app-providers";
import { PageContainer } from "@/components/shell/page-container";
import { buttonVariants } from "@/components/ui/button";
import { ScreenState } from "@/components/ui/screen-state";
import { SurfaceCard } from "@/components/ui/surface-card";
import { api } from "@/convex/_generated/api";
import { GROUP_MEMBER_ROLE } from "@/convex/lib/constants";
import { iconMap } from "@/lib/icon-map";
import { dashboardGroups, type IconKey, type StatTone } from "@/lib/placeholder-data";
import { DASHBOARD_CREATE_GROUP_HREF, groupPath } from "@/lib/routes";
import { cn, formatCurrencyFromCents, getInitials } from "@/lib/utils";

type GroupListItem = {
  id: string;
  name: string;
  memberLabel: string;
  contextLabel: string;
  balanceLabel: string;
  balanceTone: StatTone;
  icon: IconKey;
  accentCount: number;
  isOwner: boolean;
  href: string;
};

function buildGroupHref(id: string, name: string, description?: string) {
  const params = new URLSearchParams({ name });

  if (description?.trim()) {
    params.set("description", description.trim());
  }

  return `${groupPath(id)}?${params.toString()}`;
}

function formatBalanceLabel(valueCents: number, currency = "USD") {
  if (valueCents === 0) {
    return "Settled";
  }

  return `${valueCents > 0 ? "+" : "-"}${formatCurrencyFromCents(Math.abs(valueCents), currency)}`;
}

function mapMockGroups(): GroupListItem[] {
  return dashboardGroups.map((group) => ({
    id: group.id,
    name: group.name,
    memberLabel: `${group.memberCount} ${group.memberCount === 1 ? "member" : "members"}`,
    contextLabel: group.context,
    balanceLabel: group.balanceLabel,
    balanceTone: group.balanceTone,
    icon: group.icon,
    accentCount: group.accentCount ?? Math.max(group.memberCount - 2, 0),
    isOwner: true,
    href: groupPath(group.id),
  }));
}

export function GroupsIndexScreen() {
  const { mode } = usePlaceholderMode();

  if (mode !== "live") {
    return <GroupsIndexScene groups={mapMockGroups()} isMock />;
  }

  return <LiveGroupsIndexScreen />;
}

function LiveGroupsIndexScreen() {
  const currentUser = useQuery(api.users.current);
  const groups = useQuery(
    api.groups.listActiveForCurrentUser,
    currentUser === undefined ? "skip" : {},
  );

  if (currentUser === undefined || groups === undefined) {
    return (
      <PageContainer className="space-y-6">
        <ScreenState
          state="loading"
          title="Loading groups"
          description="Pulling your active ledgers into one place."
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

  const groupItems: GroupListItem[] = groups.map((group) => ({
    id: group._id,
    name: group.name,
    memberLabel: `${group.memberCount} ${group.memberCount === 1 ? "member" : "members"}`,
    contextLabel:
      group.description?.trim() ||
      (group.expenseCount > 0
        ? `${group.expenseCount} shared ${group.expenseCount === 1 ? "expense" : "expenses"} tracked`
        : "Ready for the first shared expense"),
    balanceLabel: formatBalanceLabel(group.balanceCents, group.currency),
    balanceTone: group.balanceCents === 0 ? "neutral" : group.balanceCents > 0 ? "positive" : "negative",
    icon: group.iconKey,
    accentCount: Math.max(group.memberCount - 2, 0),
    isOwner: group.role === GROUP_MEMBER_ROLE.OWNER,
    href: buildGroupHref(group._id, group.name, group.description),
  }));

  return <GroupsIndexScene groups={groupItems} />;
}

function GroupsIndexScene({
  groups,
  isMock = false,
}: {
  groups: GroupListItem[];
  isMock?: boolean;
}) {
  return (
    <PageContainer className="page-glow relative space-y-8 lg:space-y-10">
      <section className="space-y-3">
        <p className="text-[0.68rem] uppercase tracking-[0.28em] text-on-surface-variant">
          Shared Ledgers
        </p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface sm:text-5xl">
              All Groups
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant">
              Browse every active split, jump back into a ledger, or start a new one from the dashboard composer.
            </p>
          </div>
          <Link href={DASHBOARD_CREATE_GROUP_HREF} className={buttonVariants({ variant: "primary", size: "lg" })}>
            <Plus className="h-4.5 w-4.5" />
            New Group
          </Link>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
              Active Groups
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {groups.length} active {groups.length === 1 ? "group" : "groups"} in view
              {isMock ? " · mock data" : ""}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.length === 0 ? (
            <EmptyGroupsState />
          ) : (
            groups.map((group) => <GroupCard key={group.id} group={group} />)
          )}
        </div>
      </section>
    </PageContainer>
  );
}

function GroupCard({ group }: { group: GroupListItem }) {
  const Icon = iconMap[group.icon];

  return (
    <Link href={group.href} className="group block">
      <SurfaceCard
        variant="high"
        className="min-h-[16rem] rounded-[2rem] p-5 transition duration-200 hover:bg-surface-bright sm:p-6"
      >
        <div className="relative flex h-full flex-col justify-between gap-8 overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.15rem] bg-surface-container-low text-on-surface-variant">
              <Icon
                className={cn(
                  "h-5 w-5",
                  group.balanceTone === "negative" ? "text-secondary" : "text-primary",
                )}
              />
            </div>

            <div className="flex items-center gap-2">
              {group.accentCount > 0 ? (
                <GroupAccentCluster name={group.name} accentCount={group.accentCount} />
              ) : null}
              {group.isOwner ? (
                <span className="hidden rounded-full bg-white/6 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-variant sm:inline-flex">
                  Owner
                </span>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="font-headline text-[1.7rem] font-bold tracking-tight text-on-surface">
                {group.name}
              </h3>
              <p className="mt-1 text-sm text-on-surface-variant">{group.memberLabel}</p>
            </div>
            <p className="max-w-[18rem] text-sm italic text-on-surface-variant/90">{group.contextLabel}</p>
          </div>

          <div className="space-y-2">
            <p className="text-[0.62rem] uppercase tracking-[0.24em] text-on-surface-variant">
              Balance
            </p>
            <p
              className={cn(
                "font-headline text-[2rem] font-extrabold tracking-tight",
                group.balanceTone === "positive" && "text-primary",
                group.balanceTone === "negative" && "text-secondary",
                group.balanceTone === "neutral" && "text-on-surface",
              )}
            >
              {group.balanceLabel}
            </p>
          </div>

          <div
            className={cn(
              "pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full blur-3xl transition group-hover:opacity-100",
              group.balanceTone === "negative" ? "bg-secondary/12" : "bg-primary/10",
            )}
          />
        </div>
      </SurfaceCard>
    </Link>
  );
}

function GroupAccentCluster({ name, accentCount }: { name: string; accentCount: number }) {
  const initials = getInitials(name);
  const first = initials[0] ?? "S";
  const second = initials[1] ?? first;

  return (
    <div className="hidden items-center sm:flex">
      <div className="flex items-center -space-x-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-surface bg-primary/18 text-[0.65rem] font-semibold text-primary">
          {first}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-surface bg-secondary/16 text-[0.65rem] font-semibold text-secondary">
          {second}
        </span>
      </div>
      {accentCount > 0 ? (
        <span className="ml-2 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white/6 px-2 text-[0.62rem] font-semibold text-on-surface-variant">
          +{accentCount}
        </span>
      ) : null}
    </div>
  );
}

function EmptyGroupsState() {
  return (
    <SurfaceCard variant="hero" className="rounded-[2rem]">
      <div className="flex h-full flex-col justify-between gap-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-[1.15rem] bg-primary/14 text-primary">
          <Coins className="h-6 w-6" />
        </div>

        <div className="space-y-3">
          <h3 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
            No groups yet
          </h3>
          <p className="max-w-xl text-sm leading-7 text-on-surface-variant">
            Start with rent, a trip, or a dinner rotation. Once the group exists, it appears here reactively.
          </p>
        </div>

        <div>
          <Link
            href={DASHBOARD_CREATE_GROUP_HREF}
            className={buttonVariants({ variant: "primary", size: "lg" })}
          >
            <Plus className="h-4.5 w-4.5" />
            Create Group
          </Link>
        </div>
      </div>
    </SurfaceCard>
  );
}
