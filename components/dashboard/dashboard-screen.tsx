"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { NetBalanceCard, NetBalanceCardSkeleton } from "@/components/dashboard/net-balance-card";
import { PeopleList, PeopleListSkeleton } from "@/components/dashboard/people-list";
import { GroupList, GroupRow, GroupRowSkeleton } from "@/components/groups/compact-group-card";
import { CreateGroupDialog, useCreateGroupDialog } from "@/components/groups/create-group-dialog";
import {
  buildGroupHref,
  buildLocalGroup,
  dominantCurrency,
  mapLiveGroup,
  mockGroups,
  mockPeople,
  summarizeGroups,
  type CreateGroupDraft,
  type GroupListItem,
  type PersonBalanceItem,
} from "@/components/groups/group-list-data";
import { usePlaceholderMode } from "@/components/providers/app-providers";
import { MobileTopBar } from "@/components/shell/mobile-top-bar";
import { PageContainer } from "@/components/shell/page-container";
import { Button } from "@/components/ui/button";
import { ScreenState } from "@/components/ui/screen-state";
import { api } from "@/convex/_generated/api";

const HOME_GROUP_LIMIT = 5;

type DashboardScreenProps = {
  initialCreateOpen?: boolean;
};

type DashboardData = {
  summary: { owedCents: number; oweCents: number };
  groups: GroupListItem[];
  people: PersonBalanceItem[];
};

export function DashboardScreen({ initialCreateOpen = false }: DashboardScreenProps) {
  const { mode } = usePlaceholderMode();

  if (mode === "live") {
    return <LiveDashboardScreen initialCreateOpen={initialCreateOpen} />;
  }

  return <MockDashboardScreen initialCreateOpen={initialCreateOpen} />;
}

function MockDashboardScreen({ initialCreateOpen = false }: DashboardScreenProps) {
  const [groups, setGroups] = useState<GroupListItem[]>(mockGroups);

  async function handleCreateGroup(draft: CreateGroupDraft) {
    const group = buildLocalGroup(draft);
    setGroups((current) => [group, ...current]);
    return group.id;
  }

  return (
    <DashboardScene
      initialCreateOpen={initialCreateOpen}
      data={{ summary: summarizeGroups(groups), groups, people: mockPeople }}
      onCreateGroup={handleCreateGroup}
    />
  );
}

function LiveDashboardScreen({ initialCreateOpen = false }: DashboardScreenProps) {
  const { isLoading: isConvexAuthLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.current);
  const ready = currentUser === undefined || currentUser === null ? "skip" : {};
  const summary = useQuery(api.groups.getDashboardSummary, ready);
  const groups = useQuery(api.groups.listActiveForCurrentUser, ready);
  const people = useQuery(api.groups.listPeopleBalances, ready);
  const createGroup = useMutation(api.groups.create);

  async function handleCreateGroup(draft: CreateGroupDraft) {
    return createGroup({
      name: draft.name,
      description: draft.description || undefined,
      currency: draft.currency,
      iconKey: draft.iconKey,
    });
  }

  if (currentUser === null) {
    return (
      <PageContainer size="content">
        <MobileTopBar variant="tab" title="Home" />
        <ScreenState
          state={isConvexAuthLoading ? "loading" : "unavailable"}
          title={isConvexAuthLoading ? "Syncing your workspace" : "Convex auth bridge unavailable"}
          description={
            isConvexAuthLoading
              ? "Your account is authenticated, but the ledger record is still finishing setup. Refresh in a moment if this state persists."
              : isConvexAuthenticated
                ? "Your account is authenticated, but the ledger record was not found in Convex. The Clerk webhook or current-user sync still needs attention."
                : "Clerk sign-in succeeded, but Convex did not receive a valid auth token for this session. Check the Clerk JWT template named `convex`, its `aud` claim, and whether it matches this app's publishable key and issuer domain."
          }
        />
      </PageContainer>
    );
  }

  const data: DashboardData | null =
    summary === undefined || groups === undefined || people === undefined
      ? null
      : {
          summary: { owedCents: summary.overallYouAreOwedCents, oweCents: summary.totalYouOweCents },
          groups: groups.map(mapLiveGroup),
          people: people.map((person) => ({
            key: `${person.userId}:${person.currency}`,
            name: person.name,
            imageUrl: person.imageUrl,
            currency: person.currency,
            balanceCents: person.balanceCents,
            groups: person.groups.map((group) => ({
              id: group.groupId,
              name: group.groupName,
              href: buildGroupHref(group.groupId, group.groupName),
            })),
          })),
        };

  return <DashboardScene initialCreateOpen={initialCreateOpen} data={data} onCreateGroup={handleCreateGroup} />;
}

