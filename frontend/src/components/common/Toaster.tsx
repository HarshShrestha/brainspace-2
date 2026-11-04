import { useRecoilValue } from "recoil";
import { notificationsState } from "@/store/notifications.atoms";

/** Renders transient notifications in a polite live region. Mounted once by the app. */
export function Toaster() {
  const notifications = useRecoilValue(notificationsState);
  return (
    <div className="toaster" aria-live="polite" aria-atomic="false">
      {notifications.map((n) => (
        <div key={n.id} className={`toast toast--${n.tone}`} role={n.tone === "error" ? "alert" : "status"}>
          {n.message}
        </div>
      ))}
    </div>
  );
}
