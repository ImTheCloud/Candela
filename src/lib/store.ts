// Small wrappers around localStorage: it can be missing or throw (private mode, blocked storage).
export function localGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function localSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function localRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}
