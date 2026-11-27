"use client";

import {
  getTodayDateInputValue,
  shiftDateInputValue,
} from "@/components/expenses/composer-model";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { cn } from "@/lib/utils";

type ComposerDateSheetProps = {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

/** The native date input lives only inside this sheet so it is never rendered by default. */
export function ComposerDateSheet({ open, onClose, value, onChange, error }: ComposerDateSheetProps) {
  const today = getTodayDateInputValue();
  const quickPicks = [
    { label: "Today", value: today },
    { label: "Yesterday", value: shiftDateInputValue(today, -1) },
  ];

  return (
    <ResponsiveDialog open={open} onClose={onClose} title="When was it?" size="compact">
      <div className="grid grid-cols-2 gap-2">
        {quickPicks.map((pick) => {
          const active = pick.value === value;

          return (
            <button
              key={pick.label}
              type="button"
              aria-pressed={active}
              data-autofocus={active ? true : undefined}
              onClick={() => {
                onChange(pick.value);
                onClose();
              }}
              className={cn(
                "min-h-12 rounded-2xl font-headline text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                active
                  ? "bg-primary/15 text-primary ring-1 ring-primary/40"
                  : "bg-surface-container-lowest text-on-surface hover:bg-white/6",
              )}
            >
              {pick.label}
            </button>
          );
        })}
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-semibold text-on-surface-variant">Or pick a date</span>
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? "true" : undefined}
          className="min-h-12 w-full rounded-2xl border border-white/8 bg-surface-container-lowest px-4 text-base text-on-surface [color-scheme:dark] focus:border-primary/50 focus:outline-none"
        />
      </label>
      {error ? <p className="text-sm text-secondary">{error}</p> : null}

      <Button size="lg" fullWidth onClick={onClose}>
        Done
      </Button>
    </ResponsiveDialog>
  );
}
