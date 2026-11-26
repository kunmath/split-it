"use client";

import { X } from "lucide-react";

import { topBarIconButtonClass, useBackNavigation } from "@/components/shell/mobile-top-bar";
import { cn } from "@/lib/utils";

type ComposerHeaderProps = {
  title: string;
  groupId: string;
};

/** Sticky top bar on mobile; a plain heading row above the card on desktop. */
export function ComposerHeader({ title, groupId }: ComposerHeaderProps) {
  const close = useBackNavigation(`/groups/${groupId}`);

  return (
    <header
      className={cn(
        "glass-panel sticky top-0 z-30 -mx-4 border-b border-white/5 px-4 pt-[env(safe-area-inset-top)] sm:-mx-6 sm:px-6",
        "lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:pt-0 lg:backdrop-blur-none",
      )}
    >
      <div className="flex min-h-14 items-center gap-2 lg:min-h-0 lg:gap-3">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className={cn(topBarIconButtonClass, "-ml-2 text-on-surface lg:ml-0 lg:bg-white/5")}
        >
          <X className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 truncate font-headline text-lg font-bold tracking-tight text-on-surface lg:text-3xl">
          {title}
        </h1>
      </div>
    </header>
  );
}
