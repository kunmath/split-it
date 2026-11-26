"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getSectionFromPathname, mobileNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-panel fixed inset-x-0 bottom-0 z-40 border-t border-white/5 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-2 lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[1.75rem] bg-surface/60 px-1">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const active = getSectionFromPathname(pathname) === item.section;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[1.35rem] text-[0.62rem] uppercase tracking-[0.22em] transition",
                active
                  ? "bg-surface-container-high text-primary"
                  : "text-on-surface-variant hover:bg-white/4 hover:text-on-surface",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
