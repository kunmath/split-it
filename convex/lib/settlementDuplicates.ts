/** ConvexError payload code when the other party already recorded a matching payment. */
export const DUPLICATE_SETTLEMENT_ERROR = "DUPLICATE_SETTLEMENT";

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
