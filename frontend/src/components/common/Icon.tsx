import { ICON_CODEPOINTS, type IconName } from "./iconCodepoints";

export type { IconName };

/**
 * Decorative Material Symbols glyph from the self-hosted subset font (see scripts/build-icon-font.py).
 * Rendered by codepoint, so only icons included in the font type-check.
 */
export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <span aria-hidden="true" className={`icon ${className}`.trim()}>
      {ICON_CODEPOINTS[name]}
    </span>
  );
}
