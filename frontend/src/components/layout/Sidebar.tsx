import type { ReactNode } from "react";

/**
 * Responsive navigation shell: a fixed column on desktop, a drawer on small screens.
 * Following any link inside closes the drawer.
 */
export function Sidebar({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <aside
        id="sidebar"
        className={open ? "sidebar sidebar--open" : "sidebar"}
        aria-label="Main navigation"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a, button")) onClose();
        }}
      >
        {children}
      </aside>
      {open && <div className="sidebar__scrim" onClick={onClose} aria-hidden="true" />}
    </>
  );
}
