"use client";

import { Check, Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";

import { getCurrencyToken, type SplitType } from "@/components/expenses/composer-model";
import type { ComposerState } from "@/components/expenses/use-composer-state";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { formatMoneyFromCents } from "@/lib/format";
import { cn } from "@/lib/utils";

const SPLIT_OPTIONS: Array<{ value: SplitType; label: string }> = [
  { value: "equal", label: "Equal" },
  { value: "exact", label: "Exact" },
  { value: "shares", label: "Shares" },
];

type ComposerSplitSheetProps = {
  open: boolean;
  onClose: () => void;
  state: ComposerState;
};

export function ComposerSplitSheet({ open, onClose, state }: ComposerSplitSheetProps) {
  const {
    amountCents,
    currency,
    members,
    selectedIds,
    splitType,
    memberShareCents,
    exactRows,
    shareRows,
    fieldErrors,
  } = state;
  const totalCents = amountCents && amountCents > 0 ? amountCents : 0;
  const allSelected = selectedIds.length === members.length;
  const splitError = fieldErrors.participants ?? fieldErrors.exactShares ?? fieldErrors.shares;

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title={totalCents > 0 ? `Split ${formatMoneyFromCents(totalCents, currency)}` : "Split"}
      size="compact"
    >
      <div role="radiogroup" aria-label="Split type" className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-container-lowest p-1">
        {SPLIT_OPTIONS.map((option) => {
          const active = option.value === splitType;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              data-autofocus={active ? true : undefined}
              onClick={() => state.changeSplitType(option.value)}
              className={cn(
                "min-h-11 rounded-xl font-headline text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                active
                  ? "bg-surface-container-high text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-on-surface-variant">
          {selectedIds.length} of {members.length} included
        </p>
        <div className="flex items-center gap-1">
          {splitType !== "equal" ? (
            <button type="button" onClick={state.resetSplitValues} className={linkButtonClass}>
              {splitType === "exact" ? "Split evenly" : "1 share each"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={allSelected ? state.clearParticipants : state.selectAllParticipants}
            className={linkButtonClass}
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
        </div>
      </div>

      <ul className="-mx-1 space-y-1">
        {members.map((member) => {
          const isIncluded = selectedIds.includes(member.id);
          const shareCents = memberShareCents.get(member.id) ?? 0;
          const name = member.isCurrentUser ? "You" : member.name;
          let control: ReactNode = null;
          let meta: ReactNode = isIncluded ? null : "Not included";

          if (splitType === "equal") {
            control = isIncluded ? (
              <Money cents={shareCents} currency={currency} className="font-headline text-base font-bold text-on-surface" />
            ) : null;
          } else if (splitType === "exact") {
            const row = exactRows.find((candidate) => candidate.member.id === member.id)!;
            const flagged = row.isInvalid || (row.isSelected && row.needsAmount);

            control = (
              <label
                className={cn(
                  "flex min-h-11 w-32 items-center gap-1.5 rounded-xl border bg-surface-container-lowest px-3 transition focus-within:border-primary/50",
                  flagged ? "border-secondary/50" : "border-white/8",
                  !isIncluded && "opacity-50",
                )}
              >
                <span className="text-sm text-on-surface-variant">{getCurrencyToken(currency)}</span>
                <input
                  value={row.input}
                  onChange={(event) => state.setExactInput(member.id, event.target.value)}
                  placeholder="0.00"
                  inputMode="decimal"
                  enterKeyHint="next"
                  disabled={!isIncluded}
                  aria-label={`Amount for ${name}`}
                  aria-invalid={flagged ? "true" : undefined}
                  className="w-full min-w-0 border-none bg-transparent p-0 text-right font-headline text-base font-bold tabular-nums text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none disabled:cursor-not-allowed"
                />
              </label>
            );
          } else {
            const row = shareRows.find((candidate) => candidate.member.id === member.id)!;
            const flagged = row.isInvalid || (row.isSelected && row.needsAmount);
            const current = Number.isFinite(row.parsedShare) ? row.parsedShare : 0;

            if (isIncluded) {
              meta = <Money cents={shareCents} currency={currency} />;
            }

            control = (
              <div
                className={cn(
                  "flex items-center rounded-xl border bg-surface-container-lowest",
                  flagged ? "border-secondary/50" : "border-white/8",
                  !isIncluded && "opacity-50",
                )}
              >
                <button
                  type="button"
                  disabled={!isIncluded || current <= 1}
                  onClick={() => state.setShareInput(member.id, String(Math.max(1, Math.ceil(current) - 1)))}
                  aria-label={`One fewer share for ${name}`}
                  className={stepperButtonClass}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  value={row.input}
                  onChange={(event) => state.setShareInput(member.id, event.target.value)}
                  placeholder="1"
                  inputMode="decimal"
                  disabled={!isIncluded}
                  aria-label={`Shares for ${name}`}
                  aria-invalid={flagged ? "true" : undefined}
                  className="w-9 border-none bg-transparent p-0 text-center font-headline text-base font-bold tabular-nums text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  disabled={!isIncluded}
                  onClick={() => state.setShareInput(member.id, String(Math.floor(current) + 1))}
                  aria-label={`One more share for ${name}`}
                  className={stepperButtonClass}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            );
          }

          return (
            <li
              key={member.id}
              className={cn(
                "flex min-h-14 items-center gap-2 rounded-2xl pr-2 transition",
                isIncluded ? "bg-white/3" : "",
              )}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={isIncluded}
                onClick={() => state.toggleParticipant(member.id)}
                className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition",
                    isIncluded ? "bg-primary text-on-primary" : "ring-2 ring-inset ring-on-surface-variant/50",
                  )}
                >
                  {isIncluded ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block truncate font-headline text-base font-semibold",
                      isIncluded ? "text-on-surface" : "text-on-surface-variant",
                    )}
                  >
                    {name}
                  </span>
                  {meta ? <span className="block truncate text-xs text-on-surface-variant">{meta}</span> : null}
                </span>
              </button>
              {control ? <div className="shrink-0">{control}</div> : null}
            </li>
          );
        })}
      </ul>

      <div className="sticky -bottom-4 -mx-4 space-y-3 border-t border-white/6 bg-[#1c1b1b] px-4 pb-1 pt-3 md:-bottom-6 md:-mx-6 md:px-6">
        <SplitStatus state={state} />
        {splitError ? (
          <p role="alert" className="text-sm text-secondary">
            {splitError}
          </p>
        ) : null}
        <Button size="lg" fullWidth onClick={onClose}>
          Done
        </Button>
      </div>
    </ResponsiveDialog>
  );
}

function SplitStatus({ state }: { state: ComposerState }) {
  const { amountCents, currency, selectedIds, splitType, exactAssignedCents, exactDifferenceCents, totalShares, memberShareCents } =
    state;
  const totalCents = amountCents && amountCents > 0 ? amountCents : 0;

  if (selectedIds.length === 0) {
    return <StatusLine tone="warning">Pick at least one person</StatusLine>;
  }

  if (splitType === "equal") {
    const shares = selectedIds.map((id) => memberShareCents.get(id) ?? 0);
    const each = Math.min(...shares);
    const uneven = shares.some((cents) => cents !== each);

    return (
      <StatusLine tone="matched">
        {totalCents > 0 ? (
          <>
            {uneven ? "~" : null}
            <Money cents={each} currency={currency} className="font-semibold" /> each ·{" "}
            {selectedIds.length} {selectedIds.length === 1 ? "person" : "people"}
          </>
        ) : (
          "Enter an amount to see each share"
        )}
      </StatusLine>
    );
  }

  if (splitType === "exact") {
    if (exactDifferenceCents === null) {
      return <StatusLine tone="warning">Enter a valid total first</StatusLine>;
    }

    if (exactDifferenceCents === 0) {
      return (
        <StatusLine tone="matched">
          All <Money cents={exactAssignedCents} currency={currency} className="font-semibold" /> assigned
        </StatusLine>
      );
    }

    return (
      <StatusLine tone={exactDifferenceCents < 0 ? "warning" : "error"}>
        <Money cents={exactDifferenceCents} currency={currency} className="font-semibold" />{" "}
        {exactDifferenceCents < 0 ? "left to assign" : "over the total"}
        <span className="text-on-surface-variant">
          {" "}
          · <Money cents={exactAssignedCents} currency={currency} /> of{" "}
          <Money cents={totalCents} currency={currency} />
        </span>
      </StatusLine>
    );
  }

  return (
    <StatusLine tone={state.splitSummary.canSubmit ? "matched" : "warning"}>
      {state.splitSummary.canSubmit
        ? `${formatShareCount(totalShares)} ${totalShares === 1 ? "share" : "shares"} in total`
        : state.splitSummary.detail}
    </StatusLine>
  );
}

function formatShareCount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "");
}

function StatusLine({ tone, children }: { tone: "matched" | "warning" | "error"; children: ReactNode }) {
  return (
    <p
      aria-live="polite"
      className={cn(
        "text-sm",
        tone === "matched" ? "text-primary" : "text-secondary",
      )}
    >
      {children}
    </p>
  );
}

const linkButtonClass =
  "min-h-11 rounded-full px-3 text-sm font-semibold text-primary transition hover:bg-white/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

const stepperButtonClass =
  "flex h-11 w-10 items-center justify-center text-on-surface-variant transition hover:text-on-surface disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-xl";
