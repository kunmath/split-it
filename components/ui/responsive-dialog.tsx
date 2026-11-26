"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { SurfaceCard } from "./surface-card";

type ResponsiveDialogProps = {
  children: ReactNode;
  className?: string;
  description?: string;
  eyebrow?: string;
  onClose: () => void;
  open: boolean;
  title: string;
  tone?: "default" | "danger";
  /** Compact sheets (pickers) use tighter padding and a smaller title. */
  size?: "default" | "compact";
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Bottom sheet on mobile, centered modal from md up. Traps focus and restores it on close. */
export function ResponsiveDialog({
  children,
  className,
  description,
  eyebrow,
  onClose,
  open,
  title,
  tone = "default",
  size = "default",
}: ResponsiveDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const autoFocusTarget =
      panel?.querySelector<HTMLElement>("[data-autofocus]") ??
      panel?.querySelector<HTMLElement>(FOCUSABLE);
    autoFocusTarget?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !panel) {
        return;
      }

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      );
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const compact = size === "compact";

  return (
    <div className="fixed inset-0 z-50">
      <div aria-hidden="true" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="pointer-events-none relative flex min-h-full items-end md:items-center md:justify-center">
        <div className="pointer-events-auto w-full pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-16 md:max-w-xl md:pb-6 md:pl-6 md:pr-6 md:pt-6">
          <SurfaceCard
            ref={panelRef}
            variant={tone === "danger" ? "high" : "hero"}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            className={cn(
              "relative max-h-[85dvh] overflow-y-auto overscroll-contain rounded-[1.75rem] shadow-[0_24px_90px_rgba(0,0,0,0.34)] md:rounded-[2rem]",
              compact ? "p-4 md:p-6" : "p-5 md:p-7",
              tone === "danger" &&
                "bg-[radial-gradient(circle_at_top_right,rgba(255,181,158,0.12),transparent_34%),linear-gradient(180deg,rgba(42,42,42,0.98),rgba(28,27,27,1))]",
              className,
            )}
          >
            <div aria-hidden="true" className="mx-auto -mt-1 mb-3 h-1 w-10 rounded-full bg-white/15 md:hidden" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/6 text-on-surface-variant transition hover:text-on-surface"
            >
              <X className="h-5 w-5" />
            </button>

            <div className={compact ? "space-y-4" : "space-y-5"}>
              <div className="space-y-1.5 pr-12">
                {eyebrow ? (
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      tone === "danger" ? "text-secondary" : "text-primary",
                    )}
                  >
                    {eyebrow}
                  </p>
                ) : null}
                <h2
                  id={titleId}
                  className={cn(
                    "font-headline font-bold tracking-tight text-on-surface",
                    compact ? "text-xl" : "text-2xl md:text-3xl",
                  )}
                >
                  {title}
                </h2>
                {description ? (
                  <p id={descriptionId} className="text-sm leading-6 text-on-surface-variant">
                    {description}
                  </p>
                ) : null}
              </div>

              {children}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
