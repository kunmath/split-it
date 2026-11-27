import { describe, expect, it } from "vitest";

import {
  buildEqualSharePreview,
  buildExactRows,
  buildInitialShareInputs,
  buildSavedExpenseMessage,
  buildShareRows,
  buildSharesPreview,
  deriveSplitSummary,
  formatDateChipLabel,
  parseAmountInputToCents,
  parseShareInput,
  reconstructShareWeights,
  shiftDateInputValue,
  type ComposerMember,
} from "../components/expenses/composer-model";
import { splitByShares } from "../convex/lib/money";

const buildSharesCents = (totalCents: number, weights: number[]) => splitByShares(totalCents, weights);

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

  it("reconstructs small weights when the split had rounding cents", () => {
    expect(
      buildInitialShareInputs(members, [
        { userId: "a", shareCents: 3_334 },
        { userId: "b", shareCents: 3_333 },
        { userId: "c", shareCents: 3_333 },
      ]),
    ).toEqual({ a: "1", b: "1", c: "1" });

    // 2:1 of ₹100 is 6667 / 3333.
    expect(reconstructShareWeights([6_667, 3_333])).toEqual([2, 1]);
    // 3:2:2 of ₹10 → 429 / 286 / 285.
    expect(reconstructShareWeights(buildSharesCents(1_000, [3, 2, 2]))).toEqual([3, 2, 2]);
    // 1.5 : 1 is stored as 3 : 2.
    expect(reconstructShareWeights(buildSharesCents(12_345, [1.5, 1]))).toEqual([3, 2]);
  });

  it("only returns weights that reproduce the saved cents exactly", () => {
    for (const weights of [
      [1, 1, 1],
      [5, 3, 1],
      [7, 2],
      [1, 1, 1, 1, 1, 1, 1],
      [100, 1],
    ]) {
      const cents = buildSharesCents(99_999, weights);
      const rebuilt = reconstructShareWeights(cents);
      expect(Math.max(...rebuilt)).toBeLessThanOrEqual(100);
      expect(buildSharesCents(99_999, rebuilt)).toEqual(cents);
    }
  });

  it("falls back to reduced cents when no small ratio fits", () => {
    // 1001 / 1000 is just a 1:1 split of an odd total.
    expect(reconstructShareWeights([1_001, 1_000])).toEqual([1, 1]);
    expect(reconstructShareWeights([5_003, 1])).toEqual([5_003, 1]);
    expect(reconstructShareWeights([2_002, 2_000])).toEqual([1_001, 1_000]);
  });

  it("keeps a participant whose share rounded to zero cents without changing the saved split", () => {
    // 0.1 : 1 of ₹0.02 is saved as 0 / 2 cents.
    const saved = buildSharesCents(2, [0.1, 1]);
    expect(saved).toEqual([0, 2]);

    const rebuilt = reconstructShareWeights(saved);
    expect(rebuilt.every((weight) => weight > 0)).toBe(true);
    expect(buildSharesCents(2, rebuilt)).toEqual(saved);

    for (const [total, weights] of [
      [3, [0.01, 0.01, 50]],
      [7, [1, 1_000, 1_000]],
      [1, [1, 1, 1]],
    ] as const) {
      const cents = buildSharesCents(total, [...weights]);
      expect(cents).toContain(0);
      const weightsBack = reconstructShareWeights(cents);
      expect(weightsBack.every((weight) => weight > 0)).toBe(true);
      expect(buildSharesCents(total, weightsBack)).toEqual(cents);
    }
  });

  it("re-saves an unchanged shares edit with the same cents whatever order the viewer lists members in", () => {
    // ₹1.00 split 1:1:1 leaves one cent over; it lands on the first user id, not the first listed member.
    const saved = [
      { userId: "c", shareCents: 33 },
      { userId: "a", shareCents: 34 },
      { userId: "b", shareCents: 33 },
    ];
    expect(buildSharesPreview(100, [
      { userId: "c", share: 1 },
      { userId: "a", share: 1 },
      { userId: "b", share: 1 },
    ])).toEqual(new Map([["c", 33], ["a", 34], ["b", 33]]));

    for (const viewerOrder of [members, [...members].reverse()]) {
      const inputs = buildInitialShareInputs(viewerOrder, saved);
      const rows = viewerOrder.map((member) => ({ userId: member.id, share: Number(inputs[member.id]) }));
      const preview = buildSharesPreview(100, rows);

      for (const share of saved) {
        expect(preview.get(share.userId)).toBe(share.shareCents);
      }
    }
  });

  it("only accepts whole plain numbers as share weights", () => {
    expect(parseShareInput("2")).toBe(2);
    expect(parseShareInput(" 0.5 ")).toBe(0.5);
    expect(parseShareInput(".5")).toBe(0.5);
    expect(parseShareInput("3.")).toBe(3);

    for (const value of ["2abc", "Infinity", "1e3", "-1", "", "1.2.3", "9".repeat(400)]) {
      expect(parseShareInput(value)).toBeNaN();
    }

    const rows = buildShareRows(members, { a: "2abc", b: "Infinity", c: "0.5" }, ["a", "b", "c"]);
    expect(rows.map((row) => [row.isInvalid, row.share])).toEqual([
      [true, 0],
      [true, 0],
      [false, 0.5],
    ]);
  });

  it("describes the saved expense for the confirmation toast", () => {
    const draft = {
      description: "Groceries",
      amountCents: 1_250_00,
      paidBy: "a",
      splitType: "equal" as const,
      participantIds: ["a", "b", "c", "d"],
      expenseAt: 0,
    };
    const people = [...members, { ...members[1]!, id: "d", name: "Priya Shah" }];
    expect(buildSavedExpenseMessage("Added", draft, people, "INR")).toBe("Added Groceries · you lent ₹937.50");
    expect(
      buildSavedExpenseMessage("Added", { ...draft, paidBy: "d", amountCents: 900_00, participantIds: ["a", "d"] }, people, "INR"),
    ).toBe("Added Groceries · you owe Priya ₹450.00");
    expect(
      buildSavedExpenseMessage("Added", { ...draft, paidBy: "b", participantIds: ["b", "c"] }, people, "INR"),
    ).toBe("Added Groceries");
    expect(buildSavedExpenseMessage("Updated", draft, people, "INR")).toBe("Updated Groceries");
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
