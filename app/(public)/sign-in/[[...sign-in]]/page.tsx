import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getSafeRedirectPath } from "@/lib/auth-redirect";

type SignInPageProps = {
  searchParams: Promise<{
    redirect_url?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedSearchParams = await searchParams;
  const redirectPath = getSafeRedirectPath(resolvedSearchParams.redirect_url);

  return (
    <AuthShell mode="sign-in">
      <SignInForm redirectPath={redirectPath} />
    </AuthShell>
  );
}
