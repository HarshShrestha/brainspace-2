import { useCallback } from "react";
import { useResetRecoilState, useSetRecoilState } from "recoil";
import { foldersState } from "@/store/folders.atoms";
import { contentRevisionState } from "@/store/library.atoms";
import { sessionState } from "@/store/session.atoms";
import { authService } from "../services/auth.service";
import type { Credentials } from "../types/auth.types";

export function useAuthActions() {
  const setSession = useSetRecoilState(sessionState);
  const resetFolders = useResetRecoilState(foldersState);
  const resetRevision = useResetRecoilState(contentRevisionState);

  const login = useCallback(
    async (credentials: Credentials) =>
      setSession({ status: "authenticated", user: await authService.login(credentials) }),
    [setSession],
  );
  const register = useCallback(
    async (credentials: Credentials) =>
      setSession({ status: "authenticated", user: await authService.register(credentials) }),
    [setSession],
  );
  /** Clears all account-scoped client state so nothing from this account survives sign-out. */
  const signOutLocally = useCallback(() => {
    resetFolders();
    resetRevision();
    setSession({ status: "anonymous", user: null });
  }, [resetFolders, resetRevision, setSession]);
  const logout = useCallback(async () => {
    await authService.logout();
    signOutLocally();
  }, [signOutLocally]);

  return { login, register, logout, signOutLocally };
}
