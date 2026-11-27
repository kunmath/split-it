"use client";

import { useConvex, useMutation, useQuery } from "convex/react";
import { Copy, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useRef, useState, type FormEvent } from "react";

import { dangerButtonClass, SettingsNotice } from "@/components/groups/settings-list";
import { Button } from "@/components/ui/button";
import { FilledInput } from "@/components/ui/filled-input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SkeletonBlock } from "@/components/ui/skeletons";
import { showToast } from "@/components/ui/toast";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import {
  buildExpenseExportCsv,
  buildInviteLink,
  createExportFileName,
  downloadCsv,
  formatInviteExpiry,
  getErrorMessage,
  type ExpenseExportRow,
} from "./settings-helpers";

type Options = {
  groupId: string;
  groupName: string;
  isOwner: boolean;
};

/** Rename, invite, export, and archive flows for a live group, plus their sheets. */
export function useGroupSettingsActions({ groupId, groupName, isOwner }: Options) {
  const router = useRouter();
  const convex = useConvex();
  const renameGroup = useMutation(api.groups.rename);
  const createInvite = useMutation(api.invites.create);
  const sendEmailInvite = useMutation(api.invites.sendEmailInvite);
  const archiveGroup = useMutation(api.groups.archive);
  const typedGroupId = groupId as Id<"groups">;

  const [openDialog, setOpenDialogState] = useState<"archive" | "invite" | "rename" | null>(null);
  // Bumped whenever a dialog opens or closes, so a request only updates the dialog session that started it.
  const dialogSessionRef = useRef(0);
  const setOpenDialog = (next: "archive" | "invite" | "rename" | null) => {
    dialogSessionRef.current += 1;
    setOpenDialogState(next);
  };
  const [renameDraft, setRenameDraft] = useState(groupName);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [inviteEmailDraft, setInviteEmailDraft] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [isCopyingInvite, setIsCopyingInvite] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [archiveConfirmation, setArchiveConfirmation] = useState("");
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const composerData = useQuery(
    api.invites.getGroupComposerData,
    openDialog === "invite" ? { groupId: typedGroupId } : "skip",
  );
  const activeInvite = composerData?.activeInvite ?? null;
  const inviteLink = activeInvite ? buildInviteLink(activeInvite.token) : null;
  const matchesArchiveConfirmation = archiveConfirmation.trim() === groupName;

  function closeDialog() {
    setOpenDialog(null);
    setRenameError(null);
    setInviteError(null);
    setArchiveError(null);
  }

  function openRename() {
    if (!isOwner) {
      return;
    }

    setRenameDraft(groupName);
    setRenameError(null);
    setOpenDialog("rename");
  }

  function openInvite() {
    if (!isOwner) {
      return;
    }

    setInviteEmailDraft("");
    setInviteError(null);
    setInviteNotice(null);
    setOpenDialog("invite");
  }

  function openArchive() {
    if (!isOwner) {
      return;
    }

    setArchiveConfirmation("");
    setArchiveError(null);
    setOpenDialog("archive");
  }

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = dialogSessionRef.current;
    setIsRenaming(true);
    setRenameError(null);

    try {
      await renameGroup({ groupId: typedGroupId, name: renameDraft });
      if (dialogSessionRef.current === session) {
        closeDialog();
      }
    } catch (error) {
      const message = getErrorMessage(error);
      if (dialogSessionRef.current === session) {
        setRenameError(message);
      } else {
        showToast(`Group not renamed — ${message}`);
      }
    } finally {
      setIsRenaming(false);
    }
  }

  async function handleCopyInviteLink() {
    setIsCopyingInvite(true);
    setInviteError(null);
    setInviteNotice(null);

    try {
      const invite = activeInvite ?? (await createInvite({ groupId: typedGroupId }));

      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable in this browser.");
      }

      await navigator.clipboard.writeText(buildInviteLink(invite.token));
      setInviteNotice(activeInvite ? "Invite link copied." : "New invite link created and copied.");
    } catch (error) {
      setInviteError(getErrorMessage(error));
    } finally {
      setIsCopyingInvite(false);
    }
  }

  async function handleSendInviteEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSendingInvite(true);
    setInviteError(null);
    setInviteNotice(null);

    try {
      const email = inviteEmailDraft.trim();

      if (!email) {
        throw new Error("Enter an email address to send an invite.");
      }

      await sendEmailInvite({ groupId: typedGroupId, email });
      setInviteEmailDraft("");
      setInviteNotice(`Invite sent to ${email}.`);
    } catch (error) {
      setInviteError(getErrorMessage(error));
    } finally {
      setIsSendingInvite(false);
    }
  }

  async function exportCsv() {
    setIsExporting(true);
    setExportError(null);

    try {
      const exportData = await convex.query(api.exports.getGroupExpenseExport, { groupId: typedGroupId });
      downloadCsv(
        buildExpenseExportCsv(exportData.rows as ExpenseExportRow[]),
        createExportFileName(exportData.groupName, exportData.generatedAt),
      );
    } catch (error) {
      setExportError(getErrorMessage(error, "Couldn't export right now. Please try again."));
    } finally {
      setIsExporting(false);
    }
  }

  async function handleArchive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!matchesArchiveConfirmation) {
      setArchiveError(`Type "${groupName}" to confirm.`);
      return;
    }

    setIsArchiving(true);
    setArchiveError(null);

    try {
      await archiveGroup({ groupId: typedGroupId });
      startTransition(() => {
        router.push("/dashboard");
      });
    } catch (error) {
      setArchiveError(getErrorMessage(error));
    } finally {
      setIsArchiving(false);
    }
  }

  const dialogs = (
    <>
      <ResponsiveDialog
        open={openDialog === "rename"}
        onClose={closeDialog}
        title="Rename group"
        description="The new name shows up for everyone in the group."
      >
        <form className="space-y-5" onSubmit={handleRename}>
          <FilledInput
            label="Group name"
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            maxLength={60}
            placeholder="Iceland Expedition"
            data-autofocus
          />
          {renameError ? <SettingsNotice tone="error">{renameError}</SettingsNotice> : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" size="lg" onClick={closeDialog} disabled={isRenaming}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={isRenaming || renameDraft.trim().length === 0}>
              {isRenaming ? "Saving…" : "Save name"}
            </Button>
          </div>
        </form>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={openDialog === "invite"}
        onClose={closeDialog}
        title="Invite people"
        description={`Share a link to join ${groupName}. Each link works once and expires.`}
      >
        {composerData === undefined ? (
          <div role="status" aria-label="Loading invite" className="space-y-3">
            <SkeletonBlock className="h-14 w-full" />
            <SkeletonBlock className="h-14 w-full rounded-full" />
          </div>
        ) : composerData === null || !composerData.canInvite ? (
          <SettingsNotice>
            Invites aren&apos;t available. The group may be archived, or you no longer manage it.
          </SettingsNotice>
        ) : (
          <div className="space-y-5">
            {inviteError ? <SettingsNotice tone="error">{inviteError}</SettingsNotice> : null}
            {inviteNotice ? <SettingsNotice tone="success">{inviteNotice}</SettingsNotice> : null}

            <div className="space-y-3">
              <div className="rounded-2xl bg-surface-container-lowest px-4 py-3 ring-1 ring-white/10">
                <p className="text-xs text-on-surface-variant">
                  {activeInvite ? `Invite link · expires ${formatInviteExpiry(activeInvite.expiresAt)}` : "Invite link"}
                </p>
                <p className="mt-0.5 break-all text-sm text-on-surface">
                  {inviteLink ?? "A new link is created when you copy it."}
                </p>
              </div>
              <Button
                size="lg"
                fullWidth
                onClick={() => void handleCopyInviteLink()}
                disabled={isCopyingInvite || isSendingInvite}
              >
                <Copy className="h-4.5 w-4.5" aria-hidden="true" />
                {isCopyingInvite ? "Copying…" : activeInvite ? "Copy invite link" : "Create and copy link"}
              </Button>
            </div>

            {composerData.inviteEmailEnabled ? (
              <form className="space-y-3 border-t border-white/[0.06] pt-5" onSubmit={handleSendInviteEmail}>
                <FilledInput
                  label="Or send by email"
                  type="email"
                  autoComplete="email"
                  value={inviteEmailDraft}
                  onChange={(event) => setInviteEmailDraft(event.target.value)}
                  placeholder="friend@example.com"
                  hint="They'll get the same single-use link."
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="lg"
                  fullWidth
                  disabled={isSendingInvite || isCopyingInvite || inviteEmailDraft.trim().length === 0}
                >
                  <Mail className="h-4.5 w-4.5" aria-hidden="true" />
                  {isSendingInvite ? "Sending…" : "Send invite"}
                </Button>
              </form>
            ) : (
              <p className="text-xs leading-5 text-on-surface-variant">
                Email invites aren&apos;t set up here yet. Share the link instead.
              </p>
            )}
          </div>
        )}
      </ResponsiveDialog>

      <ResponsiveDialog
        open={openDialog === "archive"}
        onClose={closeDialog}
        tone="danger"
        title="Archive this group?"
        description="It disappears for every member and the invite link stops working. Expenses and payments stay stored."
      >
        <form className="space-y-5" onSubmit={handleArchive}>
          <FilledInput
            label={`Type "${groupName}" to confirm`}
            value={archiveConfirmation}
            onChange={(event) => setArchiveConfirmation(event.target.value)}
            placeholder={groupName}
            autoComplete="off"
            data-autofocus
          />
          {archiveError ? <SettingsNotice tone="error">{archiveError}</SettingsNotice> : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" size="lg" onClick={closeDialog} disabled={isArchiving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              disabled={isArchiving || !matchesArchiveConfirmation}
              className={dangerButtonClass}
            >
              {isArchiving ? "Archiving…" : "Archive group"}
            </Button>
          </div>
        </form>
      </ResponsiveDialog>
    </>
  );

  return { openRename, openInvite, openArchive, exportCsv, isExporting, exportError, dialogs };
}
