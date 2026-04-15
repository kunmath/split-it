"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  Copy,
  LockKeyhole,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AuthHeader, AuthNotice } from "@/components/auth/auth-primitives";
import { usePlaceholderMode } from "@/components/providers/app-providers";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScreenState } from "@/components/ui/screen-state";
import { SurfaceCard } from "@/components/ui/surface-card";
import { api } from "@/convex/_generated/api";
import { buildAuthRedirectHref } from "@/lib/auth-redirect";
import { getInitials } from "@/lib/utils";

type InviteAcceptanceProps = {
  token: string;
};

type AcceptedInviteState = {
  alreadyMember: boolean;
  groupId: string;
  groupName: string;
};

function formatExpiryLabel(expiresAt: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(expiresAt);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to complete the invite right now.";
}

export function InviteAcceptance({ token }: InviteAcceptanceProps) {
  const { mode } = usePlaceholderMode();

  if (mode !== "live") {
    return <MockInviteAcceptance token={token} />;
  }

  return <LiveInviteAcceptance token={token} />;
}

function MockInviteAcceptance({ token }: InviteAcceptanceProps) {
  return (
    <div className="space-y-6">
      <AuthHeader
        title="Join the split"
        subtitle="Invite acceptance needs Clerk + Convex auth bridging. The visual shell is live, but the secure join flow is disabled until the backend is configured."
      />

      <AuthNotice>
        Add live Clerk and Convex env values to enable token validation and membership acceptance.
      </AuthNotice>

      <SurfaceCard variant="low" className="space-y-5 rounded-[1.75rem] border border-white/5 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-primary">Invite Preview</p>
            <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Shared getaway</h2>
            <p className="text-sm leading-6 text-on-surface-variant">
              Valid invite links become available once Clerk and Convex are configured together.
            </p>
          </div>
        </div>

        <div className="rounded-[1.3rem] border border-white/6 bg-surface-container-lowest/70 px-4 py-3 text-sm text-on-surface-variant">
          token preview · {token.slice(0, 10)}
        </div>
      </SurfaceCard>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/sign-in" className={buttonVariants({ variant: "primary", size: "lg", className: "w-full" })}>
          Sign In <ArrowRight className="h-4.5 w-4.5" />
        </Link>
        <Link href="/sign-up" className={buttonVariants({ variant: "ghost", size: "lg", className: "w-full" })}>
          Create Access
        </Link>
      </div>
    </div>
  );
}

