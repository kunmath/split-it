"use client";

import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  NotebookPen,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { ComposerDateSheet } from "@/components/expenses/composer-date-sheet";
import { ComposerHeader } from "@/components/expenses/composer-header";
import {
  formatDateChipLabel,
  getCurrencyToken,
  guessExpenseIconKey,
  type ComposerSceneData,
  type ExpenseDraft,
  type FormErrors,
} from "@/components/expenses/composer-model";
import { ComposerPayerSheet } from "@/components/expenses/composer-payer-sheet";
import { ComposerSplitSheet } from "@/components/expenses/composer-split-sheet";
import { useComposerState, type ComposerState } from "@/components/expenses/use-composer-state";
import { useExitComposer } from "@/components/expenses/use-exit-composer";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useHistoryLayer } from "@/components/ui/use-history-layer";
import { useKeyboardInset } from "@/components/ui/use-keyboard-inset";
import { iconMap } from "@/lib/icon-map";
import { cn } from "@/lib/utils";

type SheetName = "payer" | "split" | "date" | "delete" | "discard" | null;

type ExpenseComposerSceneProps = {
  data: ComposerSceneData;
  onSaveExpense?: (draft: ExpenseDraft) => Promise<void>;
  onDeleteExpense?: () => Promise<void>;
};

