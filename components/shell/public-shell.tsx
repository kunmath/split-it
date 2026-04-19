import Link from "next/link";
import type { ReactNode } from "react";

import { PageContainer } from "@/components/shell/page-container";
import { SurfaceCard } from "@/components/ui/surface-card";
import { ROUTES } from "@/lib/routes";

type PublicShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function PublicShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: PublicShellProps) {
  return (
    <div className="page-glow relative min-h-screen overflow-hidden bg-surface">
      <PageContainer className="relative flex min-h-screen flex-col px-4 py-6 sm:px-6 lg:px-10">
        <header className="flex items-center justify-between py-3">
          <Link href={ROUTES.dashboard} className="font-headline text-2xl font-extrabold tracking-tight text-primary">
            split-it
          </Link>
          <div className="hidden items-center gap-6 text-xs uppercase tracking-[0.2em] text-on-surface-variant md:flex">
            <span>Privacy</span>
            <span>Support</span>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="grid w-full items-center gap-12 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="hidden max-w-xl space-y-8 xl:block">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.28em] text-primary">{eyebrow}</p>
                <h1 className="font-headline text-6xl font-extrabold tracking-tight text-on-surface">
                  Shared expenses with editorial gravity.
                </h1>
                <p className="max-w-lg text-lg leading-8 text-on-surface-variant">
                  Split-It keeps the product shell polished while auth, invites, and shared-expense workflows stay coherent across every route.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <SurfaceCard variant="low" className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.22em] text-on-surface-variant">
                    tonal layers
                  </p>
                  <p className="font-headline text-3xl font-bold text-primary">$12,480</p>
                  <p className="text-sm text-on-surface-variant">Premium depth with no hard dividers.</p>
                </SurfaceCard>
                <SurfaceCard variant="low" className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.22em] text-on-surface-variant">
                    responsive shell
                  </p>
                  <p className="font-headline text-3xl font-bold text-secondary">390 → 1440</p>
                  <p className="text-sm text-on-surface-variant">
                    One route tree across mobile and desktop.
                  </p>
                </SurfaceCard>
              </div>
            </div>

            <div className="mx-auto w-full max-w-xl">
              <SurfaceCard variant="glass" className="rounded-[2.25rem] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.24)] sm:p-8">
                <div className="space-y-2 text-center sm:text-left">
                  <p className="text-xs uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
                  <h2 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
                    {title}
                  </h2>
                  <p className="text-sm text-on-surface-variant sm:text-base">{subtitle}</p>
                </div>
                <div className="mt-8">{children}</div>
              </SurfaceCard>
              {footer ? <div className="mt-6">{footer}</div> : null}
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
