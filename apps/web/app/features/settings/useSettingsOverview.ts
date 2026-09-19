import {
  usageCountsResponseSchema,
  userSubscriptionInfoSchema,
} from "@recetario/types";
import type { UserSubscriptionInfo } from "@recetario/types";
import { resolveSettingsTab } from "./settings-tabs";

export type SettingsOverview = {
  counts: { recipes: number; ingredients: number };
  /** Suscripción refrescada por el API; `null` si no aplicaba o falló. */
  subscription: UserSubscriptionInfo | null;
  failed: boolean;
};

const EMPTY_COUNTS = { recipes: 0, ingredients: 0 };

/**
 * Datos de la página de Settings.
 *
 * Réplica del SSR del baseline: sincroniza el checkout si llega `?session_id=`,
 * carga los contadores y, sólo cuando la vista lo necesita (tab de facturación,
 * retorno de Stripe o sincronización), refresca la suscripción — que es el único
 * camino donde el API expone `scheduledChange`. Un fallo del API no tumba la
 * página: se degrada con `failed` y la suscripción de sesión.
 */
export function useSettingsOverview() {
  const api = useApi();
  const route = useRoute();
  const { subscription: sessionSubscription } = useAuth();

  const { data, pending, refresh } = useAsyncData<SettingsOverview>(
    "settings-overview",
    async () => {
      const query = route.query;
      const sessionId =
        typeof query.session_id === "string" ? query.session_id : null;
      const needsFreshSubscription =
        resolveSettingsTab(query.tab) === "billing" ||
        Boolean(sessionId) ||
        query.success === "1" ||
        query.canceled === "1";

      if (sessionId) {
        try {
          await api("/api/stripe/sync-session", {
            method: "POST",
            body: { sessionId },
          });
        } catch (cause) {
          // Best-effort: la suscripción de sesión sigue siendo válida.
          console.error("[settings] no se pudo sincronizar el checkout", cause);
        }
      }

      let counts = { ...EMPTY_COUNTS };
      let failed = false;
      try {
        counts = await api("/api/usage-counts", {
          schema: usageCountsResponseSchema,
        });
      } catch (cause) {
        console.error("[settings] no se pudieron cargar los contadores", cause);
        failed = true;
      }

      let subscription: UserSubscriptionInfo | null = null;
      if (needsFreshSubscription) {
        try {
          subscription = await api("/api/billing/subscription", {
            schema: userSubscriptionInfoSchema,
          });
        } catch (cause) {
          // El plan free responde 404: se usa la suscripción de la sesión.
          console.error(
            "[settings] no se pudo refrescar la suscripción",
            cause,
          );
        }
      }

      return { counts, subscription, failed };
    },
    {
      default: () => ({
        counts: { ...EMPTY_COUNTS },
        subscription: null,
        failed: false,
      }),
    },
  );

  const counts = computed(() => data.value.counts);
  const failed = computed(() => data.value.failed);
  const subscription = computed(
    () => data.value.subscription ?? sessionSubscription.value,
  );

  return { counts, subscription, pending, failed, refresh };
}
