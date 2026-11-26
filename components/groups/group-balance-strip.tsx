"use client";

import { ChevronRight, HandCoins, Scale } from "lucide-react";

import {
  getShortName,
  type GroupSceneData,
} from "@/components/groups/group-types";
import type { SettleUpPreset } from "@/components/groups/settle-up-dialog";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";

const MAX_COUNTERPARTY_LINES = 3;

const chipClass =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:pointer-events-none disabled:opacity-50";

/** Personal standing + top counterparties, with Settle up / Balances actions. */
export function GroupBalanceStrip({
  group,
  onSettleUp,
  onShowBalances,
  showActions = true,
  className,
}: {
  group: GroupSceneData;
  onSettleUp: (preset?: SettleUpPreset) => void;
  onShowBalances: () => void;
  /** Desktop places Settle up in the page heading and shows balances inline. */
  showActions?: boolean;
  className?: string;
}) {
  const balanceCents = group.currentStanding.balanceCents;
  const currency = group.groupCurrency;
  const allNames = group.members.map((member) => member.name);
  const suggestions = [...group.suggestedSettlements].sort(
    (left, right) => right.amountCents - left.amountCents,
  );
  const visible = suggestions.slice(0, MAX_COUNTERPARTY_LINES);
  const hiddenCount = suggestions.length - visible.length;
  const canSettle = group.memberCount > 1;

  return (
    <section
      aria-label="Your balance in this group"
      className={cn(
        "rounded-3xl bg-surface-container-low p-4 ring-1 ring-white/5 sm:p-5",
        className,
      )}
    >
      <p className="font-headline text-xl font-bold tracking-tight text-on-surface">
        {balanceCents > 0 ? (
          <>
            You are owed{" "}
            <Money cents={balanceCents} currency={currency} tone="positive" />
          </>
        ) : balanceCents < 0 ? (
          <>
            You owe{" "}
            <Money cents={balanceCents} currency={currency} tone="negative" />
          </>
        ) : (
          "You're settled up in this group"
        )}
      </p>

      {visible.length > 0 ? (
        <ul className="-mx-2 mt-2">
          {visible.map((suggestion) => {
            const name = getShortName(suggestion.counterpartyName, allNames);
            const isIncoming = suggestion.direction === "youReceive";
            return (
              <li key={`${suggestion.counterpartyId}-${suggestion.direction}`}>
                <button
                  type="button"
                  onClick={() =>
                    onSettleUp({
                      counterpartyId: suggestion.counterpartyId,
                      direction: suggestion.direction,
                    })
                  }
                  className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-left text-sm text-on-surface transition hover:bg-white/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  aria-label={`${isIncoming ? `${name} owes you` : `You owe ${name}`}: settle up`}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      isIncoming ? "bg-primary" : "bg-secondary",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {isIncoming ? (
                      <>
                        <span className="font-semibold">{name}</span> owes
                        you{" "}
                      </>
                    ) : (
                      <>
                        You owe{" "}
                        <span className="font-semibold">{name}</span>{" "}
                      </>
                    )}
                    <Money
                      cents={suggestion.amountCents}
                      currency={currency}
                      tone={isIncoming ? "positive" : "negative"}
                      className="font-semibold"
                    />
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-on-surface-variant"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : group.expenseCount === 0 ? (
        <p className="mt-1 text-sm text-on-surface-variant">
          Balances appear once the first expense is added.
        </p>
      ) : null}

      {hiddenCount > 0 ? (
        <p className="mt-1 text-xs text-on-surface-variant">
          +{hiddenCount} more {hiddenCount === 1 ? "person" : "people"} in
          balances
        </p>
      ) : null}

      {showActions ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onSettleUp()}
            disabled={!canSettle}
            aria-haspopup="dialog"
            className={cn(
              chipClass,
              "bg-primary text-on-primary hover:brightness-110",
            )}
          >
            <HandCoins aria-hidden="true" className="h-4 w-4" />
            Settle up
          </button>
          <button
            type="button"
            onClick={onShowBalances}
            aria-haspopup="dialog"
            className={cn(
              chipClass,
              "bg-white/6 text-on-surface hover:bg-white/10",
            )}
          >
            <Scale aria-hidden="true" className="h-4 w-4" />
            Balances
          </button>
        </div>
      ) : null}
    </section>
  );
}
