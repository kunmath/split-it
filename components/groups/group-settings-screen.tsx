"use client";

import { getMockGroupSceneData } from "@/components/groups/group-mock-data";
import { useQuery } from "convex/react";
import { ArrowLeft, Coins, Download, LogOut, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { useMembershipManagement } from "@/components/groups/membership-management-card";
import { SettingsNotice, SettingsRow, SettingsSection } from "@/components/groups/settings-list";
import { useGroupSettingsActions } from "@/components/groups/settings-live-actions";
import { usePlaceholderMode } from "@/components/providers/app-providers";
import { MobileTopBar } from "@/components/shell/mobile-top-bar";
import { PageContainer } from "@/components/shell/page-container";
import { buttonVariants } from "@/components/ui/button";
import { describeBalance, Money } from "@/components/ui/money";
import { ScreenState } from "@/components/ui/screen-state";
import { SkeletonBlock } from "@/components/ui/skeletons";
import { UserAvatar } from "@/components/ui/user-avatar";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { looksLikeConvexId } from "@/lib/convex-ids";

import { describeMemberBalance, type SettingsMember } from "./settings-helpers";

type GroupSettingsScreenProps = {
  groupId: string;
};

type GroupSettingsSceneData = {
  groupId: string;
  groupName: string;
  groupCurrency: string;
  memberCount: number;
  expenseCount: number;
  totalSpendCents: number;
  currentUserBalanceCents: number;
  currentUserPaidCents: number;
  currentUserOwedCents: number;
  viewerRole: "owner" | "member";
  memberBalances: SettingsMember[];
};

type SceneActions = {
  onRename?: () => void;
  onInvite?: () => void;
  onExport?: () => void;
  isExporting?: boolean;
  exportError?: string | null;
  onArchive?: () => void;
  onLeave?: () => void;
  onOpenMember?: (member: SettingsMember) => void;
};

function getMockGroupSettingsData(groupId: string): GroupSettingsSceneData {
  // Same demo people and balances as the group detail screen.
  const scene = getMockGroupSceneData(groupId);
  const viewer = scene.members.find((member) => member.isCurrentUser);

  return {
    groupId,
    groupName: scene.groupName,
    groupCurrency: scene.groupCurrency,
    memberCount: scene.memberCount,
    expenseCount: scene.expenseCount,
    totalSpendCents: scene.insights.totalSpendCents,
    currentUserBalanceCents: viewer?.balanceCents ?? 0,
    currentUserPaidCents: viewer?.paidCents ?? 0,
    currentUserOwedCents: viewer?.owedCents ?? 0,
    viewerRole: "owner",
    memberBalances: scene.members.filter((member) => !member.isCurrentUser),
  };
}

export function GroupSettingsScreen({ groupId }: GroupSettingsScreenProps) {
  const { mode } = usePlaceholderMode();

  if (mode !== "live") {
    return <GroupSettingsScene group={getMockGroupSettingsData(groupId)} isMock />;
  }

  return <LiveGroupSettingsScreen groupId={groupId} />;
}

function SettingsFrame({
  groupId,
  groupName,
  children,
}: {
  groupId: string;
  groupName?: string;
  children: ReactNode;
}) {
  const groupHref = `/groups/${groupId}`;

  return (
    <PageContainer size="content">
      <MobileTopBar title="Group settings" subtitle={groupName} backFallbackHref={groupHref} />
      <header className="mb-8 hidden lg:block">
        <Link
          href={groupHref}
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm text-on-surface-variant transition hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {groupName ?? "Back to group"}
        </Link>
        <h1 className="mt-1 font-headline text-3xl font-bold tracking-tight text-on-surface">Group settings</h1>
      </header>
      {children}
    </PageContainer>
  );
}

function LiveGroupSettingsScreen({ groupId }: GroupSettingsScreenProps) {
  const currentUser = useQuery(api.users.current);
  const hasValidGroupId = looksLikeConvexId(groupId);
  const settingsOverview = useQuery(
    api.groups.getSettingsOverview,
    currentUser && hasValidGroupId ? { groupId: groupId as Id<"groups"> } : "skip",
  );

  if (!hasValidGroupId || settingsOverview === null) {
    return (
      <SettingsFrame groupId={groupId}>
        <ScreenState
          state="unavailable"
          title="Group unavailable"
          description="You don't have access to this group, or it's no longer active."
          icon={<Users />}
          actions={
            <Link href="/groups" className={buttonVariants({ variant: "primary" })}>
              Back to groups
            </Link>
          }
        />
      </SettingsFrame>
    );
  }

  if (currentUser === null) {
    return (
      <SettingsFrame groupId={groupId}>
        <ScreenState
          state="loading"
          title="Finishing setup"
          description="Your account is signed in and still syncing. Refresh in a moment if this persists."
        />
      </SettingsFrame>
    );
  }

  if (currentUser === undefined || settingsOverview === undefined) {
    return (
      <SettingsFrame groupId={groupId}>
        <GroupSettingsSkeleton />
      </SettingsFrame>
    );
  }

  return (
    <LiveGroupSettingsScene
      group={{
        ...settingsOverview,
        groupId: String(settingsOverview.groupId),
        memberBalances: settingsOverview.memberBalances.map((member) => ({ ...member, id: String(member.id) })),
      }}
    />
  );
}

function LiveGroupSettingsScene({ group }: { group: GroupSettingsSceneData }) {
  const isOwner = group.viewerRole === "owner";
  const actions = useGroupSettingsActions({ groupId: group.groupId, groupName: group.groupName, isOwner });
  const membership = useMembershipManagement({
    currency: group.groupCurrency,
    groupId: group.groupId,
    groupName: group.groupName,
  });

  return (
    <>
      <GroupSettingsScene
        group={group}
        actions={{
          onRename: isOwner ? actions.openRename : undefined,
          onInvite: isOwner ? actions.openInvite : undefined,
          onArchive: isOwner ? actions.openArchive : undefined,
          onExport: () => void actions.exportCsv(),
          isExporting: actions.isExporting,
          exportError: actions.exportError,
          onLeave: !isOwner && group.currentUserBalanceCents === 0 ? membership.requestLeave : undefined,
          onOpenMember: isOwner ? membership.openMember : undefined,
        }}
      />
      {actions.dialogs}
      {membership.dialog}
    </>
  );
}

function GroupSettingsScene({
  group,
  actions = {},
  isMock = false,
}: {
  group: GroupSettingsSceneData;
  actions?: SceneActions;
  isMock?: boolean;
}) {
  const isOwner = group.viewerRole === "owner";
  const signInNote = "Available when signed in";

  return (
    <SettingsFrame groupId={group.groupId} groupName={group.groupName}>
      <div className="space-y-7 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8 lg:space-y-0">
        <div className="space-y-4 lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1">
          <GroupTotalsCard group={group} />
          {isMock ? (
            <SettingsNotice>
              Demo data. Sign in to rename, invite people, export, or archive.
            </SettingsNotice>
          ) : null}
        </div>

        <div className="space-y-7 lg:col-start-1 lg:row-start-1">
          <SettingsSection
            title="Group"
            description={!isMock && !isOwner ? "Only the group owner can rename this group." : undefined}
          >
            {actions.onRename ? (
              <SettingsRow
                icon={Pencil}
                title="Name"
                description={group.groupName}
                onClick={actions.onRename}
              />
            ) : (
              <SettingsRow icon={Pencil} title="Name" description={group.groupName} />
            )}
            <SettingsRow
              icon={Coins}
              title="Currency"
              trailing={<span className="text-sm text-on-surface-variant">{group.groupCurrency}</span>}
            />
          </SettingsSection>

          <MembersSection group={group} actions={actions} isMock={isMock} />

          <SettingsSection title="Export">
            {actions.onExport ? (
              <SettingsRow
                icon={Download}
                title="Download expenses as CSV"
                description={
                  actions.isExporting ? "Preparing your file…" : "Every expense and payment, ready for a spreadsheet."
                }
                onClick={actions.onExport}
                disabled={actions.isExporting}
              />
            ) : (
              <SettingsRow icon={Download} tone="muted" title="Download expenses as CSV" description={signInNote} />
            )}
          </SettingsSection>
          {actions.exportError ? <SettingsNotice tone="error">{actions.exportError}</SettingsNotice> : null}

          <SettingsSection title="Danger zone" tone="danger">
            {isOwner ? (
              actions.onArchive ? (
                <SettingsRow
                  icon={Trash2}
                  tone="danger"
                  title="Archive group"
                  description="Hide it for everyone. Requires typing the group name."
                  onClick={actions.onArchive}
                />
              ) : (
                <SettingsRow icon={Trash2} tone="muted" title="Archive group" description={signInNote} />
              )
            ) : actions.onLeave ? (
              <SettingsRow
                icon={LogOut}
                tone="danger"
                title="Leave group"
                description="You're settled up, so you can leave any time."
                onClick={actions.onLeave}
              />
            ) : (
              <SettingsRow
                icon={LogOut}
                tone="danger"
                title="Leave group"
                description={
                  <>
                    Settle your <Money cents={group.currentUserBalanceCents} currency={group.groupCurrency} /> balance
                    before leaving.
                  </>
                }
              />
            )}
          </SettingsSection>
        </div>
      </div>
    </SettingsFrame>
  );
}

function GroupTotalsCard({ group }: { group: GroupSettingsSceneData }) {
  const standing = describeBalance(group.currentUserBalanceCents);

  return (
    <section aria-label="Group totals" className="rounded-3xl bg-surface-container-low p-5">
      <p className="text-sm text-on-surface-variant">Total spent</p>
      <p className="mt-0.5 font-headline text-3xl font-bold tracking-tight text-on-surface">
        <Money cents={group.totalSpendCents} currency={group.groupCurrency} />
      </p>
      <p className="mt-1 text-xs text-on-surface-variant">
        {group.expenseCount} {group.expenseCount === 1 ? "expense" : "expenses"} · {group.memberCount}{" "}
        {group.memberCount === 1 ? "member" : "members"}
      </p>

      <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
        <p className="text-sm text-on-surface">
          <span className="text-on-surface-variant">Your balance: </span>
          <span className="font-semibold">{standing.label}</span>
          {group.currentUserBalanceCents !== 0 ? (
            <>
              {" "}
              <Money
                cents={group.currentUserBalanceCents}
                currency={group.groupCurrency}
                tone={standing.tone}
                className="font-headline font-bold"
              />
            </>
          ) : null}
        </p>
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs text-on-surface-variant">You paid</dt>
            <dd className="mt-0.5 text-sm font-semibold text-on-surface">
              <Money cents={group.currentUserPaidCents} currency={group.groupCurrency} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-on-surface-variant">Your share</dt>
            <dd className="mt-0.5 text-sm font-semibold text-on-surface">
              <Money cents={group.currentUserOwedCents} currency={group.groupCurrency} />
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function MemberBalance({ cents, currency }: { cents: number; currency: string }) {
  const standing = describeMemberBalance(cents);

  return (
    <span className="flex flex-col items-end text-right">
      <span className="text-xs leading-4 text-on-surface-variant">{standing.label}</span>
      {cents !== 0 ? (
        <Money cents={cents} currency={currency} tone={standing.tone} className="font-headline text-sm font-bold" />
      ) : null}
    </span>
  );
}

function RoleBadge() {
  return (
    <span className="ml-2 rounded-full bg-primary/12 px-2 py-0.5 align-middle text-xs font-medium text-primary">
      Owner
    </span>
  );
}

function MembersSection({
  group,
  actions,
  isMock,
}: {
  group: GroupSettingsSceneData;
  actions: SceneActions;
  isMock: boolean;
}) {
  const isOwner = group.viewerRole === "owner";
  const you = describeBalance(group.currentUserBalanceCents);
  const description = isMock
    ? undefined
    : isOwner
      ? "Tap a member to see their balance. Members can be removed once they're settled up."
      : "Only the group owner can invite or remove members.";

  return (
    <SettingsSection title={`Members · ${group.memberCount}`} description={description}>
      {actions.onInvite ? (
        <SettingsRow
          icon={UserPlus}
          tone="primary"
          title="Invite people"
          description="Share a link or send an email invite"
          onClick={actions.onInvite}
        />
      ) : null}

      <SettingsRow
        leading={<UserAvatar name="You" size="sm" />}
        title={
          <>
            You
            {isOwner ? <RoleBadge /> : null}
          </>
        }
        trailing={
          <span className="flex flex-col items-end text-right">
            <span className="text-xs leading-4 text-on-surface-variant">{you.label}</span>
            {group.currentUserBalanceCents !== 0 ? (
              <Money
                cents={group.currentUserBalanceCents}
                currency={group.groupCurrency}
                tone={you.tone}
                className="font-headline text-sm font-bold"
              />
            ) : null}
          </span>
        }
      />

      {group.memberBalances.map((member) => {
        const rowProps = {
          leading: <UserAvatar imageUrl={member.imageUrl} name={member.name} size="sm" />,
          title: (
            <>
              {member.name}
              {member.role === "owner" ? <RoleBadge /> : null}
            </>
          ),
          description: member.email ? <span className="block truncate">{member.email}</span> : undefined,
          trailing: <MemberBalance cents={member.balanceCents} currency={group.groupCurrency} />,
        };

        return actions.onOpenMember ? (
          <SettingsRow key={member.id} {...rowProps} onClick={() => actions.onOpenMember?.(member)} />
        ) : (
          <SettingsRow key={member.id} {...rowProps} />
        );
      })}
    </SettingsSection>
  );
}

function GroupSettingsSkeleton() {
  return (
    <div role="status" aria-label="Loading group settings" className="space-y-7 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8 lg:space-y-0">
      <SkeletonBlock className="h-40 w-full rounded-3xl lg:col-start-2 lg:row-start-1" />
      <div className="space-y-7 lg:col-start-1 lg:row-start-1">
        {[2, 4, 1].map((rows, index) => (
          <div key={index} className="space-y-2">
            <SkeletonBlock className="h-4 w-24 rounded-md" />
            <div className="space-y-1 rounded-3xl bg-surface-container-low p-2">
              {Array.from({ length: rows }, (_, rowIndex) => (
                <div key={rowIndex} className="flex items-center gap-3 px-2 py-2">
                  <SkeletonBlock className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-1/2 rounded-md" />
                    <SkeletonBlock className="h-3 w-1/3 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
