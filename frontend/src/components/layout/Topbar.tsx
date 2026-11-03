import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";

/** Sticky top bar. `brand` is only shown on small screens, where the sidebar is hidden. */
export function Topbar({
  menuOpen,
  onMenu,
  brand,
  children,
}: {
  menuOpen: boolean;
  onMenu: () => void;
  brand?: ReactNode;
  children: ReactNode;
}) {
  return (
    <header className="topbar">
      <div className="topbar__start">
        <IconButton
          icon="menu"
          label="Toggle navigation"
          className="topbar__menu"
          aria-controls="sidebar"
          aria-expanded={menuOpen}
          onClick={onMenu}
        />
        {brand && <div className="topbar__brand">{brand}</div>}
      </div>
      <div className="topbar__actions">{children}</div>
    </header>
  );
}
