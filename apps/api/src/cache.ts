// =============================================================================
// In-memory cache — bounded LRU
// =============================================================================
//
// Memory budget & eviction policy
// --------------------------------
// At MAX_ENTRIES = 5,000, average entry size ~2KB → worst-case ~10MB resident.
// Alert thresholds: if MAX_ENTRIES > 10,000 OR single value > 1MB, stop and
// re-design. Cloudflare Workers isolate cap is 128MB; crossing 50% resident
// is the fire alarm.
//
// LRU is approximate: every `get` promotes the entry, every `set` inserts at
// the head, and on overflow we trim from the tail. This is O(1) amortized
// per operation, and good enough for a small bounded cache.
//
// Redis migration path
// --------------------
// All storage lives behind `get/set`. To swap in Redis later:
//   1. Add a `CacheBackend` interface with the same two methods.
//   2. Implement `InMemoryBackend` (current) and `RedisBackend` (new).
//   3. Pick the backend at module init based on `env.CACHE_BACKEND`.
// Callers stay unchanged. See issue #65 for the original spec.
// =============================================================================

type Entry<T = unknown> = {
  value: T;
  expiresAt: number;
};

type Store = Map<string, Entry>;

const MAX_ENTRIES = 5_000;
const store: Store = new Map();
let sweepTimer: ReturnType<typeof setInterval> | null = null;

function startSweep(): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.expiresAt <= now) store.delete(key);
    }
  }, 60_000);
}

function trimToMax(): void {
  if (store.size <= MAX_ENTRIES) return;
  const overflow = store.size - MAX_ENTRIES;
  const keys = store.keys();
  for (let i = 0; i < overflow; i++) {
    const next = keys.next();
    if (next.done) break;
    store.delete(next.value);
  }
}

export function get<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  // LRU: re-insert to promote to head.
  store.delete(key);
  store.set(key, entry);
  return entry.value as T;
}

export function set<T>(key: string, value: T, ttlMs: number): void {
  if (!sweepTimer) startSweep();
  if (store.has(key)) store.delete(key);
  const now = Date.now();
  store.set(key, { value, expiresAt: now + ttlMs });
  trimToMax();
}
