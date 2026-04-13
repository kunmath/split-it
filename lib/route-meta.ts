import type { AppSection } from "@/lib/navigation";

export type AppRouteMeta = {
  section: AppSection;
  title: string;
  eyebrow: string;
  searchPlaceholder: string;
  showFab: boolean;
  fabLabel: string;
  topActionLabel?: string;
  updatedLabel?: string;
};

export function getRouteMeta(pathname: string): AppRouteMeta {
  if (pathname.startsWith("/groups/") && pathname.endsWith("/settings")) {
    return {
      section: "groups",
      title: "Group Totals",
      eyebrow: "Summary + Settings",
      searchPlaceholder: "Search transactions...",
      showFab: true,
      fabLabel: "New Expense",
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
      topActionLabel: "Preview",
      updatedLabel: "Draft mode",
    };
  }

  if (pathname.startsWith("/groups/")) {
    return {
      section: "groups",
      title: "Group Detail",
      eyebrow: "Editorial Ledger",
      searchPlaceholder: "Search expenses, people...",
      showFab: true,
      fabLabel: "New Expense",
      topActionLabel: "Settle Up",
      updatedLabel: "Live placeholder",
    };
  }

  if (pathname.startsWith("/friends")) {
    return {
      section: "friends",
      title: "Friends",
      eyebrow: "Relationship Ledger",
      searchPlaceholder: "Search friends...",
      showFab: false,
      fabLabel: "Add",
      topActionLabel: "Invite",
      updatedLabel: "Placeholder space",
    };
  }

  if (pathname.startsWith("/activity")) {
    return {
      section: "activity",
      title: "Activity",
      eyebrow: "Recent Motion",
      searchPlaceholder: "Search activity...",
      showFab: false,
      fabLabel: "Add",
      topActionLabel: "Filter",
      updatedLabel: "Quiet feed",
    };
  }

  if (pathname.startsWith("/account")) {
    return {
      section: "account",
      title: "Account",
      eyebrow: "Profile + Settings",
      searchPlaceholder: "Search settings...",
      showFab: false,
      fabLabel: "Save",
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
    fabLabel: "New Expense",
    topActionLabel: "Settle Up",
    updatedLabel: "Updated 2 minutes ago",
  };
}
