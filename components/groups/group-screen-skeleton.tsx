import { SkeletonBlock } from "@/components/ui/skeletons";
import { cn } from "@/lib/utils";

function RowSkeleton() {
  return (
    <div className="flex min-h-16 items-center gap-3 px-2 py-2.5">
      <div className="flex w-9 flex-col items-center gap-1">
        <SkeletonBlock className="h-3 w-6 rounded" />
        <SkeletonBlock className="h-4 w-5 rounded" />
      </div>
      <SkeletonBlock className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-2/3 rounded-md" />
        <SkeletonBlock className="h-3 w-1/3 rounded-md" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <SkeletonBlock className="h-3 w-12 rounded" />
        <SkeletonBlock className="h-4 w-16 rounded-md" />
      </div>
    </div>
  );
}

function StripSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 rounded-3xl bg-surface-container-low p-4 sm:p-5", className)}>
      <SkeletonBlock className="h-6 w-56 rounded-lg" />
      <SkeletonBlock className="h-4 w-44 rounded-md" />
      <SkeletonBlock className="h-4 w-40 rounded-md" />
      <div className="flex gap-2 pt-1">
        <SkeletonBlock className="h-11 w-28 rounded-full" />
        <SkeletonBlock className="h-11 w-28 rounded-full" />
      </div>
    </div>
  );
}

/** Layout-matched placeholder for the group detail screen. */
export function GroupScreenSkeleton() {
  return (
    <div role="status" aria-label="Loading group" className="mx-auto w-full max-w-[1280px]">
      <div className="-mx-4 mb-4 flex min-h-14 items-center gap-3 border-b border-white/5 px-4 sm:-mx-6 sm:px-6 lg:hidden">
        <SkeletonBlock className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <SkeletonBlock className="h-4 w-40 rounded-md" />
          <SkeletonBlock className="h-3 w-20 rounded" />
        </div>
      </div>
      <div className="mb-6 hidden items-center gap-4 lg:flex">
        <SkeletonBlock className="h-12 w-12 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-7 w-64 rounded-lg" />
          <SkeletonBlock className="h-4 w-32 rounded-md" />
        </div>
        <SkeletonBlock className="h-11 w-28 rounded-full" />
        <SkeletonBlock className="h-11 w-28 rounded-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:gap-8">
        <div className="space-y-4">
          <StripSkeleton className="lg:hidden" />
          <div className="space-y-1">
            <SkeletonBlock className="mx-2 my-2 h-3 w-24 rounded" />
            {Array.from({ length: 6 }, (_, index) => (
              <RowSkeleton key={index} />
            ))}
          </div>
        </div>
        <div className="hidden space-y-4 lg:block">
          <StripSkeleton />
          <SkeletonBlock className="h-72 w-full rounded-3xl" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
