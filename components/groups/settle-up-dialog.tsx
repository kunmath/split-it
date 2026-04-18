"use client";

import { useMutation } from "convex/react";
import { ArrowRightLeft, HandCoins } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { FilledInput } from "@/components/ui/filled-input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMoneyFromCents } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SettleUpMember = {
  id: string;
  name: string;
  isCurrentUser: boolean;
};

export type SettleUpSuggestion = {
  counterpartyId: string;
  counterpartyName: string;
  amountCents: number;
  direction: "youPay" | "youReceive";
};

type SettleUpDialogProps = {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupCurrency: string;
  members: SettleUpMember[];
  suggestions: SettleUpSuggestion[];
  isMock?: boolean;
};

function parseAmountToCents(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const asNumber = Number(trimmed);
  if (!Number.isFinite(asNumber) || asNumber <= 0) {
    return null;
  }
  return Math.round(asNumber * 100);
}

export function SettleUpDialog({
  open,
  onClose,
  groupId,
  groupCurrency,
  members,
  suggestions,
  isMock = false,
}: SettleUpDialogProps) {
  const otherMembers = useMemo(
    () => members.filter((member) => !member.isCurrentUser),
    [members],
  );
  const payableSuggestions = useMemo(
    () => suggestions.filter((suggestion) => suggestion.direction === "youPay"),
    [suggestions],
  );

  const [toUserId, setToUserId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createSettlement = useMutation(api.settlements.create);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    setIsSubmitting(false);
    if (payableSuggestions.length > 0) {
      const first = payableSuggestions[0]!;
      setToUserId(first.counterpartyId);
      setAmount((first.amountCents / 100).toFixed(2));
    } else if (otherMembers.length > 0 && !toUserId) {
      setToUserId(otherMembers[0]!.id);
    }
  }, [open, payableSuggestions, otherMembers, toUserId]);

  const handleSuggestionClick = (suggestion: SettleUpSuggestion) => {
    setToUserId(suggestion.counterpartyId);
    setAmount((suggestion.amountCents / 100).toFixed(2));
    setError(null);
  };

  const handleSubmit = async () => {
    if (isMock) {
      setError("Settle Up requires a live Convex connection.");
      return;
    }
    if (!toUserId) {
      setError("Select who you paid.");
      return;
    }
    const amountCents = parseAmountToCents(amount);
    if (amountCents === null) {
      setError("Enter a valid amount greater than zero.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await createSettlement({
        groupId: groupId as Id<"groups">,
        toUserId: toUserId as Id<"users">,
        amountCents,
        note: note.trim() || undefined,
      });
      setAmount("");
      setNote("");
      onClose();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Could not record settlement.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      eyebrow="Settle Up"
      title="Record a payment"
      description="Log a payment you made outside the app (cash, UPI, Venmo, etc.) to update balances."
    >
      <div className="space-y-6">
        {suggestions.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[0.68rem] uppercase tracking-[0.22em] text-on-surface-variant">
              Suggested settlements
            </p>
            <div className="space-y-2">
              {suggestions.map((suggestion) => {
                const isPayable = suggestion.direction === "youPay";
                return (
                  <button
                    key={`${suggestion.counterpartyId}-${suggestion.direction}`}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={!isPayable}
                    className={cn(
                      "flex w-full items-center justify-between gap-4 rounded-[1.25rem] border border-white/6 bg-surface-container-low px-4 py-3 text-left transition",
                      isPayable
                        ? "hover:border-primary/40 hover:bg-surface-container-high"
                        : "cursor-not-allowed opacity-70",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl",
                          isPayable
                            ? "bg-secondary/12 text-secondary"
                            : "bg-primary/12 text-primary",
                        )}
                      >
                        {isPayable ? (
                          <HandCoins className="h-4.5 w-4.5" />
                        ) : (
                          <ArrowRightLeft className="h-4.5 w-4.5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-on-surface">
                          {isPayable
                            ? `You owe ${suggestion.counterpartyName}`
                            : `${suggestion.counterpartyName} owes you`}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {isPayable
                            ? "Tap to prefill amount"
                            : "They should record this payment"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "font-headline text-lg font-bold tracking-tight",
                        isPayable ? "text-secondary" : "text-primary",
                      )}
                    >
                      {formatMoneyFromCents(suggestion.amountCents, groupCurrency)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-[1.25rem] border border-white/6 bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
            No outstanding debts detected. You can still record a manual payment below.
          </div>
        )}

        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="block text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant">
              Paid to
            </span>
            <span className="flex min-h-14 items-center gap-3 rounded-[1.25rem] bg-surface-container-lowest px-4 ring-1 ring-white/5 transition focus-within:ring-primary/40">
              <select
                value={toUserId}
                onChange={(event) => {
                  setToUserId(event.target.value);
                  setError(null);
                }}
                className="w-full border-none bg-transparent text-sm text-on-surface focus:outline-none"
              >
                <option value="" disabled>
                  Select a member
                </option>
                {otherMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </span>
          </label>

          <FilledInput
            label={`Amount (${groupCurrency})`}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setError(null);
            }}
            prefix={<span className="text-sm">{groupCurrency}</span>}
          />

          <FilledInput
            label="Note (optional)"
            type="text"
            placeholder="e.g., UPI transfer for last weekend"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={200}
          />

          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="lg" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting || isMock}
          >
            {isSubmitting ? "Recording..." : "Record payment"}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
