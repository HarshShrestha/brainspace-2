import { ASSISTANT_LIMITS } from "../../constants/assistant.constants.js";

/** Cosine similarity in [-1, 1]; returns -1 for mismatched or zero vectors so they never rank. */
export function cosineSimilarity(a: readonly number[], b: readonly number[]) {
  if (!a.length || a.length !== b.length) return -1;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : -1;
}

/** Keeps the best `limit` items scoring at or above `threshold`, highest first, in O(limit) memory. */
export class TopK<T> {
  private readonly entries: { score: number; item: T }[] = [];

  constructor(
    private readonly limit: number = ASSISTANT_LIMITS.retrievalTopK,
    private readonly threshold: number = ASSISTANT_LIMITS.retrievalThreshold,
  ) {}

  offer(score: number, item: T) {
    if (!Number.isFinite(score) || score < this.threshold) return;
    if (this.entries.length >= this.limit && score <= this.entries.at(-1)!.score) return;
    const index = this.entries.findIndex((entry) => score > entry.score);
    this.entries.splice(index === -1 ? this.entries.length : index, 0, { score, item });
    if (this.entries.length > this.limit) this.entries.pop();
  }

  results(): T[] {
    return this.entries.map((entry) => entry.item);
  }
}
