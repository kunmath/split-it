"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  ArrowUpRight,
  Coins,
  Plus,
  Sparkles,
  TrendingDown,
  Users,
  X,
} from "lucide-react";
import { startTransition, useEffect, useState, type FormEvent } from "react";

import { usePlaceholderMode } from "@/components/providers/app-providers";
import { PageContainer } from "@/components/shell/page-container";
import { Button } from "@/components/ui/button";
import { FilledInput } from "@/components/ui/filled-input";
import { ScreenState } from "@/components/ui/screen-state";
import { SurfaceCard } from "@/components/ui/surface-card";
import { api } from "@/convex/_generated/api";
import { iconMap } from "@/lib/icon-map";
import { dashboardGroups, dashboardSummary, type IconKey, type StatTone } from "@/lib/placeholder-data";
import { cn, formatCurrency, formatCurrencyFromCents, getInitials } from "@/lib/utils";

type DashboardScreenProps = {
  initialCreateOpen?: boolean;
};

type DashboardSummaryItem = {
  label: string;
  valueLabel: string;
  tone: StatTone;
  detail: string;
};

type DashboardGroupItem = {
  id: string;
  name: string;
  memberLabel: string;
  contextLabel: string;
  balanceLabel: string;
  balanceTone: StatTone;
  icon: IconKey;
  accentCount: number;
  isOwner: boolean;
  href: string;
};

type CreateGroupDraft = {
  name: string;
  description: string;
  currency: string;
  iconKey: IconKey;
};

const DEFAULT_CREATE_GROUP_DRAFT: CreateGroupDraft = {
  name: "",
  description: "",
  currency: "USD",
  iconKey: "home",
};

const GROUP_ICON_CHOICES: Array<{ key: IconKey; label: string }> = [
  { key: "home", label: "Home" },
  { key: "plane", label: "Trip" },
  { key: "utensils", label: "Dining" },
  { key: "cart", label: "Groceries" },
  { key: "mountain", label: "Adventure" },
  { key: "fuel", label: "Road Trip" },
];

function buildGroupHref(id: string, name: string, description?: string) {
  const params = new URLSearchParams({ name });

  if (description?.trim()) {
    params.set("description", description.trim());
  }

  return `/groups/${id}?${params.toString()}`;
}

function formatBalanceLabel(valueCents: number, currency = "USD") {
  if (valueCents === 0) {
    return "Settled";
  }

  return `${valueCents > 0 ? "+" : "-"}${formatCurrencyFromCents(Math.abs(valueCents), currency)}`;
}

