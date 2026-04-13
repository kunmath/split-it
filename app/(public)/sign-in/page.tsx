import Link from "next/link";
import { ArrowRight, Lock, ShieldCheck } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { FilledInput } from "@/components/ui/filled-input";
import { cn } from "@/lib/utils";

export default function SignInPage() {
  return (
    <PublicShell
      eyebrow="Welcome Back"
      title="Access your editorial ledger"
      subtitle="Phase 0 keeps auth visual-only. The shell and reusable inputs are ready for Clerk wiring in the next auth phase."
      footer={
        <div className="flex items-center justify-center gap-6 text-[0.68rem] uppercase tracking-[0.24em] text-on-surface-variant">
          <span className="inline-flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            AES-256 inspired tone
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            Placeholder-safe
          </span>
        </div>
      }
    >
      <div className="space-y-6">
        <Button variant="secondary" size="lg" fullWidth>
          Continue with Google
        </Button>

        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-white/8" />
          <span className="text-[0.68rem] uppercase tracking-[0.24em] text-on-surface-variant">Or email</span>
          <div className="h-px flex-1 bg-white/8" />
        </div>

        <div className="space-y-5">
          <FilledInput label="Email Address" type="email" placeholder="ledger@split-it.com" />
          <FilledInput
            label="Password"
            type="password"
            placeholder="••••••••"
            hint="Forms are intentionally inert in Phase 0."
          />
        </div>

        <Button variant="primary" size="lg" fullWidth>
          Sign In <ArrowRight className="h-4.5 w-4.5" />
        </Button>

        <p className="text-center text-sm text-on-surface-variant">
          New to the collective?{" "}
          <Link href="/sign-up" className={cn(buttonVariants({ variant: "ghost" }), "ml-2 !min-h-0 px-3 py-2")}>
            Create access
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}
