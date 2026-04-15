import { UserPlus } from "lucide-react";

import { PageContainer } from "@/components/shell/page-container";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";

export default function FriendsPage() {
  return (
    <PageContainer className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-primary">Friends</p>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface sm:text-5xl">
          Shared contacts, later
        </h1>
        <p className="max-w-2xl text-sm leading-8 text-on-surface-variant sm:text-base">
          The MVP keeps friends lightweight. This route stays available so the authenticated shell has a coherent destination while direct person-to-person ledgers wait for a later iteration.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SurfaceCard variant="hero" className="lg:col-span-2 rounded-[2.25rem] p-7">
          <p className="text-xs uppercase tracking-[0.24em] text-primary">Planned Surface</p>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-on-surface-variant">
            A fuller friends model can land here later with bilateral balances, recent settlements, and faster group composition from saved contacts.
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
        <AvatarBadge name="Sarah Jenkins" note="Saved contact concept" tone="positive" />
        <AvatarBadge name="James Chen" note="Shared group collaborator concept" tone="negative" />
        <AvatarBadge name="Elena Rodriguez" note="Quick-add roster concept" tone="neutral" />
      </SurfaceCard>
    </PageContainer>
  );
}
