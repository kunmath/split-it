"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AddExpenseProvider } from "@/components/shell/add-expense";
import { DesktopRail } from "@/components/shell/desktop-rail";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";
import { InAppHistoryContext } from "@/components/shell/mobile-top-bar";
import { isExpenseComposerRoute } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isComposer = isExpenseComposerRoute(pathname);
  const hasInAppHistory = useInAppHistory(pathname);

  return (
    <InAppHistoryContext.Provider value={hasInAppHistory}>
      <AddExpenseProvider>
        <div className="min-h-dvh bg-surface text-on-surface">
          <DesktopRail />

          <div className="lg:ml-72">
            <main
              className={cn(
                "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] lg:px-10 lg:pb-16 lg:pt-8",
                isComposer
                  ? "pb-0"
                  : "pb-[calc(4.5rem+env(safe-area-inset-bottom)+1.5rem)]",
              )}
            >
              {children}
            </main>
          </div>

          {!isComposer ? <MobileBottomNav /> : null}
        </div>
      </AddExpenseProvider>
    </InAppHistoryContext.Provider>
  );
}

function useInAppHistory(pathname: string) {
  const [firstPathname] = useState(pathname);
  const [hasHistory, setHasHistory] = useState(false);

  // Adjusting state during render (not in an effect) per React's guidance.
  if (!hasHistory && pathname !== firstPathname) {
    setHasHistory(true);
  }

  return hasHistory;
}