function LiveInviteAcceptance({ token }: InviteAcceptanceProps) {
  const { isLoaded, isSignedIn } = useUser();
  const invite = useQuery(api.invites.getByToken, { token });
  const currentUser = useQuery(api.users.current, isSignedIn ? {} : "skip");
  const acceptInvite = useMutation(api.invites.accept);
  const [acceptedInvite, setAcceptedInvite] = useState<AcceptedInviteState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectPath = `/invites/${token}`;
  const signInHref = buildAuthRedirectHref("/sign-in", redirectPath);
  const signUpHref = buildAuthRedirectHref("/sign-up", redirectPath);

  const groupHref = useMemo(() => {
    const joinedGroupId = acceptedInvite?.groupId ?? invite?.groupId;
    return joinedGroupId ? `/groups/${joinedGroupId}` : "/dashboard";
  }, [acceptedInvite?.groupId, invite?.groupId]);

  async function handleAcceptInvite() {
    setIsSubmitting(true);
    setActionError(null);

    try {
      const result = await acceptInvite({ token });
      setAcceptedInvite(result);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      setActionError("Unable to copy the invite link from this browser session.");
    }
  }

  if (invite === undefined || !isLoaded) {
    return (
      <ScreenState
        state="loading"
        title="Validating invite"
        description="Checking the secure link and preparing the join flow."
      />
    );
  }

  if (invite === null) {
    return (
      <ScreenState
        state="unavailable"
        title="Invite unavailable"
        description="This invite link could not be matched to an active group. It may be invalid, rotated, or tied to a group that is no longer available."
        actions={
          <>
            <Link href="/dashboard" className={buttonVariants({ variant: "primary", size: "lg", className: "w-full sm:w-auto" })}>
              Back to dashboard <ArrowRight className="h-4.5 w-4.5" />
            </Link>
            <Link href="/sign-in" className={buttonVariants({ variant: "ghost", size: "lg", className: "w-full sm:w-auto" })}>
              Sign In
            </Link>
          </>
        }
      />
    );
  }

  const memberJoined = invite.viewerMembershipRole !== null || acceptedInvite !== null;

  return (
    <div className="space-y-6">
      <AuthHeader
        title={`Join ${invite.groupName}`}
        subtitle={
          invite.groupDescription?.trim()
            ? invite.groupDescription
            : "Step into the shared ledger with one secure join link."
        }
      />

      {actionError ? <AuthNotice tone="error">{actionError}</AuthNotice> : null}
      {memberJoined ? (
        <AuthNotice tone="success">
          {acceptedInvite?.alreadyMember || invite.viewerMembershipRole !== null
            ? `You already have access to ${invite.groupName}.`
            : `You are now a member of ${invite.groupName}.`}
        </AuthNotice>
      ) : null}

      <SurfaceCard variant="low" className="space-y-5 rounded-[1.8rem] border border-white/5 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-primary">Secure Invite</p>
            <div className="space-y-1">
              <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
                {invite.groupName}
              </h2>
              <p className="text-sm text-on-surface-variant">
                Created by {invite.inviterName} · {invite.memberCount}{" "}
                {invite.memberCount === 1 ? "member" : "members"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.25rem] bg-surface-container-lowest/80 px-4 py-3">
            <p className="text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-variant">Status</p>
            <p className="mt-2 font-headline text-lg font-bold text-on-surface">
              {invite.inviteStatus === "pending"
                ? "Open"
                : invite.inviteStatus === "accepted"
                  ? "Used"
                  : "Expired"}
            </p>
          </div>
          <div className="rounded-[1.25rem] bg-surface-container-lowest/80 px-4 py-3">
            <p className="text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-variant">Expires</p>
            <p className="mt-2 font-headline text-lg font-bold text-on-surface">
              {formatExpiryLabel(invite.expiresAt)}
            </p>
          </div>
          <div className="rounded-[1.25rem] bg-surface-container-lowest/80 px-4 py-3">
            <p className="text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-variant">Access</p>
            <p className="mt-2 font-headline text-lg font-bold text-on-surface">
              {memberJoined ? "Active" : isSignedIn ? "Ready" : "Sign in"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.22em] text-on-surface-variant">Current Members</p>
          <div className="flex flex-wrap gap-2">
            {invite.memberPreview.map((member) => (
              <div
                key={member.id}
                className="inline-flex items-center gap-3 rounded-full border border-white/6 bg-white/[0.03] px-3 py-2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high font-headline text-xs font-bold text-on-surface">
                  {getInitials(member.name)}
                </span>
                <span className="text-sm text-on-surface">{member.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.35rem] border border-white/6 bg-white/[0.03] px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-primary">Join rules</p>
              <p className="text-sm leading-6 text-on-surface-variant">
                This is a single-use invite link. Once one person joins, the token closes and the owner can generate a fresh one.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant transition hover:text-on-surface"
            >
              <Copy className="h-4 w-4" />
              Copy link
            </button>
          </div>
        </div>
      </SurfaceCard>

      {!isSignedIn ? (
        <div className="space-y-4">
          <AuthNotice>
            Sign in or create an account first. After authentication you’ll return here and can accept the invite immediately.
          </AuthNotice>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={signInHref} className={buttonVariants({ variant: "primary", size: "lg", className: "w-full" })}>
              Sign In <ArrowRight className="h-4.5 w-4.5" />
            </Link>
            <Link href={signUpHref} className={buttonVariants({ variant: "ghost", size: "lg", className: "w-full" })}>
              Create Access
            </Link>
          </div>
        </div>
      ) : currentUser === undefined || currentUser === null ? (
        <div className="space-y-4">
          <ScreenState
            state="loading"
            title="Syncing your workspace"
            description="We’re finishing your workspace record. This usually takes a moment right after authentication."
            className="max-w-none rounded-[1.8rem]"
          />
        </div>
      ) : memberJoined ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={groupHref} className={buttonVariants({ variant: "primary", size: "lg", className: "w-full" })}>
            Open Group <ArrowRight className="h-4.5 w-4.5" />
          </Link>
          <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "lg", className: "w-full" })}>
            Dashboard
          </Link>
        </div>
      ) : invite.inviteStatus === "expired" ? (
        <div className="space-y-4">
          <AuthNotice tone="error">
            This invite has expired. Ask the group owner for a fresh link.
          </AuthNotice>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/dashboard" className={buttonVariants({ variant: "primary", size: "lg", className: "w-full" })}>
              Back to dashboard <ArrowRight className="h-4.5 w-4.5" />
            </Link>
            <Link href="/sign-in" className={buttonVariants({ variant: "ghost", size: "lg", className: "w-full" })}>
              Switch Account
            </Link>
          </div>
        </div>
      ) : invite.inviteStatus === "accepted" ? (
        <div className="space-y-4">
          <AuthNotice tone="error">
            This link has already been used. Ask the owner to generate a fresh invite.
          </AuthNotice>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/dashboard" className={buttonVariants({ variant: "primary", size: "lg", className: "w-full" })}>
              Back to dashboard <ArrowRight className="h-4.5 w-4.5" />
            </Link>
            <Link href="/sign-in" className={buttonVariants({ variant: "ghost", size: "lg", className: "w-full" })}>
              Switch Account
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Button
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              className="w-full"
              onClick={handleAcceptInvite}
            >
              {isSubmitting ? "Joining Group..." : "Accept Invite"}
              <ArrowRight className="h-4.5 w-4.5" />
            </Button>
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "ghost", size: "lg", className: "w-full sm:w-auto" })}
            >
              Later
            </Link>
          </div>

          <div className="grid gap-3 rounded-[1.35rem] border border-white/6 bg-white/[0.03] px-4 py-4 text-sm text-on-surface-variant sm:grid-cols-2">
            <div className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-primary" />
              Membership is added only after explicit acceptance.
            </div>
            <div className="inline-flex items-center gap-2">
              <LockKeyhole className="h-4.5 w-4.5 text-primary" />
              The invite closes automatically after the first successful join.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
