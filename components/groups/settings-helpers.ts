import { ConvexError } from "convex/values";

export type ExpenseExportRow = {
  amount: string;
  currency: string;
  description: string;
  expense_date: string;
  group_name: string;
  kind: "expense" | "settlement";
  notes: string;
  paid_by: string;
  participant_count: number;
  participants: string;
  split_summary: string;
  split_type: "equal" | "exact" | "shares";
};

const CSV_COLUMNS = [
  "group_name",
  "currency",
  "expense_date",
  "kind",
  "description",
  "amount",
  "paid_by",
  "split_type",
  "participant_count",
  "participants",
  "split_summary",
  "notes",
] as const;

function slugifyGroupName(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "group";
}

function formatExportDate(value: number) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function createExportFileName(groupName: string, generatedAt: number) {
  return `split-it-${slugifyGroupName(groupName)}-expenses-${formatExportDate(generatedAt)}.csv`;
}

function escapeCsvField(value: string | number) {
  const text = String(value);

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function buildExpenseExportCsv(rows: ExpenseExportRow[]) {
  return [
    CSV_COLUMNS.join(","),
    ...rows.map((row) => CSV_COLUMNS.map((column) => escapeCsvField(row[column])).join(",")),
  ].join("\n");
}

export function downloadCsv(csv: string, fileName: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

function getInviteBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

export function buildInviteLink(token: string) {
  const baseUrl = getInviteBaseUrl();

  return baseUrl ? `${baseUrl}/invites/${token}` : `/invites/${token}`;
}

export function formatInviteExpiry(expiresAt: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(expiresAt);
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error instanceof ConvexError && typeof error.data === "string") {
    return error.data;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export type SettingsMember = {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
  role: "member" | "owner";
  isCurrentUser: boolean;
  joinedAt: number | null;
  paidCents: number;
  owedCents: number;
  balanceCents: number;
};

/** Group-level standing for another member, in words (positive = the group owes them). */
export function describeMemberBalance(balanceCents: number) {
  if (balanceCents > 0) {
    return { label: "gets back", tone: "positive" as const };
  }

  if (balanceCents < 0) {
    return { label: "owes", tone: "negative" as const };
  }

  return { label: "settled up", tone: "neutral" as const };
}
