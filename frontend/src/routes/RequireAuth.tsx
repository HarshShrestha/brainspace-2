import { Navigate, Outlet, useLocation } from "react-router";
import { useRecoilValue } from "recoil";
import { LoadingState } from "@/components/common/LoadingState";
import { sessionState } from "@/store/session.atoms";
import { paths } from "./paths";

/** Renders child routes only for signed-in users; otherwise redirects to sign-in and returns afterwards. */
export function RequireAuth() {
  const session = useRecoilValue(sessionState);
  const location = useLocation();
  if (session.status === "loading") return <LoadingState label="Opening your space…" fullScreen />;
  if (session.status === "anonymous")
    return <Navigate to={paths.login()} replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

/** Sends signed-in users away from the sign-in and registration pages. */
export function RedirectIfAuthenticated() {
  const session = useRecoilValue(sessionState);
  if (session.status === "loading") return <LoadingState label="Opening your space…" fullScreen />;
  if (session.status === "authenticated") return <Navigate to={paths.library()} replace />;
  return <Outlet />;
}
