const globalKey = "__lazySingletons";

export function lazyInit<T extends object>(key: string, initFn: () => T): T {
  const singletons: Map<string, unknown> =
    ((globalThis as Record<string, unknown>)[globalKey] as Map<string, unknown> | undefined) ??
    ((globalThis as Record<string, unknown>)[globalKey] = new Map<string, unknown>());

  return new Proxy({} as T, {
    get(_target, prop) {
      if (!singletons.has(key)) {
        singletons.set(key, initFn());
      }
      const client = singletons.get(key) as Record<string | symbol, unknown>;
      const value = client[prop];
      return typeof value === "function" ? (value as Function).bind(client) : value;
    },
  });
}
