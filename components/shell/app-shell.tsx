"use client";

import { ArrowLeft, Search, Settings2, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { usePlaceholderMode } from "@/components/providers/app-providers";
import { DesktopRail } from "@/components/shell/desktop-rail";
import { FloatingActionButton } from "@/components/shell/floating-action-button";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";
import { ShellMobileSessionControls } from "@/components/shell/shell-session-controls";
import { TopUtilityBar } from "@/components/shell/top-utility-bar";
import { getRouteMeta } from "@/lib/route-meta";
import { ROUTES, groupSettingsPath } from "@/lib/routes";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const meta = getRouteMeta(pathname);
  const { mode, isClerkConfigured, isConvexConfigured } = usePlaceholderMode();
  const isFocusedExpenseCreateRoute = pathname.endsWith("/expenses/new");
  const isGroupDetailRoute =
    pathname.startsWith(`${ROUTES.groups}/`) &&
    !pathname.endsWith("/settings") &&
    !pathname.includes("/expenses/");
  const pathnameSegments = pathname.split("/").filter(Boolean);
  const groupId = pathnameSegments[1];
  const groupSettingsHref = groupId ? groupSettingsPath(groupId) : ROUTES.dashboard;

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <DesktopRail meta={meta} />

      <div className="lg:ml-72">
        {!isFocusedExpenseCreateRoute ? (
          <div className="glass-panel sticky top-0 z-30 border-b border-white/5 px-4 py-4 lg:hidden">
            {isGroupDetailRoute ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={ROUTES.dashboard}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface"
                    aria-label="Back to dashboard"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                  <p className="font-headline text-lg font-semibold tracking-tight text-on-surface">
                    Group Details
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Search expenses"
                    className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface"
                  >
                    <Search className="h-4.5 w-4.5" />
                  </button>
                  <Link
                    href={groupSettingsHref}
                    aria-label="Open group totals and settings"
                    className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-white/5 hover:text-on-surface"
                  >
                    <Settings2 className="h-4.5 w-4.5" />
                  </Link>
                </div>
              </div>
            ) : (
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
                <ShellMobileSessionControls />
              </div>
            )}
          </div>
        ) : null}

        {!isFocusedExpenseCreateRoute ? (
          <TopUtilityBar
            meta={meta}
            mode={mode}
            isClerkConfigured={isClerkConfigured}
            isConvexConfigured={isConvexConfigured}
          />
        ) : null}

        <main
          className={
            isFocusedExpenseCreateRoute
              ? "pb-0"
              : "px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-8"
          }
        >
          {children}
        </main>
      </div>

      {!isFocusedExpenseCreateRoute ? <MobileBottomNav /> : null}
      {meta.showFab ? <FloatingActionButton href={meta.fabHref} label={meta.fabLabel} /> : null}
    </div>
  );
}
