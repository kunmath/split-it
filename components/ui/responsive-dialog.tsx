"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { SurfaceCard } from "./surface-card";
import { useHistoryLayer } from "./use-history-layer";
import { useKeyboardInset, useVisualViewportHeight } from "./use-keyboard-inset";
import { useSheetDrag } from "./use-sheet-drag";

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

const TEXT_ENTRY = "input:not([type=checkbox]):not([type=radio]):not([type=button]), textarea, select";

/** Open dialogs, oldest first; only the top one handles Escape and Tab. */
const openDialogs: string[] = [];

/**
 * Bottom sheet on mobile, centered modal from md up. Traps focus and restores it on close.
 * System Back closes it (it owns a history entry while open), it stays above the on-screen
 * keyboard, and on mobile it can be dragged down by its handle to dismiss.
 */
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
  const dialogId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const keyboardInset = useKeyboardInset();
  const viewportHeight = useVisualViewportHeight();
  const keyboardOpen = open && keyboardInset > 0;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const requestClose = useCallback(() => onCloseRef.current(), []);
  useHistoryLayer(open, requestClose);
  const dragHandlers = useSheetDrag(panelRef, requestClose);

  useEffect(() => {
    if (!open) {
      return;
    }

    openDialogs.push(dialogId);
    const isTop = () => openDialogs[openDialogs.length - 1] === dialogId;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    // Focus an explicit [data-autofocus] field, else the dialog itself (announced via its label),
    // so the close button doesn't open with a focus ring.
    const autoFocusTarget = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel;
    autoFocusTarget?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTop()) {
        return;
      }

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

    // Keep the field being typed into visible inside the sheet (above the keyboard / sticky footer).
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches(TEXT_ENTRY)) {
        requestAnimationFrame(() => target.scrollIntoView({ block: "nearest" }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    panel?.addEventListener("focusin", handleFocusIn);

    return () => {
      const index = openDialogs.lastIndexOf(dialogId);
      if (index !== -1) {
        openDialogs.splice(index, 1);
      }
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      panel?.removeEventListener("focusin", handleFocusIn);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open, dialogId]);

  // When the keyboard opens or resizes, bring the focused field back into view.
  useEffect(() => {
    if (!keyboardOpen) {
      return;
    }

    const active = document.activeElement as HTMLElement | null;
    if (active && panelRef.current?.contains(active) && active.matches(TEXT_ENTRY)) {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [keyboardOpen, keyboardInset]);

  if (!open) {
    return null;
  }

  const compact = size === "compact";

  return (
    <div className="fixed inset-0 z-50" style={keyboardOpen ? { bottom: keyboardInset } : undefined}>
      <div aria-hidden="true" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="pointer-events-none relative flex min-h-full items-end md:items-center md:justify-center">
        <div
          className={cn(
            "pointer-events-auto w-full pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] md:max-w-xl md:pb-6 md:pl-6 md:pr-6 md:pt-6",
            keyboardOpen ? "pb-2 pt-2" : "pt-16",
          )}
        >
          <SurfaceCard
            ref={panelRef}
            tabIndex={-1}
            variant={tone === "danger" ? "high" : "hero"}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            style={
              keyboardOpen && viewportHeight > 0
                ? { maxHeight: `min(85dvh, ${Math.max(160, viewportHeight - 16)}px)` }
                : undefined
            }
            className={cn(
              "relative max-h-[85dvh] overflow-y-auto outline-none overscroll-contain rounded-[1.75rem] shadow-[0_24px_90px_rgba(0,0,0,0.34)] md:rounded-[2rem]",
              compact ? "p-4 md:p-6" : "p-5 md:p-7",
              tone === "danger" &&
                "bg-[radial-gradient(circle_at_top_right,rgba(255,181,158,0.12),transparent_34%),linear-gradient(180deg,rgba(42,42,42,0.98),rgba(28,27,27,1))]",
              className,
            )}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/6 text-on-surface-variant transition hover:text-on-surface"
            >
              <X className="h-5 w-5" />
            </button>

            <div className={compact ? "space-y-4" : "space-y-5"}>
              <div
                data-sheet-drag-area=""
                {...dragHandlers}
                className={cn(
                  "touch-none select-none md:touch-auto md:select-auto",
                  compact ? "-mt-4 pt-4 md:mt-0 md:pt-0" : "-mt-5 pt-5 md:mt-0 md:pt-0",
                )}
              >
                <div aria-hidden="true" className="mx-auto -mt-1 mb-3 h-1 w-10 rounded-full bg-white/15 md:hidden" />
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
              </div>

              {children}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
