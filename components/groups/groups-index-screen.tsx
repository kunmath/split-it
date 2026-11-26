"use client";

import { useMutation, useQuery } from "convex/react";
import { Plus, Users } from "lucide-react";
import { useState } from "react";

import { GroupList, GroupRow, GroupRowSkeleton } from "@/components/groups/compact-group-card";
import { CreateGroupDialog, useCreateGroupDialog } from "@/components/groups/create-group-dialog";
import {
  buildLocalGroup,
  mapLiveGroup,
  mockGroups,
  type CreateGroupDraft,
  type GroupListItem,
} from "@/components/groups/group-list-data";
import { usePlaceholderMode } from "@/components/providers/app-providers";
import { MobileTopBar, topBarIconButtonClass } from "@/components/shell/mobile-top-bar";
import { PageContainer } from "@/components/shell/page-container";
import { Button } from "@/components/ui/button";
import { ScreenState } from "@/components/ui/screen-state";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

type GroupsIndexScreenProps = {
  initialCreateOpen?: boolean;
};

type GroupFilter = "all" | "owed" | "owe";

const FILTERS: Array<{ value: GroupFilter; label: string; matches: (group: GroupListItem) => boolean }> = [
  { value: "all", label: "All", matches: () => true },
  { value: "owed", label: "You're owed", matches: (group) => group.balanceCents > 0 },
  { value: "owe", label: "You owe", matches: (group) => group.balanceCents < 0 },
];

export function GroupsIndexScreen({ initialCreateOpen = false }: GroupsIndexScreenProps) {
  const { mode } = usePlaceholderMode();

  if (mode === "live") {
    return <LiveGroupsIndexScreen initialCreateOpen={initialCreateOpen} />;
  }

  return <MockGroupsIndexScreen initialCreateOpen={initialCreateOpen} />;
}

function MockGroupsIndexScreen({ initialCreateOpen = false }: GroupsIndexScreenProps) {
  const [groups, setGroups] = useState<GroupListItem[]>(mockGroups);

  async function handleCreateGroup(draft: CreateGroupDraft) {
    const group = buildLocalGroup(draft);
    setGroups((current) => [group, ...current]);
    return group.id;
  }

  return <GroupsIndexScene initialCreateOpen={initialCreateOpen} groups={groups} onCreateGroup={handleCreateGroup} />;
}

function LiveGroupsIndexScreen({ initialCreateOpen = false }: GroupsIndexScreenProps) {
  const currentUser = useQuery(api.users.current);
  const groups = useQuery(api.groups.listActiveForCurrentUser, currentUser ? {} : "skip");
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
      <PageContainer size="narrow">
        <MobileTopBar variant="tab" title="Groups" />
        <ScreenState
          state="loading"
          title="Syncing your workspace"
          description="Your account is authenticated, but the ledger record is still finishing setup. Refresh in a moment if this state persists."
        />
      </PageContainer>
    );
  }

  return (
    <GroupsIndexScene
      initialCreateOpen={initialCreateOpen}
      groups={groups === undefined ? null : groups.map(mapLiveGroup)}
      onCreateGroup={handleCreateGroup}
    />
  );
}

type GroupsIndexSceneProps = {
  initialCreateOpen: boolean;
  /** Null while loading. */
  groups: GroupListItem[] | null;
  onCreateGroup: (draft: CreateGroupDraft) => Promise<string>;
};

function GroupsIndexScene({ initialCreateOpen, groups, onCreateGroup }: GroupsIndexSceneProps) {
  const createDialog = useCreateGroupDialog(initialCreateOpen);
  const [filter, setFilter] = useState<GroupFilter>("all");
  const [highlightGroupId, setHighlightGroupId] = useState<string | null>(null);

  function handleCreated(groupId: string) {
    setHighlightGroupId(groupId);
    setFilter("all");
    createDialog.close();
  }

  const activeFilter = FILTERS.find((option) => option.value === filter) ?? FILTERS[0]!;
  const visibleGroups = groups?.filter(activeFilter.matches) ?? [];

  return (
    <PageContainer size="narrow">
      <MobileTopBar
        variant="tab"
        title="Groups"
        actions={
          <button
            type="button"
            aria-label="New group"
            onClick={createDialog.openDialog}
            className={cn(topBarIconButtonClass, "-mr-2 text-primary")}
          >
            <Plus className="h-6 w-6" aria-hidden="true" />
          </button>
        }
      />

      <header className="mb-8 hidden items-end justify-between gap-4 lg:flex">
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">Groups</h1>
        <Button onClick={createDialog.openDialog}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New group
        </Button>
      </header>

      {groups === null ? (
        <div role="status">
          <span className="sr-only">Loading groups…</span>
          <GroupList>
            <GroupRowSkeleton />
            <GroupRowSkeleton />
            <GroupRowSkeleton />
            <GroupRowSkeleton />
          </GroupList>
        </div>
      ) : groups.length === 0 ? (
        <EmptyGroups onCreate={createDialog.openDialog} />
      ) : (
        <div className="space-y-4">
          <div role="group" aria-label="Filter groups" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
            {FILTERS.map((option) => {
              const count = groups.filter(option.matches).length;
              const active = option.value === filter;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(option.value)}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                    active
                      ? "bg-on-surface text-surface"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
                  )}
                >
                  {option.label}
                  <span className={cn("tabular-nums", active ? "text-surface/70" : "text-on-surface-variant")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {visibleGroups.length === 0 ? (
            <p className="rounded-3xl bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant">
              {filter === "owed" ? "No group owes you money right now." : "You don't owe money in any group."}
            </p>
          ) : (
            <GroupList>
              {visibleGroups.map((group) => (
                <GroupRow key={group.id} group={group} highlighted={group.id === highlightGroupId} />
              ))}
            </GroupList>
          )}
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

function EmptyGroups({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="rounded-3xl bg-surface-container-low px-5 py-8 text-center sm:px-8">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/14 text-primary">
        <Users className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-headline text-xl font-bold text-on-surface">No groups yet</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-on-surface-variant">
        Groups keep shared expenses and balances in one place.
      </p>
      <Button size="lg" className="mt-5" onClick={onCreate}>
        <Plus className="h-4.5 w-4.5" aria-hidden="true" />
        Create a group
      </Button>
    </section>
  );
}
