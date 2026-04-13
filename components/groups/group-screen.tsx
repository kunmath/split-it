"use client";

import { useMutation, useQuery } from "convex/react";
import { ChevronRight, Copy, Link2, LoaderCircle, ShieldCheck, Users, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AuthNotice } from "@/components/auth/auth-primitives";
import { usePlaceholderMode } from "@/components/providers/app-providers";
import { PageContainer } from "@/components/shell/page-container";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { FilledInput } from "@/components/ui/filled-input";
import { SurfaceCard } from "@/components/ui/surface-card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getGroupDetail, memberBalances } from "@/lib/placeholder-data";
import { cn } from "@/lib/utils";

type GroupScreenProps = {
  groupId: string;
  initialDescription?: string;
  initialName?: string;
};

type InviteLinkState = {
  expiresAt: number;
  token: string;
};

type ActionRowButtonProps = {
  label: string;
  note: string;
  onClick?: () => void;
  disabled?: boolean;
};

type GroupMember = {
  email: string;
  id: string;
  imageUrl?: string;
  isCurrentUser: boolean;
  name: string;
  role: "member" | "owner";
};

function formatInviteExpiry(expiresAt: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(expiresAt);
}

function buildInviteUrl(token: string) {
  if (typeof window === "undefined") {
    return `/invites/${token}`;
  }

  return new URL(`/invites/${token}`, window.location.origin).toString();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to update the invite link right now.";
}

function ActionRowButton({ label, note, onClick, disabled = false }: ActionRowButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-[1.5rem] px-4 py-4 text-left transition",
        "hover:bg-surface-container-high disabled:pointer-events-none disabled:opacity-60",
      )}
    >
      <span className="flex items-center gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/4 text-primary">
          <Users className="h-4.5 w-4.5" />
        </span>
        <span>
          <span className="block font-headline text-base font-semibold text-on-surface">{label}</span>
          <span className="mt-1 block text-sm text-on-surface-variant">{note}</span>
        </span>
      </span>
      <ChevronRight className="h-4.5 w-4.5 text-on-surface-variant" />
    </button>
  );
}

export function GroupScreen({ groupId, initialDescription, initialName }: GroupScreenProps) {
  const { mode } = usePlaceholderMode();

  if (mode !== "live") {
    return <MockGroupScreen groupId={groupId} initialDescription={initialDescription} initialName={initialName} />;
  }

  return <LiveGroupScreen groupId={groupId} initialDescription={initialDescription} initialName={initialName} />;
}

