import { atom } from "recoil";
import { STORAGE_KEYS } from "@/constants/storage.constants";

export type Theme = "light" | "dark";

function initialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEYS.theme);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export const themeState = atom<Theme>({ key: "theme", default: initialTheme() });
