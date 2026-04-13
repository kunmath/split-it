import Link from "next/link";
import { ArrowUpRight, Coins, TrendingDown, Users } from "lucide-react";

import { PageContainer } from "@/components/shell/page-container";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { buttonVariants } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { SurfaceCard } from "@/components/ui/surface-card";
import { iconMap } from "@/lib/icon-map";
import { dashboardGroups, dashboardSummary } from "@/lib/placeholder-data";
import { cn, formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <PageContainer className="space-y-10">
      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">Portfolio Summary</p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface sm:text-5xl">
              Financial Footprint
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-7 text-on-surface-variant sm:text-base">
            The dashboard shell mirrors the supplied editorial layout: wide summary cards, tonal group
            blocks, and a navigation system that changes shape across breakpoints.
          </p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <StatCard
          label={dashboardSummary[0].label}
          value={formatCurrency(dashboardSummary[0].value)}
          detail={dashboardSummary[0].detail}
          tone="positive"
          icon={<ArrowUpRight className="h-5 w-5 text-primary" />}
        />
        <StatCard
          label={dashboardSummary[1].label}
          value={formatCurrency(dashboardSummary[1].value)}
          detail={dashboardSummary[1].detail}
          tone="negative"
          icon={<TrendingDown className="h-5 w-5 text-secondary" />}
        />
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface">Active Groups</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Dashboard cards share one responsive implementation.</p>
          </div>
          <Link href="/groups/demo-group" className="text-sm font-medium text-primary transition hover:text-on-surface">
            View all groups
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboardGroups.map((group) => {
            const Icon = iconMap[group.icon];

            return (
              <Link key={group.id} href={group.id === "modern-loft-4b" ? "/groups/demo-group" : `/groups/${group.id}`}>
                <SurfaceCard
                  variant="high"
                  className="group h-full min-h-72 rounded-[2rem] p-5 transition hover:bg-surface-bright"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-13 w-13 items-center justify-center rounded-[1.15rem] bg-surface-container-low text-on-surface-variant">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    {group.accentCount ? (
                      <div className="hidden lg:block">
                        <AvatarBadge
                          name="Editorial Crew"
                          note={`${group.accentCount} nearby`}
                          tone={group.balanceTone === "negative" ? "negative" : "positive"}
                          size="sm"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-10 space-y-3">
                    <div>
                      <p className="font-headline text-2xl font-bold tracking-tight text-on-surface">
                        {group.name}
                      </p>
                      <p className="mt-2 text-sm text-on-surface-variant">
                        {group.memberCount} members · {group.context}
                      </p>
                    </div>
                    <div className="space-y-2 pt-5">
                      <p className="text-[0.68rem] uppercase tracking-[0.22em] text-on-surface-variant">Balance</p>
                      <p
                        className={cn(
                          "font-headline text-3xl font-extrabold tracking-tight",
                          group.balanceTone === "positive" && "text-primary",
                          group.balanceTone === "negative" && "text-secondary",
                          group.balanceTone === "neutral" && "text-on-surface",
                        )}
                      >
                        {group.balanceLabel}
                      </p>
                    </div>
                  </div>
                </SurfaceCard>
              </Link>
            );
          })}

          <SurfaceCard
            variant="low"
            className="flex min-h-72 flex-col items-center justify-center rounded-[2rem] border border-dashed border-outline-variant/25 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
              <Users className="h-6 w-6" />
            </div>
            <p className="mt-6 font-headline text-2xl font-bold text-on-surface">Invite a Friend</p>
            <p className="mt-2 max-w-[18rem] text-sm leading-7 text-on-surface-variant">
              Placeholder route shells are in place for invites, activity, friends, and account screens.
            </p>
          </SurfaceCard>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard variant="hero" className="space-y-4 rounded-[2.25rem]">
          <p className="text-xs uppercase tracking-[0.24em] text-primary">Phase 0 Ready</p>
          <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
            Responsive shell, design tokens, and Docker workflow are now the foundation.
          </h2>
          <p className="max-w-2xl text-sm leading-8 text-on-surface-variant sm:text-base">
            The next phases can focus on real auth, schema, and live Convex data without redoing the
            shell or the visual language.
          </p>
        </SurfaceCard>

        <SurfaceCard variant="low" className="space-y-4 rounded-[2.25rem]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-surface-container-high">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-headline text-lg font-semibold text-on-surface">Reusable financial voice</p>
              <p className="text-sm text-on-surface-variant">Tonal layers over borders, dense numbers over chrome.</p>
            </div>
          </div>
          <Link href="/groups/demo-group/settings" className={buttonVariants({ variant: "ghost", size: "lg" })}>
            Explore Group Totals
          </Link>
        </SurfaceCard>
      </section>
    </PageContainer>
  );
}
