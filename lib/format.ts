export function formatMoneyFromCents(amountCents: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountCents / 100);
}

export function formatSignedMoneyFromCents(amountCents: number, currency = "INR") {
  const formatted = formatMoneyFromCents(Math.abs(amountCents), currency);
  if (amountCents > 0) {
    return `+${formatted}`;
  }
  if (amountCents < 0) {
    return `-${formatted}`;
  }
  return formatted;
}
