import { describe, expect, it } from "vitest";

import {
  buildEqualSharePreview,
  buildExactRows,
  buildInitialShareInputs,
  buildShareRows,
  buildSharesPreview,
  deriveSplitSummary,
  formatDateChipLabel,
  parseAmountInputToCents,
  shiftDateInputValue,
  type ComposerMember,
} from "../components/expenses/composer-model";

const members: ComposerMember[] = ["a", "b", "c"].map((id, index) => ({
  id,
  name: id.toUpperCase(),
  email: `${id}@example.com`,
  role: index === 0 ? "owner" : "member",
  isCurrentUser: index === 0,
}));

describe("composer model", () => {
  it("parses amounts into integer cents", () => {
    expect(parseAmountInputToCents("")).toBe(0);
    expect(parseAmountInputToCents("1,250.5")).toBe(125_050);
    expect(parseAmountInputToCents("0.07")).toBe(7);
    expect(parseAmountInputToCents("1.234")).toBeNull();
    expect(parseAmountInputToCents(".")).toBeNull();
  });

  it("gives equal-split remainder cents to the first participants", () => {
    const preview = buildEqualSharePreview(10_000, ["a", "b", "c"]);
    expect([...preview.values()]).toEqual([3_334, 3_333, 3_333]);
  });

  it("previews share splits exactly like the backend", () => {
    const preview = buildSharesPreview(10_000, [
      { userId: "a", share: 2 },
      { userId: "b", share: 1 },
    ]);
    expect(preview.get("a")! + preview.get("b")!).toBe(10_000);
    expect(preview.get("a")).toBe(6_667);
    expect(buildSharesPreview(0, [{ userId: "a", share: 1 }]).get("a")).toBe(0);
  });

  it("reconstructs share ratios from saved cents", () => {
    const inputs = buildInitialShareInputs(members, [
      { userId: "a", shareCents: 4_000 },
      { userId: "b", shareCents: 2_000 },
    ]);
    expect(inputs).toEqual({ a: "2", b: "1", c: "1" });
  });

  it("reports what is left or over for exact splits", () => {
    const selected = ["a", "b"];
    const base = {
      splitType: "exact" as const,
      amountCents: 10_000,
      selectedCount: 2,
      shareRows: buildShareRows(members, {}, selected),
      currency: "INR",
    };

    const under = buildExactRows(members, { a: "40", b: "40" }, selected);
    const underSummary = deriveSplitSummary({ ...base, exactRows: under, exactDifferenceCents: -2_000 });
    expect(underSummary.canSubmit).toBe(false);
    expect(underSummary.problem).toBe("₹20.00 left");

    const over = buildExactRows(members, { a: "60", b: "60" }, selected);
    expect(deriveSplitSummary({ ...base, exactRows: over, exactDifferenceCents: 2_000 }).problem).toBe("₹20.00 over");

    const matched = buildExactRows(members, { a: "50", b: "50" }, selected);
    expect(deriveSplitSummary({ ...base, exactRows: matched, exactDifferenceCents: 0 }).canSubmit).toBe(true);

    const invalid = buildExactRows(members, { a: "5.555", b: "50" }, selected);
    expect(deriveSplitSummary({ ...base, exactRows: invalid, exactDifferenceCents: 0 }).canSubmit).toBe(false);
  });

  it("blocks saving when nobody is in the split", () => {
    const summary = deriveSplitSummary({
      splitType: "equal",
      amountCents: 500,
      selectedCount: 0,
      exactRows: [],
      exactDifferenceCents: null,
      shareRows: [],
      currency: "INR",
    });
    expect(summary.canSubmit).toBe(false);
  });

  it("labels dates relative to today", () => {
    expect(formatDateChipLabel("2026-11-26", "2026-11-26")).toBe("Today");
    expect(formatDateChipLabel("2026-11-25", "2026-11-26")).toBe("Yesterday");
    expect(formatDateChipLabel("2026-08-18", "2026-11-26")).toBe("Aug 18");
    expect(formatDateChipLabel("2025-08-18", "2026-11-26")).toBe("Aug 18, 2025");
    expect(shiftDateInputValue("2026-03-01", -1)).toBe("2026-02-28");
  });
});
