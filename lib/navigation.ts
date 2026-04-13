import type { LucideIcon } from "lucide-react";
import {
  BellDot,
  CircleHelp,
  LayoutDashboard,
  Settings2,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";

export type AppSection = "dashboard" | "groups" | "friends" | "activity" | "account";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  section: AppSection;
};

export const desktopPrimaryNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: "dashboard" },
  { label: "Activity", href: "/activity", icon: BellDot, section: "activity" },
  { label: "Friends", href: "/friends", icon: Users, section: "friends" },
  { label: "Groups", href: "/groups/demo-group", icon: WalletCards, section: "groups" },
];

export const desktopSecondaryNav = [
  { label: "Settings", href: "/account", icon: Settings2, section: "account" as const },
  { label: "Support", href: "/invites/demo-token", icon: CircleHelp, section: "account" as const },
];

export const mobileNav: NavItem[] = [
  { label: "Groups", href: "/dashboard", icon: WalletCards, section: "dashboard" },
  { label: "Friends", href: "/friends", icon: Users, section: "friends" },
  { label: "Activity", href: "/activity", icon: BellDot, section: "activity" },
  { label: "Account", href: "/account", icon: UserRound, section: "account" },
];

export function getSectionFromPathname(pathname: string): AppSection {
  if (pathname.startsWith("/groups")) {
    return "groups";
  }

  if (pathname.startsWith("/friends")) {
    return "friends";
  }

  if (pathname.startsWith("/activity")) {
    return "activity";
  }

  if (pathname.startsWith("/account")) {
    return "account";
  }

  return "dashboard";
}
