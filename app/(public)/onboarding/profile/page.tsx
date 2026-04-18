import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingProfileForm } from "@/components/profile/profile-form";
import { getEnvSnapshot } from "@/lib/env";
import { getSafeRedirectPath } from "@/lib/auth-redirect";

type ProfileOnboardingPageProps = {
  searchParams: Promise<{
    redirect_url?: string;
  }>;
};

export default async function ProfileOnboardingPage({ searchParams }: ProfileOnboardingPageProps) {
  const env = getEnvSnapshot();
  const resolvedSearchParams = await searchParams;
  const redirectPath = getSafeRedirectPath(resolvedSearchParams.redirect_url);

  if (env.placeholderMode !== "live") {
    redirect("/dashboard");
  }

  return (
    <AuthShell mode="onboarding">
      <OnboardingProfileForm redirectPath={redirectPath} />
    </AuthShell>
  );
}
