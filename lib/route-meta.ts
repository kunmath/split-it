import type { AppSection } from "@/lib/navigation";
import {
  DASHBOARD_CREATE_GROUP_HREF,
  ROUTES,
  groupExpenseNewPath,
} from "@/lib/routes";

export type AppRouteMeta = {
  section: AppSection;
  title: string;
  eyebrow: string;
  searchPlaceholder: string;
  showFab: boolean;
  fabLabel: string;
  fabHref: string;
  railActionLabel?: string;
  railActionHref?: string;
  topActionLabel?: string;
  updatedLabel?: string;
};

function getGroupExpenseHref(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const groupId = segments[1];

  return groupId ? groupExpenseNewPath(groupId) : ROUTES.dashboard;
}

export function getRouteMeta(pathname: string): AppRouteMeta {
  if (pathname === ROUTES.groups) {
    return {
      section: "groups",
      title: "All Groups",
      eyebrow: "Shared Ledgers",
      searchPlaceholder: "Search groups...",
      showFab: true,
      fabLabel: "New Group",
      fabHref: DASHBOARD_CREATE_GROUP_HREF,
      railActionLabel: "New Group",
      railActionHref: DASHBOARD_CREATE_GROUP_HREF,
      topActionLabel: "Create Group",
      updatedLabel: "Active group directory",
    };
  }

  if (pathname.startsWith(`${ROUTES.groups}/`) && pathname.endsWith("/settings")) {
    return {
      section: "groups",
      title: "Group Totals",
      eyebrow: "Summary + Settings",
      searchPlaceholder: "Search transactions...",
      showFab: true,
      fabLabel: "New Expense",
      fabHref: getGroupExpenseHref(pathname),
      railActionLabel: "New Expense",
      railActionHref: getGroupExpenseHref(pathname),
      topActionLabel: "Settle Up",
      updatedLabel: "Group snapshot",
    };
  }

  if (pathname.includes("/expenses/new")) {
    return {
      section: "groups",
      title: "New Expense",
      eyebrow: "Composer",
      searchPlaceholder: "Search expenses, people...",
      showFab: false,
      fabLabel: "Add",
      fabHref: getGroupExpenseHref(pathname),
      railActionLabel: "New Expense",
      railActionHref: getGroupExpenseHref(pathname),
      topActionLabel: "Preview",
      updatedLabel: "Draft mode",
    };
  }

  if (pathname.includes("/expenses/") && pathname.endsWith("/edit")) {
    return {
      section: "groups",
      title: "Edit Expense",
      eyebrow: "Composer",
      searchPlaceholder: "Search expenses, people...",
      showFab: false,
      fabLabel: "Save",
      fabHref: getGroupExpenseHref(pathname),
      railActionLabel: "New Expense",
      railActionHref: getGroupExpenseHref(pathname),
      topActionLabel: "Preview",
      updatedLabel: "Draft mode",
    };
  }

  if (pathname.startsWith(`${ROUTES.groups}/`)) {
    return {
      section: "groups",
      title: "Group Details",
      eyebrow: "Editorial Ledger",
      searchPlaceholder: "Search expenses, people...",
      showFab: true,
      fabLabel: "New Expense",
      fabHref: getGroupExpenseHref(pathname),
      railActionLabel: "New Expense",
      railActionHref: getGroupExpenseHref(pathname),
      topActionLabel: "Settle Up",
      updatedLabel: "Current standing + recent expenses",
    };
  }

  if (pathname.startsWith(ROUTES.friends)) {
    return {
      section: "friends",
      title: "Friends",
      eyebrow: "Relationship Ledger",
      searchPlaceholder: "Search friends...",
      showFab: false,
      fabLabel: "Add",
      fabHref: DASHBOARD_CREATE_GROUP_HREF,
      railActionLabel: "New Group",
      railActionHref: DASHBOARD_CREATE_GROUP_HREF,
      topActionLabel: "Invite",
      updatedLabel: "Placeholder space",
    };
  }

  if (pathname.startsWith(ROUTES.activity)) {
    return {
      section: "activity",
      title: "Activity",
      eyebrow: "Recent Motion",
      searchPlaceholder: "Search activity...",
      showFab: false,
      fabLabel: "Add",
      fabHref: DASHBOARD_CREATE_GROUP_HREF,
      railActionLabel: "New Group",
      railActionHref: DASHBOARD_CREATE_GROUP_HREF,
      topActionLabel: "Filter",
      updatedLabel: "Quiet feed",
    };
  }

  if (pathname.startsWith(ROUTES.account)) {
    return {
      section: "account",
      title: "Account",
      eyebrow: "Profile + Settings",
      searchPlaceholder: "Search settings...",
      showFab: false,
      fabLabel: "Save",
      fabHref: DASHBOARD_CREATE_GROUP_HREF,
      railActionLabel: "New Group",
      railActionHref: DASHBOARD_CREATE_GROUP_HREF,
      topActionLabel: "Manage",
      updatedLabel: "Profile shell",
    };
  }

  return {
    section: "dashboard",
    title: "Financial Footprint",
    eyebrow: "Portfolio Summary",
    searchPlaceholder: "Search transactions...",
    showFab: true,
    fabLabel: "New Group",
    fabHref: DASHBOARD_CREATE_GROUP_HREF,
    railActionLabel: "New Group",
    railActionHref: DASHBOARD_CREATE_GROUP_HREF,
    topActionLabel: "Settle Up",
    updatedLabel: "Updated 2 minutes ago",
  };
}
