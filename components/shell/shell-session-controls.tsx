"use client";

import { SignOutButton, useUser } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

import { usePlaceholderMode } from "@/components/providers/app-providers";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ShellSessionCard() {
  const { isClerkConfigured } = usePlaceholderMode();

  if (!isClerkConfigured) {
    return (
      <div className="rounded-[1.5rem] bg-surface-container-low p-4">
        <p className="font-headline text-sm font-semibold text-on-surface">Alex Rivera</p>
        <p className="mt-1 text-[0.68rem] uppercase tracking-[0.22em] text-on-surface-variant">
          Placeholder Session
        </p>
      </div>
    );
  }

  return <LiveShellSessionCard />;
}

export function ShellSessionAvatar() {
  const { isClerkConfigured } = usePlaceholderMode();

  if (!isClerkConfigured) {
    return <AvatarOrb initials="AR" />;
  }

  return <LiveShellSessionAvatar />;
}

export function ShellMobileSessionControls() {
  const { isClerkConfigured } = usePlaceholderMode();

  if (!isClerkConfigured) {
    return null;
  }

  return <LiveShellMobileSessionControls />;
}

function LiveShellSessionCard() {
  const { user } = useUser();
  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Signed in";
  const detail = user?.primaryEmailAddress?.emailAddress ?? "Clerk session";

  return (
    <div className="rounded-[1.5rem] bg-surface-container-low p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-headline text-sm font-semibold text-on-surface">{displayName}</p>
          <p className="mt-1 text-[0.68rem] uppercase tracking-[0.18em] text-on-surface-variant">
            {detail}
          </p>
        </div>
        <AvatarOrb initials={getInitials(displayName)} />
      </div>
      <SignOutButton redirectUrl="/sign-in">
        <button className={cn(buttonVariants({ variant: "ghost", fullWidth: true }), "mt-4 min-h-11 rounded-[1rem] px-4")}>
          Sign out <LogOut className="h-4 w-4" />
        </button>
      </SignOutButton>
    </div>
  );
}

function LiveShellSessionAvatar() {
  const { user } = useUser();
  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Signed in";

  return <AvatarOrb initials={getInitials(displayName)} />;
}

function LiveShellMobileSessionControls() {
  const { user } = useUser();
  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Signed in";

  return (
    <div className="flex items-center gap-2">
      <AvatarOrb initials={getInitials(displayName)} />
      <SignOutButton redirectUrl="/sign-in">
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/8 bg-transparent px-3 text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-on-surface-variant transition hover:bg-white/4 hover:text-on-surface"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </SignOutButton>
    </div>
  );
}

function AvatarOrb({ initials }: { initials: string }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(78,222,163,0.35),rgba(255,181,158,0.25))] font-headline text-sm font-bold text-on-surface ring-1 ring-white/8">
      {initials}
    </div>
  );
}

function getInitials(value: string) {
  const parts = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "SI";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}
