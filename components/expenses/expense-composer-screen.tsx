"use client";

import { useMutation, useQuery } from "convex/react";
import { Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useContext, useState } from "react";

import { ExpenseComposerScene } from "@/components/expenses/composer-scene";
import type {
  ComposerMember,
  ComposerSceneData,
  ExpenseDraft,
  SplitType,
} from "@/components/expenses/composer-model";
import { usePlaceholderMode } from "@/components/providers/app-providers";
import { InAppHistoryContext } from "@/components/shell/mobile-top-bar";
import { buttonVariants } from "@/components/ui/button";
import { ScreenState } from "@/components/ui/screen-state";
import { SkeletonBlock } from "@/components/ui/skeletons";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getMockGroupSceneData } from "@/components/groups/group-mock-data";

type ExpenseComposerScreenProps = {
  groupId: string;
  expenseId?: string;
};

function buildMockComposerData(groupId: string, expenseId?: string): ComposerSceneData {
  // Same demo people as the group detail screen; the viewer is listed first.
  const group = getMockGroupSceneData(groupId);
  const members: ComposerMember[] = group.members.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    isCurrentUser: member.isCurrentUser,
  }));
  const [viewer, second, third] = members;

  return {
    groupId,
    groupName: group.groupName,
    groupCurrency: group.groupCurrency,
    members,
    expense: expenseId
      ? {
          id: expenseId,
          description: "Dinner at Prime",
          amountCents: 12_000,
          paidBy: viewer?.id ?? "",
          splitType: "exact",
          expenseAt: new Date("2024-10-27T12:00:00.000Z").getTime(),
          notes: "Booked the corner table; tip included.",
          shares: [
            { userId: viewer?.id ?? "", shareCents: 4_500 },
            { userId: second?.id ?? "", shareCents: 3_500 },
            { userId: third?.id ?? "", shareCents: 4_000 },
          ],
        }
      : null,
  };
}

function buildSceneData(data: {
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
}): ComposerSceneData {
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

/** Leaves the composer: back to wherever the user came from, else replace with the group page. */
function useExitComposer(groupId: string) {
  const router = useRouter();
  const hasInAppHistory = useContext(InAppHistoryContext);

  return () => {
    startTransition(() => {
      if (hasInAppHistory) {
        router.back();
      } else {
        router.replace(`/groups/${groupId}`);
      }
    });
  };
}

function LoadingComposerState() {
  return (
    <div role="status" aria-label="Loading expense" className="mx-auto w-full max-w-2xl space-y-6 pt-4 lg:pt-0">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-11 w-11 rounded-full" />
        <SkeletonBlock className="h-6 w-36 rounded-lg" />
      </div>
      <SkeletonBlock className="h-8 w-44 rounded-full" />
      <SkeletonBlock className="h-16 w-3/4 rounded-xl" />
      <SkeletonBlock className="h-14 w-full rounded-2xl" />
      <div className="flex flex-wrap gap-2">
        <SkeletonBlock className="h-11 w-24 rounded-full" />
        <SkeletonBlock className="h-11 w-28 rounded-full" />
        <SkeletonBlock className="h-11 w-24 rounded-full" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

function UnavailableComposerState({ groupId, isEditMode }: { groupId: string; isEditMode: boolean }) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center py-16">
      <ScreenState
        state="unavailable"
        title={isEditMode ? "Expense unavailable" : "Group unavailable"}
        description={
          isEditMode
            ? "You can't edit this expense, or it no longer exists."
            : "You don't have access to this group, or it's no longer active."
        }
        icon={<Users className="h-7 w-7 text-secondary" />}
        actions={
          <Link href={`/groups/${groupId}`} className={buttonVariants({ variant: "primary", size: "lg" })}>
            Back to group
          </Link>
        }
      />
    </div>
  );
}

export function ExpenseComposerScreen({ groupId, expenseId }: ExpenseComposerScreenProps) {
  const { mode } = usePlaceholderMode();

  if (mode !== "live") {
    return <MockExpenseComposerScreen key={expenseId ?? "new"} groupId={groupId} expenseId={expenseId} />;
  }

  return <LiveExpenseComposerScreen groupId={groupId} expenseId={expenseId} />;
}

function MockExpenseComposerScreen({ groupId, expenseId }: ExpenseComposerScreenProps) {
  const exitComposer = useExitComposer(groupId);
  const [data] = useState(() => buildMockComposerData(groupId, expenseId));
  const [notice, setNotice] = useState<string | null>(null);

  async function finishWithNotice(message: string) {
    setNotice(message);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    exitComposer();
  }

  return (
    <ExpenseComposerScene
      data={data}
      notice={notice}
      onSaveExpense={() => finishWithNotice("Demo mode — expense not saved")}
      onDeleteExpense={expenseId ? () => finishWithNotice("Demo mode — expense not deleted") : undefined}
    />
  );
}

function LiveExpenseComposerScreen({ groupId, expenseId }: ExpenseComposerScreenProps) {
  const exitComposer = useExitComposer(groupId);
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
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center py-16">
        <ScreenState
          state="loading"
          title="Finishing account setup"
          description="This only takes a moment."
        />
      </div>
    );
  }

  if (composer === undefined) {
    return <LoadingComposerState />;
  }

  if (composer === null) {
    return <UnavailableComposerState groupId={groupId} isEditMode={Boolean(expenseId)} />;
  }

  async function saveExpense(draft: ExpenseDraft) {
    const payload = {
      description: draft.description,
      amountCents: draft.amountCents,
      paidBy: draft.paidBy as Id<"users">,
      splitType: draft.splitType,
      participantIds: draft.participantIds as Id<"users">[],
      exactShares: draft.exactShares?.map((share) => ({
        userId: share.userId as Id<"users">,
        shareCents: share.shareCents,
      })),
      shares: draft.shares?.map((share) => ({
        userId: share.userId as Id<"users">,
        share: share.share,
      })),
      expenseAt: draft.expenseAt,
      notes: draft.notes,
    };

    if (expenseId) {
      await updateExpense({ expenseId: expenseId as Id<"expenses">, ...payload });
    } else {
      await createExpense({ groupId: groupId as Id<"groups">, ...payload });
    }

    exitComposer();
  }

  return (
    <ExpenseComposerScene
      key={expenseId ?? "new"}
      data={buildSceneData(composer)}
      onSaveExpense={saveExpense}
      onDeleteExpense={
        expenseId
          ? async () => {
              await deleteExpense({ expenseId: expenseId as Id<"expenses"> });
              exitComposer();
            }
          : undefined
      }
    />
  );
}
