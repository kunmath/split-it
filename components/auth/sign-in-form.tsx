"use client";

import { SignIn } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { signInAppearance } from "@/components/auth/clerk-appearance";
import { AuthDivider, AuthHeader, AuthNotice, OAuthGoogleButton } from "@/components/auth/auth-primitives";
import { usePlaceholderMode } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { FilledInput } from "@/components/ui/filled-input";
import {
  DEFAULT_AUTH_REDIRECT_PATH,
  SIGN_IN_PATH,
  SIGN_UP_PATH,
  buildAuthRedirectHref,
  getSafeRedirectPath,
} from "@/lib/auth-redirect";

type SignInFormProps = {
  redirectPath?: string | null;
};

export function SignInForm({ redirectPath }: SignInFormProps) {
  const { isClerkConfigured } = usePlaceholderMode();
  const safeRedirectPath = getSafeRedirectPath(redirectPath);

  if (!isClerkConfigured) {
    return <DisabledSignInForm redirectPath={safeRedirectPath} />;
  }

  return <LiveSignInForm redirectPath={safeRedirectPath} />;
}

type DisabledSignInFormProps = {
  redirectPath?: string | null;
};

function DisabledSignInForm({ redirectPath }: DisabledSignInFormProps) {
  return (
    <div className="space-y-6">
      <AuthHeader title="Welcome back" subtitle="Access your editorial ledger." />
      <AuthNotice>
        Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to enable live sign-in and route protection.
      </AuthNotice>
      <OAuthGoogleButton disabled />
      <AuthDivider />
      <div className="space-y-5">
        <FilledInput disabled label="Email Address" placeholder="ledger@split-it.com" type="email" />
        <FilledInput disabled label="Password" placeholder="••••••••" type="password" />
      </div>
      <Button className="min-h-15 rounded-[1.15rem] text-[1.02rem] font-extrabold" disabled fullWidth size="lg">
        Sign In <ArrowRight className="h-4.5 w-4.5" />
      </Button>
      <p className="pt-2 text-center text-sm text-on-surface-variant">
        New to the collective?{" "}
        <Link
          href={buildAuthRedirectHref(SIGN_UP_PATH, redirectPath)}
          className="font-headline font-bold text-primary transition hover:text-primary/80"
        >
          Create access
        </Link>
      </p>
    </div>
  );
}

type LiveSignInFormProps = {
  redirectPath?: string | null;
};

function LiveSignInForm({ redirectPath }: LiveSignInFormProps) {
  return (
    <SignIn
      appearance={signInAppearance}
      fallbackRedirectUrl={DEFAULT_AUTH_REDIRECT_PATH}
      oauthFlow="redirect"
      path={SIGN_IN_PATH}
      routing="path"
      signUpUrl={buildAuthRedirectHref(SIGN_UP_PATH, redirectPath)}
    />
  );
}
