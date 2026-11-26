"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AddExpenseTrigger } from "@/components/shell/add-expense";
import { getSectionFromPathname, primaryNav, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Height of the bar above the safe-area inset; pages pad by this so nothing hides underneath. */
export const MOBILE_NAV_HEIGHT = "4.5rem";

export function MobileBottomNav() {
  const pathname = usePathname();
  const activeSection = getSectionFromPathname(pathname);
  const [first, second, third, fourth] = primaryNav as [NavItem, NavItem, NavItem, NavItem];

  return (
    <nav
      aria-label="Primary"
      className="glass-panel fixed inset-x-0 bottom-0 z-40 border-t border-white/6 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] lg:hidden"
    >
      <div className="mx-auto grid h-[4.5rem] max-w-md grid-cols-5 items-center px-1">
        <NavTab item={first} active={activeSection === first.section} />
        <NavTab item={second} active={activeSection === second.section} />
        <div className="flex items-center justify-center">
          <AddExpenseTrigger
            ariaLabel="Add expense"
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl text-on-primary transition active:scale-95",
              "bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-container))]",
              "shadow-[0_10px_30px_rgba(78,222,163,0.25)] ring-1 ring-white/10",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
            )}
          >
            <Plus className="h-7 w-7" strokeWidth={2.4} />
          </AddExpenseTrigger>
        </div>
        <NavTab item={third} active={activeSection === third.section} />
        <NavTab item={fourth} active={activeSection === fourth.section} />
      </div>
    </nav>
  );
}

function NavTab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[0.72rem] font-medium transition",
        active ? "text-primary" : "text-on-surface-variant hover:text-on-surface",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-12 items-center justify-center rounded-full transition",
          active && "bg-primary/14",
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
      </span>
      <span>{item.label}</span>
    </Link>
  );
}
