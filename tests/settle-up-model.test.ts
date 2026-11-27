import { describe, expect, it } from "vitest";

import {
  applySuggestion,
  changeDirection,
  getOverpayment,
  initialSettleUpState,
  parseAmountToCents,
  normalizeAmountInput,
  selectPerson,
  typeAmount,
  type SettleUpSuggestion,
} from "../components/groups/settle-up-model";

const priyaOwesYou: SettleUpSuggestion = {
  counterpartyId: "priya",
  counterpartyName: "Priya Nair",
  amountCents: 95_000,
  direction: "youReceive",
};
const youOweMarcus: SettleUpSuggestion = {
  counterpartyId: "marcus",
  counterpartyName: "Marcus Vale",
  amountCents: 12_500,
  direction: "youPay",
};
const jordanOwesYou: SettleUpSuggestion = {
  counterpartyId: "jordan",
  counterpartyName: "Jordan Lee",
  amountCents: 32_000,
  direction: "youReceive",
};

describe("settle-up model", () => {
  it("opens on the first payment you owe, with its amount", () => {
    const state = initialSettleUpState([priyaOwesYou, youOweMarcus]);

    expect(state).toMatchObject({ direction: "youPay", counterpartyId: "marcus", amount: "125.00" });
  });

  it("honours a preset person and direction", () => {
    const state = initialSettleUpState([priyaOwesYou, youOweMarcus], {
      counterpartyId: "priya",
      direction: "youReceive",
    });

    expect(state).toMatchObject({ direction: "youReceive", counterpartyId: "priya", amount: "950.00" });
  });

  it("does not carry a typed amount across a direction reversal for the same person", () => {
    // Only Priya has a debt, so reversing keeps her selected.
    let state = initialSettleUpState([priyaOwesYou], { counterpartyId: "priya", direction: "youReceive" });
    state = typeAmount(state, "100");
    expect(state.amount).toBe("100");

    state = changeDirection(state, [priyaOwesYou], "youPay");

    expect(state.direction).toBe("youPay");
    expect(state.counterpartyId).toBe("priya");
    expect(state.amount).not.toBe("100");
    expect(state.amount).toBe("");
  });

  it("resyncs to the other direction's suggestion after a reversal", () => {
    const suggestions = [priyaOwesYou, youOweMarcus];
    let state = initialSettleUpState(suggestions, { counterpartyId: "priya", direction: "youReceive" });
    state = typeAmount(state, "100");

    state = changeDirection(state, suggestions, "youPay");

    expect(state).toMatchObject({ direction: "youPay", counterpartyId: "marcus", amount: "125.00" });

    // Going back does not resurrect the old typed figure either.
    state = changeDirection(state, suggestions, "youReceive");
    expect(state).toMatchObject({ direction: "youReceive", counterpartyId: "priya", amount: "950.00" });
  });

  it("keeps a typed amount when the same person is picked again in the same direction", () => {
    const suggestions = [priyaOwesYou, jordanOwesYou];
    let state = initialSettleUpState(suggestions, { counterpartyId: "priya", direction: "youReceive" });
    state = typeAmount(state, "100");

    state = selectPerson(state, suggestions, "priya");

    expect(state.amount).toBe("100");
  });

  it("resyncs the amount when switching to another person", () => {
    const suggestions = [priyaOwesYou, jordanOwesYou];
    let state = initialSettleUpState(suggestions, { counterpartyId: "priya", direction: "youReceive" });
    state = typeAmount(state, "100");

    state = selectPerson(state, suggestions, "jordan");
    expect(state).toMatchObject({ counterpartyId: "jordan", amount: "320.00", typedFor: null });

    state = selectPerson(state, suggestions, "sam");
    expect(state).toMatchObject({ counterpartyId: "sam", amount: "" });
  });

  it("fills both person and amount when a suggestion is tapped", () => {
    const suggestions = [priyaOwesYou, jordanOwesYou];
    let state = initialSettleUpState(suggestions, { counterpartyId: "priya", direction: "youReceive" });
    state = typeAmount(state, "1");

    state = applySuggestion(state, jordanOwesYou);

    expect(state).toMatchObject({ counterpartyId: "jordan", amount: "320.00", typedFor: null });
  });

  it("strips a currency symbol and digit grouping from typed amounts", () => {
    const state = typeAmount(initialSettleUpState([youOweMarcus]), "₹1,200.5");

    expect(state.amount).toBe("1200.5");
    expect(parseAmountToCents(state.amount)).toBe(120_050);
    expect(typeAmount(state, "1,20,000").amount).toBe("120000");
    expect(typeAmount(state, "12,").amount).toBe("12");
  });

  it("keeps amounts that stripping would change as typed, so they stay invalid", () => {
    const state = initialSettleUpState([youOweMarcus]);

    for (const value of ["-12.50", "12,50", "12a"]) {
      const next = typeAmount(state, value);
      expect(next.amount).toBe(value);
      expect(normalizeAmountInput(value)).toBeNull();
      expect(parseAmountToCents(next.amount)).toBeNull();
    }
  });

  it("reports how far an amount goes past the debt in the selected direction", () => {
    const suggestions = [priyaOwesYou, youOweMarcus];
    let state = initialSettleUpState(suggestions);
    expect(getOverpayment(state, suggestions)).toBeNull();

    state = typeAmount(state, "896.85");
    expect(getOverpayment(state, suggestions)?.excessCents).toBe(77_185);

    state = typeAmount(state, "125");
    expect(getOverpayment(state, suggestions)).toBeNull();

    // No debt with this person in this direction: nothing to compare against.
    state = typeAmount(selectPerson(state, suggestions, "priya"), "5000");
    expect(getOverpayment(state, suggestions)).toBeNull();
  });
});