export function ExpenseComposerScene({ data, onSaveExpense, onDeleteExpense }: ExpenseComposerSceneProps) {
  const state = useComposerState({ data, onSaveExpense, onDeleteExpense });
  const [openSheet, setOpenSheet] = useState<SheetName>(null);
  const [showNotes, setShowNotes] = useState(Boolean(data.expense?.notes));
  const amountRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const keyboardInset = useKeyboardInset();
  const exitComposer = useExitComposer(data.groupId);
  const [leaving, setLeaving] = useState(false);
  const closeSheet = () => setOpenSheet(null);
  const isBusy = state.isSaving || state.isDeleting;
  const guardDraft = state.isDirty && !leaving;

  function leaveComposer() {
    setLeaving(true);
    exitComposer();
  }

  function requestClose() {
    // Leaving mid-save would drop the draft and its error if the save then fails, so Close waits for it.
    if (state.isSaving) {
      return;
    }

    if (state.isDirty && !state.isDeleting) {
      setOpenSheet("discard");
      return;
    }

    leaveComposer();
  }

  // The composer owns a history entry from mount, so it always sits *below* any sheet opened later:
  // Back closes the top sheet first, then lands here — a dirty draft asks before discarding, a clean
  // one simply leaves.
  const handleGuardPop = () => {
    if (isBusy) {
      return;
    }
    if (state.isDirty) {
      setOpenSheet("discard");
      return;
    }
    leaveComposer();
  };
  useHistoryLayer(!leaving && openSheet !== "discard", handleGuardPop);

  useEffect(() => {
    if (!guardDraft) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [guardDraft]);

  const { fieldErrors, isEditMode, currency } = state;
  const CategoryIcon = (() => {
    const key = guessExpenseIconKey(state.description);
    return key ? iconMap[key] : ReceiptText;
  })();

  function focusFirstError(errors: FormErrors) {
    if (errors.amount) {
      amountRef.current?.focus();
    } else if (errors.description) {
      descriptionRef.current?.focus();
    } else if (errors.payer) {
      setOpenSheet("payer");
    } else if (errors.participants || errors.exactShares || errors.shares) {
      setOpenSheet("split");
    } else if (errors.expenseAt) {
      setOpenSheet("date");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = await state.submit();

    if (errors) {
      focusFirstError(errors);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="mx-auto w-full max-w-2xl pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0"
      >
        <ComposerHeader
          title={isEditMode ? "Edit expense" : "Add expense"}
          onClose={requestClose}
          closeDisabled={state.isSaving}
        />

        <div className="lg:mt-6 lg:rounded-3xl lg:bg-surface-container-low lg:p-8 lg:ring-1 lg:ring-white/5">
          <p className="mt-3 truncate text-sm text-on-surface-variant lg:mt-0">
            in <span className="font-semibold text-on-surface">{data.groupName}</span>
          </p>

          <div className="mt-6">
            <label htmlFor="expense-amount" className="text-xs font-semibold text-on-surface-variant">
              Amount
            </label>
            <div
              className={cn(
                "mt-1 flex items-baseline gap-2 border-b-2 pb-2 transition",
                fieldErrors.amount ? "border-secondary" : "border-white/10 focus-within:border-primary",
              )}
            >
              <span aria-hidden="true" className="font-headline text-3xl font-bold text-on-surface-variant">
                {getCurrencyToken(currency)}
              </span>
              <input
                id="expense-amount"
                ref={amountRef}
                value={state.amountInput}
                onChange={(event) => state.setAmountInput(event.target.value)}
                onKeyDown={(event) => {
                  // The decimal keypad's return key moves on to the description instead of submitting early.
                  if (event.key === "Enter" && !state.description.trim()) {
                    event.preventDefault();
                    descriptionRef.current?.focus();
                  }
                }}
                placeholder="0.00"
                inputMode="decimal"
                enterKeyHint="next"
                autoComplete="off"
                autoFocus={!isEditMode}
                aria-invalid={fieldErrors.amount ? "true" : undefined}
                aria-describedby={fieldErrors.amount ? "expense-amount-error" : undefined}
                className="w-full min-w-0 border-none bg-transparent p-0 font-headline text-5xl font-extrabold tabular-nums tracking-tight text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none lg:text-6xl"
              />
            </div>
            <FieldError id="expense-amount-error">{fieldErrors.amount}</FieldError>
          </div>

          <div className="mt-5">
            <div
              className={cn(
                "flex items-center gap-3 rounded-2xl bg-surface-container-low px-3 py-1.5 ring-1 transition lg:bg-surface-container",
                fieldErrors.description ? "ring-secondary/60" : "ring-white/6 focus-within:ring-primary/50",
              )}
            >
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
              >
                <CategoryIcon className="h-5 w-5" />
              </span>
              <input
                ref={descriptionRef}
                value={state.description}
                onChange={(event) => state.setDescription(event.target.value)}
                placeholder="What was it for?"
                aria-label="Description"
                autoCapitalize="sentences"
                autoComplete="off"
                enterKeyHint="done"
                aria-invalid={fieldErrors.description ? "true" : undefined}
                aria-describedby={fieldErrors.description ? "expense-description-error" : undefined}
                className="min-h-12 w-full min-w-0 border-none bg-transparent p-0 text-lg text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none"
              />
            </div>
            <FieldError id="expense-description-error">{fieldErrors.description}</FieldError>
          </div>

          <SplitSentence state={state} onOpenPayer={() => setOpenSheet("payer")} onOpenSplit={() => setOpenSheet("split")} />

          <div className="mt-5 flex flex-wrap gap-2">
            <ChipButton
              onClick={() => setOpenSheet("date")}
              icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
              tone={fieldErrors.expenseAt ? "warning" : "default"}
              ariaLabel={`Date: ${formatDateChipLabel(state.expenseDate)}. Change date`}
            >
              {formatDateChipLabel(state.expenseDate)}
            </ChipButton>
            <ChipButton
              onClick={() => setShowNotes((current) => !current)}
              icon={<NotebookPen className="h-4 w-4" aria-hidden="true" />}
              ariaExpanded={showNotes}
              active={Boolean(state.notes.trim())}
            >
              {state.notes.trim() ? "Note" : "Add note"}
            </ChipButton>
          </div>
          <FieldError>{fieldErrors.expenseAt}</FieldError>

          {showNotes ? (
            <textarea
              value={state.notes}
              onChange={(event) => state.setNotes(event.target.value)}
              rows={3}
              autoFocus={!state.notes}
              aria-label="Note"
              placeholder="Add details for the group (optional)"
              className="mt-3 w-full resize-none rounded-2xl border border-white/8 bg-surface-container-low px-4 py-3 text-base text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary/50 focus:outline-none lg:bg-surface-container"
            />
          ) : null}

          {state.formError ? (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-secondary/10 px-4 py-3 text-sm text-secondary">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {state.formError}
            </p>
          ) : null}


          <div
            style={keyboardInset > 0 ? { bottom: keyboardInset } : undefined}
            className={cn(
              "glass-panel fixed inset-x-0 bottom-0 z-30 border-t border-white/6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-3",
              keyboardInset > 0 && "pb-3",
              "lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none",
            )}
          >
            <div className="mx-auto max-w-2xl">
              <Button type="submit" size="lg" fullWidth disabled={!state.canPersist}>
                {state.isSaving ? "Saving…" : isEditMode ? "Save changes" : "Save expense"}
              </Button>
            </div>
          </div>
          {isEditMode ? (
            <div className="mt-10 border-t border-white/6 pt-4 lg:mt-6">
              <button
                type="button"
                onClick={() => setOpenSheet("delete")}
                disabled={state.isSaving || state.isDeleting || !onDeleteExpense}
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-secondary transition hover:bg-secondary/10 disabled:opacity-50 -ml-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete expense
              </button>
            </div>
          ) : null}
        </div>
      </form>

      <ComposerPayerSheet
        open={openSheet === "payer"}
        onClose={closeSheet}
        members={state.members}
        paidById={state.paidById}
        onSelect={state.selectPayer}
      />
      <ComposerSplitSheet open={openSheet === "split"} onClose={closeSheet} state={state} />
      {openSheet === "date" ? (
        <ComposerDateSheet
          open
          onClose={closeSheet}
          value={state.expenseDate}
          onChange={state.setExpenseDate}
          error={fieldErrors.expenseAt}
        />
      ) : null}
      <ResponsiveDialog
        open={openSheet === "delete"}
        onClose={closeSheet}
        tone="danger"
        size="compact"
        title="Delete this expense?"
        description="It will be removed from the group and everyone's balances will update."
      >
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" size="lg" onClick={closeSheet} data-autofocus>
            Keep it
          </Button>
          <Button
            variant="ghost"
            size="lg"
            disabled={state.isDeleting}
            onClick={async () => {
              await state.deleteExpense();
            }}
            className="border-secondary/40 bg-secondary/10 text-secondary hover:bg-secondary/20 hover:text-secondary"
          >
            {state.isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
        {state.formError ? <p className="text-sm text-secondary">{state.formError}</p> : null}
      </ResponsiveDialog>
      <ResponsiveDialog
        open={openSheet === "discard"}
        onClose={closeSheet}
        size="compact"
        title={isEditMode ? "Discard your changes?" : "Discard this expense?"}
        description={isEditMode ? "Your edits won't be saved." : "What you've entered won't be saved."}
      >
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" size="lg" onClick={closeSheet} data-autofocus>
            Keep editing
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              closeSheet();
              leaveComposer();
            }}
            className="border-secondary/40 bg-secondary/10 text-secondary hover:bg-secondary/20 hover:text-secondary"
          >
            Discard
          </Button>
        </div>
      </ResponsiveDialog>
    </>
  );
}

function SplitSentence({
  state,
  onOpenPayer,
  onOpenSplit,
}: {
  state: ComposerState;
  onOpenPayer: () => void;
  onOpenSplit: () => void;
}) {
  const { payer, selectedIds, splitType, splitSummary, fieldErrors, members } = state;
  const payerLabel = payer ? (payer.isCurrentUser ? "you" : payer.name.split(" ")[0]) : "choose";
  const modeLabel = splitType === "equal" ? "equally" : splitType === "exact" ? "by amount" : "by shares";
  const splitProblem =
    splitSummary.problem ??
    (fieldErrors.exactShares || fieldErrors.shares ? "needs a fix" : null);
  const peopleLabel =
    selectedIds.length === 0
      ? "nobody"
      : selectedIds.length === members.length && members.length > 2
        ? `all ${selectedIds.length}`
        : selectedIds.length === 1
          ? selectedIds[0] === members.find((member) => member.isCurrentUser)?.id
            ? "just you"
            : "1 person"
          : `${selectedIds.length} people`;
  const peopleProblem = selectedIds.length === 0 || Boolean(fieldErrors.participants);

  return (
    <div className="mt-6">
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-base leading-tight text-on-surface-variant">
        <span>Paid by</span>
        <SentenceToken
          onClick={onOpenPayer}
          warning={Boolean(fieldErrors.payer) || !payer}
          ariaLabel={`Paid by ${payer ? (payer.isCurrentUser ? "you" : payer.name) : "nobody yet"}. Change payer`}
        >
          {payerLabel}
        </SentenceToken>
        <span>and split</span>
        <SentenceToken
          onClick={onOpenSplit}
          warning={Boolean(splitProblem) && selectedIds.length > 0}
          ariaLabel={`Split ${modeLabel}${splitProblem ? `, ${splitProblem}` : ""}. Change split`}
        >
          {modeLabel}
        </SentenceToken>
        <span>among</span>
        <SentenceToken
          onClick={onOpenSplit}
          warning={peopleProblem}
          ariaLabel={`Split among ${peopleLabel}. Change who is included`}
        >
          {peopleLabel}
        </SentenceToken>
      </p>
      <SplitOutcome state={state} />
    </div>
  );
}

/** "₹200.00 each · you lent ₹1,000.00", or what's blocking the save. */
function SplitOutcome({ state }: { state: ComposerState }) {
  const { amountCents, currency, members, payer, selectedIds, splitType, splitSummary, memberShareCents, fieldErrors } =
    state;
  const splitError = fieldErrors.payer ?? fieldErrors.participants ?? fieldErrors.exactShares ?? fieldErrors.shares;

  if (splitError) {
    return <OutcomeLine tone="warning">{splitError}</OutcomeLine>;
  }

  if (!splitSummary.canSubmit && splitSummary.detail && amountCents !== null) {
    return <OutcomeLine tone="warning">{splitSummary.detail}</OutcomeLine>;
  }

  if (!amountCents || amountCents <= 0 || !payer || selectedIds.length === 0) {
    return null;
  }

  const me = members.find((member) => member.isCurrentUser);
  const myShareCents = me ? memberShareCents.get(me.id) ?? 0 : 0;
  const isIncluded = me ? selectedIds.includes(me.id) : false;
  const selectedShares = selectedIds.map((id) => memberShareCents.get(id) ?? 0);
  const each = Math.min(...selectedShares);
  const isUneven = selectedShares.some((cents) => cents !== each);
  const showEach = splitType === "equal" && selectedIds.length > 1;
  let standing: ReactNode;

  if (me && payer.id === me.id) {
    const lentCents = amountCents - myShareCents;
    standing =
      lentCents > 0 ? (
        <span className="text-primary">
          you lent <Money cents={lentCents} currency={currency} className="font-semibold" />
        </span>
      ) : (
        <span>only you are in this split</span>
      );
  } else if (isIncluded) {
    standing = (
      <span className="text-secondary">
        you owe {payer.name.split(" ")[0]} <Money cents={myShareCents} currency={currency} className="font-semibold" />
      </span>
    );
  } else {
    standing = <span>you&apos;re not involved</span>;
  }

  return (
    <OutcomeLine>
      {showEach ? (
        <>
          {isUneven ? "~" : null}
          <Money cents={each} currency={currency} className="font-semibold text-on-surface" /> each ·{" "}
        </>
      ) : null}
      {standing}
    </OutcomeLine>
  );
}

function OutcomeLine({ tone = "default", children }: { tone?: "default" | "warning"; children: ReactNode }) {
  return (
    <p
      aria-live="polite"
      className={cn(
        "mt-3 flex items-start gap-1.5 text-sm",
        tone === "warning" ? "text-secondary" : "text-on-surface-variant",
      )}
    >
      {tone === "warning" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      <span>{children}</span>
    </p>
  );
}

function SentenceToken({
  children,
  onClick,
  warning = false,
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  warning?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      className={cn(
        "inline-flex min-h-11 max-w-full items-center gap-1 rounded-full px-3.5 font-headline text-base font-semibold ring-1 transition focus-visible:outline-none focus-visible:ring-2",
        warning
          ? "bg-secondary/12 text-secondary ring-secondary/40 hover:bg-secondary/18 focus-visible:ring-secondary"
          : "bg-primary/10 text-primary ring-primary/25 hover:bg-primary/15 focus-visible:ring-primary",
      )}
    >
      {warning ? <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      <span className="truncate">{children}</span>
      <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
    </button>
  );
}

function ChipButton({
  children,
  icon,
  onClick,
  tone = "default",
  active = false,
  ariaLabel,
  ariaExpanded,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
  tone?: "default" | "warning";
  active?: boolean;
  ariaLabel?: string;
  ariaExpanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        tone === "warning"
          ? "bg-secondary/12 text-secondary ring-secondary/40"
          : active
            ? "bg-primary/10 text-primary ring-primary/25"
            : "bg-white/5 text-on-surface ring-white/8 hover:bg-white/8",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) {
    return null;
  }

  return (
    <p id={id} role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-secondary">
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}
