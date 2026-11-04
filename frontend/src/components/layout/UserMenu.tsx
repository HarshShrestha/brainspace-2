import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Icon } from "@/components/common/Icon";

/** Avatar button with a small account menu. Closes on outside click and Escape. */
export function UserMenu({
  username,
  settingsHref,
  onSignOut,
}: {
  username: string;
  settingsHref: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
      >
        {username.charAt(0).toUpperCase()}
      </button>
      {open && (
        <div className="menu__popover" role="menu">
          <div className="menu__header">
            <strong>{username}</strong>
            <span className="muted">Personal space</span>
          </div>
          <Link role="menuitem" className="menu__item" to={settingsHref} onClick={() => setOpen(false)}>
            <Icon name="settings" /> Settings
          </Link>
          <button
            role="menuitem"
            type="button"
            className="menu__item"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            <Icon name="logout" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
