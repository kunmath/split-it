"use client";

import { BellDot, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ShellSessionAvatar } from "@/components/shell/shell-session-controls";
import { buttonVariants } from "@/components/ui/button";
import type { AppRouteMeta } from "@/lib/route-meta";
import { cn } from "@/lib/utils";

type TopUtilityBarProps = {
  meta: AppRouteMeta;
  mode: "mock" | "live";
  isClerkConfigured: boolean;
  isConvexConfigured: boolean;
};

function isGroupDetailRoute(pathname: string | null) {
  if (pathname === null) {
    return false;
  }
  if (!pathname.startsWith("/groups/")) {
    return false;
  }
  if (pathname.endsWith("/settings")) {
    return false;
  }
  if (pathname.includes("/expenses/")) {
    return false;
  }
  return true;
}

export function TopUtilityBar({
  meta,
  mode,
  isClerkConfigured,
  isConvexConfigured,
}: TopUtilityBarProps) {
  const pathname = usePathname();
  const settleUpHref =
    meta.topActionLabel === "Settle Up" && isGroupDetailRoute(pathname)
      ? `${pathname}?settle=1`
      : null;

  return (
    <div className="glass-panel hidden items-center justify-between gap-6 border-b border-white/5 px-10 py-5 lg:flex">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex h-14 w-full max-w-md items-center gap-3 rounded-full bg-surface-container-lowest px-5">
          <Search className="h-4.5 w-4.5 text-on-surface-variant" />
          <span className="truncate text-sm text-on-surface-variant">{meta.searchPlaceholder}</span>
        </div>
        <div className="text-right text-xs italic text-on-surface-variant">{meta.updatedLabel}</div>
      </div>

      <div className="flex items-center gap-3">
        {mode === "mock" ? (
          <div className="flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2 text-[0.68rem] uppercase tracking-[0.22em] text-on-surface-variant">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>
              Mock Mode · {isClerkConfigured ? "Clerk on" : "Clerk off"} ·{" "}
              {isConvexConfigured ? "Convex on" : "Convex off"}
            </span>
          </div>
        ) : null}
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition hover:text-on-surface"
        >
          <BellDot className="h-5 w-5" />
        </button>
        {meta.topActionLabel ? (
          settleUpHref ? (
            <Link
              href={settleUpHref}
              scroll={false}
              className={cn(buttonVariants({ variant: "ghost" }), "px-5")}
            >
              {meta.topActionLabel}
            </Link>
          ) : (
            <button type="button" className={cn(buttonVariants({ variant: "ghost" }), "px-5")}>
              {meta.topActionLabel}
            </button>
          )
        ) : null}
        <ShellSessionAvatar />
      </div>
    </div>
  );
}
