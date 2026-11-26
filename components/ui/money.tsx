import { formatMoneyFromCents } from "@/lib/format";
import { cn } from "@/lib/utils";

export type BalanceTone = "positive" | "negative" | "neutral";

export function toneFromCents(valueCents: number): BalanceTone {
  if (valueCents > 0) {
    return "positive";
  }

  if (valueCents < 0) {
    return "negative";
  }

  return "neutral";
}

export const toneTextClass: Record<BalanceTone, string> = {
  positive: "text-primary",
  negative: "text-secondary",
  neutral: "text-on-surface-variant",
};

type MoneyProps = {
  cents: number;
  currency?: string;
  /** Show absolute value (direction conveyed by surrounding words). Default true. */
  absolute?: boolean;
  tone?: BalanceTone | "auto" | "none";
  className?: string;
};

/** Formatted amount with tabular digits. Direction should be conveyed in words nearby, not by color alone. */
export function Money({ cents, currency = "INR", absolute = true, tone = "none", className }: MoneyProps) {
  const resolvedTone = tone === "auto" ? toneFromCents(cents) : tone;

  return (
    <span
      className={cn(
        "whitespace-nowrap tabular-nums",
        resolvedTone !== "none" && toneTextClass[resolvedTone],
        className,
      )}
    >
      {formatMoneyFromCents(absolute ? Math.abs(cents) : cents, currency)}
    </span>
  );
}

/** "you are owed" / "you owe" / "settled up" phrasing for a signed balance from the viewer's perspective. */
export function describeBalance(valueCents: number) {
  if (valueCents > 0) {
    return { tone: "positive" as const, label: "you are owed", shortLabel: "owed" };
  }

  if (valueCents < 0) {
    return { tone: "negative" as const, label: "you owe", shortLabel: "you owe" };
  }

  return { tone: "neutral" as const, label: "settled up", shortLabel: "settled" };
}
