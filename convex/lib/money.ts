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
