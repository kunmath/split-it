import { describe, expect, it } from "vitest";

import { fromCents, splitByShares, splitEvenly, toCents } from "../convex/lib/money";

describe("toCents", () => {
  it("converts whole and fractional amounts", () => {
    expect(toCents(0)).toBe(0);
    expect(toCents(1)).toBe(100);
    expect(toCents(12.34)).toBe(1234);
  });

  it("rounds float artifacts to the nearest cent", () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(1.006)).toBe(101);
  });

  it("rejects non-finite amounts", () => {
    expect(() => toCents(Number.NaN)).toThrow();
    expect(() => toCents(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("fromCents", () => {
  it("converts cents back to major units", () => {
    expect(fromCents(1234)).toBe(12.34);
  });

  it("rejects fractional cents", () => {
    expect(() => fromCents(12.5)).toThrow();
  });
});

describe("splitEvenly", () => {
  it("splits divisible totals equally", () => {
    expect(splitEvenly(900, ["a", "b", "c"])).toEqual([300, 300, 300]);
  });

  it("distributes the remainder one cent at a time from the front", () => {
    expect(splitEvenly(1000, ["a", "b", "c"])).toEqual([334, 333, 333]);
    expect(splitEvenly(101, ["a", "b"])).toEqual([51, 50]);
  });

  it("always sums exactly to the total", () => {
    for (const total of [1, 99, 100, 1000, 12345, 999999]) {
      for (const count of [1, 2, 3, 7, 11]) {
        const shares = splitEvenly(total, Array.from({ length: count }));
        expect(shares.reduce((sum, share) => sum + share, 0)).toBe(total);
      }
    }
  });

  it("rejects empty participant lists and negative totals", () => {
    expect(() => splitEvenly(100, [])).toThrow();
    expect(() => splitEvenly(-1, ["a"])).toThrow();
  });
});

describe("splitByShares", () => {
  it("splits proportionally when the total divides cleanly", () => {
    expect(splitByShares(300, [1, 2])).toEqual([100, 200]);
  });

  it("gives leftover cents to the largest fractional parts", () => {
    // 100 * 1/3 = 33.33..., 100 * 2/3 = 66.66... → the 2-share entry rounds up.
    expect(splitByShares(100, [1, 2])).toEqual([33, 67]);
  });

  it("preserves input order while distributing the remainder", () => {
    const result = splitByShares(100, [1, 1, 1]);
    expect(result.reduce((sum, share) => sum + share, 0)).toBe(100);
    expect(result).toEqual([34, 33, 33]);
  });

  it("supports fractional share weights", () => {
    const result = splitByShares(1000, [0.5, 0.5, 1]);
    expect(result).toEqual([250, 250, 500]);
  });

  it("always sums exactly to the total", () => {
    const weightSets = [
      [1, 2, 3],
      [7, 11, 13],
      [0.1, 0.2, 0.7],
      [1, 1, 1, 1, 1, 1, 1],
      [99, 1],
    ];

    for (const total of [1, 97, 100, 12345, 100001]) {
      for (const weights of weightSets) {
        const shares = splitByShares(total, weights);
        expect(shares.reduce((sum, share) => sum + share, 0)).toBe(total);
        expect(shares.every((share) => share >= 0)).toBe(true);
      }
    }
  });

  it("rejects empty and non-positive shares", () => {
    expect(() => splitByShares(100, [])).toThrow();
    expect(() => splitByShares(100, [1, 0])).toThrow();
    expect(() => splitByShares(100, [1, -2])).toThrow();
    expect(() => splitByShares(100, [1, Number.NaN])).toThrow();
  });
});
