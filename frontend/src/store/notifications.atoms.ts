import { atom } from "recoil";

export interface Notification {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
}

export const notificationsState = atom<Notification[]>({ key: "notifications", default: [] });
