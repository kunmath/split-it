import { cn } from "@/lib/utils";

export function SkeletonBlock({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-2xl bg-white/6", className)} />;
}

/** Layout-matched placeholder: header, summary card, and list rows. Used by route loading states. */
export function ListSkeleton({ rows = 5, withSummary = true }: { rows?: number; withSummary?: boolean }) {
  return (
    <div role="status" aria-label="Loading" className="mx-auto w-full max-w-3xl space-y-4 pt-3 lg:pt-0">
      <SkeletonBlock className="h-8 w-40 rounded-lg" />
      {withSummary ? <SkeletonBlock className="h-28 w-full rounded-3xl" /> : null}
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-2xl px-1 py-2">
            <SkeletonBlock className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-2/3 rounded-md" />
              <SkeletonBlock className="h-3 w-1/3 rounded-md" />
            </div>
            <SkeletonBlock className="h-5 w-16 rounded-md" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
