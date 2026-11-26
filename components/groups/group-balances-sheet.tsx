"use client";

import type { GroupMember } from "@/components/groups/group-types";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

function describeMemberBalance(member: GroupMember) {
  if (member.balanceCents > 0) {
    return { label: member.isCurrentUser ? "you get back" : "gets back", tone: "positive" as const };
  }

  if (member.balanceCents < 0) {
    return { label: member.isCurrentUser ? "you owe" : "owes", tone: "negative" as const };
  }

  return { label: "settled up", tone: "neutral" as const };
}

/** Every member's net position in the group, in words + amount. Viewer first, then by magnitude. */
export function GroupMemberBalanceList({
  members,
  currency,
  className,
}: {
  members: GroupMember[];
  currency: string;
  className?: string;
}) {
  const sorted = [...members].sort((left, right) => {
    if (left.isCurrentUser !== right.isCurrentUser) {
      return left.isCurrentUser ? -1 : 1;
    }
    return Math.abs(right.balanceCents) - Math.abs(left.balanceCents);
  });

  return (
    <ul className={cn("divide-y divide-white/5", className)}>
      {sorted.map((member) => {
        const balance = describeMemberBalance(member);
        return (
          <li key={member.id} className="flex min-h-14 items-center gap-3 py-2">
            <UserAvatar name={member.name} imageUrl={member.imageUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-on-surface">
                {member.name}
                {member.isCurrentUser ? <span className="font-normal text-on-surface-variant"> (you)</span> : null}
              </p>
              <p className="text-xs text-on-surface-variant">
                Paid <Money cents={member.paidCents} currency={currency} /> · share{" "}
                <Money cents={member.owedCents} currency={currency} />
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-on-surface-variant">{balance.label}</p>
              {balance.tone !== "neutral" ? (
                <Money
                  cents={member.balanceCents}
                  currency={currency}
                  tone={balance.tone}
                  className="font-headline text-sm font-bold"
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function GroupBalancesSheet({
  open,
  onClose,
  members,
  currency,
  onSettleUp,
  canSettle,
}: {
  open: boolean;
  onClose: () => void;
  members: GroupMember[];
  currency: string;
  onSettleUp: () => void;
  canSettle: boolean;
}) {
  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title="Balances"
      description="What each member gets back or owes across every expense in this group."
    >
      <div className="space-y-4">
        <GroupMemberBalanceList members={members} currency={currency} className="-mt-1" />
        {canSettle ? (
          <Button variant="primary" size="lg" fullWidth onClick={onSettleUp}>
            Settle up
          </Button>
        ) : null}
      </div>
    </ResponsiveDialog>
  );
}
