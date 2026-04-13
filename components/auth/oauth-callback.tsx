"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { LoaderCircle } from "lucide-react";

import { AuthHeader } from "@/components/auth/auth-primitives";
import { usePlaceholderMode } from "@/components/providers/app-providers";

export function OAuthCallback() {
  const { isClerkConfigured } = usePlaceholderMode();

  if (!isClerkConfigured) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
          <LoaderCircle className="h-7 w-7" />
        </div>
        <AuthHeader
          title="Auth callback unavailable"
          subtitle="Configure Clerk publishable and secret keys before using Google sign-in or sign-up."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
        <LoaderCircle className="h-7 w-7 animate-spin" />
      </div>
      <AuthHeader title="Finalizing access" subtitle="Completing the secure handoff and returning you to the ledger." />
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/dashboard"
        signInUrl="/sign-in"
        signUpFallbackRedirectUrl="/dashboard"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
