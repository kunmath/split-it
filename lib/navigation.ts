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

import { ROUTES, inviteAcceptPath } from "@/lib/routes";

export type AppSection = "dashboard" | "groups" | "friends" | "activity" | "account";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  section: AppSection;
};

export const desktopPrimaryNav: NavItem[] = [
  { label: "Dashboard", href: ROUTES.dashboard, icon: LayoutDashboard, section: "dashboard" },
  { label: "Activity", href: ROUTES.activity, icon: BellDot, section: "activity" },
  { label: "Friends", href: ROUTES.friends, icon: Users, section: "friends" },
  { label: "Groups", href: ROUTES.groups, icon: WalletCards, section: "groups" },
];

export const desktopSecondaryNav = [
  { label: "Settings", href: ROUTES.account, icon: Settings2, section: "account" as const },
  { label: "Support", href: inviteAcceptPath("demo-token"), icon: CircleHelp, section: "account" as const },
];

export const mobileNav: NavItem[] = [
  { label: "Groups", href: ROUTES.groups, icon: WalletCards, section: "groups" },
  { label: "Friends", href: ROUTES.friends, icon: Users, section: "friends" },
  { label: "Activity", href: ROUTES.activity, icon: BellDot, section: "activity" },
  { label: "Account", href: ROUTES.account, icon: UserRound, section: "account" },
];

export function getSectionFromPathname(pathname: string): AppSection {
  if (pathname.startsWith(ROUTES.groups)) {
    return "groups";
  }

  if (pathname.startsWith(ROUTES.friends)) {
    return "friends";
  }

  if (pathname.startsWith(ROUTES.activity)) {
    return "activity";
  }

  if (pathname.startsWith(ROUTES.account)) {
    return "account";
  }

  return "dashboard";
}