type DashboardSceneProps = {
  initialCreateOpen: boolean;
  /** Null while loading. */
  data: DashboardData | null;
  onCreateGroup: (draft: CreateGroupDraft) => Promise<string>;
};

function DashboardScene({ initialCreateOpen, data, onCreateGroup }: DashboardSceneProps) {
  const createDialog = useCreateGroupDialog(initialCreateOpen);
  const [highlightGroupId, setHighlightGroupId] = useState<string | null>(null);

  function handleCreated(groupId: string) {
    setHighlightGroupId(groupId);
    createDialog.close();
  }

  return (
    <PageContainer size="content">
      <MobileTopBar variant="tab" title="Home" />

      <header className="mb-8 hidden items-end justify-between gap-4 lg:flex">
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">Home</h1>
        <Button variant="ghost" onClick={createDialog.openDialog}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New group
        </Button>
      </header>

      {data === null ? (
        <DashboardSkeleton />
      ) : data.groups.length === 0 ? (
        <EmptyHome onCreate={createDialog.openDialog} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start xl:gap-8">
          <div className="space-y-6">
            <NetBalanceCard
              owedCents={data.summary.owedCents}
              oweCents={data.summary.oweCents}
              currency={dominantCurrency(data.groups)}
            />

            <section id="people" aria-labelledby="people-heading" className="scroll-mt-20 space-y-2">
              <SectionHeading id="people-heading" title="People" />
              <PeopleList people={data.people} />
            </section>
          </div>

          <section aria-labelledby="groups-heading" className="space-y-2">
            <SectionHeading
              id="groups-heading"
              title="Groups"
              action={
                <button
                  type="button"
                  onClick={createDialog.openDialog}
                  className="-mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-primary transition hover:bg-white/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 lg:hidden"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New group
                </button>
              }
            />
            <GroupList>
              {data.groups.slice(0, HOME_GROUP_LIMIT).map((group) => (
                <GroupRow key={group.id} group={group} highlighted={group.id === highlightGroupId} />
              ))}
            </GroupList>
            {data.groups.length > HOME_GROUP_LIMIT ? (
              <Link
                href="/groups"
                className="flex min-h-11 items-center justify-center rounded-full text-sm font-semibold text-primary transition hover:bg-white/4"
              >
                See all {data.groups.length} groups
              </Link>
            ) : null}
          </section>
        </div>
      )}

      <CreateGroupDialog
        open={createDialog.open}
        onClose={createDialog.close}
        onCreate={onCreateGroup}
        onCreated={handleCreated}
      />
    </PageContainer>
  );
}

function SectionHeading({ id, title, action }: { id: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <h2 id={id} className="font-headline text-lg font-bold tracking-tight text-on-surface">
        {title}
      </h2>
      {action}
    </div>
  );
}

function EmptyHome({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="rounded-3xl bg-surface-container-low px-5 py-8 text-center sm:px-8">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/14 text-primary">
        <Users className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-headline text-xl font-bold text-on-surface">Start your first group</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-on-surface-variant">
        Make a group for your flat, a trip, or a dinner rotation, then add the people you split with.
      </p>
      <Button size="lg" className="mt-5" onClick={onCreate}>
        <Plus className="h-4.5 w-4.5" aria-hidden="true" />
        Create a group
      </Button>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" className="grid gap-6 xl:grid-cols-2 xl:items-start xl:gap-8">
      <span className="sr-only">Loading your balances…</span>
      <div className="space-y-6">
        <NetBalanceCardSkeleton />
        <div className="space-y-2">
          <div className="h-11 py-3">
            <div className="h-5 w-20 animate-pulse rounded-md bg-white/6" />
          </div>
          <PeopleListSkeleton />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-11 py-3">
          <div className="h-5 w-20 animate-pulse rounded-md bg-white/6" />
        </div>
        <GroupList>
          <GroupRowSkeleton />
          <GroupRowSkeleton />
          <GroupRowSkeleton />
        </GroupList>
      </div>
    </div>
  );
}
