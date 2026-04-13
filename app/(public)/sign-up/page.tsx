import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { FilledInput } from "@/components/ui/filled-input";
import { cn } from "@/lib/utils";

export default function SignUpPage() {
  return (
    <PublicShell
      eyebrow="Create Access"
      title="Start a premium shared-expense workspace"
      subtitle="The sign-up layout shares the same public shell as sign-in while reserving real Clerk mutations for Phase 2."
      footer={
        <div className="text-center text-[0.68rem] uppercase tracking-[0.24em] text-on-surface-variant">
          staged onboarding · reusable primitives · zero copied HTML
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <FilledInput label="First Name" placeholder="Alex" />
          <FilledInput label="Last Name" placeholder="Rivera" />
        </div>
        <FilledInput label="Email Address" type="email" placeholder="name@domain.com" />
        <FilledInput label="Password" type="password" placeholder="Choose a strong password" />

        <div className="rounded-[1.5rem] bg-surface-container-low p-4 text-sm leading-7 text-on-surface-variant">
          <p className="inline-flex items-center gap-2 font-medium text-on-surface">
            <Sparkles className="h-4 w-4 text-primary" />
            Phase 0 note
          </p>
          <p className="mt-2">
            Creating the account is intentionally disabled until the dedicated auth phase lands.
          </p>
        </div>

        <Button variant="primary" size="lg" fullWidth>
          Create Access <ArrowRight className="h-4.5 w-4.5" />
        </Button>

        <p className="text-center text-sm text-on-surface-variant">
          Already inside?{" "}
          <Link href="/sign-in" className={cn(buttonVariants({ variant: "ghost" }), "ml-2 !min-h-0 px-3 py-2")}>
            Sign in
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}
