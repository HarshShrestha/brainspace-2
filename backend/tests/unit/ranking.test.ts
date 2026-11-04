import { describe, expect, it } from "vitest";
import { cosineSimilarity, TopK } from "../../src/services/assistant/ranking.js";

describe("cosineSimilarity", () => {
  it("scores identical, orthogonal and opposite vectors", () => {
    expect(cosineSimilarity([1, 2], [2, 4])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it("never ranks mismatched, empty or zero vectors", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(-1);
    expect(cosineSimilarity([], [])).toBe(-1);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(-1);
  });
});

describe("TopK", () => {
  it("keeps the highest scores above the threshold, best first", () => {
    const top = new TopK<string>(2, 0.5);
    for (const [score, item] of [
      [0.6, "b"],
      [0.4, "low"],
      [0.9, "a"],
      [0.7, "c"],
      [Number.NaN, "nan"],
    ] as const)
      top.offer(score, item);
    expect(top.results()).toEqual(["a", "c"]);
  });

  it("returns nothing when no score clears the threshold", () => {
    const top = new TopK<string>(5, 0.35);
    top.offer(0.1, "x");
    expect(top.results()).toEqual([]);
  });
});
