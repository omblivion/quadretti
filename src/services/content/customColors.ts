export const STORAGE_KEY = "quadretti.customColors";
const EMPTY_SLOTS: (string | null)[] = [null, null, null, null, null];

export function loadCustomColors(): (string | null)[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length === 5) {
      return parsed.map((v: unknown) => typeof v === "string" ? v : null);
    }
  } catch { /* ignore */ }
  return [...EMPTY_SLOTS];
}

export function persistCustomColors(next: (string | null)[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}
