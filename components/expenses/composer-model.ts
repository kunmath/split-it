// Relative imports keep this module loadable from vitest, which has no "@/" alias.
import { splitByShares } from "../../convex/lib/money";
import { getExpenseIconKey, type ExpenseIconKey } from "../../lib/expense-icons";
import { formatMoneyFromCents } from "../../lib/format";

export type SplitType = "equal" | "exact" | "shares";

export type ComposerMember = {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
  role: "owner" | "member";
  isCurrentUser: boolean;
};

export type ExistingExpenseDraft = {
  id: string;
  description: string;
  amountCents: number;
  paidBy: string;
  splitType: SplitType;
  expenseAt: number;
  notes?: string;
  shares: Array<{
    userId: string;
    shareCents: number;
  }>;
};

export type ComposerSceneData = {
  groupId: string;
  groupName: string;
  groupCurrency: string;
  members: ComposerMember[];
  expense: ExistingExpenseDraft | null;
};

export type ExactShareDraft = {
  userId: string;
  shareCents: number;
};

export type ShareDraft = {
  userId: string;
  share: number;
};

export type ExpenseDraft = {
  description: string;
  amountCents: number;
  paidBy: string;
  splitType: SplitType;
  participantIds: string[];
  exactShares?: ExactShareDraft[];
  shares?: ShareDraft[];
  expenseAt: number;
  notes?: string;
};

export type FormErrors = {
  amount?: string;
  description?: string;
  expenseAt?: string;
  participants?: string;
  payer?: string;
  exactShares?: string;
  shares?: string;
};

export type SplitSummaryState = {
  tone: "matched" | "warning" | "error";
  /** Short status shown inside the split token, e.g. "₹20.00 left". Null when the split is fine. */
  problem: string | null;
  /** One-line hint shown near the save button when saving is blocked. */
  detail: string;
  canSubmit: boolean;
};

export type ExactRow = {
  member: ComposerMember;
  input: string;
  parsedCents: number | null;
  isSelected: boolean;
  isInvalid: boolean;
  needsAmount: boolean;
  shareCents: number;
};

export type ShareRow = {
  member: ComposerMember;
  input: string;
  parsedShare: number;
  isSelected: boolean;
  isInvalid: boolean;
  needsAmount: boolean;
  share: number;
};

export function getTodayDateInputValue() {
  return formatDateInputValue(Date.now());
}

