import { CheckCircle2 } from "lucide-react";

import type { CurrencyTotals } from "@/components/groups/group-list-data";
import { Money, toneFromCents, toneTextClass } from "@/components/ui/money";
import { SkeletonBlock } from "@/components/ui/skeletons";
import { cn } from "@/lib/utils";

type NetBalanceCardProps = {
  /** One entry per currency. Different currencies are shown side by side, never summed. */
  totals: CurrencyTotals[];
};

const cardClass =
  "rounded-3xl bg-[radial-gradient(circle_at_top_right,rgba(78,222,163,0.12),transparent_45%),linear-gradient(180deg,rgba(53,53,52,0.85),rgba(32,31,31,0.95))] px-5 py-3.5 ring-1 ring-white/5 sm:px-6 sm:py-4";

function netLabel(netCents: number) {
  return netCents > 0 ? "you're owed" : netCents < 0 ? "you owe" : "you're even";
}

export function NetBalanceCard({ totals }: NetBalanceCardProps) {
  const open = totals.filter((entry) => entry.owedCents !== 0 || entry.oweCents !== 0);

  return (
    <section aria-label="Overall balance" className={cardClass}>
      {open.length === 0 ? (
        <SettledContent />
      ) : open.length === 1 ? (
        <SingleCurrencyContent totals={open[0]!} />
      ) : (
        <MultiCurrencyContent totals={open} />
      )}
    </section>
  );
}

function SettledContent() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/14 text-primary">
        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="font-headline text-xl font-bold text-on-surface">You&apos;re all settled up</p>
        <p className="text-sm text-on-surface-variant">No one owes anyone right now.</p>
      </div>
    </div>
  );
}

function SingleCurrencyContent({ totals }: { totals: CurrencyTotals }) {
  const { currency, owedCents, oweCents } = totals;
  const netCents = owedCents - oweCents;

  return (
    <>
      <p className="text-sm text-on-surface-variant">Overall, {netLabel(netCents)}</p>
      <Money
        cents={netCents}
        currency={currency}
        tone="auto"
        className="block font-headline text-[2.25rem] font-extrabold leading-tight tracking-tight sm:text-5xl"
      />
      {netCents === 0 ? (
        <p className="text-sm text-on-surface-variant">What you&apos;re owed and what you owe cancel out.</p>
      ) : null}

      <dl className="mt-2.5 grid grid-cols-2 gap-3 border-t border-white/8 pt-2.5">
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
  );
}

function MultiCurrencyContent({ totals }: { totals: CurrencyTotals[] }) {
  return (
    <>
      <p className="text-sm text-on-surface-variant">Overall, by currency</p>
      <ul className="mt-1.5 divide-y divide-white/8">
        {totals.map(({ currency, owedCents, oweCents }) => {
          const netCents = owedCents - oweCents;
          const tone = toneFromCents(netCents);

          return (
            <li key={currency} className="flex min-h-11 items-baseline justify-between gap-3 py-1.5">
              <span className="text-sm text-on-surface">
                <span className="font-semibold">{currency}:</span>{" "}
                <span className={cn(tone !== "neutral" && toneTextClass[tone])}>{netLabel(netCents)}</span>
              </span>
              <Money
                cents={netCents}
                currency={currency}
                tone={tone}
                absolute
                className="font-headline text-xl font-extrabold tracking-tight"
              />
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function NetBalanceCardSkeleton() {
  return (
    <div aria-hidden="true" className="rounded-3xl bg-surface-container-low px-5 py-3.5 sm:px-6 sm:py-4">
      <SkeletonBlock className="h-4 w-32 rounded-md" />
      <SkeletonBlock className="mt-2 h-10 w-44 rounded-lg" />
      <div className="mt-2.5 grid grid-cols-2 gap-3 border-t border-white/8 pt-2.5">
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
