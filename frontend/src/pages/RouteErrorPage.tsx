import { isRouteErrorResponse, useRouteError } from "react-router";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/Button";
import { NotFoundPage } from "./NotFoundPage";

/** Last-resort boundary for render errors, so one broken view never blanks the whole app. */
export function RouteErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  return (
    <main className="page page--centered">
      <EmptyState
        icon="error"
        title="Something went wrong"
        action={<Button onClick={() => window.location.reload()}>Reload the page</Button>}
      >
        An unexpected error occurred. Reloading usually fixes it.
      </EmptyState>
    </main>
  );
}
