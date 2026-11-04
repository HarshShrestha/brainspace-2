import { useCallback } from "react";
import { useSetRecoilState } from "recoil";
import { notificationsState, type Notification } from "@/store/notifications.atoms";

let nextId = 1;
const DISMISS_AFTER_MS = 4000;

/** Shows a transient, screen-reader-announced message (rendered by <Toaster />). */
export function useNotify() {
  const setNotifications = useSetRecoilState(notificationsState);
  return useCallback(
    (message: string, tone: Notification["tone"] = "success") => {
      const id = nextId++;
      setNotifications((list) => [...list.slice(-2), { id, message, tone }]);
      window.setTimeout(() => setNotifications((list) => list.filter((n) => n.id !== id)), DISMISS_AFTER_MS);
    },
    [setNotifications],
  );
}
