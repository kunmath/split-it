"use client";

import { useQuery } from "convex/react";
import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { mockGroups } from "@/components/groups/group-list-data";
import { usePlaceholderMode } from "@/components/providers/app-providers";
import { buttonVariants } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { api } from "@/convex/_generated/api";
import { iconMap } from "@/lib/icon-map";
import { getGroupIdFromPathname } from "@/lib/navigation";
import type { IconKey } from "@/lib/placeholder-data";
import { cn } from "@/lib/utils";

type PickerGroup = {
  id: string;
  name: string;
  memberCount: number;
  icon: IconKey;
};

type AddExpenseContextValue = {
  /** Direct composer href when the current route is inside a group, otherwise null. */
  directHref: string | null;
  openPicker: () => void;
};

const AddExpenseContext = createContext<AddExpenseContextValue>({
  directHref: null,
  openPicker: () => {},
});

export function useAddExpense() {
  return useContext(AddExpenseContext);
}

export function AddExpenseProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pickerOpen, setPickerOpen] = useState(false);
  const groupId = getGroupIdFromPathname(pathname);
  const directHref = groupId ? `/groups/${groupId}/expenses/new` : null;
  const openPicker = useCallback(() => setPickerOpen(true), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const value = useMemo(() => ({ directHref, openPicker }), [directHref, openPicker]);

  return (
    <AddExpenseContext.Provider value={value}>
      {children}
      {pickerOpen ? <GroupPickerSheet onClose={closePicker} /> : null}
    </AddExpenseContext.Provider>
  );
}

type AddExpenseTriggerProps = {
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
};

/** Renders a link straight to the composer inside a group, or a button that opens the group picker. */
export function AddExpenseTrigger({ className, children, ariaLabel }: AddExpenseTriggerProps) {
  const { directHref, openPicker } = useAddExpense();

  if (directHref) {
    return (
      <Link href={directHref} className={className} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={openPicker} className={className} aria-label={ariaLabel} aria-haspopup="dialog">
      {children}
    </button>
  );
}

function GroupPickerSheet({ onClose }: { onClose: () => void }) {
  const { mode } = usePlaceholderMode();

  return mode === "live" ? <LiveGroupPicker onClose={onClose} /> : <GroupPickerScene groups={mockPickerGroups} onClose={onClose} />;
}

// Same demo groups (and member counts) as Home / Groups.
const mockPickerGroups: PickerGroup[] = mockGroups.map((group) => ({
  id: group.id,
  name: group.name,
  memberCount: group.memberCount,
  icon: group.icon,
}));

function LiveGroupPicker({ onClose }: { onClose: () => void }) {
  const groups = useQuery(api.groups.listActiveForCurrentUser, {});
  // No last-activity timestamp is available, so newest groups come first.
  const mapped = groups
    ? [...groups]
        .sort((left, right) => right.createdAt - left.createdAt)
        .map((group) => ({
          id: group._id,
          name: group.name,
          memberCount: group.memberCount,
          icon: group.iconKey as IconKey,
        }))
    : undefined;

  return <GroupPickerScene groups={mapped} onClose={onClose} />;
}

function composerHref(groupId: string) {
  return `/groups/${groupId}/expenses/new`;
}

function GroupPickerScene({ groups, onClose }: { groups: PickerGroup[] | undefined; onClose: () => void }) {
  const router = useRouter();
  const onlyGroupId = groups?.length === 1 ? groups[0]!.id : null;

  // With a single group there is nothing to pick: go straight to its composer.
  useEffect(() => {
    if (onlyGroupId) {
      onClose();
      router.push(composerHref(onlyGroupId));
    }
  }, [onlyGroupId, onClose, router]);

  if (onlyGroupId) {
    return null;
  }

  return (
    <ResponsiveDialog open size="compact" title="Add expense to…" onClose={onClose}>
      {groups === undefined ? (
        <ul className="space-y-2" aria-busy="true" aria-label="Loading groups">
          {[0, 1, 2].map((index) => (
            <li key={index} className="h-16 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </ul>
      ) : groups.length === 0 ? (
        <div className="space-y-4 py-2">
          <p className="text-sm leading-6 text-on-surface-variant">
            Expenses live inside a group. Create one first, then invite the people you split with.
          </p>
          <Link
            href="/groups?create=1"
            onClick={onClose}
            className={buttonVariants({ variant: "primary", fullWidth: true })}
          >
            <Plus className="h-4 w-4" />
            Create a group
          </Link>
        </div>
      ) : (
        <ul className="-mx-1 space-y-1">
          {groups.map((group) => {
            const Icon = iconMap[group.icon] ?? iconMap.home;

            return (
              <li key={group.id}>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(composerHref(group.id));
                  }}
                  className={cn(
                    "flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition",
                    "hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none",
                  )}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-lowest text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-headline text-base font-semibold text-on-surface">
                      {group.name}
                    </span>
                    <span className="block text-sm text-on-surface-variant">
                      {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-on-surface-variant" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </ResponsiveDialog>
  );
}
