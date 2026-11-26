"use client";

import { SignOutButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { FlaskConical, LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { SettingsRow, SettingsSection } from "@/components/groups/settings-list";
import { AccountProfileForm } from "@/components/profile/profile-form";
import { usePlaceholderMode } from "@/components/providers/app-providers";
import { MobileTopBar } from "@/components/shell/mobile-top-bar";
import { PageContainer } from "@/components/shell/page-container";
import { SkeletonBlock } from "@/components/ui/skeletons";
import { UserAvatar } from "@/components/ui/user-avatar";
import { api } from "@/convex/_generated/api";

const DEMO_NAME = "Alex Rivera";

export function AccountScreen() {
  const { mode, isClerkConfigured } = usePlaceholderMode();

  return (
    <PageContainer size="narrow">
      <MobileTopBar variant="tab" title="Account" />
      <header className="mb-6 hidden lg:block">
        <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface">Account</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Your profile and session.</p>
      </header>

      <div className="space-y-7">
        {mode === "live" ? <LiveAccountBody /> : <MockAccountBody isClerkConfigured={isClerkConfigured} />}
      </div>
    </PageContainer>
  );
}

function ProfileHeader({
  name,
  email,
  imageUrl,
}: {
  name: string;
  email: ReactNode;
  imageUrl?: string | null;
}) {
  return (
    <section aria-label="Profile summary" className="flex items-center gap-4 rounded-3xl bg-surface-container-low p-4 sm:p-5">
      <UserAvatar imageUrl={imageUrl} name={name} size="lg" />
      <div className="min-w-0">
        <p className="truncate font-headline text-xl font-bold tracking-tight text-on-surface">{name}</p>
        <p className="truncate text-sm text-on-surface-variant">{email}</p>
      </div>
    </section>
  );
}

function ProfileHeaderSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-surface-container-low p-4 sm:p-5" aria-hidden="true">
      <SkeletonBlock className="h-14 w-14 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-5 w-40 rounded-md" />
        <SkeletonBlock className="h-4 w-52 rounded-md" />
      </div>
    </div>
  );
}

function LiveAccountBody() {
  const currentUser = useQuery(api.users.current);

  return (
    <>
      {currentUser ? (
        <ProfileHeader name={currentUser.name} email={currentUser.email} imageUrl={currentUser.imageUrl} />
      ) : (
        <ProfileHeaderSkeleton />
      )}

      <section aria-labelledby="account-profile-heading" className="space-y-2">
        <h2 id="account-profile-heading" className="px-1 text-sm font-semibold text-on-surface-variant">
          Edit profile
        </h2>
        <div className="rounded-3xl bg-surface-container-low p-4 sm:p-6">
          <AccountProfileForm />
        </div>
      </section>

      <SettingsSection title="Session">
        <ClerkSignOutRow />
      </SettingsSection>
    </>
  );
}

function MockAccountBody({ isClerkConfigured }: { isClerkConfigured: boolean }) {
  return (
    <>
      {isClerkConfigured ? <ClerkProfileHeader /> : <ProfileHeader name={DEMO_NAME} email="Demo session" />}

      <SettingsSection title="Demo mode">
        <SettingsRow
          icon={FlaskConical}
          tone="primary"
          title="You're exploring sample data"
          description="Groups, balances, and activity are placeholders and nothing is saved. Profile editing turns on once Clerk and Convex are configured."
        />
      </SettingsSection>

      <SettingsSection title="Session">
        {isClerkConfigured ? (
          <ClerkSignOutRow />
        ) : (
          <SettingsRow
            icon={LogOut}
            tone="muted"
            title="Sign out"
            description="Sign-in isn't set up in this demo, so there's no session to end."
          />
        )}
      </SettingsSection>
    </>
  );
}

function ClerkProfileHeader() {
  const { user } = useUser();
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Signed in";

  return (
    <ProfileHeader
      name={name}
      email={user?.primaryEmailAddress?.emailAddress ?? "Signed in"}
      imageUrl={user?.imageUrl}
    />
  );
}

function ClerkSignOutRow() {
  return (
    <SignOutButton redirectUrl="/sign-in">
      <button
        type="button"
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/12 text-secondary">
          <LogOut className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
        </span>
        <span className="flex-1 text-[0.95rem] font-semibold text-secondary">Sign out</span>
      </button>
    </SignOutButton>
  );
}
