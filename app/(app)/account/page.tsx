import { BadgeCheck, Shield } from "lucide-react";

import { PageContainer } from "@/components/shell/page-container";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

export default function AccountPage() {
  return (
    <PageContainer className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-primary">Account Placeholder</p>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface sm:text-5xl">
          Profile and settings shell
        </h1>
        <p className="max-w-2xl text-sm leading-8 text-on-surface-variant sm:text-base">
          Sign-out and Clerk account management are intentionally deferred. This page keeps the account nav
          destination coherent in Phase 0.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <SurfaceCard variant="high" className="space-y-6 rounded-[2.25rem] p-7">
          <AvatarBadge name="Alex Rivera" note="Premium member placeholder" tone="positive" align="stack" />
          <div className="grid gap-3">
            <div className="rounded-[1.5rem] bg-surface-container-low p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-on-surface-variant">Auth status</p>
              <p className="mt-2 font-headline text-2xl font-bold text-on-surface">Pending Phase 2</p>
            </div>
            <div className="rounded-[1.5rem] bg-surface-container-low p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-on-surface-variant">Convex status</p>
              <p className="mt-2 font-headline text-2xl font-bold text-on-surface">Placeholder mode aware</p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard variant="hero" className="space-y-5 rounded-[2.25rem] p-7">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <p className="font-headline text-3xl font-bold tracking-tight text-on-surface">
            Clerk and Convex can be layered in without redesigning the account area.
          </p>
          <p className="max-w-2xl text-sm leading-8 text-on-surface-variant">
            The shell already carries the right spacing, typography, and tonal hierarchy. Later auth work only
            needs to replace the placeholders with live account actions.
          </p>
          <Button variant="secondary" size="lg">
            <BadgeCheck className="h-4.5 w-4.5" />
            Review Placeholder State
          </Button>
        </SurfaceCard>
      </div>
    </PageContainer>
  );
}
