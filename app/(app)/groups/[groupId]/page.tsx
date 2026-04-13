import Link from "next/link";
import { Download, Filter, Send, Sparkles } from "lucide-react";

import { PageContainer } from "@/components/shell/page-container";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { iconMap } from "@/lib/icon-map";
import { getGroupDetail, groupExpenses, memberBalances } from "@/lib/placeholder-data";
import { cn, formatCurrency } from "@/lib/utils";

type GroupPageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{
    name?: string;
    description?: string;
  }>;
};

export default async function GroupPage({ params, searchParams }: GroupPageProps) {
  const { groupId } = await params;
  const resolvedSearchParams = await searchParams;
  const group = getGroupDetail(groupId);
  const title = resolvedSearchParams.name?.trim() || group.title;
  const description = resolvedSearchParams.description?.trim() || group.description;

  return (
    <PageContainer className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.6fr_0.84fr]">
        <SurfaceCard variant="hero" className="min-h-[18rem] rounded-[2.5rem] p-6 sm:p-8">
          <div className="flex h-full flex-col justify-between gap-6">
            <div className="flex flex-wrap gap-2 text-[0.68rem] uppercase tracking-[0.22em] text-on-surface-variant">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">Adventure</span>
              <span className="rounded-full bg-white/6 px-3 py-1">Aug 2024</span>
            </div>
            <div className="space-y-3">
              <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface sm:text-6xl">
                {title}
              </h1>
              <p className="max-w-2xl text-sm leading-8 text-on-surface-variant sm:text-base">
                {group.memberCount} members exploring the Land of Fire and Ice. {description}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <AvatarBadge name="Sarah Jenkins" tone="positive" size="sm" />
              <AvatarBadge name="James Chen" tone="negative" size="sm" />
              <AvatarBadge name="Elena Rodriguez" tone="positive" size="sm" />
            </div>
          </div>
        </SurfaceCard>

        <div className="space-y-5">
          <SurfaceCard variant="high" className="rounded-[2.25rem] p-7">
            <p className="text-xs uppercase tracking-[0.22em] text-primary">Current Standing</p>
            <p className="mt-4 font-headline text-5xl font-extrabold tracking-tight text-primary">
              {formatCurrency(group.standing)}
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">You are owed in this group.</p>
            <div className="mt-8 space-y-4">
              {memberBalances.slice(0, 3).map((member) => (
                <div key={member.name} className="flex items-center justify-between gap-4">
                  <AvatarBadge
                    name={member.name}
                    note={member.note}
                    tone={member.tone === "neutral" ? "neutral" : member.tone}
                    size="sm"
                  />
                  <p
                    className={cn(
                      "font-headline text-lg font-bold",
                      member.tone === "positive" && "text-primary",
                      member.tone === "negative" && "text-secondary",
                      member.tone === "neutral" && "text-on-surface",
                    )}
                  >
                    {member.amount > 0 ? "+" : ""}
                    {formatCurrency(member.amount)}
                  </p>
                </div>
              ))}
            </div>
            <Button variant="secondary" size="lg" fullWidth className="mt-8">
              <Send className="h-4.5 w-4.5" />
              Send Reminders
            </Button>
          </SurfaceCard>

          <SurfaceCard variant="low" className="rounded-[2.25rem] p-7">
            <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Group Insights</h2>
            <div className="mt-6 space-y-5">
              {group.insightBreakdown.map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-on-surface-variant">
                    <span>{item.label}</span>
                    <span>{item.percent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-container-highest">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        item.tone === "positive" ? "bg-primary" : "bg-secondary",
                      )}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface">Recent Expenses</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              The list layout is shared across breakpoints and only changes composition density.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-container-low text-on-surface-variant transition hover:text-on-surface"
            >
              <Filter className="h-4.5 w-4.5" />
            </button>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-container-low text-on-surface-variant transition hover:text-on-surface"
            >
              <Download className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {groupExpenses.map((expense) => {
            const Icon = iconMap[expense.icon];

            return (
              <Link key={expense.id} href={`/groups/${groupId}/expenses/${expense.id}/edit`}>
                <SurfaceCard
                  variant="low"
                  className="grid gap-4 rounded-[2rem] p-5 transition hover:bg-surface-container-high lg:grid-cols-[0.12fr_0.48fr_0.2fr_0.2fr] lg:items-center"
                >
                  <div className="flex items-center gap-4 lg:block lg:text-center">
                    <p className="text-[0.68rem] uppercase tracking-[0.22em] text-on-surface-variant">
                      {expense.dateLabel.split(" ")[0]}
                    </p>
                    <p className="font-headline text-3xl font-bold tracking-tight text-on-surface">
                      {expense.dateLabel.split(" ")[1]}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-surface-container-highest">
                      <Icon className={cn("h-5 w-5", expense.tone === "negative" ? "text-secondary" : "text-primary")} />
                    </div>
                    <div>
                      <p className="font-headline text-xl font-semibold tracking-tight text-on-surface">
                        {expense.title}
                      </p>
                      <p className="text-sm text-on-surface-variant">
                        {expense.category} · Paid by {expense.paidBy}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[0.68rem] uppercase tracking-[0.22em] text-on-surface-variant">
                      Total Expense
                    </p>
                    <p className="mt-2 font-headline text-2xl font-bold text-on-surface">
                      {formatCurrency(expense.total)}
                    </p>
                  </div>

                  <div className="text-left lg:text-right">
                    <p className="text-[0.68rem] uppercase tracking-[0.22em] text-on-surface-variant">
                      {expense.tone === "negative" ? "You owe" : "You are owed"}
                    </p>
                    <p
                      className={cn(
                        "mt-2 font-headline text-2xl font-extrabold tracking-tight",
                        expense.tone === "negative" ? "text-secondary" : "text-primary",
                      )}
                    >
                      {expense.signedBalance > 0 ? "+" : ""}
                      {formatCurrency(expense.signedBalance)}
                    </p>
                  </div>
                </SurfaceCard>
              </Link>
            );
          })}
        </div>
      </section>

      <SurfaceCard variant="low" className="flex items-start gap-4 rounded-[2rem] p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-container-high text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="font-headline text-lg font-semibold text-on-surface">Phase 0 boundary</p>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-on-surface-variant">
            This screen intentionally stops at shell fidelity. Expense actions, filters, and reminders
            remain visual placeholders until real mutations arrive in later phases.
          </p>
        </div>
      </SurfaceCard>
    </PageContainer>
  );
}
