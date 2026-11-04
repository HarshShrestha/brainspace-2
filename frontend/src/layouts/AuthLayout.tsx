import { Outlet } from "react-router";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function AuthLayout() {
  return (
    <div className="auth">
      <section className="auth__intro">
        <Logo />
        <div>
          <p className="eyebrow">A little space for big ideas</p>
          <h2 className="auth__headline">
            Make room
            <br />
            for <em>ideas.</em>
          </h2>
          <p>
            Collect the links worth keeping, find them when you need them, and ask questions across what you've read.
          </p>
        </div>
        <p className="eyebrow">Your knowledge, in one calm place</p>
      </section>
      <main className="auth__panel">
        <div className="auth__theme">
          <ThemeToggle />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
