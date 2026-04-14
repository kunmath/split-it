"use client";

import { useMutation, useQuery } from "convex/react";
import {
  CalendarDays,
  Check,
  CircleDollarSign,
  ImagePlus,
  LoaderCircle,
  NotebookPen,
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
import { SurfaceCard } from "@/components/ui/surface-card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMoneyFromCents } from "@/lib/format";
import { getGroupDetail } from "@/lib/placeholder-data";
import { cn, getInitials } from "@/lib/utils";

type ExpenseComposerScreenProps = {
  groupId: string;
};

type ComposerMember = {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
  role: "owner" | "member";
  isCurrentUser: boolean;
};

type ComposerSceneData = {
  groupId: string;
  groupName: string;
  groupCurrency: string;
  members: ComposerMember[];
};

type FormErrors = {
  amount?: string;
  description?: string;
  expenseAt?: string;
  participants?: string;
  payer?: string;
};

type ExpenseDraft = {
  description: string;
  amountCents: number;
  paidBy: string;
  participantIds: string[];
  expenseAt: number;
  notes?: string;
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
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency
  );
}

function buildMockComposerData(groupId: string): ComposerSceneData {
  const group = getGroupDetail(groupId);

  return {
    groupId,
    groupName: group.title,
    groupCurrency: group.currency,
    members: MOCK_MEMBERS,
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
  };
}

function LoadingComposerState() {
  return (
    <PageContainer className="flex min-h-[70vh] items-center justify-center px-4 py-16 sm:px-6 lg:px-12">
      <SurfaceCard variant="high" className="mx-auto max-w-2xl space-y-4 rounded-[2.4rem] text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LoaderCircle className="h-7 w-7 animate-spin" />
        </div>
        <div>
          <p className="font-headline text-3xl font-bold tracking-tight text-on-surface">Loading composer</p>
          <p className="mt-2 text-sm leading-7 text-on-surface-variant">
            Pulling active members, payer options, and the group ledger into the expense draft.
          </p>
        </div>
      </SurfaceCard>
    </PageContainer>
  );
}

function SyncingComposerState() {
  return (
    <PageContainer className="flex min-h-[70vh] items-center justify-center px-4 py-16 sm:px-6 lg:px-12">
      <SurfaceCard variant="high" className="mx-auto max-w-2xl space-y-4 rounded-[2.4rem] text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LoaderCircle className="h-7 w-7 animate-spin" />
        </div>
        <div>
          <p className="font-headline text-3xl font-bold tracking-tight text-on-surface">Syncing your workspace</p>
          <p className="mt-2 text-sm leading-7 text-on-surface-variant">
            Your session is authenticated, but the Split-it user record is still finishing setup.
          </p>
        </div>
      </SurfaceCard>
    </PageContainer>
  );
}

function UnavailableComposerState({ groupId }: { groupId: string }) {
  return (
    <PageContainer className="flex min-h-[70vh] items-center justify-center px-4 py-16 sm:px-6 lg:px-12">
      <SurfaceCard variant="high" className="mx-auto max-w-2xl space-y-5 rounded-[2.4rem] text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10 text-secondary">
          <Users className="h-7 w-7" />
        </div>
        <div>
          <p className="font-headline text-3xl font-bold tracking-tight text-on-surface">Group unavailable</p>
          <p className="mt-2 text-sm leading-7 text-on-surface-variant">
            You do not have access to this group, or it is no longer active.
          </p>
        </div>
        <div className="flex justify-center">
          <Link href={`/groups/${groupId}`} className={buttonVariants({ variant: "primary", size: "lg" })}>
            Back to group
          </Link>
        </div>
      </SurfaceCard>
    </PageContainer>
  );
}

export function ExpenseComposerScreen({ groupId }: ExpenseComposerScreenProps) {
  const { mode } = usePlaceholderMode();

  if (mode !== "live") {
    return <ExpenseComposerScene data={buildMockComposerData(groupId)} isMock />;
  }

  return <LiveExpenseComposerScreen groupId={groupId} />;
}

function LiveExpenseComposerScreen({ groupId }: ExpenseComposerScreenProps) {
  const router = useRouter();
  const currentUser = useQuery(api.users.current);
  const composer = useQuery(
    api.expenses.getComposerData,
    currentUser ? { groupId: groupId as Id<"groups"> } : "skip",
  );
  const createEqualSplit = useMutation(api.expenses.createEqualSplit);

  if (currentUser === undefined || composer === undefined) {
    return <LoadingComposerState />;
  }

  if (currentUser === null) {
    return <SyncingComposerState />;
  }

  if (composer === null) {
    return <UnavailableComposerState groupId={groupId} />;
  }

  return (
    <ExpenseComposerScene
      data={buildSceneData(composer)}
      onSaveExpense={async (draft) => {
        await createEqualSplit({
          groupId: groupId as Id<"groups">,
          description: draft.description,
          amountCents: draft.amountCents,
          paidBy: draft.paidBy as Id<"users">,
          participantIds: draft.participantIds as Id<"users">[],
          expenseAt: draft.expenseAt,
          notes: draft.notes,
        });

        startTransition(() => {
          router.push(`/groups/${groupId}`);
        });
      }}
    />
  );
}

