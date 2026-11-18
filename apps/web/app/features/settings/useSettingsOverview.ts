import { computed, ref, watch } from 'vue';
import { usageCountsResponseSchema, userSubscriptionInfoSchema } from '@recetario/types';
import type { UserSubscriptionInfo } from '@recetario/types';
import { ApiError } from '~/utils/api-error';
import { resolveSettingsTab } from './settings-tabs';

const EMPTY_COUNTS = { recipes: 0, ingredients: 0 };

/** Claves separadas: los contadores no dependen del ciclo de facturación. */
const COUNTS_KEY = 'settings-counts';
const SUBSCRIPTION_KEY = 'settings-billing-subscription';

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
  const { subscription: sessionSubscription, revision, refresh: refreshSession } = useAuth();

  const activeTab = computed(() => resolveSettingsTab(route.query.tab));
  const sessionId = computed(() =>
    typeof route.query.session_id === 'string' ? route.query.session_id : null
  );
  // Retorno de Stripe o deep link: el SSR también debe traer el dato fresco.
  const billingContext = computed(
    () =>
      activeTab.value === 'billing' ||
      sessionId.value !== null ||
      route.query.success === '1' ||
      route.query.canceled === '1'
  );

  const hasFetchedSubscription = ref(false);
  const subscriptionFailed = ref(false);

  const {
    data: overview,
    pending: countsPending,
    refresh: refreshCounts,
  } = useAsyncData(
    COUNTS_KEY,
    async () => {
      try {
        const counts = await api('/api/usage-counts', {
          schema: usageCountsResponseSchema,
        });
        return { counts, failed: false };
      } catch (cause) {
        console.error('[settings] no se pudieron cargar los contadores', cause);
        return { counts: { ...EMPTY_COUNTS }, failed: true };
      }
    },
    { default: () => ({ counts: { ...EMPTY_COUNTS }, failed: false }) }
  );

  const {
    data: freshSubscription,
    pending: subscriptionPending,
    refresh: refreshSubscription,
  } = useAsyncData<UserSubscriptionInfo | null>(
    SUBSCRIPTION_KEY,
    async () => {
      subscriptionFailed.value = false;
      const id = sessionId.value;
      if (id) {
        try {
          await api('/api/stripe/sync-session', {
            method: 'POST',
            body: { sessionId: id },
          });
          // El checkout pudo cambiar el plan: el snapshot de sesión también.
          await refreshSession();
        } catch (cause) {
          // Best-effort: la suscripción de la sesión sigue siendo válida.
          console.error('[settings] no se pudo sincronizar el checkout', cause);
        }
      }

      try {
        const sub = await api('/api/billing/subscription', {
          schema: userSubscriptionInfoSchema,
        });
        hasFetchedSubscription.value = true;
        return sub;
      } catch (cause) {
        const status =
          cause instanceof ApiError ? cause.status : (cause as { status?: number })?.status;
        if (status === 404) {
          // El plan free responde 404: se confirma plan free sin error.
          hasFetchedSubscription.value = true;
          return null;
        }
        console.error('[settings] no se pudo refrescar la suscripción', cause);
        subscriptionFailed.value = true;
        return null;
      }
    },
    { default: () => null, immediate: billingContext.value }
  );

  // La pestaña de facturación revalida al activarse y cuando la sesión cambió
  // fuera del documento (página restaurada de bfcache, regreso a la pestaña).
  let fetchedRevision = -1;
  watch([activeTab, revision], () => {
    if (activeTab.value !== 'billing') return;
    if (fetchedRevision === revision.value) return;

    fetchedRevision = revision.value;
    void refreshSubscription();
  });

  const counts = computed(() => overview.value.counts);
  const countsFailed = computed(() => overview.value.failed);
  const failed = computed(() => countsFailed.value || subscriptionFailed.value);
  const subscription = computed(() => freshSubscription.value ?? sessionSubscription.value);
  // Sólo se esqueletiza cuando no hay dato fresco verificado: revalidar datos ya visibles
  // no debe parpadear.
  const pending = computed(
    () => countsPending.value || (subscriptionPending.value && !hasFetchedSubscription.value)
  );

  async function refreshAll() {
    await Promise.all([refreshCounts(), refreshSubscription()]);
  }

  return {
    counts,
    subscription,
    pending,
    failed,
    subscriptionFailed,
    refresh: refreshAll,
  };
}
