import { Link } from "react-router";
import { EmptyState } from "@/components/common/EmptyState";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { paths } from "@/routes/paths";

export function NotFoundPage() {
  useDocumentTitle("Not found");
  return (
    <main className="page page--centered">
      <EmptyState
        icon="explore_off"
        title="Page not found"
        action={
          <Link to={paths.library()} className="button button--primary">
            Go to your library
          </Link>
        }
      >
        The page you were looking for doesn't exist.
      </EmptyState>
    </main>
  );
}
