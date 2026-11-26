"use client";

import { useMutation, useQuery } from "convex/react";
import { HandCoins, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { getMockEntryDetail } from "@/components/groups/group-mock-data";
import { getShortName, type GroupEntryDetail, type GroupExpense } from "@/components/groups/group-types";
import { getErrorMessage } from "@/components/groups/settings-helpers";
import { Button, buttonVariants } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SkeletonBlock } from "@/components/ui/skeletons";
import { showToast } from "@/components/ui/toast";
import { UserAvatar } from "@/components/ui/user-avatar";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { iconMap } from "@/lib/icon-map";
import { cn } from "@/lib/utils";

const fullDateFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const splitTypeLabel: Record<GroupEntryDetail["splitType"], string> = {
  equal: "Split equally",
  exact: "Split by exact amounts",
  shares: "Split by shares",
};

const dangerButtonClass =
  "border-secondary/40 bg-secondary/10 text-secondary hover:bg-secondary/20 hover:text-secondary";

type EntrySheetProps = {
  /** The tapped ledger row; its summary renders instantly while the detail loads. */
  entry: GroupExpense | null;
  groupId: string;
  currency: string;
  onClose: () => void;
};

export function MockGroupEntrySheet({ entry, groupId, currency, onClose }: EntrySheetProps) {
  const detail = entry ? getMockEntryDetail(groupId, entry.id) : null;

  return (
    <EntrySheetFrame
      key={entry?.id ?? "closed"}
      entry={entry}
      detail={detail}
      groupId={groupId}
      currency={currency}
      onClose={onClose}
      onDelete={async () => {
        showToast("Demo data – nothing was deleted");
        onClose();
      }}
    />
  );
}

export function LiveGroupEntrySheet({ entry, groupId, currency, onClose }: EntrySheetProps) {
  const detail = useQuery(
    api.expenses.getEntryDetail,
    entry ? { expenseId: entry.id as Id<"expenses"> } : "skip",
  );
  const deleteExpense = useMutation(api.expenses.deleteExpense);

  return (
    <EntrySheetFrame
      key={entry?.id ?? "closed"}
      entry={entry}
      detail={detail === undefined ? undefined : detail === null ? null : { ...detail, groupId: String(detail.groupId) }}
      groupId={groupId}
      currency={currency}
      onClose={onClose}
      onDelete={async () => {
        if (!entry) {
          return;
        }
        await deleteExpense({ expenseId: entry.id as Id<"expenses"> });
        showToast(entry.kind === "settlement" ? "Settlement deleted" : "Expense deleted");
        onClose();
      }}
    />
  );
}

function EntrySheetFrame({
  entry,
  detail,
  groupId,
  currency,
  onClose,
  onDelete,
}: EntrySheetProps & {
  /** undefined while loading, null when the entry no longer exists. */
  detail: GroupEntryDetail | null | undefined;
  onDelete: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!entry) {
    return null;
  }

  const isSettlement = entry.kind === "settlement";
  const noun = isSettlement ? "settlement" : "expense";

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, `Couldn't delete this ${noun}. Please try again.`));
      setIsDeleting(false);
    }
  };

  if (confirming) {
    return (
      <ResponsiveDialog
        open
        onClose={onClose}
        tone="danger"
        size="compact"
        title={`Delete this ${noun}?`}
        description={
          isSettlement
            ? "The payment will be removed and both balances will go back to what they were."
            : "It will be removed from the group and everyone's balances will update."
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" size="lg" onClick={() => setConfirming(false)} data-autofocus>
            Keep it
          </Button>
          <Button
            variant="ghost"
            size="lg"
            disabled={isDeleting}
            aria-busy={isDeleting}
            onClick={handleDelete}
            className={dangerButtonClass}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-secondary">
            {error}
          </p>
        ) : null}
      </ResponsiveDialog>
    );
  }

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={isSettlement ? "Settlement" : entry.description}
    >
      {isSettlement ? (
        <SettlementBody entry={entry} detail={detail} currency={currency} />
      ) : (
        <ExpenseBody entry={entry} detail={detail} currency={currency} />
      )}

      {detail === null ? (
        <p className="rounded-2xl bg-white/4 px-4 py-3 text-sm text-on-surface-variant">
          This {noun} was deleted or is no longer available.
        </p>
      ) : null}

      {detail?.notes ? (
        <div className="rounded-2xl bg-surface-container-high px-4 py-3">
          <p className="text-xs font-semibold text-on-surface-variant">Note</p>
          <p className="mt-1 whitespace-pre-line text-sm text-on-surface">{detail.notes}</p>
        </div>
      ) : null}

      {detail?.canEdit ? (
        <div className={cn("grid gap-2", isSettlement ? "grid-cols-1" : "grid-cols-2")}>
          {isSettlement ? null : (
            <Link
              href={`/groups/${groupId}/expenses/${entry.id}/edit`}
              className={buttonVariants({ variant: "primary", size: "lg" })}
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              Edit
            </Link>
          )}
          <Button variant="ghost" size="lg" onClick={() => setConfirming(true)} className={dangerButtonClass}>
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Delete
          </Button>
        </div>
      ) : detail ? (
        <p className="text-xs text-on-surface-variant">
          Only the person who added this {noun} or the group owner can change it.
        </p>
      ) : null}
    </ResponsiveDialog>
  );
}

