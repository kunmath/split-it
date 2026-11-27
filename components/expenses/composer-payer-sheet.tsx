"use client";

import { Check } from "lucide-react";

import type { ComposerMember } from "@/components/expenses/composer-model";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

type ComposerPayerSheetProps = {
  open: boolean;
  onClose: () => void;
  members: ComposerMember[];
  paidById: string;
  onSelect: (memberId: string) => void;
};

export function ComposerPayerSheet({ open, onClose, members, paidById, onSelect }: ComposerPayerSheetProps) {
  return (
    <ResponsiveDialog open={open} onClose={onClose} title="Who paid?" size="compact">
      <ul className="-mx-1 space-y-1" role="radiogroup" aria-label="Payer">
        {members.map((member) => {
          const isSelected = member.id === paidById;

          return (
            <li key={member.id}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-autofocus={isSelected ? true : undefined}
                onClick={() => {
                  onSelect(member.id);
                  onClose();
                }}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  isSelected ? "bg-primary/10" : "hover:bg-white/4",
                )}
              >
                <UserAvatar name={member.name} imageUrl={member.imageUrl} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-headline text-base font-semibold text-on-surface">
                    {member.isCurrentUser ? "You" : member.name}
                  </span>
                  {member.isCurrentUser ? (
                    <span className="block truncate text-xs text-on-surface-variant">{member.name}</span>
                  ) : null}
                </span>
                {isSelected ? <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </ResponsiveDialog>
  );
}
