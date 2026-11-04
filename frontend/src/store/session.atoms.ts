import { atom } from "recoil";
import type { SessionState } from "@/features/authentication/types/auth.types";

/** The signed-in user. "loading" until the initial session check finishes. */
export const sessionState = atom<SessionState>({
  key: "session",
  default: { status: "loading", user: null },
});
