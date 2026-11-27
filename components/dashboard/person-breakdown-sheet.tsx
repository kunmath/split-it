"use client";

import Link from "next/link";

import { buildSettleHref, type PersonBalanceItem } from "@/components/groups/group-list-data";
import { Money, toneFromCents } from "@/components/ui/money";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { formatMoneyFromCents } from "@/lib/format";

const actionClass =
  "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function describeTotal(person: PersonBalanceItem) {
  const amount = formatMoneyFromCents(Math.abs(person.balanceCents), person.currency);
  const name = firstName(person.name);
  if (person.balanceCents === 0) {
    return `Your balances with ${name} offset overall, but each group below still needs settling.`;
  }

  if (person.groups.length === 1) {
    return "Settle up here, or open the group to see the expenses behind it.";
  }

  return person.balanceCents > 0
    ? `Overall, ${name} owes you ${amount} across ${person.groups.length} groups.`
    : `Overall, you owe ${name} ${amount} across ${person.groups.length} groups.`;
}

/** Per-group breakdown of a person's balance. Settling happens per group. */
export function PersonBreakdownSheet({ person, onClose }: { person: PersonBalanceItem | null; onClose: () => void }) {
  return (
    <ResponsiveDialog
      open={person !== null}
      size="compact"
      title={person?.name ?? ""}
      description={person ? describeTotal(person) : undefined}
      onClose={onClose}
    >
      {person ? (
        <ul className="-mx-1 divide-y divide-white/6">
          {person.groups.map((group) => {
            const tone = toneFromCents(group.balanceCents);

            return (
              <li key={group.id} className="space-y-2.5 px-1 py-3 first:pt-0 last:pb-0">
                <p className="text-sm leading-6 text-on-surface-variant">
                  {tone === "positive" ? `${firstName(person.name)} owes you ` : `You owe ${firstName(person.name)} `}
                  <Money
                    cents={group.balanceCents}
                    currency={person.currency}
                    tone={tone}
                    className="font-headline font-bold"
                  />{" "}
                  in <span className="font-semibold text-on-surface">{group.name}</span>
                </p>
                <div className="flex gap-2">
                  <Link
                    href={buildSettleHref(group.href, person.userId)}
                    onClick={onClose}
                    className={`${actionClass} bg-primary/14 text-primary hover:bg-primary/20`}
                    aria-label={`Settle up with ${person.name} in ${group.name}`}
                  >
                    Settle up
                  </Link>
                  <Link
                    href={group.href}
                    onClick={onClose}
                    className={`${actionClass} border border-white/8 text-on-surface-variant hover:bg-white/4 hover:text-on-surface`}
                    aria-label={`Open ${group.name}`}
                  >
                    Open group
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </ResponsiveDialog>
  );
}
