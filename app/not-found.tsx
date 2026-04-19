import Link from "next/link";

import { PublicShell } from "@/components/shell/public-shell";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

export default function NotFound() {
  return (
    <PublicShell
      eyebrow="Missing Route"
      title="That ledger page does not exist"
      subtitle="This path is outside the current Split-It route map."
      footer={
        <div className="text-center text-xs uppercase tracking-[0.2em] text-on-surface-variant">
          404 · tonal fallback
        </div>
      }
    >
      <div className="space-y-6">
        <p className="text-sm leading-7 text-on-surface-variant">
          Try the dashboard or a live group route instead.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={ROUTES.dashboard} className={buttonVariants({ variant: "primary", size: "lg" })}>
            Go to Dashboard
          </Link>
          <Link href={ROUTES.groups} className={buttonVariants({ variant: "ghost", size: "lg" })}>
            Open Groups
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
