import { CheckCircle2 } from "lucide-react";

import { Money } from "@/components/ui/money";
import { SkeletonBlock } from "@/components/ui/skeletons";

type NetBalanceCardProps = {
  owedCents: number;
  oweCents: number;
  currency: string;
};

export function NetBalanceCard({ owedCents, oweCents, currency }: NetBalanceCardProps) {
  const netCents = owedCents - oweCents;
  const settled = owedCents === 0 && oweCents === 0;

  return (
    <section
      aria-label="Overall balance"
      className="rounded-3xl bg-[radial-gradient(circle_at_top_right,rgba(78,222,163,0.12),transparent_45%),linear-gradient(180deg,rgba(53,53,52,0.85),rgba(32,31,31,0.95))] p-5 ring-1 ring-white/5 sm:p-6"
    >
      {settled ? (
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/14 text-primary">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-headline text-xl font-bold text-on-surface">You&apos;re all settled up</p>
            <p className="text-sm text-on-surface-variant">No one owes anyone right now.</p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-on-surface-variant">
            {netCents > 0 ? "Overall, you're owed" : netCents < 0 ? "Overall, you owe" : "Overall, you're even"}
          </p>
          <Money
            cents={netCents}
            currency={currency}
            tone="auto"
            className="mt-1 block font-headline text-[2.5rem] font-extrabold leading-tight tracking-tight sm:text-5xl"
          />
          {netCents === 0 ? (
            <p className="mt-1 text-sm text-on-surface-variant">What you&apos;re owed and what you owe cancel out.</p>
          ) : null}

          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/8 pt-4">
            <div>
              <dt className="text-xs text-on-surface-variant">You&apos;re owed</dt>
              <dd>
                <Money cents={owedCents} currency={currency} tone="positive" className="font-headline text-base font-bold" />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-on-surface-variant">You owe</dt>
              <dd>
                <Money
                  cents={oweCents}
                  currency={currency}
                  tone={oweCents > 0 ? "negative" : "neutral"}
                  className="font-headline text-base font-bold"
                />
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}

export function NetBalanceCardSkeleton() {
  return (
    <div aria-hidden="true" className="rounded-3xl bg-surface-container-low p-5 sm:p-6">
      <SkeletonBlock className="h-4 w-32 rounded-md" />
      <SkeletonBlock className="mt-3 h-10 w-44 rounded-lg" />
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/8 pt-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-16 rounded-md" />
          <SkeletonBlock className="h-4 w-24 rounded-md" />
        </div>
        <div className="space-y-2">
          <SkeletonBlock className="h-3 w-16 rounded-md" />
          <SkeletonBlock className="h-4 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}
