import { ConvexError } from "convex/values";

function assertFiniteNumber(value: number, errorMessage: string) {
  if (!Number.isFinite(value)) {
    throw new ConvexError(errorMessage);
  }
}

function assertSafeInteger(value: number, errorMessage: string) {
  if (!Number.isSafeInteger(value)) {
    throw new ConvexError(errorMessage);
  }
}

function assertValidCents(value: number, errorMessage: string) {
  assertFiniteNumber(value, errorMessage);
  assertSafeInteger(value, errorMessage);
}

export function toCents(amount: number) {
  assertFiniteNumber(amount, "Money amount must be finite");

  const amountCents = Math.round(amount * 100);
  assertSafeInteger(amountCents, "Money amount is out of range");

  return amountCents;
}

export function fromCents(amountCents: number) {
  assertValidCents(amountCents, "Money amount must be a safe integer number of cents");
  return amountCents / 100;
}

export function splitEvenly<T>(totalCents: number, items: readonly T[]) {
  assertValidCents(totalCents, "Split total must be a safe integer number of cents");

  if (totalCents < 0) {
    throw new ConvexError("Split total cannot be negative");
  }

  if (items.length === 0) {
    throw new ConvexError("Split requires at least one item");
  }

  const baseShare = Math.floor(totalCents / items.length);
  const remainder = totalCents % items.length;

  return items.map((_, index) => baseShare + (index < remainder ? 1 : 0));
}

export function splitByShares(totalCents: number, shares: readonly number[]) {
  assertValidCents(totalCents, "Split total must be a safe integer number of cents");

  if (totalCents < 0) {
    throw new ConvexError("Split total cannot be negative");
  }

  if (shares.length === 0) {
    throw new ConvexError("Split requires at least one share");
  }

  for (const share of shares) {
    if (!Number.isFinite(share) || share <= 0) {
      throw new ConvexError("Share amounts must be positive numbers");
    }
  }

  const totalShares = shares.reduce((sum, share) => sum + share, 0);
  const flooredAmounts = shares.map((share) => {
    const exact = (totalCents * share) / totalShares;
    const floored = Math.floor(exact);

    return { floored, fraction: exact - floored };
  });
  const totalFloored = flooredAmounts.reduce((sum, item) => sum + item.floored, 0);
  const remainder = totalCents - totalFloored;

  // Give the leftover cents to the largest fractional parts so the result
  // stays as close as possible to the exact proportional split.
  const indexesByFraction = flooredAmounts
    .map((item, index) => ({ fraction: item.fraction, index }))
    .sort((left, right) => right.fraction - left.fraction);
  const result = flooredAmounts.map((item) => item.floored);

  for (let i = 0; i < remainder; i += 1) {
    result[indexesByFraction[i]!.index] += 1;
  }

  return result;
}
