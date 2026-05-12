const store = new Map<string, { value: unknown; expiresAt: number }>();
const stats = { hits: 0, misses: 0, sets: 0 };

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    stats.hits++;
    return entry.value as T;
  }
  if (entry) {
    store.delete(key);
  }
  stats.misses++;
  return undefined;
}

export function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
): void {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  stats.sets++;
}

export function cacheDelete(key: string): void {
  store.delete(key);
}

export function cacheClear(): void {
  store.clear();
}

export function cacheStats() {
  return { ...stats, size: store.size };
}
