import { HandCoins, Plus, ReceiptText } from "lucide-react";
import Link from "next/link";

import { getShortName, type GroupExpense, type GroupSceneData } from "@/components/groups/group-types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Money, toneTextClass, type BalanceTone } from "@/components/ui/money";
import { formatMoneyFromCents } from "@/lib/format";
import { iconMap } from "@/lib/icon-map";
import { cn } from "@/lib/utils";

const monthLabelFormat = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const weekdayFormat = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const fullDateFormat = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const dayFormat = new Intl.DateTimeFormat("en-US", { day: "numeric" });

function groupByMonth(expenses: GroupExpense[]) {
  const sections: Array<{ key: string; label: string; items: GroupExpense[] }> = [];

  for (const expense of expenses) {
    const date = new Date(expense.expenseAt);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const last = sections[sections.length - 1];
    if (last && last.key === key) {
      last.items.push(expense);
    } else {
      sections.push({ key, label: monthLabelFormat.format(date), items: [expense] });
    }
  }

  return sections;
}

function describeExpenseNet(expense: GroupExpense): { label: string; tone: BalanceTone; showAmount: boolean } {
  if (expense.currentUserNetCents > 0) {
    return { label: "you lent", tone: "positive", showAmount: true };
  }
  if (expense.currentUserNetCents < 0) {
    return { label: "you borrowed", tone: "negative", showAmount: true };
  }
  if (expense.paidByCurrentUser) {
    return { label: "your share only", tone: "neutral", showAmount: false };
  }
  return { label: "not involved", tone: "neutral", showAmount: false };
}

export type GroupExpensePager = {
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  loadMore: () => void;
};

export function GroupExpenseList({
  group,
  pager,
  onOpenEntry,
}: {
  group: GroupSceneData;
  pager?: GroupExpensePager;
  onOpenEntry: (expense: GroupExpense) => void;
}) {
  const expenses = [...group.recentExpenses].sort((left, right) => right.expenseAt - left.expenseAt);
  const allNames = group.members.map((member) => member.name);

  if (expenses.length === 0) {
    return <GroupExpenseEmptyState groupId={group.groupId} />;
  }

  const sections = groupByMonth(expenses);
  const hiddenCount = Math.max(group.expenseCount - expenses.length, 0);

  return (
    <section
      aria-labelledby="group-expenses-heading"
      className="space-y-1 lg:rounded-3xl lg:bg-surface-container-low lg:p-3 lg:ring-1 lg:ring-white/5"
    >
      <h2 id="group-expenses-heading" className="sr-only">
        Expenses
      </h2>
      {sections.map((section) => (
        <div key={section.key}>
          <h3 className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-1 bg-surface/95 px-3 py-2 text-xs font-semibold text-on-surface-variant backdrop-blur-sm lg:static lg:mx-0 lg:bg-transparent lg:px-2 lg:backdrop-blur-none">
            {section.label}
          </h3>
          <ul className="space-y-1">
            {section.items.map((expense) => (
              <li key={expense.id}>
                <GroupExpenseRow
                  currency={group.groupCurrency}
                  expense={expense}
                  allNames={allNames}
                  onOpen={onOpenEntry}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
      {pager && (pager.status === "CanLoadMore" || pager.status === "LoadingMore") ? (
        <div className="px-1 pt-3">
          <Button
            variant="ghost"
            fullWidth
            onClick={pager.loadMore}
            disabled={pager.status === "LoadingMore"}
            aria-busy={pager.status === "LoadingMore"}
          >
            {pager.status === "LoadingMore" ? "Loading…" : "Show older expenses"}
          </Button>
        </div>
      ) : !pager && hiddenCount > 0 ? (
        <p className="px-2 pt-3 text-xs text-on-surface-variant">
          Showing the {expenses.length} most recent of {group.expenseCount} entries.
        </p>
      ) : null}
    </section>
  );
}

function DateBlock({ timestamp }: { timestamp: number }) {
  return (
    <div className="flex w-8 shrink-0 flex-col items-center leading-none" aria-hidden="true">
      <span className="text-xs text-on-surface-variant">{weekdayFormat.format(timestamp)}</span>
      <span className="mt-1 font-headline text-lg font-bold text-on-surface">{dayFormat.format(timestamp)}</span>
    </div>
  );
}

const rowClass =
  "flex min-h-16 w-full items-center gap-2.5 rounded-2xl px-1.5 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:gap-3 sm:px-2";

function GroupExpenseRow({
  currency,
  expense,
  allNames,
  onOpen,
}: {
  currency: string;
  expense: GroupExpense;
  allNames: string[];
  onOpen: (expense: GroupExpense) => void;
}) {
  const payer = expense.paidByCurrentUser ? "You" : getShortName(expense.paidByName, allNames);
  const dateLabel = fullDateFormat.format(expense.expenseAt);

  if (expense.kind === "settlement") {
    const recipient = expense.counterpartyIsCurrentUser
      ? "you"
      : getShortName(expense.counterpartyName ?? "a member", allNames);
    const label = expense.paidByCurrentUser
      ? "you paid"
      : expense.counterpartyIsCurrentUser
        ? "you received"
        : "settlement";

    return (
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => onOpen(expense)}
        className={cn(rowClass, "bg-primary/[0.05] ring-1 ring-inset ring-primary/10 hover:bg-primary/[0.09]")}
      >
        <span className="sr-only">{dateLabel}, </span>
        <DateBlock timestamp={expense.expenseAt} />
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <HandCoins aria-hidden="true" className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-on-surface">
            {payer} paid {recipient}
          </span>
          <span className="block truncate text-xs text-on-surface-variant">Settlement</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-xs text-on-surface-variant">{label}</span>
          <Money cents={expense.amountCents} currency={currency} className="block font-headline text-sm font-bold text-on-surface" />
        </span>
      </button>
    );
  }

  const Icon = iconMap[expense.iconKey];
  const net = describeExpenseNet(expense);

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => onOpen(expense)}
      className={cn(rowClass, "hover:bg-white/4")}
    >
      <span className="sr-only">{dateLabel}, </span>
      <DateBlock timestamp={expense.expenseAt} />
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-on-surface">{expense.description}</span>
        <span className="block truncate text-xs text-on-surface-variant">
          {payer} paid {formatMoneyFromCents(expense.amountCents, currency)}
          <span className="hidden sm:inline">
            {" "}
            · split {expense.participantCount} {expense.participantCount === 1 ? "way" : "ways"}
          </span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className={cn("block text-xs", net.tone === "neutral" ? "text-on-surface-variant" : toneTextClass[net.tone])}>
          {net.label}
        </span>
        {net.showAmount ? (
          <Money
            cents={expense.currentUserNetCents}
            currency={currency}
            tone={net.tone}
            className="block font-headline text-sm font-bold"
          />
        ) : null}
      </span>
    </button>
  );
}

function GroupExpenseEmptyState({ groupId }: { groupId: string }) {
  return (
    <section className="flex flex-col items-center gap-4 rounded-3xl bg-surface-container-low px-6 py-10 text-center ring-1 ring-white/5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <ReceiptText aria-hidden="true" className="h-6 w-6" />
      </div>
      <p className="max-w-xs text-sm text-on-surface-variant">
        No expenses yet. Add one and everyone&apos;s balance updates automatically.
      </p>
      <Link href={`/groups/${groupId}/expenses/new`} className={buttonVariants({ variant: "primary" })}>
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add the first expense
      </Link>
    </section>
  );
}
