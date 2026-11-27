"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import type { CreateGroupDraft } from "@/components/groups/group-list-data";
import { Button } from "@/components/ui/button";
import { FilledInput } from "@/components/ui/filled-input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { iconMap } from "@/lib/icon-map";
import type { IconKey } from "@/lib/placeholder-data";
import { cn } from "@/lib/utils";

const DEFAULT_DRAFT: CreateGroupDraft = {
  name: "",
  description: "",
  currency: "INR",
  iconKey: "home",
};

const GROUP_ICON_CHOICES: Array<{ key: IconKey; label: string }> = [
  { key: "home", label: "Home" },
  { key: "plane", label: "Trip" },
  { key: "utensils", label: "Dining" },
  { key: "cart", label: "Groceries" },
  { key: "mountain", label: "Outdoors" },
  { key: "fuel", label: "Road trip" },
];

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to create the group right now.";
}

/**
 * Open/close state for the create-group dialog. Every visit to a `?create=1` URL opens it; the param
 * is stripped on arrival (before the dialog pushes its history entry), so closing never rewrites
 * history and Back can't land on a URL that reopens the dialog.
 */
export function useCreateGroupDialog(initialOpen: boolean) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const linkSearch = searchParams.get("create") === "1" ? searchParams.toString() : null;
  const [open, setOpen] = useState(initialOpen || linkSearch !== null);
  const [consumedSearch, setConsumedSearch] = useState(linkSearch);

  // Re-open when navigating to `?create=1` while this screen is already mounted.
  if (linkSearch !== consumedSearch) {
    setConsumedSearch(linkSearch);
    if (linkSearch !== null) {
      setOpen(true);
    }
  }

  useEffect(() => {
    if (linkSearch === null) {
      return;
    }
    const next = new URLSearchParams(linkSearch);
    next.delete("create");
    const query = next.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }, [linkSearch, pathname]);

  return { open, openDialog: () => setOpen(true), close: () => setOpen(false) };
}

type CreateGroupDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Persists the group and resolves with its id. Errors are shown inline. */
  onCreate: (draft: CreateGroupDraft) => Promise<string>;
  onCreated?: (groupId: string) => void;
};

export function CreateGroupDialog({ open, onClose, onCreate, onCreated }: CreateGroupDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title="New group"
      description="Name it now. You can add members and expenses right after."
    >
      {open ? <CreateGroupForm onCancel={onClose} onCreate={onCreate} onCreated={onCreated} /> : null}
    </ResponsiveDialog>
  );
}

function CreateGroupForm({
  onCancel,
  onCreate,
  onCreated,
}: {
  onCancel: () => void;
  onCreate: CreateGroupDialogProps["onCreate"];
  onCreated?: CreateGroupDialogProps["onCreated"];
}) {
  const [draft, setDraft] = useState<CreateGroupDraft>(DEFAULT_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = draft.name.trim();
    const description = draft.description.trim();

    if (name.length < 2) {
      setError("Group name must be at least 2 characters.");
      return;
    }

    if (description.length > 140) {
      setError("Description must stay within 140 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const groupId = await onCreate({ ...draft, name, description });
      onCreated?.(groupId);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <FilledInput
        label="Group name"
        placeholder="e.g. Modern Loft 4B"
        value={draft.name}
        onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
        maxLength={60}
        autoComplete="off"
        data-autofocus
        required
      />

      <FilledInput
        label="Description (optional)"
        placeholder="Rent and utilities"
        value={draft.description}
        onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
        maxLength={140}
        autoComplete="off"
      />

      <fieldset className="space-y-2.5">
        <legend className="text-xs font-semibold text-on-surface-variant">Type</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {GROUP_ICON_CHOICES.map((choice) => {
            const Icon = iconMap[choice.key];
            const active = draft.iconKey === choice.key;

            return (
              <button
                key={choice.key}
                type="button"
                aria-pressed={active}
                onClick={() => setDraft((current) => ({ ...current, iconKey: choice.key }))}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-2.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  active
                    ? "bg-primary/14 text-primary ring-1 ring-primary/50"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {choice.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <p className="text-xs text-on-surface-variant">Amounts are tracked in INR (₹).</p>

      {error ? (
        <p role="alert" className="rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" size="lg" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create group"}
        </Button>
      </div>
    </form>
  );
}