function buildLiveSummaryDetail(activeGroupCount: number, tone: StatTone, valueCents: number) {
  if (activeGroupCount === 0) {
    return "Create a group to start tracking.";
  }

  if (valueCents === 0) {
    return tone === "positive" ? "No one owes you yet." : "Nothing outstanding.";
  }

  return `${activeGroupCount} active ${activeGroupCount === 1 ? "group" : "groups"}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to create the group right now.";
}

function mapMockSummary(): DashboardSummaryItem[] {
  return dashboardSummary.map((item) => ({
    label: item.label,
    valueLabel: formatCurrency(item.value),
    tone: item.tone,
    detail: item.detail,
  }));
}

function mapMockGroups(): DashboardGroupItem[] {
  return dashboardGroups.map((group) => ({
    id: group.id,
    name: group.name,
    memberLabel: `${group.memberCount} ${group.memberCount === 1 ? "member" : "members"}`,
    contextLabel: group.context,
    balanceLabel: group.balanceLabel,
    balanceTone: group.balanceTone,
    icon: group.icon,
    accentCount: group.accentCount ?? Math.max(group.memberCount - 2, 0),
    isOwner: true,
    href: `/groups/${group.id}`,
  }));
}

export function DashboardScreen({ initialCreateOpen = false }: DashboardScreenProps) {
  const { mode } = usePlaceholderMode();

  if (mode === "live") {
    return <LiveDashboardScreen initialCreateOpen={initialCreateOpen} />;
  }

  return <MockDashboardScreen initialCreateOpen={initialCreateOpen} />;
}

function MockDashboardScreen({ initialCreateOpen = false }: DashboardScreenProps) {
  const [groups, setGroups] = useState<DashboardGroupItem[]>(() => mapMockGroups());

  async function handleCreateGroup(draft: CreateGroupDraft) {
    const trimmedName = draft.name.trim();
    const trimmedDescription = draft.description.trim();

    const localId = `local-${Date.now()}`;

    setGroups((currentGroups) => [
      {
        id: localId,
        name: trimmedName,
        memberLabel: "1 member",
        contextLabel: trimmedDescription || "Ready for the first shared expense",
        balanceLabel: "Settled",
        balanceTone: "neutral",
        icon: draft.iconKey,
        accentCount: 0,
        isOwner: true,
        href: buildGroupHref(localId, trimmedName, trimmedDescription),
      },
      ...currentGroups,
    ]);

    return localId;
  }

  return (
    <DashboardScene
      initialCreateOpen={initialCreateOpen}
      summary={mapMockSummary()}
      groups={groups}
      onCreateGroup={handleCreateGroup}
    />
  );
}

function LiveDashboardScreen({ initialCreateOpen = false }: DashboardScreenProps) {
  const { isLoading: isConvexAuthLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.current);
  const summary = useQuery(
    api.groups.getDashboardSummary,
    currentUser === undefined ? "skip" : {},
  );
  const groups = useQuery(
    api.groups.listActiveForCurrentUser,
    currentUser === undefined ? "skip" : {},
  );
  const createGroup = useMutation(api.groups.create);

  if (currentUser === undefined) {
    return (
      <PageContainer className="space-y-6">
        <ScreenState
          state="loading"
          title="Loading dashboard"
          description="Pulling your active groups, portfolio totals, and create-group tools into place."
        />
      </PageContainer>
    );
  }

  if (currentUser === null) {
    return (
      <PageContainer className="space-y-6">
        <ScreenState
          state={isConvexAuthLoading ? "loading" : "unavailable"}
          title={isConvexAuthLoading ? "Syncing your workspace" : "Convex auth bridge unavailable"}
          description={
            isConvexAuthLoading
              ? "Your account is authenticated, but the ledger record is still finishing setup. Refresh in a moment if this state persists."
              : isConvexAuthenticated
                ? "Your account is authenticated, but the ledger record was not found in Convex. The Clerk webhook or current-user sync still needs attention."
                : "Clerk sign-in succeeded, but Convex did not receive a valid auth token for this session. Check the Clerk JWT template named `convex`, its `aud` claim, and whether it matches this app's publishable key and issuer domain."
          }
        />
      </PageContainer>
    );
  }

  if (summary === undefined || groups === undefined) {
    return (
      <PageContainer className="space-y-6">
        <ScreenState
          state="loading"
          title="Loading dashboard"
          description="Pulling your active groups, portfolio totals, and create-group tools into place."
        />
      </PageContainer>
    );
  }

  const summaryItems: DashboardSummaryItem[] =
    [
      {
        label: "Overall you are owed",
        valueLabel: formatCurrencyFromCents(summary.overallYouAreOwedCents),
        tone: "positive",
        detail: buildLiveSummaryDetail(
          summary.activeGroupCount,
          "positive",
          summary.overallYouAreOwedCents,
        ),
      },
      {
        label: "Total you owe",
        valueLabel: formatCurrencyFromCents(summary.totalYouOweCents),
        tone: "negative",
        detail: buildLiveSummaryDetail(summary.activeGroupCount, "negative", summary.totalYouOweCents),
      },
    ];

  const groupItems: DashboardGroupItem[] =
    groups.map((group) => ({
      id: group._id,
      name: group.name,
      memberLabel: `${group.memberCount} ${group.memberCount === 1 ? "member" : "members"}`,
      contextLabel:
        group.description?.trim() ||
        (group.expenseCount > 0
          ? `${group.expenseCount} shared ${group.expenseCount === 1 ? "expense" : "expenses"} tracked`
          : "Ready for the first shared expense"),
      balanceLabel: formatBalanceLabel(group.balanceCents, group.currency),
      balanceTone: group.balanceCents === 0 ? "neutral" : group.balanceCents > 0 ? "positive" : "negative",
      icon: group.iconKey,
      accentCount: Math.max(group.memberCount - 2, 0),
      isOwner: group.role === "owner",
      href: buildGroupHref(group._id, group.name, group.description),
    }));

  async function handleCreateGroup(draft: CreateGroupDraft) {
    return createGroup({
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      currency: draft.currency,
      iconKey: draft.iconKey,
    });
  }

  return (
    <DashboardScene
      initialCreateOpen={initialCreateOpen}
      summary={summaryItems}
      groups={groupItems}
      onCreateGroup={handleCreateGroup}
    />
  );
}

type DashboardSceneProps = {
  initialCreateOpen: boolean;
  summary: DashboardSummaryItem[];
  groups: DashboardGroupItem[];
  onCreateGroup: (draft: CreateGroupDraft) => Promise<string>;
  isLoading?: boolean;
  loadingLabel?: string;
};

function DashboardScene({
  initialCreateOpen,
  summary,
  groups,
  onCreateGroup,
  isLoading = false,
  loadingLabel = "Loading dashboard...",
}: DashboardSceneProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<CreateGroupDraft>(DEFAULT_CREATE_GROUP_DRAFT);
  const [highlightGroupId, setHighlightGroupId] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(initialCreateOpen);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCreateOpen) {
      setIsComposerOpen(true);
    }
  }, [initialCreateOpen]);

  function openComposer() {
    setSubmissionError(null);
    setIsComposerOpen(true);
  }

  function closeComposer() {
    setSubmissionError(null);
    setIsComposerOpen(false);
    router.replace("/dashboard", { scroll: false });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = draft.name.trim();
    const description = draft.description.trim();

    if (name.length < 2) {
      setSubmissionError("Group name must be at least 2 characters.");
      return;
    }

    if (description.length > 140) {
      setSubmissionError("Description must stay within 140 characters.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const createdGroupId = await onCreateGroup({
        ...draft,
        name,
        description,
      });

      startTransition(() => {
        setHighlightGroupId(createdGroupId);
        setDraft(DEFAULT_CREATE_GROUP_DRAFT);
        setIsComposerOpen(false);
      });
      router.replace("/dashboard", { scroll: false });
    } catch (error) {
      setSubmissionError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageContainer className="relative page-glow space-y-8 lg:space-y-11">
        <section className="space-y-3 lg:space-y-4">
          <p className="text-[0.68rem] uppercase tracking-[0.28em] text-on-surface-variant">
            Portfolio Summary
          </p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="max-w-[12rem] font-headline text-4xl font-extrabold tracking-tight text-on-surface sm:max-w-none sm:text-5xl lg:text-[3.15rem]">
                Financial Footprint
              </h1>
            </div>
            <p className="max-w-xl text-sm leading-7 text-on-surface-variant">
              Build shared ledgers for rent, travel, dinners, and recurring spend from one responsive dashboard.
            </p>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {isLoading ? (
            <>
              <SummaryTileSkeleton />
              <SummaryTileSkeleton />
            </>
          ) : (
            summary.map((item) => <SummaryTile key={item.label} item={item} />)
          )}
        </section>

        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
                Active Groups
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                {isLoading ? loadingLabel : `${groups.length} active ${groups.length === 1 ? "group" : "groups"} in view`}
              </p>
            </div>

            <button
              type="button"
              className="text-sm font-semibold text-primary transition hover:text-on-surface"
            >
              <span className="sm:hidden">View Archived</span>
              <span className="hidden sm:inline">View all groups</span>
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {isLoading ? (
              <>
                <GroupCardSkeleton />
                <GroupCardSkeleton />
                <GroupCardSkeleton />
                <InviteTile disabled />
              </>
            ) : (
              <>
                {groups.length === 0 ? (
                  <EmptyGroupsState onCreateRequest={openComposer} />
                ) : (
                  groups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      highlighted={highlightGroupId === group.id}
                    />
                  ))
                )}
                <InviteTile />
              </>
            )}
          </div>
        </section>
      </PageContainer>

      {isComposerOpen ? (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close create group panel"
            className="absolute inset-0"
            onClick={closeComposer}
          />

          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-2xl px-3 pb-3 pt-16 lg:inset-0 lg:flex lg:items-center lg:justify-center lg:px-6 lg:pb-6 lg:pt-6">
            <SurfaceCard
              variant="hero"
              className="relative max-h-[92vh] overflow-y-auto rounded-[2rem] p-5 sm:p-6 lg:w-full lg:rounded-[2.5rem] lg:p-8"
            >
              <button
                type="button"
                onClick={closeComposer}
                className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/6 text-on-surface-variant transition hover:text-on-surface"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="space-y-7">
                <div className="space-y-3 pr-12">
                  <p className="text-[0.68rem] uppercase tracking-[0.28em] text-primary">Create Group</p>
                  <h3 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface sm:text-4xl">
                    Start a new shared ledger
                  </h3>
                  <p className="max-w-xl text-sm leading-7 text-on-surface-variant">
                    Add the group basics now. Invites, acceptance, and expense entry arrive in later phases.
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                  <FilledInput
                    label="Group Name"
                    placeholder="Modern Loft 4B"
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    maxLength={60}
                  />

                  <FilledInput
                    label="Description"
                    placeholder="Monthly rent and utilities"
                    value={draft.description}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, description: event.target.value }))
                    }
                    maxLength={140}
                    hint="Optional. Keep it short so it fits cleanly on the dashboard card."
                  />

                  <label className="block space-y-2">
                    <span className="block text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant">
                      Currency
                    </span>
                    <span className="flex min-h-14 items-center rounded-[1.25rem] bg-surface-container-lowest px-4 ring-1 ring-white/5">
                      <select
                        value={draft.currency}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, currency: event.target.value }))
                        }
                        className="w-full bg-transparent text-sm text-on-surface focus:outline-none"
                      >
                        <option value="USD" className="bg-surface text-on-surface">
                          USD - US Dollar
                        </option>
                      </select>
                    </span>
                  </label>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant">
                        Card Icon
                      </p>
                      <p className="text-xs text-on-surface-variant">Choose the card tone that fits the group.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                      {GROUP_ICON_CHOICES.map((choice) => {
                        const Icon = iconMap[choice.key];
                        const active = draft.iconKey === choice.key;

                        return (
                          <button
                            key={choice.key}
                            type="button"
                            onClick={() => setDraft((current) => ({ ...current, iconKey: choice.key }))}
                            className={cn(
                              "space-y-3 rounded-[1.5rem] bg-surface-container-low px-3 py-4 text-center transition",
                              active
                                ? "ring-1 ring-primary/50 shadow-[0_12px_32px_rgba(78,222,163,0.14)]"
                                : "hover:bg-surface-container-high",
                            )}
                          >
                            <span
                              className={cn(
                                "mx-auto flex h-11 w-11 items-center justify-center rounded-2xl",
                                active ? "bg-primary/16 text-primary" : "bg-surface-container-high text-on-surface-variant",
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </span>
                            <span className="block text-xs text-on-surface-variant">{choice.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <SurfaceCard variant="low" className="rounded-[1.75rem] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                        <Sparkles className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="font-headline text-base font-semibold text-on-surface">Phase 3 boundary</p>
                        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                          This flow creates the group and owner membership only. Invite acceptance and expenses stay out of scope here.
                        </p>
                      </div>
                    </div>
                  </SurfaceCard>

                  {submissionError ? (
                    <p className="rounded-[1.2rem] bg-error/8 px-4 py-3 text-sm text-error">{submissionError}</p>
                  ) : null}

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button variant="ghost" size="lg" onClick={closeComposer} disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create Group"}
                    </Button>
                  </div>
                </form>
              </div>
            </SurfaceCard>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SummaryTile({ item }: { item: DashboardSummaryItem }) {
  const Icon = item.tone === "negative" ? TrendingDown : ArrowUpRight;

  return (
    <SurfaceCard variant="high" className="min-h-44 rounded-[2rem] p-5 sm:p-6 lg:min-h-48 lg:rounded-[2.2rem]">
      <div className="flex h-full flex-col justify-between gap-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-surface-container-low text-on-surface-variant">
          <Icon className={cn("h-5 w-5", item.tone === "negative" ? "text-secondary" : "text-primary")} />
        </div>

        <div className="space-y-3">
          <p className="text-[0.68rem] uppercase tracking-[0.28em] text-on-surface-variant">{item.label}</p>
          <div className="flex flex-wrap items-end gap-2">
            <p
              className={cn(
                "font-headline text-[2.4rem] font-extrabold tracking-tight sm:text-[2.8rem]",
                item.tone === "positive" && "text-primary",
                item.tone === "negative" && "text-secondary",
                item.tone === "neutral" && "text-on-surface",
              )}
            >
              {item.valueLabel}
            </p>
            <span
              className={cn(
                "pb-1.5 text-sm",
                item.tone === "positive" && "text-primary/70",
                item.tone === "negative" && "text-secondary/70",
                item.tone === "neutral" && "text-on-surface-variant",
              )}
            >
              {item.detail}
            </span>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}

function GroupCard({
  group,
  highlighted,
}: {
  group: DashboardGroupItem;
  highlighted: boolean;
}) {
  const Icon = iconMap[group.icon];

  return (
    <Link href={group.href} className="group block">
      <SurfaceCard
        variant="high"
        className={cn(
          "min-h-[16rem] rounded-[2rem] p-5 transition duration-200 hover:bg-surface-bright sm:p-6",
          highlighted && "ring-1 ring-primary/45 shadow-[0_22px_50px_rgba(78,222,163,0.14)]",
        )}
      >
        <div className="relative flex h-full flex-col justify-between gap-8 overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.15rem] bg-surface-container-low text-on-surface-variant">
              <Icon
                className={cn(
                  "h-5 w-5",
                  group.balanceTone === "negative" ? "text-secondary" : "text-primary",
                )}
              />
            </div>

            <div className="flex items-center gap-2">
              {group.accentCount > 0 ? <GroupAccentCluster name={group.name} accentCount={group.accentCount} /> : null}
              {group.isOwner ? (
                <span className="hidden rounded-full bg-white/6 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-variant sm:inline-flex">
                  Owner
                </span>
              ) : null}
            </div>

            <div className="text-right xl:hidden">
              <p className="text-[0.62rem] uppercase tracking-[0.24em] text-on-surface-variant">Balance</p>
              <p
                className={cn(
                  "mt-1 font-headline text-xl font-bold tracking-tight",
                  group.balanceTone === "positive" && "text-primary",
                  group.balanceTone === "negative" && "text-secondary",
                  group.balanceTone === "neutral" && "text-on-surface-variant",
                )}
              >
                {group.balanceLabel}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="font-headline text-[1.7rem] font-bold tracking-tight text-on-surface">
                {group.name}
              </h3>
              <p className="mt-1 text-sm text-on-surface-variant">{group.memberLabel}</p>
            </div>
            <p className="max-w-[18rem] text-sm italic text-on-surface-variant/90">{group.contextLabel}</p>
          </div>

          <div className="hidden space-y-2 xl:block">
            <p className="text-[0.62rem] uppercase tracking-[0.24em] text-on-surface-variant">Balance</p>
            <p
              className={cn(
                "font-headline text-[2rem] font-extrabold tracking-tight",
                group.balanceTone === "positive" && "text-primary",
                group.balanceTone === "negative" && "text-secondary",
                group.balanceTone === "neutral" && "text-on-surface",
              )}
            >
              {group.balanceLabel}
            </p>
          </div>

          <div
            className={cn(
              "pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full blur-3xl transition group-hover:opacity-100",
              group.balanceTone === "negative" ? "bg-secondary/12" : "bg-primary/10",
            )}
          />
        </div>
      </SurfaceCard>
    </Link>
  );
}

function GroupAccentCluster({ name, accentCount }: { name: string; accentCount: number }) {
  const initials = getInitials(name);
  const first = initials[0] ?? "S";
  const second = initials[1] ?? first;

  return (
    <div className="hidden items-center sm:flex">
      <div className="flex items-center -space-x-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-surface bg-primary/18 text-[0.65rem] font-semibold text-primary">
          {first}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-surface bg-secondary/16 text-[0.65rem] font-semibold text-secondary">
          {second}
        </span>
      </div>
      {accentCount > 0 ? (
        <span className="ml-2 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white/6 px-2 text-[0.62rem] font-semibold text-on-surface-variant">
          +{accentCount}
        </span>
      ) : null}
    </div>
  );
}

function EmptyGroupsState({ onCreateRequest }: { onCreateRequest: () => void }) {
  return (
    <SurfaceCard
      variant="hero"
      className="md:col-span-2 xl:col-span-3 xl:min-h-[16rem] xl:rounded-[2rem]"
    >
      <div className="flex h-full flex-col justify-between gap-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-[1.15rem] bg-primary/14 text-primary">
          <Coins className="h-6 w-6" />
        </div>

        <div className="space-y-3">
          <h3 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
            Create your first group
          </h3>
          <p className="max-w-xl text-sm leading-7 text-on-surface-variant">
            Start with rent, a trip, or a dinner rotation. Once the group exists, it appears here reactively.
          </p>
        </div>

        <div>
          <Button size="lg" onClick={onCreateRequest}>
            <Plus className="h-4.5 w-4.5" />
            Create Group
          </Button>
        </div>
      </div>
    </SurfaceCard>
  );
}

function InviteTile({ disabled = false }: { disabled?: boolean }) {
  return (
    <SurfaceCard
      variant="low"
      className={cn(
        "flex min-h-[16rem] flex-col items-center justify-center rounded-[2rem] border border-dashed border-outline-variant/35 bg-transparent text-center",
        disabled && "animate-pulse",
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
        <Users className="h-5 w-5" />
      </div>
      <p className="mt-5 font-headline text-2xl font-bold text-on-surface">Invite a Friend</p>
      <p className="mt-2 max-w-[16rem] text-sm leading-7 text-on-surface-variant">
        Share the split-it experience.
      </p>
    </SurfaceCard>
  );
}

function SummaryTileSkeleton() {
  return (
    <SurfaceCard variant="high" className="min-h-44 rounded-[2rem] p-5 sm:p-6 lg:min-h-48 lg:rounded-[2.2rem]">
      <div className="flex h-full animate-pulse flex-col justify-between gap-8">
        <div className="h-12 w-12 rounded-[1rem] bg-white/6" />
        <div className="space-y-3">
          <div className="h-3 w-36 rounded-full bg-white/6" />
          <div className="h-12 w-48 rounded-full bg-white/6" />
        </div>
      </div>
    </SurfaceCard>
  );
}

function GroupCardSkeleton() {
  return (
    <SurfaceCard variant="high" className="min-h-[16rem] rounded-[2rem] p-5 sm:p-6">
      <div className="flex h-full animate-pulse flex-col justify-between gap-8">
        <div className="flex items-start justify-between">
          <div className="h-14 w-14 rounded-[1.15rem] bg-white/6" />
          <div className="h-10 w-24 rounded-[1rem] bg-white/6" />
        </div>
        <div className="space-y-3">
          <div className="h-8 w-40 rounded-full bg-white/6" />
          <div className="h-4 w-24 rounded-full bg-white/6" />
          <div className="h-4 w-44 rounded-full bg-white/6" />
        </div>
      </div>
    </SurfaceCard>
  );
}
