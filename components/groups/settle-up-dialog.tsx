"use client";

import { useMutation } from "convex/react";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { ArrowDownLeft, ArrowUpRight, Check, ChevronDown, Plus } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { getShortName } from "@/components/groups/group-types";
import {
  applySuggestion,
  changeDirection,
  getOverpayment,
  initialSettleUpState,
  normalizeAmountInput,
  parseAmountToCents,
  selectPerson,
  typeAmount,
  type SettleUpDirection,
  type SettleUpPreset,
  type SettleUpState,
  type SettleUpSuggestion,
} from "@/components/groups/settle-up-model";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { showToast } from "@/components/ui/toast";
import { UserAvatar } from "@/components/ui/user-avatar";
import { api } from "@/convex/_generated/api";
import {
  isDuplicateSettlementErrorData,
  type DuplicateSettlementErrorData,
} from "@/convex/lib/settlementDuplicates";
import { formatMoneyFromCents } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SettleUpMember = {
  id: string;
  name: string;
  imageUrl?: string;
  isCurrentUser: boolean;
};

export type { SettleUpPreset, SettleUpSuggestion };

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

function formatRecordedDate(timestamp: number) {
  const sameYear = new Date(timestamp).getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(timestamp);
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

const DIRECTION_OPTIONS: Array<{ value: SettleUpDirection; label: string; Icon: typeof ArrowUpRight }> = [
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
  const othersId = useId();
  const overpaymentId = useId();
  const amountHintId = useId();
  const currentUser = useMemo(() => members.find((member) => member.isCurrentUser), [members]);
  const otherMembers = useMemo(
    () => members.filter((member) => !member.isCurrentUser),
    [members],
  );
  const allNames = members.map((member) => member.name);
  const shortName = (name: string) => getShortName(name, allNames);

  const [selection, setSelection] = useState<SettleUpState>(() => initialSettleUpState(suggestions, preset));
  const [note, setNote] = useState<string>("");
  const [showNote, setShowNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateSettlementErrorData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const openRef = useRef(open);
  // Counts openings, so a payment's result only touches the opening that recorded it.
  const openingRef = useRef(0);
  useEffect(() => {
    openRef.current = open;
    if (open) {
      openingRef.current += 1;
    }
  }, [open]);
  const { direction, counterpartyId, amount, showOthers } = selection;

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    setDuplicate(null);
    setNote("");
    setShowNote(false);
    setSelection(initialSettleUpState(suggestions, preset));
    // Only reset when the dialog transitions to open so the user's edits aren't
    // overwritten by live query updates while it is showing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const update = (transition: (state: SettleUpState) => SettleUpState) => {
    setSelection(transition);
    setError(null);
    setDuplicate(null);
  };

  const directionSuggestions = suggestions.filter((suggestion) => suggestion.direction === direction);
  const suggestedIds = new Set(directionSuggestions.map((suggestion) => suggestion.counterpartyId));
  const otherPeople = otherMembers.filter((member) => !suggestedIds.has(member.id));
  const hasSuggestions = directionSuggestions.length > 0;
  const chipsVisible = !hasSuggestions || showOthers;
  const chipMembers = hasSuggestions ? otherPeople : otherMembers;
  const amountCents = parseAmountToCents(amount);
  const counterparty = otherMembers.find((member) => member.id === counterpartyId);
  const isPaying = direction === "youPay";
  const currencySymbol = getCurrencySymbol(groupCurrency);

  const overpayment = getOverpayment(selection, suggestions);
  const amountUnreadable = amount.trim() !== "" && normalizeAmountInput(amount) === null;

  const handleSubmit = async ({ confirmDuplicate = false }: { confirmDuplicate?: boolean } = {}) => {
    // A ref, not state: it survives the sheet closing/reopening and blocks a double tap in the same frame.
    if (submittingRef.current) {
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

    const opening = openingRef.current;
    const isSameOpening = () => openRef.current && openingRef.current === opening;
    const name = counterparty ? shortName(counterparty.name) : "them";

    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    setDuplicate(null);
    try {
      await createSettlement(
        isPaying
          ? {
              groupId: groupId as CreateSettlementArgs["groupId"],
              toUserId: counterpartyId as CreateSettlementArgs["toUserId"],
              amountCents,
              note: note.trim() || undefined,
              confirmDuplicate: confirmDuplicate || undefined,
            }
          : {
              groupId: groupId as CreateSettlementArgs["groupId"],
              fromUserId: counterpartyId as CreateSettlementArgs["toUserId"],
              toUserId: currentUser!.id as CreateSettlementArgs["toUserId"],
              amountCents,
              note: note.trim() || undefined,
              confirmDuplicate: confirmDuplicate || undefined,
            },
      );
      showToast(`Recorded ${formatMoneyFromCents(amountCents, groupCurrency)} ${isPaying ? "to" : "from"} ${name}`);
      // A dismissed (or since reopened) sheet keeps its current draft; the toast is the confirmation.
      if (isSameOpening()) {
        setNote("");
        onClose();
      }
    } catch (caught) {
      const duplicateData =
        caught instanceof ConvexError && isDuplicateSettlementErrorData(caught.data) ? caught.data : null;
      const message = duplicateData
        ? `${name} already recorded this payment.`
        : caught instanceof ConvexError && typeof caught.data === "string"
          ? caught.data
          : caught instanceof Error
            ? caught.message
            : "Could not record settlement.";
      if (isSameOpening()) {
        if (duplicateData) {
          setDuplicate(duplicateData);
        } else {
          setError(message);
        }
      } else {
        // The sheet was dismissed while recording; don't let the failure go unnoticed.
        showToast(`Payment not recorded — ${message}`);
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const personLabel = counterparty ? `${isPaying ? "to" : "from"} ${shortName(counterparty.name)}` : null;
  const submitLabel = isSubmitting
    ? "Recording…"
    : amountCents !== null
      ? `Record ${formatMoneyFromCents(amountCents, groupCurrency)} ${personLabel ?? "payment"}`
      : personLabel
        ? `Record payment ${personLabel}`
        : "Record payment";

  return (
    <ResponsiveDialog
      open={open}
      // Closing stays possible while a payment records (a stalled save on a flaky connection must not
      // trap the user); the in-flight ref still blocks a second submission if the sheet is reopened,
      // and the success toast confirms the payment wherever the user is.
      onClose={onClose}
      className="scroll-pb-36"
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
                onClick={() => update((state) => changeDirection(state, suggestions, value))}
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

        <section aria-labelledby={memberLabelId} className="space-y-2">
          <h3 id={memberLabelId} className="text-xs font-semibold text-on-surface-variant">
            {isPaying ? "Who did you pay?" : "Who paid you?"}
          </h3>
          {hasSuggestions ? (
            <ul className="space-y-2">
              {directionSuggestions.map((suggestion) => {
                const selected = suggestion.counterpartyId === counterpartyId;
                return (
                  <li key={`${suggestion.counterpartyId}-${suggestion.direction}`}>
                    <button
                      type="button"
                      onClick={() => update((state) => applySuggestion(state, suggestion))}
                      aria-pressed={selected}
                      className={cn(
                        "flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-1.5 text-left ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
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
                          {shortName(suggestion.counterpartyName)}
                        </span>
                        <span className="block truncate text-xs text-on-surface-variant">
                          {isPaying ? "you owe them" : "owes you"}
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
          ) : (
            <p className="text-sm text-on-surface-variant">
              {isPaying ? "You don't owe anyone here right now." : "No one owes you here right now."}
            </p>
          )}

          {hasSuggestions && otherPeople.length > 0 ? (
            <button
              type="button"
              aria-expanded={showOthers}
              aria-controls={othersId}
              onClick={() => setSelection((state) => ({ ...state, showOthers: !state.showOthers }))}
              className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              Someone else
              <ChevronDown aria-hidden="true" className={cn("h-4 w-4 transition", showOthers && "rotate-180")} />
            </button>
          ) : null}

          {otherMembers.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Invite someone to this group to record payments.</p>
          ) : chipsVisible && chipMembers.length > 0 ? (
            <div id={othersId} role="group" aria-label={hasSuggestions ? "Someone else" : undefined} className="flex flex-wrap gap-2">
              {chipMembers.map((member) => {
                const selected = member.id === counterpartyId;
                return (
                  <button
                    key={member.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => update((state) => selectPerson(state, suggestions, member.id))}
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
          ) : null}
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
              aria-invalid={amountUnreadable || (error && amountCents === null) ? true : undefined}
              aria-describedby={amountUnreadable ? amountHintId : overpayment ? overpaymentId : undefined}
              onChange={(event) => {
                const value = event.target.value;
                update((state) => typeAmount(state, value));
              }}
              className="w-full min-w-0 border-none bg-transparent font-headline text-2xl font-bold tabular-nums text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
            />
          </div>
          {amountUnreadable ? (
            <p id={amountHintId} className="text-xs text-error">
              Enter a positive amount like 1,200.50.
            </p>
          ) : overpayment && counterparty ? (
            <p id={overpaymentId} className="text-xs text-on-surface-variant">
              <OverpaymentHint
                excessCents={overpayment.excessCents}
                currency={groupCurrency}
                name={shortName(counterparty.name)}
                isPaying={isPaying}
              />
            </p>
          ) : null}
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

        {duplicate && counterparty && amountCents !== null ? (
          <div className="space-y-3 rounded-2xl bg-secondary/10 px-4 py-3 text-sm text-on-surface" role="alert">
            <p>
              {shortName(counterparty.name)} already recorded{" "}
              <Money cents={amountCents} currency={groupCurrency} className="font-semibold" />{" "}
              {isPaying ? "from you" : "to you"} on {formatRecordedDate(duplicate.recordedAt)}. Record it only if this
              is a separate payment.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" size="md" onClick={() => setDuplicate(null)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="ghost"
                size="md"
                disabled={isSubmitting}
                onClick={() => void handleSubmit({ confirmDuplicate: true })}
                className="border-secondary/40 text-secondary hover:bg-secondary/20 hover:text-secondary"
              >
                Record anyway
              </Button>
            </div>
          </div>
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
              : "Balances update for everyone as soon as it's recorded."}
          </p>
        </div>
      </form>
    </ResponsiveDialog>
  );
}

function OverpaymentHint({
  excessCents,
  currency,
  name,
  isPaying,
}: {
  excessCents: number;
  currency: string;
  name: string;
  isPaying: boolean;
}) {
  const excess = <Money cents={excessCents} currency={currency} className="font-semibold text-on-surface" />;

  return isPaying ? (
    <>
      {excess} more than you owe {name} — {name} will then owe you that.
    </>
  ) : (
    <>
      {excess} more than {name} owes you — you&apos;ll then owe {name} that.
    </>
  );
}
