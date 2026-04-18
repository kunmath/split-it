"use client";

import { SignUp } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { signUpAppearance } from "@/components/auth/clerk-appearance";
import { AuthDivider, AuthHeader, AuthNotice, OAuthGoogleButton } from "@/components/auth/auth-primitives";
import { usePlaceholderMode } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { FilledInput } from "@/components/ui/filled-input";
import {
  SIGN_IN_PATH,
  SIGN_UP_PATH,
  buildAuthRedirectHref,
  buildProfileOnboardingHref,
  getSafeRedirectPath,
} from "@/lib/auth-redirect";

type SignUpFormProps = {
  redirectPath?: string | null;
};

export function SignUpForm({ redirectPath }: SignUpFormProps) {
  const { isClerkConfigured } = usePlaceholderMode();
  const safeRedirectPath = getSafeRedirectPath(redirectPath);

  if (!isClerkConfigured) {
    return <DisabledSignUpForm redirectPath={safeRedirectPath} />;
  }

  return <LiveSignUpForm redirectPath={safeRedirectPath} />;
}

type DisabledSignUpFormProps = {
  redirectPath?: string | null;
};

function DisabledSignUpForm({ redirectPath }: DisabledSignUpFormProps) {
  return (
    <div className="space-y-6">
      <AuthHeader title="Create access" subtitle="Start a premium shared-expense workspace." />
      <AuthNotice>
        Live sign-up stays disabled until Clerk server keys are present in `.env.local`.
      </AuthNotice>
      <OAuthGoogleButton disabled />
      <AuthDivider />
      <div className="grid gap-5 sm:grid-cols-2">
        <FilledInput disabled label="First Name" placeholder="Alex" />
        <FilledInput disabled label="Last Name" placeholder="Rivera" />
      </div>
      <FilledInput disabled label="Email Address" placeholder="name@domain.com" type="email" />
      <FilledInput disabled label="Password" placeholder="Choose a strong password" type="password" />
      <Button className="min-h-15 rounded-[1.15rem] text-[1.02rem] font-extrabold" disabled fullWidth size="lg">
        Create Access <ArrowRight className="h-4.5 w-4.5" />
      </Button>
      <p className="pt-2 text-center text-sm text-on-surface-variant">
        Already inside?{" "}
        <Link
          href={buildAuthRedirectHref(SIGN_IN_PATH, redirectPath)}
          className="font-headline font-bold text-primary transition hover:text-primary/80"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

type LiveSignUpFormProps = {
  redirectPath?: string | null;
};

function LiveSignUpForm({ redirectPath }: LiveSignUpFormProps) {
  return (
    <SignUp
      appearance={signUpAppearance}
      fallbackRedirectUrl={buildProfileOnboardingHref(redirectPath)}
      oauthFlow="redirect"
      path={SIGN_UP_PATH}
      routing="path"
      signInUrl={buildAuthRedirectHref(SIGN_IN_PATH, redirectPath)}
    />
  );
}
