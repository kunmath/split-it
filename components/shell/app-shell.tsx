"use client";

import { Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { usePlaceholderMode } from "@/components/providers/app-providers";
import { DesktopRail } from "@/components/shell/desktop-rail";
import { FloatingActionButton } from "@/components/shell/floating-action-button";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";
import { TopUtilityBar } from "@/components/shell/top-utility-bar";
import { getRouteMeta } from "@/lib/route-meta";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const meta = getRouteMeta(pathname);
  const { mode, isClerkConfigured, isConvexConfigured } = usePlaceholderMode();

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <DesktopRail />

      <div className="lg:ml-72">
        <div className="glass-panel sticky top-0 z-30 border-b border-white/5 px-4 py-4 lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-headline text-xl font-extrabold tracking-tight text-primary">split-it</p>
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-on-surface-variant">
                {meta.eyebrow}
              </p>
            </div>
            {mode === "mock" ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-2 text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-variant">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>{isClerkConfigured || isConvexConfigured ? "Partial setup" : "Mock mode"}</span>
              </div>
            ) : null}
          </div>
        </div>

        <TopUtilityBar
          meta={meta}
          mode={mode}
          isClerkConfigured={isClerkConfigured}
          isConvexConfigured={isConvexConfigured}
        />

        <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-8">{children}</main>
      </div>

      <MobileBottomNav />
      {meta.showFab ? <FloatingActionButton href="/groups/demo-group/expenses/new" label={meta.fabLabel} /> : null}
    </div>
  );
}
