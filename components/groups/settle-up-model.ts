/**
 * Pure selection/amount state for the Settle up dialog. Kept free of React so the
 * transitions (who is selected, which amount is shown) can be unit tested.
 */

export type SettleUpDirection = "youPay" | "youReceive";

export type SettleUpSuggestion = {
  counterpartyId: string;
  counterpartyName: string;
  counterpartyImageUrl?: string;
  amountCents: number;
  direction: SettleUpDirection;
};

export type SettleUpPreset = {
  counterpartyId: string;
  direction: SettleUpDirection;
};

export type SettleUpState = {
  direction: SettleUpDirection;
  counterpartyId: string;
  amount: string;
  /**
   * The person and direction a typed amount belongs to. Changing either one means the
   * typed figure no longer describes the payment, so the amount resyncs.
   */
  typedFor: SettleUpPreset | null;
  showOthers: boolean;
};

const AMOUNT_PATTERN = /^\d+(?:\.\d{1,2})?$/;

export function parseAmountToCents(value: string) {
  const trimmed = value.trim();
  if (!trimmed || !AMOUNT_PATTERN.test(trimmed)) {
    return null;
  }
  const [wholePart, fractionalPart = ""] = trimmed.split(".");
  const wholeCents = Number(wholePart) * 100;
  const fractionalCents = Number(fractionalPart.padEnd(2, "0"));
  const totalCents = wholeCents + fractionalCents;
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    return null;
  }
  return totalCents;
}

export function centsToAmountInput(cents: number) {
  return (cents / 100).toFixed(2);
}

export function findSuggestion(
  suggestions: SettleUpSuggestion[],
  counterpartyId: string,
  direction: SettleUpDirection,
) {
  return suggestions.find(
    (suggestion) => suggestion.counterpartyId === counterpartyId && suggestion.direction === direction,
  );
}

export function initialSettleUpState(
  suggestions: SettleUpSuggestion[],
  preset?: SettleUpPreset | null,
): SettleUpState {
  const presetSuggestion = preset
    ? findSuggestion(suggestions, preset.counterpartyId, preset.direction)
    : undefined;
  const initial =
    presetSuggestion ??
    (preset ? undefined : suggestions.find((suggestion) => suggestion.direction === "youPay") ?? suggestions[0]);

  if (initial) {
    return {
      direction: initial.direction,
      counterpartyId: initial.counterpartyId,
      amount: centsToAmountInput(initial.amountCents),
      typedFor: null,
      showOthers: false,
    };
  }

  return {
    direction: preset?.direction ?? "youPay",
    counterpartyId: preset?.counterpartyId ?? "",
    amount: "",
    typedFor: null,
    showOthers: Boolean(preset?.counterpartyId),
  };
}

/** Selects a person and syncs the amount to what is owed with them in this direction. */
export function selectPerson(
  state: SettleUpState,
  suggestions: SettleUpSuggestion[],
  personId: string,
  direction: SettleUpDirection = state.direction,
): SettleUpState {
  const typedForThis =
    personId !== "" &&
    state.typedFor?.counterpartyId === personId &&
    state.typedFor.direction === direction;
  if (typedForThis) {
    return { ...state, direction, counterpartyId: personId };
  }

  const match = personId ? findSuggestion(suggestions, personId, direction) : undefined;
  return {
    ...state,
    direction,
    counterpartyId: personId,
    amount: match ? centsToAmountInput(match.amountCents) : "",
    typedFor: null,
  };
}

/** Flips who paid whom, keeping the person if they have a debt that way, else the top suggestion. */
export function changeDirection(
  state: SettleUpState,
  suggestions: SettleUpSuggestion[],
  next: SettleUpDirection,
): SettleUpState {
  if (next === state.direction) {
    return state;
  }
  const nextSuggestions = suggestions.filter((suggestion) => suggestion.direction === next);
  const keepPerson = state.counterpartyId !== "" && findSuggestion(suggestions, state.counterpartyId, next);
  const person = keepPerson ? state.counterpartyId : nextSuggestions[0]?.counterpartyId ?? state.counterpartyId;
  const personIsSuggested = nextSuggestions.some((suggestion) => suggestion.counterpartyId === person);

  return selectPerson(
    {
      ...state,
      showOthers: Boolean(person) && !personIsSuggested && nextSuggestions.length > 0,
    },
    suggestions,
    person,
    next,
  );
}

export function applySuggestion(state: SettleUpState, suggestion: SettleUpSuggestion): SettleUpState {
  return {
    ...state,
    direction: suggestion.direction,
    counterpartyId: suggestion.counterpartyId,
    amount: centsToAmountInput(suggestion.amountCents),
    typedFor: null,
  };
}

export function typeAmount(state: SettleUpState, value: string): SettleUpState {
  return {
    ...state,
    amount: value.replace(/[^\d.]/g, ""),
    typedFor: state.counterpartyId
      ? { counterpartyId: state.counterpartyId, direction: state.direction }
      : null,
  };
}

/** How much the entered amount goes past the suggested debt with the selected person, if at all. */
export function getOverpayment(state: SettleUpState, suggestions: SettleUpSuggestion[]) {
  const amountCents = parseAmountToCents(state.amount);
  const suggestion = state.counterpartyId
    ? findSuggestion(suggestions, state.counterpartyId, state.direction)
    : undefined;
  if (amountCents === null || !suggestion || amountCents <= suggestion.amountCents) {
    return null;
  }
  return { excessCents: amountCents - suggestion.amountCents, suggestion };
}
