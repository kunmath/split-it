"use client";

import { useMutation } from "convex/react";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { ArrowDownLeft, ArrowUpRight, Check, Plus } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import { getShortName } from "@/components/groups/group-types";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { UserAvatar } from "@/components/ui/user-avatar";
import { api } from "@/convex/_generated/api";
import { formatMoneyFromCents } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SettleUpMember = {
  id: string;
  name: string;
  imageUrl?: string;
  isCurrentUser: boolean;
};

export type SettleUpSuggestion = {
  counterpartyId: string;
  counterpartyName: string;
  counterpartyImageUrl?: string;
  amountCents: number;
  direction: "youPay" | "youReceive";
};

export type SettleUpPreset = {
  counterpartyId: string;
  direction: SettleUpSuggestion["direction"];
};

type SettleUpDialogProps = {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupCurrency: string;
  members: SettleUpMember[];
  suggestions: SettleUpSuggestion[];
  /** Preselect a counterparty (and the matching suggestion amount, if any) when the dialog opens. */
  preset?: SettleUpPreset | null;
  isMock?: boolean;
};

type CreateSettlementArgs = FunctionArgs<typeof api.settlements.create>;
type CreateSettlement = (
  args: CreateSettlementArgs,
) => Promise<FunctionReturnType<typeof api.settlements.create>>;

type Direction = SettleUpSuggestion["direction"];

const AMOUNT_PATTERN = /^\d+(?:\.\d{1,2})?$/;

function parseAmountToCents(value: string) {
  const trimmed = value.trim();
  if (!trimmed || !AMOUNT_PATTERN.test(trimmed)) {
    return null;
  }
  const [wholePart, fractionalPart = ""] = trimmed.split(".");
  const wholeCents = Number(wholePart) * 100;
  const fractionalCents = Number(fractionalPart.padEnd(2, "0"));
  const totalCents = wholeCents + fractionalCents;
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    return null;
  }
  return totalCents;
}

function getCurrencySymbol(currency: string) {
  try {
    return (
      new Intl.NumberFormat("en-IN", { style: "currency", currency })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ?? currency
    );
  } catch {
    return currency;
  }
}

export function SettleUpDialog({
  isMock = false,
  ...props
}: SettleUpDialogProps) {
  if (isMock) {
    return <SettleUpDialogScene {...props} isMock />;
  }

  return <LiveSettleUpDialog {...props} />;
}

function LiveSettleUpDialog(props: Omit<SettleUpDialogProps, "isMock">) {
  const createSettlement = useMutation(api.settlements.create);

  return <SettleUpDialogScene {...props} createSettlement={createSettlement} />;
}

const DIRECTION_OPTIONS: Array<{ value: Direction; label: string; Icon: typeof ArrowUpRight }> = [
  { value: "youPay", label: "I paid someone", Icon: ArrowUpRight },
  { value: "youReceive", label: "Someone paid me", Icon: ArrowDownLeft },
];

