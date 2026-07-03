"use client";

import { ConvexError } from "convex/values";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SurfaceCard } from "@/components/ui/surface-card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatMoneyFromCents } from "@/lib/format";

type MemberEntry = {
  id: Id<"users">;
  name: string;
  balanceCents: number;
};

type MembershipManagementCardProps = {
  currency: string;
  currentUserBalanceCents: number;
  groupId: Id<"groups">;
  groupName: string;
  members: MemberEntry[];
  viewerRole: "owner" | "member";
};

function extractErrorMessage(error: unknown) {
  if (error instanceof ConvexError && typeof error.data === "string") {
    return error.data;
  }

  return "Something went wrong. Please try again.";
}

export function MembershipManagementCard({
  currency,
  currentUserBalanceCents,
  groupId,
  groupName,
  members,
  viewerRole,
}: MembershipManagementCardProps) {
  const router = useRouter();
  const leaveGroup = useMutation(api.groups.leaveGroup);
  const removeMember = useMutation(api.groups.removeMember);
  const [confirming, setConfirming] = useState<
    { kind: "leave" } | { kind: "remove"; member: MemberEntry } | null
  >(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeDialog = () => {
    if (!isPending) {
      setConfirming(null);
      setError(null);
    }
  };

  const handleLeave = async () => {
    setIsPending(true);
    setError(null);

    try {
      await leaveGroup({ groupId });
      router.push("/groups");
    } catch (leaveError) {
      setError(extractErrorMessage(leaveError));
      setIsPending(false);
    }
  };

  const handleRemove = async (member: MemberEntry) => {
    setIsPending(true);
    setError(null);

    try {
      await removeMember({ groupId, memberUserId: member.id });
      setIsPending(false);
      setConfirming(null);
    } catch (removeError) {
      setError(extractErrorMessage(removeError));
      setIsPending(false);
    }
  };

  const isOwner = viewerRole === "owner";
  const viewerIsSettled = currentUserBalanceCents === 0;

  return (
    <SurfaceCard variant="low" className="rounded-[2.1rem] p-5 sm:p-6">
      <h2 className="font-headline text-xl font-semibold tracking-tight text-on-surface">
        Membership
      </h2>

      {isOwner ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm leading-6 text-on-surface-variant">
            Members can be removed once their balance is settled to zero. Their
            expense history stays in the group.
          </p>
          {members.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              No other members to manage yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {members.map((member) => {
                const isSettled = member.balanceCents === 0;

                return (
                  <li
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-[1.4rem] bg-surface-container-high px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-on-surface">
                        {member.name}
                      </p>
                      {!isSettled ? (
                        <p className="mt-0.5 text-xs text-on-surface-variant">
                          Unsettled: {formatMoneyFromCents(Math.abs(member.balanceCents), currency)}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      disabled={!isSettled || isPending}
                      title={
                        isSettled
                          ? undefined
                          : "This member has an unsettled balance"
                      }
                      onClick={() => {
                        setError(null);
                        setConfirming({ kind: "remove", member });
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm leading-6 text-on-surface-variant">
            {viewerIsSettled
              ? "You are fully settled, so you can leave this group at any time."
              : `Settle your ${formatMoneyFromCents(Math.abs(currentUserBalanceCents), currency)} balance before leaving so the group's history stays consistent.`}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={!viewerIsSettled || isPending}
            onClick={() => {
              setError(null);
              setConfirming({ kind: "leave" });
            }}
          >
            Leave group
          </Button>
        </div>
      )}

      <ResponsiveDialog
        open={confirming !== null}
        onClose={closeDialog}
        tone="danger"
        eyebrow="Membership"
        title={
          confirming?.kind === "remove"
            ? `Remove ${confirming.member.name}?`
            : `Leave ${groupName}?`
        }
        description={
          confirming?.kind === "remove"
            ? "They lose access to the group, but their past expenses and settlements stay recorded. They can rejoin later with a fresh invite."
            : "You lose access to this group, but your past expenses and settlements stay recorded. You can rejoin later with a fresh invite."
        }
      >
        <div className="space-y-4">
          {error ? (
            <p className="rounded-2xl bg-secondary/10 px-4 py-3 text-sm text-secondary">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="ghost" size="md" onClick={closeDialog} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={isPending}
              onClick={() => {
                if (confirming?.kind === "remove") {
                  void handleRemove(confirming.member);
                } else if (confirming?.kind === "leave") {
                  void handleLeave();
                }
              }}
            >
              {isPending
                ? "Working..."
                : confirming?.kind === "remove"
                  ? "Remove member"
                  : "Leave group"}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </SurfaceCard>
  );
}
