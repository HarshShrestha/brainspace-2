import { IconButton } from "@/components/ui/IconButton";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <IconButton
      icon={theme === "dark" ? "light_mode" : "dark_mode"}
      label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    />
  );
}