function SettleUpDialogScene({
  open,
  onClose,
  groupId,
  groupCurrency,
  members,
  suggestions,
  preset,
  isMock = false,
  createSettlement,
}: SettleUpDialogProps & {
  createSettlement?: CreateSettlement;
}) {
  const amountId = useId();
  const noteId = useId();
  const memberLabelId = useId();
  const currentUser = useMemo(() => members.find((member) => member.isCurrentUser), [members]);
  const otherMembers = useMemo(
    () => members.filter((member) => !member.isCurrentUser),
    [members],
  );
  const allNames = members.map((member) => member.name);
  const shortName = (name: string) => getShortName(name, allNames);

  const [direction, setDirection] = useState<Direction>("youPay");
  const [counterpartyId, setCounterpartyId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [showNote, setShowNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    setIsSubmitting(false);
    setNote("");
    setShowNote(false);

    const presetSuggestion = preset
      ? suggestions.find(
          (suggestion) =>
            suggestion.counterpartyId === preset.counterpartyId &&
            suggestion.direction === preset.direction,
        )
      : undefined;
    const initial =
      presetSuggestion ??
      (preset ? undefined : suggestions.find((suggestion) => suggestion.direction === "youPay") ?? suggestions[0]);

    if (initial) {
      setDirection(initial.direction);
      setCounterpartyId(initial.counterpartyId);
      setAmount((initial.amountCents / 100).toFixed(2));
    } else {
      setDirection(preset?.direction ?? "youPay");
      setCounterpartyId(preset?.counterpartyId ?? "");
      setAmount("");
    }
    // Only reset when the dialog transitions to open so the user's edits aren't
    // overwritten by live query updates while it is showing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const directionSuggestions = suggestions.filter((suggestion) => suggestion.direction === direction);
  const amountCents = parseAmountToCents(amount);
  const counterparty = otherMembers.find((member) => member.id === counterpartyId);
  const isPaying = direction === "youPay";
  const currencySymbol = getCurrencySymbol(groupCurrency);

  const changeDirection = (next: Direction) => {
    if (next === direction) {
      return;
    }
    setDirection(next);
    setError(null);
    const match = suggestions.find((suggestion) => suggestion.direction === next);
    if (match) {
      setCounterpartyId(match.counterpartyId);
      setAmount((match.amountCents / 100).toFixed(2));
    } else {
      setAmount("");
    }
  };

  const applySuggestion = (suggestion: SettleUpSuggestion) => {
    setCounterpartyId(suggestion.counterpartyId);
    setAmount((suggestion.amountCents / 100).toFixed(2));
    setError(null);
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }
    if (!createSettlement) {
      setError("Recording a payment needs a live account connection.");
      return;
    }
    if (!counterpartyId) {
      setError(isPaying ? "Select who you paid." : "Select who paid you.");
      return;
    }
    if (amountCents === null) {
      setError("Enter a valid amount greater than zero.");
      return;
    }
    if (!isPaying && !currentUser) {
      setError("Could not identify your membership in this group.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await createSettlement(
        isPaying
          ? {
              groupId: groupId as CreateSettlementArgs["groupId"],
              toUserId: counterpartyId as CreateSettlementArgs["toUserId"],
              amountCents,
              note: note.trim() || undefined,
            }
          : {
              groupId: groupId as CreateSettlementArgs["groupId"],
              fromUserId: counterpartyId as CreateSettlementArgs["toUserId"],
              toUserId: currentUser!.id as CreateSettlementArgs["toUserId"],
              amountCents,
              note: note.trim() || undefined,
            },
      );
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

  const submitLabel = isSubmitting
    ? "Recording…"
    : amountCents !== null
      ? `Record ${formatMoneyFromCents(amountCents, groupCurrency)} payment`
      : "Record payment";

  const summary =
    counterparty && amountCents !== null
      ? isPaying
        ? `You paid ${shortName(counterparty.name)} ${formatMoneyFromCents(amountCents, groupCurrency)}`
        : `${shortName(counterparty.name)} paid you ${formatMoneyFromCents(amountCents, groupCurrency)}`
      : null;

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title="Settle up"
      description="Record cash, UPI or bank transfers."
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <div
          role="radiogroup"
          aria-label="Payment direction"
          className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-container-lowest p-1 ring-1 ring-white/5"
        >
          {DIRECTION_OPTIONS.map(({ value, label, Icon }) => {
            const active = value === direction;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => changeDirection(value)}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  active
                    ? "bg-surface-container-high text-on-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                <Icon className={cn("h-4 w-4", active && (value === "youPay" ? "text-secondary" : "text-primary"))} />
                {label}
              </button>
            );
          })}
        </div>

        {directionSuggestions.length > 0 ? (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-on-surface-variant">Suggested</h3>
            <ul className="space-y-2">
              {directionSuggestions.map((suggestion) => {
                const selected =
                  suggestion.counterpartyId === counterpartyId &&
                  amountCents === suggestion.amountCents;
                return (
                  <li key={`${suggestion.counterpartyId}-${suggestion.direction}`}>
                    <button
                      type="button"
                      onClick={() => applySuggestion(suggestion)}
                      aria-pressed={selected}
                      className={cn(
                        "flex min-h-13 w-full items-center gap-3 rounded-2xl px-3 py-1.5 text-left ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                        selected
                          ? "bg-primary/10 ring-primary/40"
                          : "bg-surface-container-low ring-white/5 hover:bg-surface-container-high",
                      )}
                    >
                      <UserAvatar
                        name={suggestion.counterpartyName}
                        imageUrl={suggestion.counterpartyImageUrl}
                        className="h-9 w-9 text-xs"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-on-surface">
                          {isPaying
                            ? `You owe ${shortName(suggestion.counterpartyName)}`
                            : `${shortName(suggestion.counterpartyName)} owes you`}
                        </span>
                      </span>
                      <Money
                        cents={suggestion.amountCents}
                        currency={groupCurrency}
                        tone={isPaying ? "negative" : "positive"}
                        className="font-headline text-base font-bold"
                      />
                      {selected ? <Check aria-hidden="true" className="h-4 w-4 text-primary" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <p className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
            {isPaying
              ? "You don't owe anyone here right now. You can still record a payment."
              : "No one owes you here right now. You can still record a payment."}
          </p>
        )}

        <section className="space-y-2">
          <h3 id={memberLabelId} className="text-xs font-semibold text-on-surface-variant">
            {isPaying ? "Who did you pay?" : "Who paid you?"}
          </h3>
          {otherMembers.length > 0 ? (
            <div role="radiogroup" aria-labelledby={memberLabelId} className="flex flex-wrap gap-2">
              {otherMembers.map((member) => {
                const selected = member.id === counterpartyId;
                return (
                  <button
                    key={member.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setCounterpartyId(member.id);
                      setError(null);
                    }}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-sm font-medium ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                      selected
                        ? "bg-primary/12 text-on-surface ring-primary/50"
                        : "bg-surface-container-low text-on-surface-variant ring-white/6 hover:text-on-surface",
                    )}
                  >
                    <UserAvatar name={member.name} imageUrl={member.imageUrl} className="h-8 w-8 text-[0.65rem]" />
                    {shortName(member.name)}
                    {selected ? <Check aria-hidden="true" className="h-3.5 w-3.5 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">Invite someone to this group to record payments.</p>
          )}
        </section>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={amountId} className="block text-xs font-semibold text-on-surface-variant">
              Amount
            </label>
            {showNote ? null : (
              <button
                type="button"
                onClick={() => setShowNote(true)}
                className="-my-3 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                Add a note
              </button>
            )}
          </div>
          <div className="flex min-h-14 items-center gap-2 rounded-2xl bg-surface-container-lowest px-4 ring-1 ring-white/5 transition focus-within:ring-primary/50">
            <span aria-hidden="true" className="font-headline text-xl font-bold text-on-surface-variant">
              {currencySymbol}
            </span>
            <input
              id={amountId}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amount}
              aria-invalid={error && amountCents === null ? true : undefined}
              onChange={(event) => {
                setAmount(event.target.value.replace(/[^\d.]/g, ""));
                setError(null);
              }}
              className="w-full min-w-0 border-none bg-transparent font-headline text-2xl font-bold tabular-nums text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
            />
          </div>
        </div>

        {showNote ? (
          <div className="space-y-2">
            <label htmlFor={noteId} className="block text-xs font-semibold text-on-surface-variant">
              Note (optional)
            </label>
            <input
              id={noteId}
              type="text"
              placeholder="e.g. UPI for groceries"
              value={note}
              maxLength={200}
              autoFocus
              onChange={(event) => setNote(event.target.value)}
              className="min-h-12 w-full rounded-2xl bg-surface-container-lowest px-4 text-sm text-on-surface ring-1 ring-white/5 placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-primary/50"
            />
          </div>
        ) : null}

        {error ? (
          <p className="rounded-2xl bg-error/10 px-4 py-3 text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="sticky bottom-0 -mx-5 -mb-5 space-y-2 bg-[linear-gradient(180deg,rgba(28,27,27,0.6),rgba(28,27,27,0.98)_16px)] px-5 pb-5 pt-4 md:static md:mx-0 md:mb-0 md:bg-none md:p-0">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isSubmitting || isMock || otherMembers.length === 0}
          >
            {submitLabel}
          </Button>
          <p className="text-center text-xs text-on-surface-variant" aria-live="polite">
            {isMock
              ? "Demo data — payments can't be recorded here."
              : summary ?? "Balances update for everyone as soon as it's recorded."}
          </p>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
