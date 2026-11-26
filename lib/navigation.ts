import type { LucideIcon } from "lucide-react";
import { Activity, House, UserRound, WalletCards } from "lucide-react";

export type AppSection = "home" | "groups" | "activity" | "account";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  section: AppSection;
};

export const primaryNav: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: House, section: "home" },
  { label: "Groups", href: "/groups", icon: WalletCards, section: "groups" },
  { label: "Activity", href: "/activity", icon: Activity, section: "activity" },
  { label: "Account", href: "/account", icon: UserRound, section: "account" },
];

export function getSectionFromPathname(pathname: string): AppSection {
  if (pathname.startsWith("/groups")) {
    return "groups";
  }

  if (pathname.startsWith("/activity")) {
    return "activity";
  }

  if (pathname.startsWith("/account")) {
    return "account";
  }

  return "home";
}

/** Group id for routes under /groups/[groupId], otherwise null. */
export function getGroupIdFromPathname(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "groups" || !segments[1]) {
    return null;
  }

  return segments[1];
}

export function isExpenseComposerRoute(pathname: string) {
  return /^\/groups\/[^/]+\/expenses\//.test(pathname);
}
