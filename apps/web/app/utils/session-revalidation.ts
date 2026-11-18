/**
 * Revalidación de la sesión de cliente, con throttle y dedupe.
 *
 * El snapshot de `useState("auth")` se resuelve una sola vez por documento: los
 * cambios externos (Stripe, otra pestaña, otra sesión) quedan invisibles hasta
 * que alguien lo revalida. Este scheduler concentra los disparadores de esos
 * eventos para que `focus`/`visibilitychange` no se conviertan en una petición
 * cada uno: aplica un TTL y descarta los disparos que llegan con una
 * revalidación en vuelo.
 *
 * Módulo puro (sin DOM ni Nuxt): el plugin `auth-revalidation` lo conecta a los
 * eventos y los tests lo ejercitan con un reloj falso.
 */

/** Ventana mínima entre revalidaciones normales; los disparos `force` la ignoran. */
export const SESSION_REFRESH_TTL_MS = 30_000;

export type RefreshSchedulerOptions = {
  /** Contrato: nunca rechaza; resuelve `false` cuando no pudo revalidar. */
  refresh: () => Promise<boolean>;
  /** Sólo se revalida con sesión autenticada. */
  isEligible: () => boolean;
  /** Resultado de cada revalidación efectiva (no de los disparos descartados). */
  onRevalidated?: (updated: boolean) => void;
  now?: () => number;
  ttlMs?: number;
};

export type RefreshScheduler = {
  /** `force` (restauración desde bfcache) ignora el TTL. */
  request: (force?: boolean) => Promise<void>;
  dispose: () => void;
};

export function createRefreshScheduler({
  refresh,
  isEligible,
  onRevalidated,
  now = Date.now,
  ttlMs = SESSION_REFRESH_TTL_MS,
}: RefreshSchedulerOptions): RefreshScheduler {
  let lastRequestAt = Number.NEGATIVE_INFINITY;
  let inFlight: Promise<void> | null = null;
  let disposed = false;

  async function run(): Promise<void> {
    // El timestamp se fija al iniciar: un API caído no debe amplificar cada
    // `focus` con una petición nueva.
    lastRequestAt = now();
    try {
      // En dos pasos a propósito: `cb?.(await refresh())` cortocircuitaría la
      // llamada (y con ella la revalidación) cuando no hay callback.
      const updated = await refresh();
      onRevalidated?.(updated);
    } finally {
      inFlight = null;
    }
  }

  return {
    async request(force = false) {
      if (disposed || !isEligible() || inFlight) return;
      if (!force && now() - lastRequestAt < ttlMs) return;

      inFlight = run();
      await inFlight;
    },
    dispose() {
      disposed = true;
      inFlight = null;
    },
  };
}
