type CacheEntry<T = unknown> = {
  value: T;
  expiresAt: number;
};

type Storage = Map<string, CacheEntry>;

const store: Storage = new Map();
const MAX_ENTRIES = 5_000;
let sweepTimer: ReturnType<typeof setInterval> | null = null;

function startSweep(): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.expiresAt <= now) store.delete(key);
    }
    if (store.size > MAX_ENTRIES) {
      const entries = [...store.entries()].sort(
        (a, b) => a[1].expiresAt - b[1].expiresAt,
      );
      const toDelete = store.size - MAX_ENTRIES;
      for (let i = 0; i < toDelete && i < entries.length; i++) {
        store.delete(entries[i][0]);
      }
    }
  }, 60_000);
}

export function get<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function set<T>(key: string, value: T, ttlSeconds = 300): void {
  // ponytail: global lock, per-account locks if throughput matters
  if (!sweepTimer) startSweep();
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export function increment(key: string, ttlSeconds = 60): number {
  const now = Date.now();
  const entry = store.get(key);
  let count = 1;
  if (entry && entry.expiresAt > now) {
    count = (entry.value as number) + 1;
  }
  store.set(key, { value: count, expiresAt: now + ttlSeconds * 1000 });
  if (!sweepTimer) startSweep();
  return count;
}

export function rateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number,
): { allowed: boolean; remaining: number; ttl: number } {
  const count = increment(key, windowSeconds);
  const allowed = count <= maxAttempts;
  const entry = store.get(key);
  const ttl = entry
    ? Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000))
    : windowSeconds;
  return {
    allowed,
    remaining: Math.max(0, maxAttempts - count),
    ttl,
  };
}
