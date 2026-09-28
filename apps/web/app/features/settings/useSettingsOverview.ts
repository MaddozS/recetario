import {
  usageCountsResponseSchema,
  userSubscriptionInfoSchema,
} from "@recetario/types";
import type { UserSubscriptionInfo } from "@recetario/types";
import { resolveSettingsTab } from "./settings-tabs";

const EMPTY_COUNTS = { recipes: 0, ingredients: 0 };

/** Claves separadas: los contadores no dependen del ciclo de facturación. */
const COUNTS_KEY = "settings-counts";
const SUBSCRIPTION_KEY = "settings-billing-subscription";

/**
 * Datos de la página de Settings.
 *
 * Los contadores se cargan una vez (con `failed` y reintento). La suscripción
 * fresca se pide a `GET /api/billing/subscription` —el único camino con
 * reconciliación en vivo y `scheduledChange`— cuando el montaje trae contexto de
 * facturación y cada vez que la pestaña se activa o la sesión se revalida
 * (`revision`); el snapshot de sesión sólo cubre el primer pintado o un fallo
 * del API.
 */
export function useSettingsOverview() {
  const api = useApi();
  const route = useRoute();
  const {
    subscription: sessionSubscription,
    revision,
    refresh: refreshSession,
  } = useAuth();

  const activeTab = computed(() => resolveSettingsTab(route.query.tab));
  const sessionId = computed(() =>
    typeof route.query.session_id === "string" ? route.query.session_id : null,
  );
  // Retorno de Stripe o deep link: el SSR también debe traer el dato fresco.
  const billingContext = computed(
    () =>
      activeTab.value === "billing" ||
      sessionId.value !== null ||
      route.query.success === "1" ||
      route.query.canceled === "1",
  );

  const {
    data: overview,
    pending: countsPending,
    refresh: refreshCounts,
  } = useAsyncData(
    COUNTS_KEY,
    async () => {
      try {
        const counts = await api("/api/usage-counts", {
          schema: usageCountsResponseSchema,
        });
        return { counts, failed: false };
      } catch (cause) {
        console.error("[settings] no se pudieron cargar los contadores", cause);
        return { counts: { ...EMPTY_COUNTS }, failed: true };
      }
    },
    { default: () => ({ counts: { ...EMPTY_COUNTS }, failed: false }) },
  );

  const {
    data: freshSubscription,
    pending: subscriptionPending,
    refresh: refreshSubscription,
  } = useAsyncData<UserSubscriptionInfo | null>(
    SUBSCRIPTION_KEY,
    async () => {
      const id = sessionId.value;
      if (id) {
        try {
          await api("/api/stripe/sync-session", {
            method: "POST",
            body: { sessionId: id },
          });
          // El checkout pudo cambiar el plan: el snapshot de sesión también.
          await refreshSession();
        } catch (cause) {
          // Best-effort: la suscripción de la sesión sigue siendo válida.
          console.error("[settings] no se pudo sincronizar el checkout", cause);
        }
      }

      try {
        return await api("/api/billing/subscription", {
          schema: userSubscriptionInfoSchema,
        });
      } catch (cause) {
        // El plan free responde 404: se usa la suscripción de la sesión.
        console.error("[settings] no se pudo refrescar la suscripción", cause);
        return null;
      }
    },
    { default: () => null, immediate: billingContext.value },
  );

  // La pestaña de facturación revalida al activarse y cuando la sesión cambió
  // fuera del documento (página restaurada de bfcache, regreso a la pestaña).
  let fetchedRevision = -1;
  watch([activeTab, revision], () => {
    if (activeTab.value !== "billing") return;
    if (fetchedRevision === revision.value) return;

    fetchedRevision = revision.value;
    void refreshSubscription();
  });

  const counts = computed(() => overview.value.counts);
  const failed = computed(() => overview.value.failed);
  const subscription = computed(
    () => freshSubscription.value ?? sessionSubscription.value,
  );
  // Sólo se esqueletiza cuando no hay dato fresco: revalidar datos ya visibles
  // no debe parpadear.
  const pending = computed(
    () =>
      countsPending.value ||
      (subscriptionPending.value && freshSubscription.value === null),
  );

  return { counts, subscription, pending, failed, refresh: refreshCounts };
}
