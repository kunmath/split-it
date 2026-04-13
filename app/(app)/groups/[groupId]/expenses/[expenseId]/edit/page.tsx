import Link from "next/link";
import { CalendarDays, PencilLine, Users } from "lucide-react";

import { PageContainer } from "@/components/shell/page-container";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { Button } from "@/components/ui/button";
import { FilledInput } from "@/components/ui/filled-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SurfaceCard } from "@/components/ui/surface-card";
import { getExpenseComposer } from "@/lib/placeholder-data";

type EditExpensePageProps = {
  params: Promise<{ groupId: string; expenseId: string }>;
};

export default async function EditExpensePage({ params }: EditExpensePageProps) {
  const { groupId, expenseId } = await params;
  const composer = getExpenseComposer(groupId, "edit");

  return (
    <PageContainer className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-primary">Expense Composer</p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface sm:text-5xl">
            Edit expense draft
          </h1>
          <p className="max-w-2xl text-sm leading-8 text-on-surface-variant sm:text-base">
            Editing reuses the same shell primitives as creation. The difference is route context, copy,
            and the draft CTA label.
          </p>
        </div>

        <SurfaceCard variant="high" className="space-y-5 rounded-[2.25rem] p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <FilledInput label="Description" placeholder={composer.description} prefix={<PencilLine className="h-4.5 w-4.5" />} />
            <FilledInput label="Amount" placeholder={composer.amount} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FilledInput label="Paid By" placeholder="James Chen" prefix={<Users className="h-4.5 w-4.5" />} />
            <FilledInput label="Date" placeholder="Aug 12, 2024" prefix={<CalendarDays className="h-4.5 w-4.5" />} />
          </div>
          <SegmentedControl
            label="Split Type"
            selected="exact"
            options={[
              { label: "Equal Split", value: "equal" },
              { label: "Exact Amounts", value: "exact" },
            ]}
          />
          <FilledInput label="Notes" placeholder={composer.notes} hint={`Editing placeholder for expense id: ${expenseId}`} />
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" size="lg">
              {composer.ctaLabel}
            </Button>
            <Link href={`/groups/${groupId}`} className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/8 px-6 text-sm font-medium text-on-surface-variant transition hover:text-on-surface">
              Back to Group
            </Link>
          </div>
        </SurfaceCard>
      </section>

      <aside className="space-y-5">
        <SurfaceCard variant="low" className="rounded-[2.25rem] p-7">
          <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">Current Split Snapshot</p>
          <div className="mt-6 space-y-4">
            <AvatarBadge name="Sarah Jenkins" note="$171.25" tone="positive" />
            <AvatarBadge name="James Chen" note="$171.25" tone="negative" />
            <AvatarBadge name="Elena Rodriguez" note="$70.00" tone="neutral" />
          </div>
        </SurfaceCard>

        <SurfaceCard variant="hero" className="rounded-[2.25rem] p-7">
          <p className="text-xs uppercase tracking-[0.24em] text-primary">Phase 0 Limit</p>
          <p className="mt-4 text-sm leading-8 text-on-surface-variant">
            No save, delete, or validation side effects yet. This route exists to prove the responsive two-column
            composition and component reuse.
          </p>
        </SurfaceCard>
      </aside>
    </PageContainer>
  );
}
