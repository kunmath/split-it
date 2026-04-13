import Link from "next/link";
import { ArrowRight, Link2, Users } from "lucide-react";

import { PublicShell } from "@/components/shell/public-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { getInviteContent } from "@/lib/placeholder-data";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const invite = getInviteContent(token);

  return (
    <PublicShell
      eyebrow="Invite Link"
      title={invite.title}
      subtitle={invite.subtitle}
      footer={
        <div className="text-center text-[0.68rem] uppercase tracking-[0.24em] text-on-surface-variant">
          token · {token}
        </div>
      }
    >
      <div className="space-y-5">
        <SurfaceCard variant="low" className="space-y-4">
          <div className="flex items-center gap-3 text-on-surface">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-container-high">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-headline text-lg font-semibold">Iceland Expedition</p>
              <p className="text-sm text-on-surface-variant">6 members · shared adventure budget</p>
            </div>
          </div>
          <div className="rounded-[1.25rem] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface-variant">
            <span className="inline-flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              Invite token is rendered, but acceptance is intentionally stubbed in Phase 0.
            </span>
          </div>
        </SurfaceCard>

        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="lg">
            Accept Later <ArrowRight className="h-4.5 w-4.5" />
          </Button>
          <Link href="/sign-in" className={buttonVariants({ variant: "ghost", size: "lg" })}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
