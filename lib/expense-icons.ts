export type ExpenseIconKey =
  | "home"
  | "plane"
  | "utensils"
  | "cart"
  | "mountain"
  | "fuel";

export function getExpenseIconKey(
  description: string,
  fallbackIconKey: ExpenseIconKey,
): ExpenseIconKey {
  const normalized = description.trim().toLowerCase();

  if (
    normalized.includes("restaurant") ||
    normalized.includes("dinner") ||
    normalized.includes("lunch") ||
    normalized.includes("breakfast") ||
    normalized.includes("brunch") ||
    normalized.includes("cafe") ||
    normalized.includes("meal") ||
    normalized.includes("feast")
  ) {
    return "utensils";
  }

  if (
    normalized.includes("fuel") ||
    normalized.includes("gas") ||
    normalized.includes("station") ||
    normalized.includes("petrol") ||
    normalized.includes("diesel")
  ) {
    return "fuel";
  }

  if (
    normalized.includes("grocery") ||
    normalized.includes("market") ||
    normalized.includes("supermarket") ||
    normalized.includes("bonus") ||
    normalized.includes("supplies")
  ) {
    return "cart";
  }

  if (
    normalized.includes("hotel") ||
    normalized.includes("cabin") ||
    normalized.includes("lodging") ||
    normalized.includes("airbnb") ||
    normalized.includes("stay")
  ) {
    return "home";
  }

  if (
    normalized.includes("flight") ||
    normalized.includes("airport") ||
    normalized.includes("ticket") ||
    normalized.includes("plane")
  ) {
    return "plane";
  }

  if (
    normalized.includes("rental") ||
    normalized.includes("tour") ||
    normalized.includes("glacier") ||
    normalized.includes("hike") ||
    normalized.includes("trail") ||
    normalized.includes("camp") ||
    normalized.includes("van") ||
    normalized.includes("car")
  ) {
    return "mountain";
  }

  return fallbackIconKey;
}
