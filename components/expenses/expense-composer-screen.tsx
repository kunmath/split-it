"use client";

import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CircleDollarSign,
  ImagePlus,
  NotebookPen,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { usePlaceholderMode } from "@/components/providers/app-providers";
import { PageContainer } from "@/components/shell/page-container";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScreenState } from "@/components/ui/screen-state";
import { SurfaceCard } from "@/components/ui/surface-card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMoneyFromCents } from "@/lib/format";
import { getGroupDetail } from "@/lib/placeholder-data";
import { cn, getInitials } from "@/lib/utils";

type ExpenseComposerScreenProps = {
  groupId: string;
  expenseId?: string;
};

type SplitType = "equal" | "exact";

type ComposerMember = {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
  role: "owner" | "member";
  isCurrentUser: boolean;
};

type ExistingExpenseDraft = {
  id: string;
  description: string;
  amountCents: number;
  paidBy: string;
  splitType: SplitType;
  expenseAt: number;
  notes?: string;
  shares: Array<{
    userId: string;
    shareCents: number;
  }>;
};

type ComposerSceneData = {
  groupId: string;
  groupName: string;
  groupCurrency: string;
  members: ComposerMember[];
  expense: ExistingExpenseDraft | null;
};

type ExactShareDraft = {
  userId: string;
  shareCents: number;
};

type ExpenseDraft = {
  description: string;
  amountCents: number;
  paidBy: string;
  splitType: SplitType;
  participantIds: string[];
  exactShares?: ExactShareDraft[];
  expenseAt: number;
  notes?: string;
};

type FormErrors = {
  amount?: string;
  description?: string;
  expenseAt?: string;
  participants?: string;
  payer?: string;
  exactShares?: string;
};

type SplitSummaryState = {
  tone: "matched" | "warning" | "error";
  badge: string;
  detail: string;
  canSubmit: boolean;
};

const MOCK_MEMBERS: ComposerMember[] = [
  {
    id: "mock-member-jordan",
    name: "Jordan Dale",
    email: "jordan@example.com",
    role: "owner",
    isCurrentUser: true,
  },
  {
    id: "mock-member-sarah",
    name: "Sarah Jenkins",
    email: "sarah@example.com",
    role: "member",
    isCurrentUser: false,
  },
  {
    id: "mock-member-elena",
    name: "Elena Rodriguez",
    email: "elena@example.com",
    role: "member",
    isCurrentUser: false,
  },
  {
    id: "mock-member-james",
    name: "James Chen",
    email: "james@example.com",
    role: "member",
    isCurrentUser: false,
  },
  {
    id: "mock-member-marcus",
    name: "Marcus Vale",
    email: "marcus@example.com",
    role: "member",
    isCurrentUser: false,
  },
  {
    id: "mock-member-priya",
    name: "Priya Nair",
    email: "priya@example.com",
    role: "member",
    isCurrentUser: false,
  },
];