export function formatDateInputValue(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function shiftDateInputValue(value: string, days: number) {
  const timestamp = toExpenseTimestamp(value) ?? Date.now();
  const date = new Date(timestamp);
  date.setDate(date.getDate() + days);

  return formatDateInputValue(date.getTime());
}

/** "Today", "Yesterday", "Aug 18", or "Aug 18, 2025" for other years. */
export function formatDateChipLabel(value: string, todayValue = getTodayDateInputValue()) {
  const timestamp = toExpenseTimestamp(value);

  if (timestamp === null) {
    return "Pick a date";
  }

  if (value === todayValue) {
    return "Today";
  }

  if (value === shiftDateInputValue(todayValue, -1)) {
    return "Yesterday";
  }

  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date(toExpenseTimestamp(todayValue) ?? Date.now()).getFullYear();

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

export function formatCentsForInput(amountCents: number) {
  return (amountCents / 100).toFixed(2);
}

export function parseAmountInputToCents(value: string) {
  const normalized = value.replace(/,/g, "").trim();

  if (!normalized) {
    return 0;
  }

  if (!/^\d*(?:\.\d{0,2})?$/.test(normalized) || normalized === ".") {
    return null;
  }

  const [wholePart = "0", fractionPart = ""] = normalized.split(".");
  const wholeCents = Number(wholePart || "0") * 100;

  if (!Number.isSafeInteger(wholeCents)) {
    return null;
  }

  return wholeCents + Number((fractionPart + "00").slice(0, 2));
}

export function buildEqualSharePreview(totalCents: number, participantIds: string[]) {
  const shares = new Map<string, number>();

  if (participantIds.length === 0 || totalCents <= 0) {
    for (const participantId of participantIds) {
      shares.set(participantId, 0);
    }

    return shares;
  }

  const baseShare = Math.floor(totalCents / participantIds.length);
  const remainder = totalCents % participantIds.length;

  participantIds.forEach((participantId, index) => {
    shares.set(participantId, baseShare + (index < remainder ? 1 : 0));
  });

  return shares;
}

/** Mirrors the backend's proportional split so the preview matches what gets saved. */
export function buildSharesPreview(totalCents: number, rows: ShareDraft[]) {
  const preview = new Map<string, number>();

  if (totalCents <= 0 || rows.length === 0 || rows.some((row) => !(row.share > 0))) {
    for (const row of rows) {
      preview.set(row.userId, 0);
    }

    return preview;
  }

  const cents = splitByShares(
    totalCents,
    rows.map((row) => row.share),
  );

  rows.forEach((row, index) => {
    preview.set(row.userId, cents[index] ?? 0);
  });

  return preview;
}

export function toExpenseTimestamp(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const timestamp = new Date(year, month - 1, day, 12, 0, 0, 0).getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return timestamp;
}

export function getCurrencyToken(currency: string) {
  return (
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency
  );
}

export function buildInitialExactInputs(
  members: ComposerMember[],
  shares: ExistingExpenseDraft["shares"],
) {
  const inputs: Record<string, string> = {};

  for (const member of members) {
    inputs[member.id] = "";
  }

  for (const share of shares) {
    inputs[share.userId] = formatCentsForInput(share.shareCents);
  }

  return inputs;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function gcdArray(nums: number[]): number {
  return nums.reduce((acc, num) => gcd(acc, num));
}

export function buildInitialShareInputs(
  members: ComposerMember[],
  shares: ExistingExpenseDraft["shares"],
) {
  const inputs: Record<string, string> = {};

  // Default to "1" for all members (new expense case)
  for (const member of members) {
    inputs[member.id] = "1";
  }

  // For edits, reconstruct ratios from persisted shareCents
  if (shares.length > 0) {
    const shareCents = shares.map((s) => s.shareCents);
    const g = gcdArray(shareCents);
    for (const share of shares) {
      const ratio = share.shareCents / g;
      inputs[share.userId] = ratio.toString();
    }
  }

  return inputs;
}

export function buildExactRows(
  members: ComposerMember[],
  exactShareInputs: Record<string, string>,
  selectedIds: string[],
): ExactRow[] {
  return members.map((member) => {
    const input = exactShareInputs[member.id] ?? "";
    const parsedCents = parseAmountInputToCents(input);
    const isSelected = selectedIds.includes(member.id);
    const isInvalid = isSelected && input.trim().length > 0 && parsedCents === null;
    const needsAmount = isSelected && (parsedCents === null || parsedCents <= 0);
    const shareCents = parsedCents !== null && parsedCents > 0 ? parsedCents : 0;

    return { member, input, parsedCents, isSelected, isInvalid, needsAmount, shareCents };
  });
}

export function buildShareRows(
  members: ComposerMember[],
  shareInputs: Record<string, string>,
  selectedIds: string[],
): ShareRow[] {
  return members.map((member) => {
    const input = shareInputs[member.id] ?? "";
    const parsedShare = parseFloat(input);
    const isSelected = selectedIds.includes(member.id);
    const isInvalid =
      isSelected && input.trim().length > 0 && (isNaN(parsedShare) || parsedShare <= 0);
    const needsAmount = isSelected && (isNaN(parsedShare) || parsedShare <= 0);
    const share = !isNaN(parsedShare) && parsedShare > 0 ? parsedShare : 0;

    return { member, input, parsedShare, isSelected, isInvalid, needsAmount, share };
  });
}

export function deriveSplitSummary({
  splitType,
  amountCents,
  selectedCount,
  exactRows,
  exactDifferenceCents,
  shareRows,
  currency,
}: {
  splitType: SplitType;
  amountCents: number | null;
  selectedCount: number;
  exactRows: ExactRow[];
  exactDifferenceCents: number | null;
  shareRows: ShareRow[];
  currency: string;
}): SplitSummaryState {
  if (amountCents === null) {
    return {
      tone: "error",
      problem: null,
      detail: "Enter a valid amount first.",
      canSubmit: false,
    };
  }

  if (selectedCount === 0) {
    return {
      tone: "error",
      problem: "nobody selected",
      detail: "Pick at least one person to split with.",
      canSubmit: false,
    };
  }

  if (splitType === "equal") {
    return { tone: "matched", problem: null, detail: "", canSubmit: true };
  }

  if (splitType === "exact") {
    if (exactRows.some((row) => row.isInvalid)) {
      return {
        tone: "error",
        problem: "invalid amount",
        detail: "Fix the amounts marked in the split (up to 2 decimals).",
        canSubmit: false,
      };
    }

    if (exactRows.some((row) => row.needsAmount)) {
      return {
        tone: "warning",
        problem: "amount missing",
        detail: "Everyone in the split needs an amount above zero.",
        canSubmit: false,
      };
    }

    if (exactDifferenceCents === 0) {
      return { tone: "matched", problem: null, detail: "", canSubmit: true };
    }

    const differenceLabel = formatMoneyFromCents(Math.abs(exactDifferenceCents ?? 0), currency);

    if ((exactDifferenceCents ?? 0) < 0) {
      return {
        tone: "warning",
        problem: `${differenceLabel} left`,
        detail: `Assign ${differenceLabel} more to match the total.`,
        canSubmit: false,
      };
    }

    return {
      tone: "error",
      problem: `${differenceLabel} over`,
      detail: `Remove ${differenceLabel} to match the total.`,
      canSubmit: false,
    };
  }

  if (shareRows.some((row) => row.isInvalid)) {
    return {
      tone: "error",
      problem: "invalid shares",
      detail: "Shares must be positive numbers.",
      canSubmit: false,
    };
  }

  if (shareRows.some((row) => row.needsAmount)) {
    return {
      tone: "warning",
      problem: "shares missing",
      detail: "Everyone in the split needs at least one share.",
      canSubmit: false,
    };
  }

  return { tone: "matched", problem: null, detail: "", canSubmit: true };
}

/** Description keyword → category icon, or null when nothing matches. */
export function guessExpenseIconKey(description: string): ExpenseIconKey | null {
  const withCartFallback = getExpenseIconKey(description, "cart");

  return withCartFallback === getExpenseIconKey(description, "plane") ? withCartFallback : null;
}
