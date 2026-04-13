import { UserPlus } from "lucide-react";

import { PageContainer } from "@/components/shell/page-container";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

export default function FriendsPage() {
  return (
    <PageContainer className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-primary">Friends Placeholder</p>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface sm:text-5xl">
          Relationship ledger shell
        </h1>
        <p className="max-w-2xl text-sm leading-8 text-on-surface-variant sm:text-base">
          This page exists so the navigation shell has fully working placeholder destinations before the
          real friends model exists.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SurfaceCard variant="hero" className="lg:col-span-2 rounded-[2.25rem] p-7">
          <p className="text-xs uppercase tracking-[0.24em] text-primary">Future surface</p>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-on-surface-variant">
            Later phases can use this space for bilateral balances, recent settlements, and friend invitations.
          </p>
        </SurfaceCard>
        <SurfaceCard variant="low" className="rounded-[2.25rem] p-7">
          <Button variant="secondary" size="lg" fullWidth>
            <UserPlus className="h-4.5 w-4.5" />
            Invite Friend
          </Button>
        </SurfaceCard>
      </div>

      <SurfaceCard variant="high" className="space-y-4 rounded-[2.25rem] p-7">
        <AvatarBadge name="Sarah Jenkins" note="Placeholder mutual ledger" tone="positive" />
        <AvatarBadge name="James Chen" note="Placeholder mutual ledger" tone="negative" />
        <AvatarBadge name="Elena Rodriguez" note="Placeholder mutual ledger" tone="neutral" />
      </SurfaceCard>
    </PageContainer>
  );
}
