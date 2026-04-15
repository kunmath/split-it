"use client";

import { X } from "lucide-react";
import { useEffect, useId, type ReactNode } from "react";

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
};

export function ResponsiveDialog({
  children,
  className,
  description,
  eyebrow,
  onClose,
  open,
  title,
  tone = "default",
}: ResponsiveDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex min-h-full items-end md:items-center md:justify-center">
        <div className="w-full px-3 pb-3 pt-20 md:max-w-2xl md:px-6 md:pb-6 md:pt-6">
          <SurfaceCard
            variant={tone === "danger" ? "high" : "hero"}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            className={cn(
              "relative max-h-[88vh] overflow-y-auto rounded-[2rem] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] md:rounded-[2.5rem] md:p-8",
              tone === "danger" &&
                "bg-[radial-gradient(circle_at_top_right,rgba(255,181,158,0.12),transparent_34%),linear-gradient(180deg,rgba(42,42,42,0.98),rgba(28,27,27,1))]",
              className,
            )}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/6 text-on-surface-variant transition hover:text-on-surface"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-6">
              <div className="space-y-3 pr-12">
                {eyebrow ? (
                  <p
                    className={cn(
                      "text-[0.68rem] uppercase tracking-[0.28em]",
                      tone === "danger" ? "text-secondary" : "text-primary",
                    )}
                  >
                    {eyebrow}
                  </p>
                ) : null}
                <div className="space-y-2">
                  <h2
                    id={titleId}
                    className="font-headline text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl"
                  >
                    {title}
                  </h2>
                  {description ? (
                    <p id={descriptionId} className="text-sm leading-7 text-on-surface-variant">
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