function ExpenseComposerScene({
  data,
  isMock = false,
  onSaveExpense,
}: {
  data: ComposerSceneData;
  isMock?: boolean;
  onSaveExpense?: (draft: ExpenseDraft) => Promise<void>;
}) {
  const defaultPayerId =
    data.members.find((member) => member.isCurrentUser)?.id ??
    data.members[0]?.id ??
    "";
  const [amountInput, setAmountInput] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [expenseDate, setExpenseDate] = useState(getTodayDateInputValue());
  const [paidById, setPaidById] = useState(defaultPayerId);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState(
    data.members.map((member) => member.id),
  );
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const amountCents = parseAmountInputToCents(amountInput);
  const sharePreview = buildEqualSharePreview(
    amountCents && amountCents > 0 ? amountCents : 0,
    selectedParticipantIds,
  );
  const payer = data.members.find((member) => member.id === paidById) ?? null;
  const selectedMembers = data.members.filter((member) => selectedParticipantIds.includes(member.id));
  const firstSelectedId = selectedParticipantIds[0];
  const perPersonCents =
    firstSelectedId && sharePreview.has(firstSelectedId) ? sharePreview.get(firstSelectedId) ?? 0 : 0;
  const hasInvalidAmount = amountCents === null;
  const canPersist = Boolean(onSaveExpense) && !isSaving && data.members.length > 0;
  const moneyLabel =
    amountCents === null ? "Invalid amount" : formatMoneyFromCents(amountCents, data.groupCurrency);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!onSaveExpense) {
      return;
    }

    const nextErrors: FormErrors = {};
    const trimmedDescription = description.trim();
    const timestamp = toExpenseTimestamp(expenseDate);
    const normalizedParticipantIds = Array.from(
      new Set(selectedParticipantIds.filter((participantId) => data.members.some((member) => member.id === participantId))),
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
        participantIds: normalizedParticipantIds,
        expenseAt: timestamp ?? 0,
        notes: notes.trim() || undefined,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save this expense.");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
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
                New Expense
              </h1>
            </div>
          </div>

          <Button type="submit" size="md" className="shrink-0 px-5 sm:px-6" disabled={!canPersist}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </PageContainer>
      </header>

      <PageContainer className="px-4 pt-6 sm:px-6 lg:px-12 lg:pt-10">
        {isMock ? (
          <div className="mb-6 rounded-[1.5rem] border border-primary/15 bg-primary/8 px-4 py-3 text-sm text-on-surface-variant">
            Preview mode only. The responsive composer is live, but saving requires a live Clerk + Convex setup.
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(340px,0.88fr)] xl:items-start">
          <section className="space-y-6 lg:space-y-8">
            <section className="space-y-3 pt-2">
              <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">Expense Amount</p>
              <div className="flex items-end gap-3">
                <span className="pb-3 font-headline text-4xl font-extrabold text-primary sm:text-5xl">
                  {getCurrencyToken(data.groupCurrency)}
                </span>
                <input
                  value={amountInput}
                  onChange={(event) => {
                    setAmountInput(event.target.value);
                    setFieldErrors((current) => ({ ...current, amount: undefined }));
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
                      setFieldErrors((current) => ({ ...current, description: undefined }));
                      setFormError(null);
                    }}
                    placeholder="Sushi dinner, cabin deposit, groceries..."
                    className="w-full border-none bg-transparent p-0 text-lg text-on-surface placeholder:text-on-surface-variant/38 focus:outline-none"
                    aria-invalid={fieldErrors.description ? "true" : undefined}
                  />
                  <p className={cn("text-sm text-on-surface-variant", fieldErrors.description && "text-secondary")}>
                    {fieldErrors.description ?? "Keep the description short so it reads cleanly in the ledger."}
                  </p>
                </div>
              </SurfaceCard>

              <SurfaceCard variant="low" className="rounded-[1.8rem] p-5 sm:p-6">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">Date</p>
                  <label className="flex min-h-13 items-center gap-3 rounded-[1.25rem] bg-surface-container-lowest px-4 ring-1 ring-white/5 transition focus-within:ring-primary/30">
                    <CalendarDays className="h-4.5 w-4.5 text-primary" />
                    <input
                      value={expenseDate}
                      onChange={(event) => {
                        setExpenseDate(event.target.value);
                        setFieldErrors((current) => ({ ...current, expenseAt: undefined }));
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
                  <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">Paid By</p>
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
                      <p className="font-headline text-lg font-semibold text-on-surface">Receipt upload placeholder</p>
                      <p className="text-sm leading-6 text-on-surface-variant">
                        The desktop receipt panel is present for layout parity. Real uploads land in a later phase.
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
                  <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">Split With</p>
                  <h2 className="mt-2 font-headline text-2xl font-bold tracking-tight text-on-surface">
                    Equal split
                  </h2>
                </div>
                <div className="inline-flex rounded-full bg-surface-container-low p-1">
                  <span className="rounded-full bg-surface-container-high px-4 py-2 text-xs font-headline font-semibold uppercase tracking-[0.18em] text-primary">
                    Equal
                  </span>
                  <span className="rounded-full px-4 py-2 text-xs font-headline font-semibold uppercase tracking-[0.18em] text-on-surface-variant/55">
                    Exact later
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedParticipantIds(data.members.map((member) => member.id));
                    setFieldErrors((current) => ({ ...current, participants: undefined }));
                    setFormError(null);
                  }}
                  className="rounded-full bg-surface-container-low px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface transition hover:text-primary"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedParticipantIds([]);
                    setFieldErrors((current) => ({ ...current, participants: undefined }));
                    setFormError(null);
                  }}
                  className="rounded-full bg-surface-container-low px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant transition hover:text-on-surface"
                >
                  Clear
                </button>
                <span className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">
                  {selectedParticipantIds.length} selected
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {data.members.map((member) => {
                  const isIncluded = selectedParticipantIds.includes(member.id);
                  const memberShareCents = sharePreview.get(member.id) ?? 0;

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setSelectedParticipantIds((current) => {
                          if (current.includes(member.id)) {
                            return current.filter((participantId) => participantId !== member.id);
                          }

                          return [...current, member.id];
                        });
                        setFieldErrors((current) => ({ ...current, participants: undefined }));
                        setFormError(null);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-4 rounded-[1.5rem] px-4 py-4 text-left transition",
                        isIncluded ? "bg-surface-container-low" : "bg-surface-container-lowest/80",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-4">
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
                      </div>

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
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md ring-1 ring-white/10 transition",
                            isIncluded ? "bg-primary text-on-primary" : "bg-surface-container-high text-transparent",
                          )}
                        >
                          <Check className="h-4 w-4" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {fieldErrors.participants ? (
                <p className="mt-3 text-sm text-secondary">{fieldErrors.participants}</p>
              ) : null}
            </SurfaceCard>

            <SurfaceCard variant="low" className="rounded-[1.8rem] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <CircleDollarSign className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-on-surface-variant">Split Options</p>
                  <p className="mt-2 font-headline text-lg font-semibold text-on-surface">
                    Equal split is live in Phase 6
                  </p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    Exact amounts and other advanced controls stay intentionally collapsed until Phase 7.
                  </p>
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard
              variant="hero"
              className="fixed bottom-4 left-4 right-4 z-20 rounded-[2rem] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.36)] sm:left-6 sm:right-6 lg:static lg:p-6 lg:shadow-[0_24px_80px_rgba(0,0,0,0.36)] xl:sticky xl:top-28"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-primary">Split Summary</p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-on-surface-variant">Total</p>
                  <p className="mt-1 font-headline text-3xl font-extrabold text-on-surface">{moneyLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-on-surface-variant">Per Person</p>
                  <p className="mt-1 font-headline text-2xl font-extrabold text-secondary">
                    {selectedParticipantIds.length === 0 || hasInvalidAmount
                      ? "--"
                      : formatMoneyFromCents(perPersonCents, data.groupCurrency)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 border-t border-white/8 pt-5 text-sm text-on-surface-variant">
                <div className="flex items-center justify-between gap-4">
                  <span>Payer</span>
                  <span className="font-medium text-on-surface">{payer?.name ?? "Select a payer"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Participants</span>
                  <span className="font-medium text-on-surface">
                    {selectedParticipantIds.length} {selectedParticipantIds.length === 1 ? "person" : "people"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Split type</span>
                  <span className="font-medium uppercase tracking-[0.16em] text-primary">Equal</span>
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
                  {selectedMembers.length === 0 ? "Nobody selected" : "Auto-rounded in cents"}
                </span>
              </div>

              {formError ? <p className="mt-4 text-sm text-secondary">{formError}</p> : null}

              <Button
                type="submit"
                size="lg"
                fullWidth
                className="mt-5"
                disabled={!canPersist}
              >
                {isSaving ? "Saving expense..." : "Save expense"}
              </Button>
            </SurfaceCard>
          </aside>
        </div>
      </PageContainer>
    </form>
  );
}
