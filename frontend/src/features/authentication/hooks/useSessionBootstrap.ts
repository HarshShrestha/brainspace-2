import { useEffect } from "react";
import { useSetRecoilState } from "recoil";
import { ApiError, setUnauthorizedHandler } from "@/services/apiClient";
import { sessionState } from "@/store/session.atoms";
import { authService } from "../services/auth.service";

/** Resolves the initial session once, and signs the UI out whenever the API reports an ended session. */
export function useSessionBootstrap() {
  const setSession = useSetRecoilState(sessionState);

  useEffect(() => {
    setUnauthorizedHandler(() => setSession({ status: "anonymous", user: null }));
    let active = true;
    const check = () =>
      authService
        .session()
        .then((user) => active && setSession({ status: "authenticated", user }))
        .catch((e: unknown) => {
          if (!active) return;
          // A network failure shouldn't look like "signed out"; retry shortly.
          if (e instanceof ApiError && e.status === 0) window.setTimeout(() => active && void check(), 3000);
          else setSession({ status: "anonymous", user: null });
        });
    void check();
    return () => {
      active = false;
    };
  }, [setSession]);
}
