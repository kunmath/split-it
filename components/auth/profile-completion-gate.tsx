"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { startTransition, useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { usePlaceholderMode } from "@/components/providers/app-providers";
import { ScreenState } from "@/components/ui/screen-state";
import { api } from "@/convex/_generated/api";
import { buildProfileOnboardingHref } from "@/lib/auth-redirect";

type ProfileCompletionGateProps = {
  children: ReactNode;
};

export function ProfileCompletionGate({ children }: ProfileCompletionGateProps) {
  const { mode } = usePlaceholderMode();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isLoading: isConvexAuthLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.current, mode === "live" ? {} : "skip");
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (mode !== "live" || currentUser === undefined || currentUser === null || currentUser.profileCompletedAt) {
      return;
    }

    if (redirectedRef.current) {
      return;
    }

    const queryString = searchParams.toString();
    const redirectPath = queryString ? `${pathname}?${queryString}` : pathname;

    redirectedRef.current = true;
    startTransition(() => {
      router.replace(buildProfileOnboardingHref(redirectPath));
    });
  }, [currentUser, mode, pathname, router, searchParams]);

  if (mode !== "live") {
    return <>{children}</>;
  }

  if (currentUser === undefined) {
    return (
      <div className="px-4 py-12 sm:px-6 lg:px-10">
        <ScreenState
          state="loading"
          title="Preparing your workspace"
          description="We’re validating your session and loading the profile state that controls access to the app."
          className="rounded-[2rem] p-7 sm:p-8"
        />
      </div>
    );
  }

  if (currentUser === null) {
    return (
      <div className="px-4 py-12 sm:px-6 lg:px-10">
        <ScreenState
          state={isConvexAuthLoading ? "loading" : "unavailable"}
          title={isConvexAuthLoading ? "Syncing your workspace" : "Workspace profile unavailable"}
          description={
            isConvexAuthLoading
              ? "Your account is authenticated, but the ledger record is still finishing setup."
              : isConvexAuthenticated
                ? "Your account is authenticated, but the ledger record was not found in Convex."
                : "Clerk sign-in succeeded, but Convex did not receive a valid auth token for this session."
          }
          className="rounded-[2rem] p-7 sm:p-8"
        />
      </div>
    );
  }

  if (!currentUser.profileCompletedAt) {
    return (
      <div className="px-4 py-12 sm:px-6 lg:px-10">
        <ScreenState
          state="loading"
          title="Opening profile setup"
          description="Taking you to the final profile step before the app shell unlocks."
          className="rounded-[2rem] p-7 sm:p-8"
        />
      </div>
    );
  }

  return <>{children}</>;
}
