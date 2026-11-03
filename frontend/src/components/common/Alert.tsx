import type { ReactNode } from "react";

/** Inline, announced message. Use tone="error" for failures that need attention. */
export function Alert({
  tone = "error",
  children,
  onDismiss,
}: {
  tone?: "error" | "info" | "success";
  children: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div className={`alert alert--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span>{children}</span>
      {onDismiss && (
        <button type="button" className="alert__dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </div>
  );
}
