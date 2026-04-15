import { Clock3 } from "lucide-react";

import { PageContainer } from "@/components/shell/page-container";
import { SurfaceCard } from "@/components/ui/surface-card";

const activityItems = [
  "You paid for a fuel refill in Iceland Expedition.",
  "James reopened the cabin reservation for a final edit pass.",
  "A fresh invite link was copied for the current roster review.",
];

export default function ActivityPage() {
  return (
    <PageContainer className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-primary">Activity</p>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface sm:text-5xl">
          Lightweight feed, ready shell
        </h1>
        <p className="max-w-2xl text-sm leading-8 text-on-surface-variant sm:text-base">
          Split-It ships the navigation destination now, with a lightweight feed that keeps the MVP complete without introducing a full notification system.
        </p>
      </div>

      <div className="space-y-3">
        {activityItems.map((item) => (
          <SurfaceCard key={item} variant="low" className="flex items-start gap-4 rounded-[2rem] p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-container-high text-primary">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-headline text-lg font-semibold text-on-surface">Recent activity</p>
              <p className="mt-2 text-sm leading-7 text-on-surface-variant">{item}</p>
            </div>
          </SurfaceCard>
        ))}
      </div>
    </PageContainer>
  );
}
