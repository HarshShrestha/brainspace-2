/** Escapes user input for safe use inside a RegExp / MongoDB `$regex`. */
export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
