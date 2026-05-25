const MAX_SIZE = 1000;
const store = new Map<string, { value: unknown; expiresAt: number }>();
const stats = { hits: 0, misses: 0, sets: 0, evictions: 0 };

function evictIfNeeded(): void {
  if (store.size <= MAX_SIZE) return;
  const now = Date.now();
  const entries = [...store.entries()].sort(
    (a, b) => a[1].expiresAt - b[1].expiresAt,
  );
  for (const [key, entry] of entries) {
    if (store.size <= MAX_SIZE * 0.8) break;
    if (entry.expiresAt <= now) {
      store.delete(key);
      stats.evictions++;
    } else {
      store.delete(key);
      stats.evictions++;
    }
  }
}

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
  evictIfNeeded();
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
