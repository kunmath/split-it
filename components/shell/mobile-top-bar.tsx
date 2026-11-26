"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";

import { usePlaceholderMode } from "@/components/providers/app-providers";
import { cn } from "@/lib/utils";

/** True once the user has navigated within the app, so router.back() stays in-app. */
export const InAppHistoryContext = createContext(false);

export function useBackNavigation(fallbackHref: string) {
  const router = useRouter();
  const hasInAppHistory = useContext(InAppHistoryContext);

  return () => {
    if (hasInAppHistory) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  };
}

export function BackButton({ fallbackHref, label = "Back", className }: { fallbackHref: string; label?: string; className?: string }) {
  const goBack = useBackNavigation(fallbackHref);

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      className={cn(
        "-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface transition hover:bg-white/6",
        className,
      )}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}

type MobileTopBarProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** When set, shows a back button that returns to the previous in-app screen or this fallback. */
  backFallbackHref?: string;
  actions?: ReactNode;
  /** Top-level tabs use a larger title. */
  variant?: "tab" | "nested";
  className?: string;
};

/** Sticky mobile header. Hidden from lg up, where the desktop rail + page headings take over. */
export function MobileTopBar({
  title,
  subtitle,
  backFallbackHref,
  actions,
  variant = "nested",
  className,
}: MobileTopBarProps) {
  const { mode } = usePlaceholderMode();

  return (
    <header
      className={cn(
        "glass-panel sticky top-0 z-30 -mx-4 mb-4 border-b border-white/5 px-4 pt-[env(safe-area-inset-top)] sm:-mx-6 sm:px-6 lg:hidden",
        className,
      )}
    >
      <div className="flex min-h-14 items-center gap-2">
        {backFallbackHref ? <BackButton fallbackHref={backFallbackHref} /> : null}
        <div className="min-w-0 flex-1">
          <h1
            className={cn(
              "truncate font-headline font-bold tracking-tight text-on-surface",
              variant === "tab" ? "text-2xl" : "text-lg",
            )}
          >
            {title}
          </h1>
          {subtitle ? <p className="truncate text-xs text-on-surface-variant">{subtitle}</p> : null}
        </div>
        {variant === "tab" && mode === "mock" ? (
          <span className="rounded-full bg-white/6 px-2.5 py-1 text-[0.7rem] font-medium text-on-surface-variant">
            Demo data
          </span>
        ) : null}
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
    </header>
  );
}

/** 44px round icon button used in top bars. */
export const topBarIconButtonClass =
  "flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-white/6 hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";
