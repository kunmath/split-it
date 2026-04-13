import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  return (
    <AuthShell
      mode="sign-in"
      footer={
        <p>
          New to the collective?{" "}
          <Link href="/sign-up" className="font-headline font-bold text-primary transition hover:text-primary/80">
            Create access
          </Link>
        </p>
      }
    >
      <SignInForm />
    </AuthShell>
  );
}
