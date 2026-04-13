"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { desktopPrimaryNav, desktopSecondaryNav, getSectionFromPathname } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function DesktopRail() {
  const pathname = usePathname();
  const activeSection = getSectionFromPathname(pathname);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/5 bg-surface px-5 py-7 lg:flex lg:flex-col">
      <div className="space-y-2 px-2">
        <Link href="/dashboard" className="inline-flex items-center gap-3">
          <span className="font-headline text-[1.7rem] font-extrabold tracking-tight text-primary">
            split-it
          </span>
        </Link>
        <p className="text-[0.68rem] uppercase tracking-[0.28em] text-on-surface-variant">
          Editorial Ledger
        </p>
      </div>

      <nav className="mt-10 space-y-2">
        {desktopPrimaryNav.map((item) => {
          const Icon = item.icon;
          const active = item.section === activeSection;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-4 rounded-[1.15rem] px-4 py-3 text-sm font-medium transition",
                active
                  ? "bg-surface-container-high text-primary ring-1 ring-primary/25"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              <span className="font-headline text-[0.95rem] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-6 border-t border-white/5 pt-8">
        <Link
          href="/groups/demo-group/expenses/new"
          className={buttonVariants({ variant: "primary", size: "lg", fullWidth: true })}
        >
          New Expense
        </Link>

        <div className="space-y-2">
          {desktopSecondaryNav.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-4 rounded-[1.15rem] px-4 py-3 text-sm text-on-surface-variant transition hover:bg-surface-container-low hover:text-on-surface"
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="rounded-[1.5rem] bg-surface-container-low p-4">
          <p className="font-headline text-sm font-semibold text-on-surface">Alex Rivera</p>
          <p className="mt-1 text-[0.68rem] uppercase tracking-[0.22em] text-on-surface-variant">
            Premium Member
          </p>
        </div>
      </div>
    </aside>
  );
}
