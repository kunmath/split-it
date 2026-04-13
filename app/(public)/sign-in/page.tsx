import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { buildAuthRedirectHref, getSafeRedirectPath } from "@/lib/auth-redirect";

type SignInPageProps = {
  searchParams: Promise<{
    redirect_url?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedSearchParams = await searchParams;
  const redirectPath = getSafeRedirectPath(resolvedSearchParams.redirect_url);

  return (
    <AuthShell
      mode="sign-in"
      footer={
        <p>
          New to the collective?{" "}
          <Link
            href={buildAuthRedirectHref("/sign-up", redirectPath)}
            className="font-headline font-bold text-primary transition hover:text-primary/80"
          >
            Create access
          </Link>
        </p>
      }
    >
      <SignInForm redirectPath={redirectPath} />
    </AuthShell>
  );
}
