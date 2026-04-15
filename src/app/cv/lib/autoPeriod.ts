/** Ensures a string ends with a full stop, unless it's empty */
export function autoPeriod(val: string): string {
  const trimmed = val.trimEnd();
  if (!trimmed) return val;
  if (trimmed.endsWith(".") || trimmed.endsWith("!") || trimmed.endsWith("?")) return val;
  return trimmed + ".";
}
