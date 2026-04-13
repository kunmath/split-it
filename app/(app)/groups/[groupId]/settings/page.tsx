import { ChevronRight, Download, Pencil, Trash2, UserPlus } from "lucide-react";

import { PageContainer } from "@/components/shell/page-container";
import { AvatarBadge } from "@/components/ui/avatar-badge";
import { SurfaceCard } from "@/components/ui/surface-card";
import { getGroupDetail, memberBalances, settingsActions } from "@/lib/placeholder-data";
import { cn, formatCurrency } from "@/lib/utils";

const actionIcons = [Pencil, UserPlus, Download, Trash2];

type GroupSettingsPageProps = {
  params: Promise<{ groupId: string }>;
};

export default async function GroupSettingsPage({ params }: GroupSettingsPageProps) {
  const { groupId } = await params;
  const group = getGroupDetail(groupId);

  return (
    <PageContainer className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">Groups · {group.title}</p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface sm:text-6xl">
            {group.title}
          </h1>
          <p className="max-w-2xl text-sm leading-8 text-on-surface-variant sm:text-base">
            {group.description}
          </p>
        </div>

        <SurfaceCard variant="high" className="rounded-[2.25rem] p-7 text-right">
          <p className="text-xs uppercase tracking-[0.24em] text-primary">Total Group Spend</p>
          <p className="mt-4 font-headline text-5xl font-extrabold tracking-tight text-on-surface sm:text-6xl">
            {formatCurrency(group.spend)}
          </p>
        </SurfaceCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-6">
          <SurfaceCard variant="low" className="space-y-6 rounded-[2.25rem] p-7">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">You are owed</p>
              <p className="mt-2 font-headline text-4xl font-extrabold tracking-tight text-primary">
                {formatCurrency(group.youAreOwed)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">You owe</p>
              <p className="mt-2 font-headline text-4xl font-extrabold tracking-tight text-secondary">
                {formatCurrency(group.youOwe)}
              </p>
            </div>
          </SurfaceCard>

          <SurfaceCard variant="low" className="rounded-[2.25rem] p-4">
            <p className="px-3 pb-4 text-xs uppercase tracking-[0.24em] text-on-surface-variant">Group Settings</p>
            <div className="space-y-2">
              {settingsActions.map((action, index) => {
                const Icon = actionIcons[index]!;

                return (
                  <button
                    key={action.label}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between rounded-[1.5rem] px-4 py-4 text-left transition",
                      action.tone === "danger"
                        ? "text-error hover:bg-error/8"
                        : "text-on-surface hover:bg-surface-container-high",
                    )}
                  >
                    <span className="flex items-center gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/4">
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <span>
                        <span className="block font-headline text-base font-semibold">{action.label}</span>
                        <span className="mt-1 block text-sm text-on-surface-variant">{action.note}</span>
                      </span>
                    </span>
                    <ChevronRight className="h-4.5 w-4.5" />
                  </button>
                );
              })}
            </div>
          </SurfaceCard>
        </div>

        <SurfaceCard variant="high" className="rounded-[2.25rem] p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">Member Balances</p>
            <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">{group.memberCount} members total</p>
          </div>
          <div className="mt-2 space-y-3">
            {memberBalances.map((member) => (
              <div
                key={member.name}
                className="flex flex-col gap-4 rounded-[1.75rem] px-3 py-4 transition hover:bg-white/3 sm:flex-row sm:items-center sm:justify-between"
              >
                <AvatarBadge
                  name={member.name}
                  note={member.note}
                  chip={member.amount === 0 ? "Settled" : member.amount > 0 ? "Owed" : "Owes"}
                  tone={member.tone === "neutral" ? "neutral" : member.tone}
                />
                <div className="text-left sm:text-right">
                  <p className="text-[0.68rem] uppercase tracking-[0.22em] text-on-surface-variant">
                    {member.amount === 0 ? "Balance" : member.amount > 0 ? "Owed" : "Owes"}
                  </p>
                  <p
                    className={cn(
                      "mt-2 font-headline text-3xl font-extrabold tracking-tight",
                      member.tone === "positive" && "text-primary",
                      member.tone === "negative" && "text-secondary",
                      member.tone === "neutral" && "text-on-surface",
                    )}
                  >
                    {member.amount > 0 ? "+" : ""}
                    {formatCurrency(member.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </section>
    </PageContainer>
  );
}