function MockGroupScreen({ groupId, initialDescription, initialName }: GroupScreenProps) {
  const group = getGroupDetail(groupId);
  const title = initialName?.trim() || group.title;
  const description = initialDescription?.trim() || group.description;
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [activeInvite, setActiveInvite] = useState<InviteLinkState | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const members = memberBalances.slice(0, 4).map((member, index) => ({
    email: "",
    id: `${member.name}-${index}`,
    isCurrentUser: index === 0,
    name: member.name,
    role: index === 0 ? ("owner" as const) : ("member" as const),
  }));

  async function handleCreateMockInvite() {
    setInviteError(null);
    setCopyMessage(null);

    const token =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replaceAll("-", "")
        : `${Date.now()}mockinvite`;

    setActiveInvite({
      token,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
  }

  async function handleCopyInvite(url: string) {
    setInviteError(null);

    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage("Preview invite link copied.");
    } catch {
      setInviteError("Unable to copy the preview link from this browser session.");
    }
  }

  return (
    <>
      <GroupScene
        groupDescription={description}
        groupName={title}
        members={members}
        memberCount={group.memberCount}
        canInvite
        activeInvite={activeInvite}
        inviteError={inviteError}
        copyMessage={copyMessage}
        onAddMembers={() => {
          setInviteError(null);
          setCopyMessage(null);
          setIsInviteDialogOpen(true);
        }}
        isMock
      />

      <AddMembersDialog
        open={isInviteDialogOpen}
        groupName={title}
        members={members}
        canInvite
        activeInvite={activeInvite}
        isCreatingInvite={false}
        inviteError={inviteError}
        copyMessage={copyMessage}
        helperNotice="Mock mode: this dialog previews the add-members flow locally. Configure Clerk server keys and the Convex auth bridge to create real invite links."
        onClose={() => {
          setInviteError(null);
          setCopyMessage(null);
          setIsInviteDialogOpen(false);
        }}
        onCreateInvite={handleCreateMockInvite}
        onCopyInvite={handleCopyInvite}
      />
    </>
  );
}

function LiveGroupScreen({ groupId, initialDescription, initialName }: GroupScreenProps) {
  const currentUser = useQuery(api.users.current);
  const group = useQuery(
    api.invites.getGroupComposerData,
    currentUser ? { groupId: groupId as Id<"groups"> } : "skip",
  );
  const createInvite = useMutation(api.invites.create);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteOverride, setInviteOverride] = useState<InviteLinkState | null>(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const activeInvite = inviteOverride ?? group?.activeInvite ?? null;

  async function handleCreateInvite() {
    setInviteError(null);
    setCopyMessage(null);
    setIsCreatingInvite(true);

    try {
      const result = await createInvite({ groupId: groupId as Id<"groups"> });
      setInviteOverride(result);
    } catch (error) {
      setInviteError(getErrorMessage(error));
    } finally {
      setIsCreatingInvite(false);
    }
  }

  async function handleCopyInvite(url: string) {
    setInviteError(null);

    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage("Invite link copied.");
    } catch {
      setInviteError("Unable to copy the invite link from this browser session.");
    }
  }

  if (currentUser === undefined || group === undefined) {
    return (
      <PageContainer className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
            <LoaderCircle className="h-7 w-7 animate-spin" />
          </div>
          <div>
            <p className="font-headline text-2xl font-bold text-on-surface">Loading group context</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Pulling members and the current invite state into the workspace.
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

  return (
    <>
      <GroupScene
        groupDescription={group.groupDescription || initialDescription}
        groupName={group.groupName || initialName || "Untitled group"}
        members={group.members}
        memberCount={group.memberCount}
        canInvite={group.canInvite}
        activeInvite={activeInvite}
        inviteError={inviteError}
        copyMessage={copyMessage}
        onAddMembers={() => {
          setInviteError(null);
          setCopyMessage(null);
          setIsInviteDialogOpen(true);
        }}
      />

      <AddMembersDialog
        open={isInviteDialogOpen}
        groupName={group.groupName}
        members={group.members}
        canInvite={group.canInvite}
        activeInvite={activeInvite}
        isCreatingInvite={isCreatingInvite}
        inviteError={inviteError}
        copyMessage={copyMessage}
        onClose={() => {
          setInviteError(null);
          setCopyMessage(null);
          setIsInviteDialogOpen(false);
        }}
        onCreateInvite={handleCreateInvite}
        onCopyInvite={handleCopyInvite}
      />
    </>
  );
}

type GroupSceneProps = {
  groupDescription?: string;
  groupName: string;
  members: GroupMember[];
  memberCount: number;
  canInvite: boolean;
  activeInvite?: InviteLinkState | null;
  inviteError?: string | null;
  copyMessage?: string | null;
  onAddMembers?: () => void;
  isMock?: boolean;
};

function GroupScene({
  groupDescription,
  groupName,
  members,
  memberCount,
  canInvite,
  activeInvite = null,
  inviteError = null,
  copyMessage = null,
  onAddMembers,
  isMock = false,
}: GroupSceneProps) {
  const rosterPreview = members.slice(0, 4);

  return (
    <PageContainer className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.5fr_0.85fr]">
        <SurfaceCard variant="hero" className="min-h-[18rem] rounded-[2.5rem] p-6 sm:p-8">
          <div className="flex h-full flex-col justify-between gap-6">
            <div className="flex flex-wrap gap-2 text-[0.68rem] uppercase tracking-[0.22em] text-on-surface-variant">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">Group Workspace</span>
              <span className="rounded-full bg-white/6 px-3 py-1">
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface sm:text-6xl">
                {groupName}
              </h1>
              <p className="max-w-2xl text-sm leading-8 text-on-surface-variant sm:text-base">
                {groupDescription?.trim()
                  ? groupDescription
                  : "Add members first, then start tracking shared expenses in the next phase."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {rosterPreview.map((member) => (
                <AvatarBadge
                  key={member.id}
                  name={member.name}
                  note={member.role === "owner" ? "Owner" : member.isCurrentUser ? "You" : "Member"}
                  tone={member.role === "owner" ? "positive" : "neutral"}
                  size="sm"
                />
              ))}
            </div>
          </div>
        </SurfaceCard>

        <div className="space-y-5">
          <SurfaceCard variant="high" className="rounded-[2.25rem] p-7">
            <p className="text-xs uppercase tracking-[0.22em] text-primary">Current Standing</p>
            <p className="mt-4 font-headline text-5xl font-extrabold tracking-tight text-primary">$0.00</p>
            <p className="mt-2 text-sm leading-7 text-on-surface-variant">
              Balances unlock once the first expense is recorded. Phase 4 stops at membership and secure joins.
            </p>
          </SurfaceCard>

          <SurfaceCard variant="low" className="rounded-[2.25rem] p-4">
            <p className="px-3 pb-4 text-xs uppercase tracking-[0.24em] text-on-surface-variant">Group Access</p>
            <div className="space-y-2">
              <ActionRowButton
                label="Add Members"
                note={
                  canInvite
                    ? "Create or refresh a secure invite link."
                    : "Only the group owner can generate invite links right now."
                }
                onClick={onAddMembers}
                disabled={!onAddMembers}
              />
            </div>

            <div className="mt-5 rounded-[1.5rem] bg-surface-container-lowest/70 px-4 py-4">
              <p className="text-[0.64rem] uppercase tracking-[0.22em] text-on-surface-variant">Invite status</p>
              <p className="mt-2 font-headline text-xl font-bold text-on-surface">
                {activeInvite ? "One link live" : canInvite ? "No pending link" : "Owner-managed"}
              </p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                {activeInvite
                  ? `Current link expires ${formatInviteExpiry(activeInvite.expiresAt)}.`
                  : canInvite
                    ? "Generate a link when you’re ready to let the next member in."
                    : "Ask the owner for the current join link if you need to bring someone in."}
              </p>
            </div>
          </SurfaceCard>
        </div>
      </section>

      {inviteError ? <AuthNotice tone="error">{inviteError}</AuthNotice> : null}
      {copyMessage ? <AuthNotice tone="success">{copyMessage}</AuthNotice> : null}

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <SurfaceCard variant="high" className="rounded-[2.25rem] p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">Members</p>
            <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">
              {memberCount} total
            </p>
          </div>
          <div className="mt-2 space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-4 rounded-[1.75rem] px-3 py-4 transition hover:bg-white/3 sm:flex-row sm:items-center sm:justify-between"
              >
                <AvatarBadge
                  name={member.name}
                  note={member.isCurrentUser ? "Current session" : member.email || "Active member"}
                  chip={member.role === "owner" ? "Owner" : member.isCurrentUser ? "You" : "Member"}
                  tone={member.role === "owner" ? "positive" : "neutral"}
                />
                <div className="text-left sm:text-right">
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-on-surface-variant">Access</p>
                  <p className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-on-surface">
                    {member.role === "owner" ? "Owner" : "Active"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard variant="low" className="flex flex-col justify-between rounded-[2.25rem] p-7">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.22em] text-primary">Next Phase Boundary</p>
            <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface">
              Expense tracking starts next.
            </h2>
            <p className="max-w-2xl text-sm leading-8 text-on-surface-variant">
              Phase 4 makes the group multi-user and keeps the join flow secure. Expense rows, balances, and editing stay intentionally out of scope until the next build step.
            </p>
          </div>

          <div className="mt-8 grid gap-3 rounded-[1.5rem] border border-white/6 bg-white/[0.03] px-4 py-4 text-sm text-on-surface-variant sm:grid-cols-2">
            <div className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-primary" />
              One invite link stays active at a time.
            </div>
            <div className="inline-flex items-center gap-2">
              <Link2 className="h-4.5 w-4.5 text-primary" />
              Accepted links immediately unlock group access.
            </div>
          </div>

          {isMock ? (
            <div className="mt-8">
              <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                Return to dashboard
              </Link>
            </div>
          ) : null}
        </SurfaceCard>
      </section>
    </PageContainer>
  );
}

type AddMembersDialogProps = {
  open: boolean;
  groupName: string;
  members: GroupMember[];
  canInvite: boolean;
  activeInvite: InviteLinkState | null;
  isCreatingInvite: boolean;
  inviteError: string | null;
  copyMessage: string | null;
  helperNotice?: string;
  onClose: () => void;
  onCreateInvite: () => Promise<void>;
  onCopyInvite: (url: string) => Promise<void>;
};

function AddMembersDialog({
  open,
  groupName,
  members,
  canInvite,
  activeInvite,
  isCreatingInvite,
  inviteError,
  copyMessage,
  helperNotice,
  onClose,
  onCreateInvite,
  onCopyInvite,
}: AddMembersDialogProps) {
  const inviteUrl = activeInvite ? buildInviteUrl(activeInvite.token) : "";

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/72 px-4 py-6 backdrop-blur-sm">
      <div className="flex min-h-full items-end justify-center sm:items-center">
        <SurfaceCard
          variant="glass"
          className="w-full max-w-2xl rounded-[2.2rem] border border-white/6 p-5 shadow-[0_28px_120px_rgba(0,0,0,0.42)] sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-primary">Add Members</p>
              <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface">
                Invite people to {groupName}
              </h2>
              <p className="max-w-xl text-sm leading-7 text-on-surface-variant">
                Keep membership deliberate. One pending link stays live at a time, and accepted links close automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/4 text-on-surface-variant transition hover:text-on-surface"
              aria-label="Close add members dialog"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {helperNotice ? <div className="mt-5"><AuthNotice>{helperNotice}</AuthNotice></div> : null}
          {inviteError ? <div className="mt-5"><AuthNotice tone="error">{inviteError}</AuthNotice></div> : null}
          {copyMessage ? <div className="mt-5"><AuthNotice tone="success">{copyMessage}</AuthNotice></div> : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="rounded-[1.6rem] border border-white/6 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-on-surface-variant">Invite controls</p>
                <div className="mt-3 space-y-2">
                  <ActionRowButton
                    label={activeInvite ? "Create New Link" : "Create Invite Link"}
                    note={
                      canInvite
                        ? activeInvite
                          ? "Generating a new link deactivates the previous pending link."
                          : "Creates a single-use link that expires in 7 days."
                        : "Only the owner can create or refresh join links."
                    }
                    onClick={canInvite ? () => void onCreateInvite() : undefined}
                    disabled={isCreatingInvite || !canInvite}
                  />
                </div>
              </div>

              {activeInvite ? (
                <div className="space-y-4 rounded-[1.6rem] border border-white/6 bg-white/[0.03] p-4">
                  <FilledInput
                    label="Active Invite Link"
                    readOnly
                    value={inviteUrl}
                    hint={`Expires ${formatInviteExpiry(activeInvite.expiresAt)}`}
                    suffix={
                      <button
                        type="button"
                        onClick={() => void onCopyInvite(inviteUrl)}
                        className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant transition hover:text-on-surface"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </button>
                    }
                  />
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => void onCopyInvite(inviteUrl)}
                      className="min-w-[11rem]"
                    >
                      Copy Link <Copy className="h-4.5 w-4.5" />
                    </Button>
                    <Link
                      href={`/invites/${activeInvite.token}`}
                      className={buttonVariants({ variant: "ghost", size: "lg" })}
                    >
                      Open Invite
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.6rem] border border-dashed border-white/8 bg-white/[0.02] px-4 py-5 text-sm leading-7 text-on-surface-variant">
                  {canInvite
                    ? "No pending invite link yet. Create one when you’re ready to bring in the next member."
                    : "The current user can view members, but only the owner can generate the join link."}
                </div>
              )}
            </div>

            <div className="rounded-[1.6rem] border border-white/6 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.22em] text-on-surface-variant">Active Members</p>
                <p className="text-xs uppercase tracking-[0.22em] text-on-surface-variant">{members.length}</p>
              </div>
              <div className="mt-4 space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-4 rounded-[1.25rem] bg-surface-container-lowest/70 px-3 py-3"
                  >
                    <AvatarBadge
                      name={member.name}
                      note={member.email || (member.isCurrentUser ? "Current session" : "Active member")}
                      chip={member.role === "owner" ? "Owner" : member.isCurrentUser ? "You" : "Member"}
                      tone={member.role === "owner" ? "positive" : "neutral"}
                      size="sm"
                    />
                    <span className="text-[0.68rem] uppercase tracking-[0.22em] text-on-surface-variant">
                      {member.role === "owner" ? "Owner" : "Active"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
