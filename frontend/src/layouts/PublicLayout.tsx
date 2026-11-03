import { Link, Outlet } from "react-router";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { paths } from "@/routes/paths";

/** Minimal chrome for pages anyone can open, such as public share links. */
export function PublicLayout() {
  return (
    <div className="public">
      <header className="public__header">
        <Link to={paths.library()} aria-label="BrainSpace home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main id="main" className="page">
        <Outlet />
      </main>
    </div>
  );
}
