import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthShell
      mode="sign-up"
      footer={
        <p>
          Already inside?{" "}
          <Link href="/sign-in" className="font-headline font-bold text-primary transition hover:text-primary/80">
            Sign in
          </Link>
        </p>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
