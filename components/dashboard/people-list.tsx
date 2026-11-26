"use client";

import Link from "next/link";
import { useId, useState } from "react";

import type { PersonBalanceItem } from "@/components/groups/group-list-data";
import { Money, toneTextClass, toneFromCents } from "@/components/ui/money";
import { SkeletonBlock } from "@/components/ui/skeletons";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

const VISIBLE_COUNT = 5;

function describeGroups(groups: PersonBalanceItem["groups"]) {
  if (groups.length === 1) {
    return `in ${groups[0]!.name}`;
  }

  return `across ${groups.length} groups`;
}

export function PeopleList({ people }: { people: PersonBalanceItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  if (people.length === 0) {
    return (
      <p className="rounded-3xl bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant">
        No open balances with anyone.
      </p>
    );
  }

  const hasMore = people.length > VISIBLE_COUNT;
  const visible = expanded ? people : people.slice(0, VISIBLE_COUNT);

  return (
    <div className="overflow-hidden rounded-3xl bg-surface-container-low">
      <ul id={listId} className="divide-y divide-white/5">
        {visible.map((person) => (
          <PersonRow key={person.key} person={person} />
        ))}
      </ul>
      {hasMore ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((current) => !current)}
          className="flex min-h-12 w-full items-center justify-center border-t border-white/5 text-sm font-semibold text-primary transition hover:bg-white/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
        >
          {expanded ? "Show fewer" : `Show all ${people.length}`}
        </button>
      ) : null}
    </div>
  );
}

function PersonRow({ person }: { person: PersonBalanceItem }) {
  const tone = toneFromCents(person.balanceCents);
  const target = person.groups[0];
  const content = (
    <>
      <UserAvatar name={person.name} imageUrl={person.imageUrl} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-headline text-base font-semibold text-on-surface">{person.name}</span>
        <span className="block truncate text-xs text-on-surface-variant">{describeGroups(person.groups)}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className={cn("block text-xs", toneTextClass[tone])}>
          {tone === "positive" ? "owes you" : "you owe"}
        </span>
        <Money
          cents={person.balanceCents}
          currency={person.currency}
          tone={tone}
          className="block font-headline text-base font-bold"
        />
      </span>
    </>
  );
  const rowClass = "flex min-h-[4.5rem] items-center gap-3 px-4 py-3";

  return (
    <li>
      {target ? (
        <Link
          href={target.href}
          className={cn(
            rowClass,
            "transition hover:bg-white/4 focus-visible:bg-white/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60",
          )}
        >
          {content}
        </Link>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </li>
  );
}

export function PeopleListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-white/5 overflow-hidden rounded-3xl bg-surface-container-low" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3">
          <SkeletonBlock className="h-11 w-11 shrink-0 rounded-full" />
          <span className="flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-28 rounded-md" />
            <SkeletonBlock className="h-3 w-24 rounded-md" />
          </span>
          <span className="space-y-2">
            <SkeletonBlock className="ml-auto h-3 w-12 rounded-md" />
            <SkeletonBlock className="h-4 w-20 rounded-md" />
          </span>
        </li>
      ))}
    </ul>
  );
}
