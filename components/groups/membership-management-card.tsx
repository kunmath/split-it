"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { dangerButtonClass, SettingsNotice } from "@/components/groups/settings-list";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { describeMemberBalance, getErrorMessage, type SettingsMember } from "./settings-helpers";

type MembershipManagementOptions = {
  currency: string;
  groupId: string;
  groupName: string;
};

type Pending = { kind: "member"; member: SettingsMember } | { kind: "leave" } | null;

/**
 * Owner-side member removal and member-side "leave group", with their confirmation sheets.
 * Returns openers plus the sheet element to render once.
 */
export function useMembershipManagement({ currency, groupId, groupName }: MembershipManagementOptions) {
  const router = useRouter();
  const leaveGroup = useMutation(api.groups.leaveGroup);
  const removeMember = useMutation(api.groups.removeMember);
  const [pending, setPending] = useState<Pending>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (!isWorking) {
      setPending(null);
      setError(null);
    }
  };

  const handleLeave = async () => {
    if (isWorking) {
      return;
    }

    setIsWorking(true);
    setError(null);

    try {
      await leaveGroup({ groupId: groupId as Id<"groups"> });
      router.push("/groups");
    } catch (leaveError) {
      setError(getErrorMessage(leaveError));
      setIsWorking(false);
    }
  };

  const handleRemove = async (member: SettingsMember) => {
    if (isWorking) {
      return;
    }

    setIsWorking(true);
    setError(null);

    try {
      await removeMember({ groupId: groupId as Id<"groups">, memberUserId: member.id as Id<"users"> });
      setIsWorking(false);
      setPending(null);
    } catch (removeError) {
      setError(getErrorMessage(removeError));
      setIsWorking(false);
    }
  };

  const member = pending?.kind === "member" ? pending.member : null;
  const firstName = member?.name.split(/\s+/)[0] ?? "";
  const memberStanding = member ? describeMemberBalance(member.balanceCents) : null;
  const canRemove = member !== null && member.role !== "owner" && member.balanceCents === 0;

  const dialog = (
    <ResponsiveDialog
      open={pending !== null}
      onClose={close}
      tone={member && !canRemove ? "default" : "danger"}
      title={member ? member.name : `Leave ${groupName}?`}
      description={
        member
          ? member.email || undefined
          : "You lose access to this group. Your past expenses and payments stay recorded, and you can rejoin later with a new invite."
      }
    >
      <div className="space-y-4">
        {member && memberStanding ? (
          <dl className="divide-y divide-white/[0.06] rounded-2xl bg-white/[0.04] text-sm">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <dt className="text-on-surface-variant">In this group</dt>
              <dd className="flex items-center gap-1.5 font-semibold text-on-surface">
                {memberStanding.label}
                {member.balanceCents !== 0 ? (
                  <Money cents={member.balanceCents} currency={currency} tone={memberStanding.tone} />
                ) : null}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <dt className="text-on-surface-variant">Paid · share</dt>
              <dd className="text-on-surface tabular-nums">
                <Money cents={member.paidCents} currency={currency} /> ·{" "}
                <Money cents={member.owedCents} currency={currency} />
              </dd>
            </div>
          </dl>
        ) : null}

        {member && member.role === "owner" ? (
          <SettingsNotice>The group owner can&apos;t be removed.</SettingsNotice>
        ) : null}
        {member && member.role !== "owner" && member.balanceCents !== 0 ? (
          <SettingsNotice>
            {firstName} needs to settle up before you can remove them. Record a payment from the group screen first.
          </SettingsNotice>
        ) : null}
        {canRemove ? (
          <SettingsNotice>
            Removing {firstName} ends their access. Their past expenses and payments stay in the group, and they can
            rejoin with a new invite.
          </SettingsNotice>
        ) : null}

        {error ? <SettingsNotice tone="error">{error}</SettingsNotice> : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="lg" onClick={close} disabled={isWorking}>
            {member && !canRemove ? "Close" : "Cancel"}
          </Button>
          {member === null ? (
            <Button
              variant="secondary"
              size="lg"
              className={dangerButtonClass}
              disabled={isWorking}
              onClick={() => void handleLeave()}
            >
              {isWorking ? "Leaving…" : "Leave group"}
            </Button>
          ) : canRemove ? (
            <Button
              variant="secondary"
              size="lg"
              className={dangerButtonClass}
              disabled={isWorking}
              onClick={() => void handleRemove(member)}
            >
              {isWorking ? "Removing…" : `Remove ${firstName}`}
            </Button>
          ) : null}
        </div>
      </div>
    </ResponsiveDialog>
  );

  return {
    openMember: (target: SettingsMember) => {
      setError(null);
      setPending({ kind: "member", member: target });
    },
    requestLeave: () => {
      setError(null);
      setPending({ kind: "leave" });
    },
    dialog,
  };
}