function SettlementBody({
  entry,
  detail,
  currency,
}: {
  entry: GroupExpense;
  detail: GroupEntryDetail | null | undefined;
  currency: string;
}) {
  const payerName = detail?.paidBy.name ?? entry.paidByName;
  const recipientName = detail?.shares[0]?.name ?? entry.counterpartyName ?? "a member";
  const names = [payerName, recipientName];
  const payer = entry.paidByCurrentUser ? "You" : getShortName(payerName, names);
  const recipient = entry.counterpartyIsCurrentUser ? "you" : getShortName(recipientName, names);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-primary/[0.06] p-4 ring-1 ring-inset ring-primary/10">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
        <HandCoins aria-hidden="true" className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-base text-on-surface">
          <span className="font-semibold">{payer}</span> paid <span className="font-semibold">{recipient}</span>{" "}
          <Money cents={entry.amountCents} currency={currency} className="font-headline font-bold" />
        </p>
        <p className="mt-0.5 text-xs text-on-surface-variant">{fullDateFormat.format(entry.expenseAt)}</p>
      </div>
    </div>
  );
}

function describeNet(netCents: number, paidByViewer: boolean) {
  if (netCents > 0) {
    return { label: "you lent", tone: "positive" as const };
  }
  if (netCents < 0) {
    return { label: "you borrowed", tone: "negative" as const };
  }
  return { label: paidByViewer ? "you paid only your share" : "you're not involved", tone: "neutral" as const };
}

function ExpenseBody({
  entry,
  detail,
  currency,
}: {
  entry: GroupExpense;
  detail: GroupEntryDetail | null | undefined;
  currency: string;
}) {
  const Icon = iconMap[entry.iconKey];
  const payerName = detail?.paidBy.name ?? entry.paidByName;
  const payer = entry.paidByCurrentUser
    ? "You"
    : getShortName(payerName, detail?.shares.map((share) => share.name) ?? [payerName]);
  const netCents = detail?.currentUserNetCents ?? entry.currentUserNetCents;
  const net = describeNet(netCents, entry.paidByCurrentUser);
  const splitType = detail?.splitType ?? entry.splitType;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/6 text-on-surface-variant">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-headline text-3xl font-bold tracking-tight text-on-surface">
            <Money cents={entry.amountCents} currency={currency} />
          </p>
          <p className="mt-0.5 text-xs text-on-surface-variant">{fullDateFormat.format(entry.expenseAt)}</p>
        </div>
      </div>

      <div className="space-y-1 text-sm text-on-surface">
        <p>
          <span className="font-semibold">{payer}</span> paid{" "}
          <Money cents={entry.amountCents} currency={currency} className="font-semibold" />
        </p>
        <p className={cn(net.tone === "positive" && "text-primary", net.tone === "negative" && "text-secondary", net.tone === "neutral" && "text-on-surface-variant")}>
          {net.label}
          {net.tone !== "neutral" ? (
            <>
              {" "}
              <Money cents={netCents} currency={currency} className="font-semibold" />
            </>
          ) : null}
        </p>
      </div>

      <section aria-label="Shares">
        <p className="text-xs font-semibold text-on-surface-variant">
          {splitTypeLabel[splitType]}
          {detail ? ` · ${detail.shares.length} ${detail.shares.length === 1 ? "share" : "shares"}` : null}
        </p>
        {detail === undefined ? (
          <div className="mt-2 space-y-3" aria-busy="true" aria-label="Loading shares">
            {Array.from({ length: Math.min(entry.participantCount || 2, 4) }, (_, index) => (
              <div key={index} className="flex items-center gap-3">
                <SkeletonBlock className="h-8 w-8 shrink-0 rounded-full" />
                <SkeletonBlock className="h-4 flex-1 rounded-md" />
                <SkeletonBlock className="h-4 w-16 rounded-md" />
              </div>
            ))}
          </div>
        ) : detail ? (
          <ul className="mt-1 divide-y divide-white/5">
            {detail.shares.map((share) => {
              const isPayer = share.userId === detail.paidBy.id;
              return (
                <li key={share.userId} className="flex min-h-11 items-center gap-3 py-1.5">
                  <UserAvatar name={share.isCurrentUser ? "You" : share.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-on-surface">
                      {share.isCurrentUser ? "You" : share.name}
                    </p>
                    {isPayer ? <p className="text-xs text-on-surface-variant">paid the bill</p> : null}
                  </div>
                  <Money
                    cents={share.shareCents}
                    currency={currency}
                    className="shrink-0 text-sm font-semibold text-on-surface"
                  />
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
