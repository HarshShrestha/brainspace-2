import { atom } from "recoil";

/**
 * Incremented after any content mutation made outside the visible list (e.g. the global "New" button),
 * telling mounted lists to refetch. Lists update themselves locally for their own mutations.
 */
export const contentRevisionState = atom<number>({ key: "contentRevision", default: 0 });