function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateInputValue(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatCentsForInput(amountCents: number) {
  return (amountCents / 100).toFixed(2);
}

function parseAmountInputToCents(value: string) {
  const normalized = value.replace(/,/g, "").trim();

  if (!normalized) {
    return 0;
  }

  if (!/^\d*(?:\.\d{0,2})?$/.test(normalized) || normalized === ".") {
    return null;
  }

  const [wholePart = "0", fractionPart = ""] = normalized.split(".");
  const wholeCents = Number(wholePart || "0") * 100;

  if (!Number.isSafeInteger(wholeCents)) {
    return null;
  }

  return wholeCents + Number((fractionPart + "00").slice(0, 2));
}

function buildEqualSharePreview(totalCents: number, participantIds: string[]) {
  const shares = new Map<string, number>();

  if (participantIds.length === 0 || totalCents <= 0) {
    for (const participantId of participantIds) {
      shares.set(participantId, 0);
    }

    return shares;
  }

  const baseShare = Math.floor(totalCents / participantIds.length);
  const remainder = totalCents % participantIds.length;

  participantIds.forEach((participantId, index) => {
    shares.set(participantId, baseShare + (index < remainder ? 1 : 0));
  });

  return shares;
}

function toExpenseTimestamp(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const timestamp = new Date(year, month - 1, day, 12, 0, 0, 0).getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return timestamp;
}

function getCurrencyToken(currency: string) {
  return (
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency
  );
}

function getStatusClasses(tone: SplitSummaryState["tone"]) {
  if (tone === "matched") {
    return "bg-primary/12 text-primary";
  }

  if (tone === "warning") {
    return "bg-amber-500/14 text-amber-200";
  }

  return "bg-secondary/12 text-secondary";
}

function buildInitialExactInputs(
  members: ComposerMember[],
  shares: ExistingExpenseDraft["shares"],
) {
  const inputs: Record<string, string> = {};

  for (const member of members) {
    inputs[member.id] = "";
  }

  for (const share of shares) {
    inputs[share.userId] = formatCentsForInput(share.shareCents);
  }

  return inputs;
}

function buildMockComposerData(
  groupId: string,
  expenseId?: string,
): ComposerSceneData {
  const group = getGroupDetail(groupId);

  return {
    groupId,
    groupName: group.title,
    groupCurrency: group.currency,
    members: MOCK_MEMBERS,
    expense: expenseId
      ? {
          id: expenseId,
          description: "Dinner at Prime",
          amountCents: 12_000,
          paidBy: "mock-member-jordan",
          splitType: "exact",
          expenseAt: new Date("2024-10-27T12:00:00.000Z").getTime(),
          notes: "Mock edit mode uses the same composer and delete affordance as live mode.",
          shares: [
            { userId: "mock-member-jordan", shareCents: 4_500 },
            { userId: "mock-member-sarah", shareCents: 3_500 },
            { userId: "mock-member-elena", shareCents: 4_000 },
          ],
        }
      : null,
  };
}

function buildSceneData(
  data: {
    groupId: Id<"groups">;
    groupName: string;
    groupCurrency: string;
    members: Array<{
      id: Id<"users">;
      name: string;
      email: string;
      imageUrl?: string;
      role: "owner" | "member";
      isCurrentUser: boolean;
    }>;
    expense: {
      id: Id<"expenses">;
      description: string;
      amountCents: number;
      paidBy: Id<"users">;
      splitType: SplitType;
      expenseAt: number;
      notes?: string;
      shares: Array<{
        userId: Id<"users">;
        shareCents: number;
      }>;
    } | null;
  },
): ComposerSceneData {
  return {
    groupId: String(data.groupId),
    groupName: data.groupName,
    groupCurrency: data.groupCurrency,
    members: data.members.map((member) => ({
      id: String(member.id),
      name: member.name,
      email: member.email,
      imageUrl: member.imageUrl,
      role: member.role,
      isCurrentUser: member.isCurrentUser,
    })),
    expense:
      data.expense === null
        ? null
        : {
            id: String(data.expense.id),
            description: data.expense.description,
            amountCents: data.expense.amountCents,
            paidBy: String(data.expense.paidBy),
            splitType: data.expense.splitType,
            expenseAt: data.expense.expenseAt,
            notes: data.expense.notes,
            shares: data.expense.shares.map((share) => ({
              userId: String(share.userId),
              shareCents: share.shareCents,
            })),
          },
  };
}

function LoadingComposerState() {
  return (
    <PageContainer className="flex min-h-[70vh] items-center justify-center px-4 py-16 sm:px-6 lg:px-12">
      <ScreenState
        state="loading"
        title="Loading composer"
        description="Pulling active members, payer options, and any existing split rows into the draft."
      />
    </PageContainer>
  );
}

function SyncingComposerState() {
  return (
    <PageContainer className="flex min-h-[70vh] items-center justify-center px-4 py-16 sm:px-6 lg:px-12">
      <ScreenState
        state="loading"
        title="Syncing your workspace"
        description="Your session is authenticated, but the Split-It user record is still finishing setup."
      />
    </PageContainer>
  );
}

function UnavailableComposerState({
  groupId,
  isEditMode,
}: {
  groupId: string;
  isEditMode: boolean;
}) {
  return (
    <PageContainer className="flex min-h-[70vh] items-center justify-center px-4 py-16 sm:px-6 lg:px-12">
      <ScreenState
        state="unavailable"
        title={isEditMode ? "Expense unavailable" : "Group unavailable"}
        description={
          isEditMode
            ? "You do not have permission to edit this expense, or it no longer exists."
            : "You do not have access to this group, or it is no longer active."
        }
        icon={<Users className="h-7 w-7 text-secondary" />}
        actions={
          <Link
            href={`/groups/${groupId}`}
            className={buttonVariants({ variant: "primary", size: "lg" })}
          >
            Back to group
          </Link>
        }
      />
    </PageContainer>
  );
}

export function ExpenseComposerScreen({
  groupId,
  expenseId,
}: ExpenseComposerScreenProps) {
  const { mode } = usePlaceholderMode();

  if (mode !== "live") {
    return (
      <ExpenseComposerScene
        key={expenseId ?? "new"}
        data={buildMockComposerData(groupId, expenseId)}
        isMock
      />
    );
  }

  return <LiveExpenseComposerScreen groupId={groupId} expenseId={expenseId} />;
}

function LiveExpenseComposerScreen({
  groupId,
  expenseId,
}: ExpenseComposerScreenProps) {
  const router = useRouter();
  const currentUser = useQuery(api.users.current);
  const composer = useQuery(
    api.expenses.getComposerData,
    currentUser
      ? {
          groupId: groupId as Id<"groups">,
          expenseId: expenseId ? (expenseId as Id<"expenses">) : undefined,
        }
      : "skip",
  );
  const createExpense = useMutation(api.expenses.createExpense);
  const updateExpense = useMutation(api.expenses.updateExpense);
  const deleteExpense = useMutation(api.expenses.deleteExpense);

  if (currentUser === undefined) {
    return <LoadingComposerState />;
  }

  if (currentUser === null) {
    return <SyncingComposerState />;
  }

  if (composer === undefined) {
    return <LoadingComposerState />;
  }

  if (composer === null) {
    return (
      <UnavailableComposerState groupId={groupId} isEditMode={Boolean(expenseId)} />
    );
  }

  return (
    <ExpenseComposerScene
      key={expenseId ?? "new"}
      data={buildSceneData(composer)}
      onSaveExpense={async (draft) => {
        if (expenseId) {
          await updateExpense({
            expenseId: expenseId as Id<"expenses">,
            description: draft.description,
            amountCents: draft.amountCents,
            paidBy: draft.paidBy as Id<"users">,
            splitType: draft.splitType,
            participantIds: draft.participantIds as Id<"users">[],
            exactShares: draft.exactShares?.map((share) => ({
              userId: share.userId as Id<"users">,
              shareCents: share.shareCents,
            })),
            expenseAt: draft.expenseAt,
            notes: draft.notes,
          });
        } else {
          await createExpense({
            groupId: groupId as Id<"groups">,
            description: draft.description,
            amountCents: draft.amountCents,
            paidBy: draft.paidBy as Id<"users">,
            splitType: draft.splitType,
            participantIds: draft.participantIds as Id<"users">[],
            exactShares: draft.exactShares?.map((share) => ({
              userId: share.userId as Id<"users">,
              shareCents: share.shareCents,
            })),
            expenseAt: draft.expenseAt,
            notes: draft.notes,
          });
        }

        startTransition(() => {
          router.push(`/groups/${groupId}`);
        });
      }}
      onDeleteExpense={
        expenseId
          ? async () => {
              await deleteExpense({
                expenseId: expenseId as Id<"expenses">,
              });

              startTransition(() => {
                router.push(`/groups/${groupId}`);
              });
            }
          : undefined
      }
    />
  );
}

function ExpenseComposerScene({
  data,
  isMock = false,
  onSaveExpense,
  onDeleteExpense,
}: {
  data: ComposerSceneData;
  isMock?: boolean;
  onSaveExpense?: (draft: ExpenseDraft) => Promise<void>;
  onDeleteExpense?: () => Promise<void>;
}) {
  const existingExpense = data.expense;
  const isEditMode = existingExpense !== null;
  const defaultPayerId =
    existingExpense?.paidBy ??
    data.members.find((member) => member.isCurrentUser)?.id ??
    data.members[0]?.id ??
    "";
  const initialSelectedParticipantIds =
    existingExpense?.shares.map((share) => share.userId) ?? data.members.map((member) => member.id);

  const [amountInput, setAmountInput] = useState(
    existingExpense ? formatCentsForInput(existingExpense.amountCents) : "",
  );
  const [description, setDescription] = useState(existingExpense?.description ?? "");
  const [notes, setNotes] = useState(existingExpense?.notes ?? "");
  const [expenseDate, setExpenseDate] = useState(
    existingExpense
      ? formatDateInputValue(existingExpense.expenseAt)
      : getTodayDateInputValue(),
  );
  const [paidById, setPaidById] = useState(defaultPayerId);
  const [splitType, setSplitType] = useState<SplitType>(
    existingExpense?.splitType ?? "equal",
  );
  const [selectedParticipantIds, setSelectedParticipantIds] = useState(
    initialSelectedParticipantIds,
  );
  const [exactShareInputs, setExactShareInputs] = useState<Record<string, string>>(
    buildInitialExactInputs(data.members, existingExpense?.shares ?? []),
  );
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const amountCents = parseAmountInputToCents(amountInput);
  const hasInvalidAmount = amountCents === null;
  const orderedSelectedParticipantIds = data.members
    .filter((member) => selectedParticipantIds.includes(member.id))
    .map((member) => member.id);
  const selectedMembers = data.members.filter((member) =>
    orderedSelectedParticipantIds.includes(member.id),
  );
  const sharePreview = buildEqualSharePreview(
    amountCents && amountCents > 0 ? amountCents : 0,
    orderedSelectedParticipantIds,
  );
  const payer = data.members.find((member) => member.id === paidById) ?? null;
  const firstSelectedId = orderedSelectedParticipantIds[0];
  const perPersonCents =
    firstSelectedId && sharePreview.has(firstSelectedId)
      ? sharePreview.get(firstSelectedId) ?? 0
      : 0;
  const exactRows = data.members.map((member) => {
    const input = exactShareInputs[member.id] ?? "";
    const parsedCents = parseAmountInputToCents(input);
    const isSelected = orderedSelectedParticipantIds.includes(member.id);
    const isInvalid = isSelected && input.trim().length > 0 && parsedCents === null;
    const needsAmount = isSelected && (parsedCents === null || parsedCents <= 0);
    const shareCents = parsedCents !== null && parsedCents > 0 ? parsedCents : 0;

    return {
      member,
      input,
      parsedCents,
      isSelected,
      isInvalid,
      needsAmount,
      shareCents,
    };
  });
  const exactAssignedCents = exactRows.reduce((sum, row) => {
    return row.isSelected ? sum + row.shareCents : sum;
  }, 0);
  const exactDifferenceCents =
    hasInvalidAmount || amountCents === null ? null : exactAssignedCents - amountCents;
  const exactShareRows = exactRows
    .filter((row) => row.isSelected && row.shareCents > 0)
    .map((row) => ({
      userId: row.member.id,
      shareCents: row.shareCents,
    }));
  const moneyLabel =
    amountCents === null
      ? "Invalid amount"
      : formatMoneyFromCents(amountCents, data.groupCurrency);

  let splitSummary: SplitSummaryState;

  if (splitType === "equal") {
    if (hasInvalidAmount) {
      splitSummary = {
        tone: "error",
        badge: "Invalid total",
        detail: "Enter a valid expense amount before the split can be calculated.",
        canSubmit: false,
      };
    } else if (orderedSelectedParticipantIds.length === 0) {
      splitSummary = {
        tone: "error",
        badge: "No participants",
        detail: "Select at least one group member to split this expense.",
        canSubmit: false,
      };
    } else {
      splitSummary = {
        tone: "matched",
        badge: "Matched",
        detail: "Equal split auto-rounds in cents so assigned shares always match the total.",
        canSubmit: true,
      };
    }
  } else if (hasInvalidAmount) {
    splitSummary = {
      tone: "error",
      badge: "Invalid total",
      detail: "Enter a valid total before exact amounts can be matched.",
      canSubmit: false,
    };
  } else if (orderedSelectedParticipantIds.length === 0) {
    splitSummary = {
      tone: "error",
      badge: "No participants",
      detail: "Select at least one group member and assign an amount.",
      canSubmit: false,
    };
  } else if (exactRows.some((row) => row.isInvalid)) {
    splitSummary = {
      tone: "error",
      badge: "Invalid amounts",
      detail: "Use dollar amounts with at most two decimals for each selected person.",
      canSubmit: false,
    };
  } else if (exactRows.some((row) => row.needsAmount)) {
    splitSummary = {
      tone: "warning",
      badge: "Missing amounts",
      detail: "Every selected member needs a positive exact amount.",
      canSubmit: false,
    };
  } else if (exactDifferenceCents === 0) {
    splitSummary = {
      tone: "matched",
      badge: "Matched",
      detail: "Exact shares add up perfectly to the total expense.",
      canSubmit: true,
    };
  } else if ((exactDifferenceCents ?? 0) < 0) {
    splitSummary = {
      tone: "warning",
      badge: "Under assigned",
      detail: `${formatMoneyFromCents(
        Math.abs(exactDifferenceCents ?? 0),
        data.groupCurrency,
      )} still needs to be assigned.`,
      canSubmit: false,
    };
  } else {
    splitSummary = {
      tone: "error",
      badge: "Over assigned",
      detail: `${formatMoneyFromCents(
        exactDifferenceCents ?? 0,
        data.groupCurrency,
      )} must be removed from the exact split.`,
      canSubmit: false,
    };
  }

  const canPersist =
    Boolean(onSaveExpense) &&
    !isSaving &&
    !isDeleting &&
    data.members.length > 0 &&
    (splitType === "equal" || splitSummary.canSubmit);

  function clearSplitErrors() {
    setFieldErrors((current) => ({
      ...current,
      participants: undefined,
      exactShares: undefined,
    }));
  }

  function seedExactAmounts(nextSelectedIds: string[]) {
    const evenPreview = buildEqualSharePreview(
      amountCents && amountCents > 0 ? amountCents : 0,
      nextSelectedIds,
    );
    const nextInputs: Record<string, string> = {};

    for (const member of data.members) {
      const seededCents = evenPreview.get(member.id) ?? 0;
      nextInputs[member.id] = seededCents > 0 ? formatCentsForInput(seededCents) : "";
    }

    setExactShareInputs(nextInputs);
  }

  function toggleParticipant(memberId: string) {
    setSelectedParticipantIds((current) => {
      const isSelected = current.includes(memberId);
      const nextSelectedIds = isSelected
        ? current.filter((participantId) => participantId !== memberId)
        : [...current, memberId];

      if (splitType === "exact" && isSelected) {
        setExactShareInputs((currentInputs) => ({
          ...currentInputs,
          [memberId]: "",
        }));
      }

      if (splitType === "exact" && !isSelected) {
        const currentInput = exactShareInputs[memberId] ?? "";

        if (!currentInput.trim()) {
          const seededPreview = buildEqualSharePreview(
            amountCents && amountCents > 0 ? amountCents : 0,
            data.members
              .filter((member) => nextSelectedIds.includes(member.id))
              .map((member) => member.id),
          );

          setExactShareInputs((currentInputs) => ({
            ...currentInputs,
            [memberId]:
              (seededPreview.get(memberId) ?? 0) > 0
                ? formatCentsForInput(seededPreview.get(memberId) ?? 0)
                : "",
          }));
        }
      }

      return nextSelectedIds;
    });
    clearSplitErrors();
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!onSaveExpense) {
      return;
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
      nextErrors.amount = "Enter an amount in dollars and cents.";
    } else if (amountCents === null) {
      nextErrors.amount = "Use a valid dollar amount with at most two decimals.";
    } else if (amountCents <= 0) {
      nextErrors.amount = "Amount must be greater than zero.";
    }

    if (trimmedDescription.length < 2) {
      nextErrors.description = "Add a short description for this expense.";
    }

    if (timestamp === null) {
      nextErrors.expenseAt = "Choose a valid expense date.";
    }

    if (!paidById || !data.members.some((member) => member.id === paidById)) {
      nextErrors.payer = "Choose an active group member as payer.";
    }

    if (normalizedParticipantIds.length === 0) {
      nextErrors.participants = "Select at least one participant.";
    }

    if (splitType === "exact") {
      if (exactRows.some((row) => row.isInvalid)) {
        nextErrors.exactShares = "Fix invalid exact amounts before saving.";
      } else if (exactRows.some((row) => row.needsAmount)) {
        nextErrors.exactShares =
          "Every selected member needs a positive exact amount.";
      } else if (exactDifferenceCents !== 0) {
        nextErrors.exactShares =
          exactDifferenceCents !== null && exactDifferenceCents < 0
            ? `Assign ${formatMoneyFromCents(
                Math.abs(exactDifferenceCents),
                data.groupCurrency,
              )} more to match the total.`
            : `Remove ${formatMoneyFromCents(
                exactDifferenceCents ?? 0,
                data.groupCurrency,
              )} to match the total.`;
      } else if (exactShareRows.length === 0) {
        nextErrors.exactShares = "Add at least one exact split amount.";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormError(null);
      return;
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
            : exactShareRows.map((share) => share.userId),
        exactShares: splitType === "exact" ? exactShareRows : undefined,
        expenseAt: timestamp ?? 0,
        notes: notes.trim() || undefined,
      });
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to save this expense.",
      );
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
  }

  async function handleDelete() {
    if (!onDeleteExpense) {
      return;
    }

    setIsDeleting(true);
    setFormError(null);

    try {
      await onDeleteExpense();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to delete this expense.",
      );
      setIsDeleting(false);
      return;
    }

    setIsDeleting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="page-glow relative min-h-screen pb-40 lg:pb-12">
      <header className="sticky top-0 z-30 border-b border-white/6 bg-[rgba(19,19,19,0.88)] backdrop-blur-xl">
        <PageContainer className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-12 lg:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/groups/${data.groupId}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
              aria-label="Close expense composer"
            >
              <X className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-[0.68rem] uppercase tracking-[0.24em] text-primary">
                {data.groupName}
              </p>
              <h1 className="truncate font-headline text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
                {isEditMode ? "Edit Expense" : "New Expense"}
              </h1>
            </div>
          </div>

          <Button type="submit" size="md" className="shrink-0 px-5 sm:px-6" disabled={!canPersist}>
            {isSaving ? (isEditMode ? "Updating..." : "Saving...") : isEditMode ? "Update" : "Save"}
          </Button>
        </PageContainer>
      </header>

      <PageContainer className="px-4 pt-6 sm:px-6 lg:px-12 lg:pt-10">
        {isMock ? (
          <div className="mb-6 rounded-[1.5rem] border border-primary/15 bg-primary/8 px-4 py-3 text-sm text-on-surface-variant">
            Preview mode only. The responsive composer is live, but save and delete actions require a live Clerk + Convex setup.
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] xl:items-start">
          <section className="space-y-6 lg:space-y-8">
            <section className="space-y-4 pt-2">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">
                    Expense Amount
                  </p>
                  <p className="mt-2 max-w-xl text-sm leading-7 text-on-surface-variant">
                    {isEditMode
                      ? "Refine the existing expense without leaving the shared composer."
                      : "Add the spend details first, then decide whether the split stays equal or becomes exact."}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-2 text-[0.7rem] uppercase tracking-[0.2em] text-on-surface-variant">
                  <Wallet className="h-3.5 w-3.5 text-primary" />
                  <span>{payer ? `${payer.name} fronts this expense` : "Select a payer"}</span>
                </div>
              </div>

              <div className="flex items-end gap-3">
                <span className="pb-3 font-headline text-4xl font-extrabold text-primary sm:text-5xl">
                  {getCurrencyToken(data.groupCurrency)}
                </span>
                <input
                  value={amountInput}
                  onChange={(event) => {
                    setAmountInput(event.target.value);
                    setFieldErrors((current) => ({
                      ...current,
                      amount: undefined,
                      exactShares: undefined,
                    }));
                    setFormError(null);
                  }}
                  placeholder="0.00"
                  inputMode="decimal"
                  className={cn(
                    "w-full border-none bg-transparent p-0 font-headline text-6xl font-extrabold tracking-tight text-on-surface placeholder:text-surface-bright focus:outline-none sm:text-7xl",
                    fieldErrors.amount && "text-secondary placeholder:text-secondary/40",
                  )}
                  aria-invalid={fieldErrors.amount ? "true" : undefined}
                />
              </div>
              <p className={cn("text-sm text-on-surface-variant", fieldErrors.amount && "text-secondary")}>
                {fieldErrors.amount ?? `Stored exactly as cents in ${data.groupCurrency}.`}
              </p>
            </section>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <SurfaceCard variant="low" className="rounded-[1.8rem] p-5 sm:p-6">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">
                    What is this for?
                  </p>
                  <input
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value);
                      setFieldErrors((current) => ({
                        ...current,
                        description: undefined,
                      }));
                      setFormError(null);
                    }}
                    placeholder="Sushi dinner, cabin deposit, groceries..."
                    className="w-full border-none bg-transparent p-0 text-lg text-on-surface placeholder:text-on-surface-variant/38 focus:outline-none"
                    aria-invalid={fieldErrors.description ? "true" : undefined}
                  />
                  <p className={cn("text-sm text-on-surface-variant", fieldErrors.description && "text-secondary")}>
                    {fieldErrors.description ??
                      "Keep the description short so it reads cleanly in the ledger."}
                  </p>
                </div>
              </SurfaceCard>

              <SurfaceCard variant="low" className="rounded-[1.8rem] p-5 sm:p-6">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">
                    Date
                  </p>
                  <label className="flex min-h-13 items-center gap-3 rounded-[1.25rem] bg-surface-container-lowest px-4 ring-1 ring-white/5 transition focus-within:ring-primary/30">
                    <CalendarDays className="h-4.5 w-4.5 text-primary" />
                    <input
                      value={expenseDate}
                      onChange={(event) => {
                        setExpenseDate(event.target.value);
                        setFieldErrors((current) => ({
                          ...current,
                          expenseAt: undefined,
                        }));
                        setFormError(null);
                      }}
                      type="date"
                      className="w-full border-none bg-transparent text-sm text-on-surface [color-scheme:dark] focus:outline-none"
                      aria-invalid={fieldErrors.expenseAt ? "true" : undefined}
                    />
                  </label>
                  <p className={cn("text-sm text-on-surface-variant", fieldErrors.expenseAt && "text-secondary")}>
                    {fieldErrors.expenseAt ?? "Use the date this spend actually happened."}
                  </p>
                </div>
              </SurfaceCard>
            </div>

            <SurfaceCard variant="high" className="rounded-[2rem] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">
                    Paid By
                  </p>
                  <h2 className="mt-2 font-headline text-2xl font-bold tracking-tight text-on-surface">
                    Choose the payer
                  </h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-2 text-[0.7rem] uppercase tracking-[0.2em] text-on-surface-variant">
                  <Wallet className="h-3.5 w-3.5 text-primary" />
                  <span>{payer ? `${payer.name} fronts this expense` : "Select a payer"}</span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {data.members.map((member) => {
                  const isSelected = member.id === paidById;

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setPaidById(member.id);
                        setFieldErrors((current) => ({ ...current, payer: undefined }));
                        setFormError(null);
                      }}
                      className={cn(
                        "inline-flex min-h-12 items-center gap-3 rounded-full border px-4 py-2 text-left transition",
                        isSelected
                          ? "border-primary/35 bg-surface-bright text-on-surface shadow-[0_16px_40px_rgba(78,222,163,0.08)]"
                          : "border-white/6 bg-surface-container-low text-on-surface-variant hover:text-on-surface",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full font-headline text-sm font-bold",
                          isSelected
                            ? "bg-[linear-gradient(135deg,rgba(78,222,163,0.45),rgba(16,185,129,0.95))] text-on-primary"
                            : "bg-surface-container-lowest text-on-surface",
                        )}
                      >
                        {getInitials(member.name)}
                      </span>
                      <span>
                        <span className="block font-headline text-sm font-semibold text-on-surface">
                          {member.isCurrentUser ? "You" : member.name}
                        </span>
                        <span className="block text-[0.7rem] uppercase tracking-[0.16em] text-on-surface-variant">
                          {member.role === "owner" ? "Owner" : "Member"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {fieldErrors.payer ? <p className="mt-3 text-sm text-secondary">{fieldErrors.payer}</p> : null}
            </SurfaceCard>

            <SurfaceCard variant="low" className="rounded-[2rem] p-5 sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)]">
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-on-surface-variant">
                    <NotebookPen className="h-3.5 w-3.5 text-primary" />
                    Notes
                  </p>
                  <textarea
                    value={notes}
                    onChange={(event) => {
                      setNotes(event.target.value);
                      setFormError(null);
                    }}
                    rows={6}
                    placeholder="Optional context for the group. Keep it short."
                    className="w-full resize-none rounded-[1.5rem] border border-white/6 bg-surface-container-lowest px-4 py-4 text-sm text-on-surface placeholder:text-on-surface-variant/38 focus:outline-none focus:ring-2 focus:ring-primary/25"
                  />
                </div>

                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-on-surface-variant">
                    <ImagePlus className="h-3.5 w-3.5 text-primary" />
                    Receipt
                  </p>
                  <div className="flex h-full min-h-44 items-center justify-center rounded-[1.5rem] border border-dashed border-white/12 bg-surface-container-lowest px-4 text-center">
                    <div className="space-y-2">
                      <p className="font-headline text-lg font-semibold text-on-surface">
                        Receipt upload placeholder
                      </p>
                      <p className="text-sm leading-6 text-on-surface-variant">
                        The desktop receipt panel stays in place for layout parity. Real uploads land in a later phase.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </SurfaceCard>
          </section>

          <aside className="space-y-6 xl:pt-6">
            <SurfaceCard variant="high" className="rounded-[2rem] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">
                    Split With
                  </p>
                  <h2 className="mt-2 font-headline text-2xl font-bold tracking-tight text-on-surface">
                    {splitType === "equal" ? "Split equally" : "Split by amount"}
                  </h2>
                </div>
                <div className="inline-flex rounded-[1rem] bg-surface-container-low p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSplitType("equal");
                      setFieldErrors((current) => ({ ...current, exactShares: undefined }));
                      setFormError(null);
                    }}
                    className={cn(
                      "rounded-[0.85rem] px-4 py-2 text-xs font-headline font-semibold uppercase tracking-[0.18em] transition",
                      splitType === "equal"
                        ? "bg-surface-container-high text-primary shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface",
                    )}
                  >
                    Split Equally
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSplitType("exact");

                      if (existingExpense?.splitType !== "exact" && exactShareRows.length === 0) {
                        seedExactAmounts(orderedSelectedParticipantIds);
                      }

                      setFieldErrors((current) => ({
                        ...current,
                        participants: undefined,
                        exactShares: undefined,
                      }));
                      setFormError(null);
                    }}
                    className={cn(
                      "rounded-[0.85rem] px-4 py-2 text-xs font-headline font-semibold uppercase tracking-[0.18em] transition",
                      splitType === "exact"
                        ? "bg-surface-container-high text-on-surface shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface",
                    )}
                  >
                    By Amount
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const allMemberIds = data.members.map((member) => member.id);
                    setSelectedParticipantIds(allMemberIds);

                    if (splitType === "exact") {
                      const evenPreview = buildEqualSharePreview(
                        amountCents && amountCents > 0 ? amountCents : 0,
                        allMemberIds,
                      );

                      setExactShareInputs((current) => {
                        const nextInputs = { ...current };

                        for (const member of data.members) {
                          if ((nextInputs[member.id] ?? "").trim()) {
                            continue;
                          }

                          nextInputs[member.id] =
                            (evenPreview.get(member.id) ?? 0) > 0
                              ? formatCentsForInput(evenPreview.get(member.id) ?? 0)
                              : "";
                        }

                        return nextInputs;
                      });
                    }

                    clearSplitErrors();
                    setFormError(null);
                  }}
                  className="rounded-full bg-surface-container-low px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface transition hover:text-primary"
                >
                  Select all
                </button>

                {splitType === "equal" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedParticipantIds([]);
                      clearSplitErrors();
                      setFormError(null);
                    }}
                    className="rounded-full bg-surface-container-low px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant transition hover:text-on-surface"
                  >
                    Clear
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const allMemberIds = data.members.map((member) => member.id);
                      setSelectedParticipantIds(allMemberIds);
                      seedExactAmounts(allMemberIds);
                      clearSplitErrors();
                      setFormError(null);
                    }}
                    className="rounded-full bg-surface-container-low px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-secondary transition hover:text-secondary"
                  >
                    Reset amounts
                  </button>
                )}

                <span className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">
                  {orderedSelectedParticipantIds.length} selected
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {splitType === "equal"
                  ? data.members.map((member) => {
                      const isIncluded = orderedSelectedParticipantIds.includes(member.id);
                      const memberShareCents = sharePreview.get(member.id) ?? 0;

                      return (
                        <div
                          key={member.id}
                          className={cn(
                            "flex items-center justify-between gap-4 rounded-[1.5rem] px-4 py-4 transition",
                            isIncluded
                              ? "bg-surface-container-low"
                              : "bg-surface-container-lowest/80",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              toggleParticipant(member.id);
                            }}
                            className="flex min-w-0 flex-1 items-center gap-4 text-left"
                          >
                            <div
                              className={cn(
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-headline text-sm font-bold",
                                isIncluded
                                  ? "bg-[linear-gradient(135deg,rgba(78,222,163,0.42),rgba(16,185,129,0.95))] text-on-primary"
                                  : "bg-surface-container-high text-on-surface-variant",
                              )}
                            >
                              {getInitials(member.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-headline text-base font-semibold text-on-surface">
                                {member.isCurrentUser ? "You" : member.name}
                              </p>
                              <p className="truncate text-[0.7rem] uppercase tracking-[0.18em] text-on-surface-variant">
                                {isIncluded ? "Included in split" : "Excluded from split"}
                              </p>
                            </div>
                          </button>

                          <div className="flex shrink-0 items-center gap-3">
                            <span
                              className={cn(
                                "hidden text-sm font-headline font-bold sm:inline",
                                isIncluded ? "text-primary" : "text-on-surface-variant",
                              )}
                            >
                              {isIncluded
                                ? formatMoneyFromCents(memberShareCents, data.groupCurrency)
                                : "Excluded"}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                toggleParticipant(member.id);
                              }}
                              className={cn(
                                "flex h-6 w-6 items-center justify-center rounded-md ring-1 ring-white/10 transition",
                                isIncluded
                                  ? "bg-primary text-on-primary"
                                  : "bg-surface-container-high text-transparent",
                              )}
                              aria-label={
                                isIncluded
                                  ? `Remove ${member.name} from equal split`
                                  : `Add ${member.name} to equal split`
                              }
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  : exactRows.map((row) => (
                      <div
                        key={row.member.id}
                        className={cn(
                          "flex items-center justify-between gap-4 rounded-[1.5rem] px-4 py-4 transition",
                          row.isSelected
                            ? "bg-surface-container-low"
                            : "bg-surface-container-lowest/80",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            toggleParticipant(row.member.id);
                          }}
                          className="flex min-w-0 flex-1 items-center gap-4 text-left"
                        >
                          <div
                            className={cn(
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-headline text-sm font-bold",
                              row.isSelected
                                ? "bg-[linear-gradient(135deg,rgba(78,222,163,0.42),rgba(16,185,129,0.95))] text-on-primary"
                                : "bg-surface-container-high text-on-surface-variant",
                            )}
                          >
                            {getInitials(row.member.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-headline text-base font-semibold text-on-surface">
                              {row.member.isCurrentUser ? "You" : row.member.name}
                            </p>
                            <p className="truncate text-[0.7rem] uppercase tracking-[0.18em] text-on-surface-variant">
                              {row.isSelected ? "Selected" : "Tap to include"}
                            </p>
                          </div>
                        </button>

                        <label
                          className={cn(
                            "flex shrink-0 items-center gap-2 rounded-[1rem] border px-4 py-2 transition focus-within:border-primary/40",
                            row.isSelected
                              ? "bg-surface-container-high"
                              : "bg-surface-container-high/55 opacity-70",
                            row.isInvalid || (row.isSelected && row.needsAmount)
                              ? "border-secondary/40"
                              : "border-white/8",
                          )}
                        >
                          <span className="text-sm font-medium text-on-surface-variant">
                            {getCurrencyToken(data.groupCurrency)}
                          </span>
                          <input
                            value={row.input}
                            onFocus={() => {
                              if (!row.isSelected) {
                                setSelectedParticipantIds((current) => [...current, row.member.id]);
                              }
                            }}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setExactShareInputs((current) => ({
                                ...current,
                                [row.member.id]: nextValue,
                              }));

                              if (!row.isSelected) {
                                setSelectedParticipantIds((current) => [...current, row.member.id]);
                              }

                              clearSplitErrors();
                              setFormError(null);
                            }}
                            placeholder="0.00"
                            inputMode="decimal"
                            disabled={!row.isSelected}
                            className="w-20 border-none bg-transparent p-0 text-right font-headline text-lg font-bold text-on-surface placeholder:text-on-surface-variant/38 focus:outline-none disabled:cursor-not-allowed"
                            aria-invalid={
                              row.isInvalid || (row.isSelected && row.needsAmount)
                                ? "true"
                                : undefined
                            }
                          />
                        </label>
                      </div>
                    ))}
              </div>

              {fieldErrors.participants ? (
                <p className="mt-3 text-sm text-secondary">{fieldErrors.participants}</p>
              ) : null}
              {fieldErrors.exactShares ? (
                <p className="mt-3 text-sm text-secondary">{fieldErrors.exactShares}</p>
              ) : null}
            </SurfaceCard>

            <SurfaceCard
              variant="hero"
              className="fixed bottom-4 left-4 right-4 z-20 rounded-[2rem] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.36)] sm:left-6 sm:right-6 lg:static lg:p-6 lg:shadow-[0_24px_80px_rgba(0,0,0,0.36)] xl:sticky xl:top-28"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-primary">Split Summary</p>

              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-on-surface-variant">
                    Total expense
                  </p>
                  <p className="mt-1 font-headline text-3xl font-extrabold text-on-surface">
                    {moneyLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-on-surface-variant">
                    {splitType === "exact" ? "Total assigned" : "Per person"}
                  </p>
                  <p
                    className={cn(
                      "mt-1 font-headline text-2xl font-extrabold",
                      splitType === "exact"
                        ? splitSummary.tone === "matched"
                          ? "text-primary"
                          : splitSummary.tone === "warning"
                            ? "text-amber-200"
                            : "text-secondary"
                        : "text-secondary",
                    )}
                  >
                    {splitType === "exact"
                      ? formatMoneyFromCents(exactAssignedCents, data.groupCurrency)
                      : orderedSelectedParticipantIds.length === 0 || hasInvalidAmount
                        ? "--"
                        : formatMoneyFromCents(perPersonCents, data.groupCurrency)}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-[rgba(12,12,12,0.18)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.18em] text-on-surface-variant">
                      Split state
                    </p>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                      {splitSummary.detail}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em]",
                      getStatusClasses(splitSummary.tone),
                    )}
                  >
                    {splitSummary.badge}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 border-t border-white/8 pt-5 text-sm text-on-surface-variant">
                <div className="flex items-center justify-between gap-4">
                  <span>Payer</span>
                  <span className="font-medium text-on-surface">
                    {payer?.name ?? "Select a payer"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Participants</span>
                  <span className="font-medium text-on-surface">
                    {orderedSelectedParticipantIds.length}{" "}
                    {orderedSelectedParticipantIds.length === 1 ? "person" : "people"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Split type</span>
                  <span className="font-medium uppercase tracking-[0.16em] text-primary">
                    {splitType}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>
                    {splitType === "exact" ? "Difference" : "Assigned total"}
                  </span>
                  <span
                    className={cn(
                      "font-medium",
                      splitType === "exact" && splitSummary.tone === "matched"
                        ? "text-primary"
                        : splitType === "exact" && splitSummary.tone === "warning"
                          ? "text-amber-200"
                          : splitType === "exact"
                            ? "text-secondary"
                            : "text-on-surface",
                    )}
                  >
                    {splitType === "exact"
                      ? hasInvalidAmount || exactDifferenceCents === null
                        ? "--"
                        : formatMoneyFromCents(exactDifferenceCents, data.groupCurrency)
                      : moneyLabel}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4">
                <div className="flex -space-x-2">
                  {selectedMembers.slice(0, 4).map((member, index) => (
                    <span
                      key={member.id}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border border-surface-container-low text-xs font-headline font-bold",
                        index === 0
                          ? "bg-primary/22 text-primary"
                          : "bg-surface-container-low text-on-surface",
                      )}
                    >
                      {getInitials(member.name)}
                    </span>
                  ))}
                  {selectedMembers.length > 4 ? (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-container-low bg-surface-container-low text-xs font-headline font-bold text-on-surface">
                      +{selectedMembers.length - 4}
                    </span>
                  ) : null}
                </div>
                <span className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">
                  {splitType === "equal"
                    ? "Auto-rounded in cents"
                    : splitSummary.tone === "matched"
                      ? "Ready to save"
                      : "Needs attention"}
                </span>
              </div>

              {formError ? <p className="mt-4 text-sm text-secondary">{formError}</p> : null}

              <Button type="submit" size="lg" fullWidth className="mt-5" disabled={!canPersist}>
                {isSaving
                  ? isEditMode
                    ? "Updating expense..."
                    : "Saving expense..."
                  : isEditMode
                    ? "Update expense"
                    : "Save expense"}
              </Button>

              {isEditMode ? (
                showDeleteConfirmation ? (
                  <div className="mt-4 rounded-[1.5rem] border border-secondary/25 bg-secondary/8 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-secondary/12 text-secondary">
                        <AlertTriangle className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="font-headline text-base font-semibold text-on-surface">
                          Delete this expense?
                        </p>
                        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                          This permanently removes the expense and its share rows from the group ledger.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowDeleteConfirmation(false);
                        }}
                      >
                        Keep expense
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          void handleDelete();
                        }}
                        disabled={isDeleting || isMock || !onDeleteExpense}
                        className="border-secondary/25 text-secondary hover:bg-secondary/10 hover:text-secondary"
                      >
                        {isDeleting ? "Deleting..." : "Delete expense"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirmation(true);
                    }}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-secondary transition hover:text-secondary"
                    disabled={isSaving}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete expense
                  </button>
                )
              ) : null}
            </SurfaceCard>

            <SurfaceCard variant="low" className="rounded-[1.8rem] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <CircleDollarSign className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-on-surface-variant">
                    Composer Notes
                  </p>
                  <p className="mt-2 font-headline text-lg font-semibold text-on-surface">
                    One responsive composer handles create and edit
                  </p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    Equal split behavior stays intact. Exact split uses the same layout with a matched or error state and a total-assigned summary.
                  </p>
                </div>
              </div>
            </SurfaceCard>
          </aside>
        </div>
      </PageContainer>
    </form>
  );
}
