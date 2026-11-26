"use client";

import { useState } from "react";

import {
  buildEqualSharePreview,
  buildExactRows,
  buildInitialExactInputs,
  buildInitialShareInputs,
  buildShareRows,
  buildSharesPreview,
  deriveSplitSummary,
  formatCentsForInput,
  formatDateInputValue,
  getTodayDateInputValue,
  parseAmountInputToCents,
  toExpenseTimestamp,
  type ComposerSceneData,
  type ExpenseDraft,
  type FormErrors,
  type SplitType,
} from "@/components/expenses/composer-model";

type UseComposerStateOptions = {
  data: ComposerSceneData;
  onSaveExpense?: (draft: ExpenseDraft) => Promise<void>;
  onDeleteExpense?: () => Promise<void>;
};

export function useComposerState({ data, onSaveExpense, onDeleteExpense }: UseComposerStateOptions) {
  const existingExpense = data.expense;
  const isEditMode = existingExpense !== null;
  const defaultPayerId =
    existingExpense?.paidBy ??
    data.members.find((member) => member.isCurrentUser)?.id ??
    data.members[0]?.id ??
    "";

  const [amountInput, setAmountInputState] = useState(
    existingExpense ? formatCentsForInput(existingExpense.amountCents) : "",
  );
  const [description, setDescriptionState] = useState(existingExpense?.description ?? "");
  const [notes, setNotesState] = useState(existingExpense?.notes ?? "");
  const [expenseDate, setExpenseDateState] = useState(
    existingExpense ? formatDateInputValue(existingExpense.expenseAt) : getTodayDateInputValue(),
  );
  const [paidById, setPaidById] = useState(defaultPayerId);
  const [splitType, setSplitTypeState] = useState<SplitType>(existingExpense?.splitType ?? "equal");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState(
    () => existingExpense?.shares.map((share) => share.userId) ?? data.members.map((member) => member.id),
  );
  const [exactShareInputs, setExactShareInputs] = useState<Record<string, string>>(() =>
    buildInitialExactInputs(data.members, existingExpense?.shares ?? []),
  );
  const [shareInputs, setShareInputs] = useState<Record<string, string>>(() =>
    buildInitialShareInputs(data.members, existingExpense?.shares ?? []),
  );
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const amountCents = parseAmountInputToCents(amountInput);
  const hasInvalidAmount = amountCents === null;
  const positiveAmountCents = amountCents && amountCents > 0 ? amountCents : 0;
  const orderedSelectedParticipantIds = data.members
    .filter((member) => selectedParticipantIds.includes(member.id))
    .map((member) => member.id);
  const sharePreview = buildEqualSharePreview(positiveAmountCents, orderedSelectedParticipantIds);
  const payer = data.members.find((member) => member.id === paidById) ?? null;

  const exactRows = buildExactRows(data.members, exactShareInputs, orderedSelectedParticipantIds);
  const exactAssignedCents = exactRows.reduce(
    (sum, row) => (row.isSelected ? sum + row.shareCents : sum),
    0,
  );
  const exactDifferenceCents =
    hasInvalidAmount || amountCents === null ? null : exactAssignedCents - amountCents;
  const exactShareRows = exactRows
    .filter((row) => row.isSelected && row.shareCents > 0)
    .map((row) => ({ userId: row.member.id, shareCents: row.shareCents }));

  const shareRows = buildShareRows(data.members, shareInputs, orderedSelectedParticipantIds);
  const totalShares = shareRows.reduce((sum, row) => (row.isSelected ? sum + row.share : sum), 0);
  const shareShareRows = shareRows
    .filter((row) => row.isSelected && row.share > 0)
    .map((row) => ({ userId: row.member.id, share: row.share }));
  const sharesPreview = buildSharesPreview(
    positiveAmountCents,
    shareRows.filter((row) => row.isSelected).map((row) => ({ userId: row.member.id, share: row.share })),
  );

  const splitSummary = deriveSplitSummary({
    splitType,
    amountCents,
    selectedCount: orderedSelectedParticipantIds.length,
    exactRows,
    exactDifferenceCents,
    shareRows,
    currency: data.groupCurrency,
  });

  /** Each included member's share of the total under the active split, in cents. */
  const memberShareCents = new Map<string, number>();
  for (const memberId of orderedSelectedParticipantIds) {
    memberShareCents.set(
      memberId,
      splitType === "equal"
        ? sharePreview.get(memberId) ?? 0
        : splitType === "exact"
          ? exactRows.find((row) => row.member.id === memberId)?.shareCents ?? 0
          : sharesPreview.get(memberId) ?? 0,
    );
  }

  const canPersist =
    Boolean(onSaveExpense) &&
    !isSaving &&
    !isDeleting &&
    data.members.length > 0 &&
    splitSummary.canSubmit;

  function clearSplitErrors() {
    setFieldErrors((current) => ({
      ...current,
      participants: undefined,
      exactShares: undefined,
      shares: undefined,
    }));
  }

  function setAmountInput(value: string) {
    setAmountInputState(value);
    setFieldErrors((current) => ({ ...current, amount: undefined, exactShares: undefined }));
    setFormError(null);
  }

  function setDescription(value: string) {
    setDescriptionState(value);
    setFieldErrors((current) => ({ ...current, description: undefined }));
    setFormError(null);
  }

  function setNotes(value: string) {
    setNotesState(value);
    setFormError(null);
  }

  function setExpenseDate(value: string) {
    setExpenseDateState(value);
    setFieldErrors((current) => ({ ...current, expenseAt: undefined }));
    setFormError(null);
  }

  function selectPayer(memberId: string) {
    setPaidById(memberId);
    setFieldErrors((current) => ({ ...current, payer: undefined }));
    setFormError(null);
  }

  function seedExactAmounts(nextSelectedIds: string[]) {
    const evenPreview = buildEqualSharePreview(positiveAmountCents, nextSelectedIds);
    const nextInputs: Record<string, string> = {};

    for (const member of data.members) {
      const seededCents = evenPreview.get(member.id) ?? 0;
      nextInputs[member.id] = seededCents > 0 ? formatCentsForInput(seededCents) : "";
    }

    setExactShareInputs(nextInputs);
  }

  function seedShareAmounts(nextSelectedIds: string[]) {
    const nextInputs: Record<string, string> = {};

    for (const member of data.members) {
      // Default to 1 share for each selected member
      nextInputs[member.id] = nextSelectedIds.includes(member.id) ? "1" : "";
    }

    setShareInputs(nextInputs);
  }

  function changeSplitType(nextType: SplitType) {
    setSplitTypeState(nextType);

    if (nextType === "exact" && existingExpense?.splitType !== "exact" && exactShareRows.length === 0) {
      seedExactAmounts(orderedSelectedParticipantIds);
    }

    if (nextType === "shares" && existingExpense?.splitType !== "shares" && shareShareRows.length === 0) {
      seedShareAmounts(orderedSelectedParticipantIds);
    }

    clearSplitErrors();
    setFormError(null);
  }

  function toggleParticipant(memberId: string) {
    const isSelected = selectedParticipantIds.includes(memberId);
    const nextSelectedIds = isSelected
      ? selectedParticipantIds.filter((participantId) => participantId !== memberId)
      : [...selectedParticipantIds, memberId];

    if (splitType === "exact" && isSelected) {
      setExactShareInputs((currentInputs) => ({ ...currentInputs, [memberId]: "" }));
    }

    if (splitType === "exact" && !isSelected && !(exactShareInputs[memberId] ?? "").trim()) {
      const seededPreview = buildEqualSharePreview(
        positiveAmountCents,
        data.members.filter((member) => nextSelectedIds.includes(member.id)).map((member) => member.id),
      );
      const seededCents = seededPreview.get(memberId) ?? 0;

      setExactShareInputs((currentInputs) => ({
        ...currentInputs,
        [memberId]: seededCents > 0 ? formatCentsForInput(seededCents) : "",
      }));
    }

    if (splitType === "shares" && isSelected) {
      setShareInputs((currentInputs) => ({ ...currentInputs, [memberId]: "" }));
    }

    if (splitType === "shares" && !isSelected && !(shareInputs[memberId] ?? "").trim()) {
      setShareInputs((currentInputs) => ({ ...currentInputs, [memberId]: "1" }));
    }

    setSelectedParticipantIds(nextSelectedIds);
    clearSplitErrors();
    setFormError(null);
  }

  function selectAllParticipants() {
    const allMemberIds = data.members.map((member) => member.id);
    setSelectedParticipantIds(allMemberIds);

    if (splitType === "exact") {
      const evenPreview = buildEqualSharePreview(positiveAmountCents, allMemberIds);

      setExactShareInputs((current) => {
        const nextInputs = { ...current };

        for (const member of data.members) {
          if ((nextInputs[member.id] ?? "").trim()) {
            continue;
          }

          const seededCents = evenPreview.get(member.id) ?? 0;
          nextInputs[member.id] = seededCents > 0 ? formatCentsForInput(seededCents) : "";
        }

        return nextInputs;
      });
    }

    if (splitType === "shares") {
      setShareInputs((current) => {
        const nextInputs = { ...current };

        for (const member of data.members) {
          if (!(nextInputs[member.id] ?? "").trim()) {
            nextInputs[member.id] = "1";
          }
        }

        return nextInputs;
      });
    }

    clearSplitErrors();
    setFormError(null);
  }

  function clearParticipants() {
    setSelectedParticipantIds([]);
    clearSplitErrors();
    setFormError(null);
  }

  /** Re-seeds exact amounts evenly (or shares to 1 each) across everyone selected. */
  function resetSplitValues() {
    if (splitType === "exact") {
      seedExactAmounts(orderedSelectedParticipantIds);
    } else if (splitType === "shares") {
      seedShareAmounts(orderedSelectedParticipantIds);
    }

    clearSplitErrors();
    setFormError(null);
  }

  function setExactInput(memberId: string, value: string) {
    setExactShareInputs((current) => ({ ...current, [memberId]: value }));
    clearSplitErrors();
    setFormError(null);
  }

  function setShareInput(memberId: string, value: string) {
    setShareInputs((current) => ({ ...current, [memberId]: value }));
    clearSplitErrors();
    setFormError(null);
  }

  /** Validates and saves. Returns the validation errors when the draft is rejected. */
  async function submit(): Promise<FormErrors | null> {
    // The button disables via state, but a second submit can fire before
    // React re-renders; this guard is what actually prevents double-saves.
    if (!onSaveExpense || isSaving || isDeleting) {
      return null;
    }

    const nextErrors: FormErrors = {};
    const trimmedDescription = description.trim();
    const timestamp = toExpenseTimestamp(expenseDate);
    const normalizedParticipantIds = Array.from(
      new Set(
        orderedSelectedParticipantIds.filter((participantId) =>
          data.members.some((member) => member.id === participantId),
        ),
      ),
    );

    if (!amountInput.trim()) {
      nextErrors.amount = "Enter an amount.";
    } else if (amountCents === null) {
      nextErrors.amount = "Use a valid amount with at most two decimals.";
    } else if (amountCents <= 0) {
      nextErrors.amount = "Amount must be greater than zero.";
    }

    if (trimmedDescription.length < 2) {
      nextErrors.description = "Add a short description.";
    }

    if (timestamp === null) {
      nextErrors.expenseAt = "Choose a valid date.";
    }

    if (!paidById || !data.members.some((member) => member.id === paidById)) {
      nextErrors.payer = "Choose who paid.";
    }

    if (normalizedParticipantIds.length === 0) {
      nextErrors.participants = "Select at least one person.";
    }

    if (splitType === "exact") {
      if (exactRows.some((row) => row.isInvalid)) {
        nextErrors.exactShares = "Fix invalid amounts before saving.";
      } else if (exactRows.some((row) => row.needsAmount)) {
        nextErrors.exactShares = "Everyone in the split needs an amount above zero.";
      } else if (exactDifferenceCents !== 0) {
        nextErrors.exactShares = splitSummary.detail || "Amounts must add up to the total.";
      } else if (exactShareRows.length === 0) {
        nextErrors.exactShares = "Add at least one amount.";
      }
    }

    if (splitType === "shares") {
      if (shareRows.some((row) => row.isInvalid)) {
        nextErrors.shares = "Fix invalid shares before saving.";
      } else if (shareRows.some((row) => row.needsAmount)) {
        nextErrors.shares = "Everyone in the split needs at least one share.";
      } else if (shareShareRows.length === 0) {
        nextErrors.shares = "Add at least one share.";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormError(null);
      return nextErrors;
    }

    setIsSaving(true);
    setFieldErrors({});
    setFormError(null);

    try {
      await onSaveExpense({
        description: trimmedDescription,
        amountCents: amountCents ?? 0,
        paidBy: paidById,
        splitType,
        participantIds:
          splitType === "equal"
            ? normalizedParticipantIds
            : splitType === "exact"
              ? exactShareRows.map((share) => share.userId)
              : shareShareRows.map((share) => share.userId),
        exactShares: splitType === "exact" ? exactShareRows : undefined,
        shares: splitType === "shares" ? shareShareRows : undefined,
        expenseAt: timestamp ?? 0,
        notes: notes.trim() || undefined,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save this expense.");
      setIsSaving(false);
      return null;
    }

    setIsSaving(false);
    return null;
  }

  async function deleteExpense() {
    if (!onDeleteExpense || isSaving || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setFormError(null);

    try {
      await onDeleteExpense();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to delete this expense.");
      setIsDeleting(false);
      return;
    }

    setIsDeleting(false);
  }

  return {
    isEditMode,
    currency: data.groupCurrency,
    members: data.members,
    amountInput,
    amountCents,
    hasInvalidAmount,
    description,
    notes,
    expenseDate,
    paidById,
    payer,
    splitType,
    selectedIds: orderedSelectedParticipantIds,
    exactRows,
    exactAssignedCents,
    exactDifferenceCents,
    shareRows,
    totalShares,
    memberShareCents,
    splitSummary,
    fieldErrors,
    formError,
    isSaving,
    isDeleting,
    canPersist,
    setAmountInput,
    setDescription,
    setNotes,
    setExpenseDate,
    selectPayer,
    changeSplitType,
    toggleParticipant,
    selectAllParticipants,
    clearParticipants,
    resetSplitValues,
    setExactInput,
    setShareInput,
    submit,
    deleteExpense,
  };
}

export type ComposerState = ReturnType<typeof useComposerState>;
