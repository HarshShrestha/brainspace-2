export const ASSISTANT_LIMITS = {
  /** Indexed sources per account; ranking is in-process, so this bounds per-question work. */
  maxIndexedSources: 250,
  /** Characters of pasted text accepted per source (the worker also truncates fetched pages). */
  maxSourceChars: 24_000,
  questionMinLength: 3,
  questionMaxLength: 1_000,
  /** Excerpts sent to the generator for one question. */
  retrievalTopK: 5,
  /** Minimum cosine similarity for an excerpt to be considered. A heuristic, not a probability. */
  retrievalThreshold: 0.35,
} as const;

export const SOURCE_TYPES = ["page", "pasted"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];
