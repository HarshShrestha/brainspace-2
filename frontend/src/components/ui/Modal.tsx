import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { IconButton } from "./IconButton";

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal dialog: labelled by its title, traps focus, closes on Escape or backdrop click,
 * and restores focus to the previously focused element when it closes.
 */
export function Modal({
  title,
  eyebrow,
  onClose,
  size = "medium",
  children,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  size?: "small" | "medium" | "large";
  children: ReactNode;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const initial = dialog?.querySelector<HTMLElement>("[autofocus]") ?? focusable()[1] ?? focusable()[0];
    initial?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return event.preventDefault();
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add("has-modal");
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("has-modal");
      previous?.focus();
    };
  }, []);

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={ref} className={`dialog dialog--${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="dialog__header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id={titleId}>{title}</h2>
          </div>
          <IconButton icon="close" label="Close" onClick={onClose} />
        </header>
        {children}
      </div>
    </div>
  );
}
