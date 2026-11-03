import { useCallback, useEffect } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { STORAGE_KEYS } from "@/constants/storage.constants";
import { themeState } from "@/store/theme.atoms";

export function useTheme() {
  const [theme, setTheme] = useRecoilState(themeState);
  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), [setTheme]);
  return { theme, toggle };
}

/** Mount once at the root: applies the theme to <html data-theme> and persists it locally. */
export function useApplyTheme() {
  const theme = useRecoilValue(themeState);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);
}
