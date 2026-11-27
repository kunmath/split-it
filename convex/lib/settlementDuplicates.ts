/** ConvexError payload code when the other party already recorded a matching payment recently. */
export const DUPLICATE_SETTLEMENT_ERROR = "DUPLICATE_SETTLEMENT";

/** How far back a payment recorded by the other party counts as possibly the same transfer. */
export const DUPLICATE_SETTLEMENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type DuplicateSettlementErrorData = {
  code: typeof DUPLICATE_SETTLEMENT_ERROR;
  message: string;
  /** When the earlier payment was recorded. */
  recordedAt: number;
};

export function isDuplicateSettlementErrorData(data: unknown): data is DuplicateSettlementErrorData {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { code?: unknown }).code === DUPLICATE_SETTLEMENT_ERROR &&
    typeof (data as { recordedAt?: unknown }).recordedAt === "number"
  );
}
