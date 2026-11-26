"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { usePlaceholderMode } from "@/components/providers/app-providers";
import { AddExpenseTrigger } from "@/components/shell/add-expense";
import { ShellSessionCard } from "@/components/shell/shell-session-controls";
import { buttonVariants } from "@/components/ui/button";
import { getSectionFromPathname, primaryNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function DesktopRail() {
  const pathname = usePathname();
  const activeSection = getSectionFromPathname(pathname);
  const { mode, isClerkConfigured, isConvexConfigured } = usePlaceholderMode();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/5 bg-surface px-5 py-7 lg:flex lg:flex-col">
      <div className="px-2">
        <Link href="/dashboard" className="inline-flex items-center gap-3 rounded-lg">
          <span className="font-headline text-[1.7rem] font-extrabold tracking-tight text-primary">split-it</span>
        </Link>
      </div>

      <AddExpenseTrigger className={cn(buttonVariants({ variant: "primary", size: "lg", fullWidth: true }), "mt-8")}>
        <Plus className="h-5 w-5" />
        Add expense
      </AddExpenseTrigger>

      <nav aria-label="Primary" className="mt-8 space-y-1">
        {primaryNav.map((item) => {
          const Icon = item.icon;
          const active = item.section === activeSection;

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-medium transition",
                active
                  ? "bg-surface-container-high text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              <span className="font-headline text-[0.95rem] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4 border-t border-white/5 pt-6">
        {mode === "mock" ? (
          <p className="px-2 text-xs leading-5 text-on-surface-variant">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-secondary align-middle" aria-hidden="true" />
            Demo data · {isClerkConfigured ? "Clerk on" : "Clerk off"} · {isConvexConfigured ? "Convex on" : "Convex off"}
          </p>
        ) : null}
        <ShellSessionCard />
      </div>
    </aside>
  );
}
