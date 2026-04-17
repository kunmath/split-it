import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getSafeRedirectPath } from "@/lib/auth-redirect";

type SignUpPageProps = {
  searchParams: Promise<{
    redirect_url?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const resolvedSearchParams = await searchParams;
  const redirectPath = getSafeRedirectPath(resolvedSearchParams.redirect_url);

  return (
    <AuthShell mode="sign-up">
      <SignUpForm redirectPath={redirectPath} />
    </AuthShell>
  );
}
