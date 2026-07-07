import { Users } from "lucide-react";
import Link from "next/link";

import { PageContainer } from "@/components/shell/page-container";
import { buttonVariants } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { cn } from "@/lib/utils";

export default function FriendsPage() {
  return (
    <PageContainer className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-primary">Friends</p>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface sm:text-5xl">
          Friends are coming soon
        </h1>
        <p className="max-w-2xl text-sm leading-8 text-on-surface-variant sm:text-base">
          Person-to-person ledgers and saved contacts are not available yet. For now, everyone
          you split with lives inside your groups.
        </p>
      </div>

      <SurfaceCard variant="hero" className="space-y-5 rounded-[2.25rem] p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Users className="h-5 w-5" />
        </div>
        <p className="max-w-2xl text-sm leading-8 text-on-surface-variant">
          Want to split with someone new today? Open one of your groups and share its invite
          link — they will show up here once direct friend ledgers arrive.
        </p>
        <Link href="/groups" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-fit")}>
          Go to your groups
        </Link>
      </SurfaceCard>
    </PageContainer>
  );
}
