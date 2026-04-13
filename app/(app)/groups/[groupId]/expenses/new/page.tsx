import Link from "next/link";
import { CalendarDays, PencilLine, Users } from "lucide-react";

import { PageContainer } from "@/components/shell/page-container";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { Button } from "@/components/ui/button";
import { FilledInput } from "@/components/ui/filled-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SurfaceCard } from "@/components/ui/surface-card";
import { getExpenseComposer } from "@/lib/placeholder-data";

type NewExpensePageProps = {
  params: Promise<{ groupId: string }>;
};

export default async function NewExpensePage({ params }: NewExpensePageProps) {
  const { groupId } = await params;
  const composer = getExpenseComposer(groupId, "new");

  return (
    <PageContainer className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-primary">Expense Composer</p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface sm:text-5xl">
            {composer.title}
          </h1>
          <p className="max-w-2xl text-sm leading-8 text-on-surface-variant sm:text-base">
            This is the reusable placeholder composer for both create and edit routes. It is intentionally
            visual and non-persistent in Phase 0.
          </p>
        </div>

        <SurfaceCard variant="high" className="space-y-5 rounded-[2.25rem] p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <FilledInput label="Description" placeholder={composer.description} prefix={<PencilLine className="h-4.5 w-4.5" />} />
            <FilledInput label="Amount" placeholder={composer.amount} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <FilledInput label="Paid By" placeholder="You" prefix={<Users className="h-4.5 w-4.5" />} />
            <FilledInput label="Date" placeholder="Aug 14, 2024" prefix={<CalendarDays className="h-4.5 w-4.5" />} />
          </div>
          <SegmentedControl
            label="Split Type"
            selected="equal"
            options={[
              { label: "Equal Split", value: "equal" },
              { label: "Exact Amounts", value: "exact" },
            ]}
          />
          <FilledInput
            label="Notes"
            placeholder={composer.notes}
            hint="Later phases will connect this to real mutations and validations."
          />
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" size="lg">
              {composer.ctaLabel}
            </Button>
            <Link href={`/groups/${groupId}`} className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/8 px-6 text-sm font-medium text-on-surface-variant transition hover:text-on-surface">
              Cancel
            </Link>
          </div>
        </SurfaceCard>
      </section>

      <aside className="space-y-5">
        <SurfaceCard variant="low" className="rounded-[2.25rem] p-7">
          <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">Included Members</p>
          <div className="mt-6 space-y-4">
            <AvatarBadge name="Sarah Jenkins" note="Current payer placeholder" tone="positive" />
            <AvatarBadge name="James Chen" note="Included in split" tone="negative" />
            <AvatarBadge name="Elena Rodriguez" note="Included in split" tone="positive" />
          </div>
        </SurfaceCard>

        <SurfaceCard variant="hero" className="rounded-[2.25rem] p-7">
          <p className="text-xs uppercase tracking-[0.24em] text-primary">Preview State</p>
          <p className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            {composer.amount}
          </p>
          <p className="mt-3 text-sm leading-7 text-on-surface-variant">
            Receipt upload, real member inclusion logic, and validation are explicitly deferred to later phases.
          </p>
        </SurfaceCard>
      </aside>
    </PageContainer>
  );
}
