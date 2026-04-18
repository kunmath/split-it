"use client";

import { SignOutButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { LogOut } from "lucide-react";

import { usePlaceholderMode } from "@/components/providers/app-providers";
import { buttonVariants } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

export function ShellSessionCard() {
  const { isClerkConfigured, mode } = usePlaceholderMode();

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

  return mode === "live" ? <LiveShellSessionCard /> : <ClerkShellSessionCard />;
}

export function ShellSessionAvatar() {
  const { isClerkConfigured, mode } = usePlaceholderMode();

  if (!isClerkConfigured) {
    return <UserAvatar name="Alex Rivera" size="md" />;
  }

  return mode === "live" ? <LiveShellSessionAvatar /> : <ClerkShellSessionAvatar />;
}

export function ShellMobileSessionControls() {
  const { isClerkConfigured, mode } = usePlaceholderMode();

  if (!isClerkConfigured) {
    return null;
  }

  return mode === "live" ? <LiveShellMobileSessionControls /> : <ClerkShellMobileSessionControls />;
}

function useResolvedProfile() {
  const { user } = useUser();
  const currentUser = useQuery(api.users.current);

  return {
    currentUser,
    displayName: currentUser?.name || user?.fullName || user?.primaryEmailAddress?.emailAddress || "Signed in",
    imageUrl: currentUser?.imageUrl,
  };
}

function useClerkProfile() {
  const { user } = useUser();

  return {
    displayName: user?.fullName || user?.primaryEmailAddress?.emailAddress || "Signed in",
  };
}

function LiveShellSessionCard() {
  const { displayName, imageUrl } = useResolvedProfile();

  return (
    <div className="rounded-[1.5rem] bg-surface-container-low p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-headline text-sm font-semibold text-on-surface">{displayName}</p>
        </div>
        <UserAvatar imageUrl={imageUrl} name={displayName} size="md" />
      </div>
      <SignOutButton redirectUrl="/sign-in">
        <button className={cn(buttonVariants({ variant: "ghost", fullWidth: true }), "mt-4 min-h-11 rounded-[1rem] px-4")}>
          Sign out <LogOut className="h-4 w-4" />
        </button>
      </SignOutButton>
    </div>
  );
}

function ClerkShellSessionCard() {
  const { displayName } = useClerkProfile();

  return (
    <div className="rounded-[1.5rem] bg-surface-container-low p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-headline text-sm font-semibold text-on-surface">{displayName}</p>
        </div>
        <UserAvatar name={displayName} size="md" />
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
  const { displayName, imageUrl } = useResolvedProfile();

  return <UserAvatar imageUrl={imageUrl} name={displayName} size="md" />;
}

function ClerkShellSessionAvatar() {
  const { displayName } = useClerkProfile();

  return <UserAvatar name={displayName} size="md" />;
}

function LiveShellMobileSessionControls() {
  const { displayName, imageUrl } = useResolvedProfile();

  return (
    <div className="flex items-center gap-2">
      <UserAvatar imageUrl={imageUrl} name={displayName} size="md" />
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

function ClerkShellMobileSessionControls() {
  const { displayName } = useClerkProfile();

  return (
    <div className="flex items-center gap-2">
      <UserAvatar name={displayName} size="md" />
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
