import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { buildAuthRedirectHref, getSafeRedirectPath } from "@/lib/auth-redirect";

type SignUpPageProps = {
  searchParams: Promise<{
    redirect_url?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const resolvedSearchParams = await searchParams;
  const redirectPath = getSafeRedirectPath(resolvedSearchParams.redirect_url);

  return (
    <AuthShell
      mode="sign-up"
      footer={
        <p>
          Already inside?{" "}
          <Link
            href={buildAuthRedirectHref("/sign-in", redirectPath)}
            className="font-headline font-bold text-primary transition hover:text-primary/80"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <SignUpForm redirectPath={redirectPath} />
    </AuthShell>
  );
}
