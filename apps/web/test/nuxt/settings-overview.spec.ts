import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { enableAutoUnmount, flushPromises } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserSubscriptionInfo } from "@recetario/types";
import { useSettingsOverview } from "~/features/settings/useSettingsOverview";

/**
 * Frescura de `/settings`: los contadores se cargan una vez y la suscripción
 * fresca se pide al montar con contexto de facturación, al activar la pestaña y
 * cuando la sesión se revalida —siempre sin recargar el documento.
 *
 * `enableAutoUnmount` es obligatorio: `useAsyncData` guarda el handler y los
 * datos por clave en el app de test, así que sin desmontar entre tests el
 * segundo montaje reutilizaría el closure del primero (`purgeCachedData` limpia
 * la entrada al desmontar). La ruta se mockea con una copia reactiva por
 * montaje, como en `production-planner.spec.ts`.
 */

enableAutoUnmount(afterEach);

const state = vi.hoisted(() => ({
  request: vi.fn(),
  query: {} as Record<string, unknown>,
  routes: [] as { query: Record<string, unknown> }[],
  revision: null as unknown as { value: number },
  refreshSession: vi.fn(),
  sessionSubscription: null as unknown,
  overview: null as unknown as ReturnType<typeof useSettingsOverview>,
}));

mockNuxtImport("useApi", () => () => state.request);

mockNuxtImport("useAuth", async () => {
  // El import dinámico evita el binding hoisteado del factory (Vitest lo iza
  // por encima de los imports del spec).
  const { computed, ref } = await import("vue");
  const revision = ref(0);
  state.revision = revision;

  return () => ({
    state: { value: { status: "authenticated" } },
    revision,
    refresh: state.refreshSession,
    subscription: computed(() => state.sessionSubscription),
  });
});

mockNuxtImport("useRoute", async () => {
  const { reactive } = await import("vue");
  return () => {
    const route = reactive({ query: { ...state.query } });
    state.routes.push(route);
    return route;
  };
});

function setQuery(query: Record<string, unknown>): void {
  state.query = { ...query };
  const route = state.routes.at(-1);
  if (!route) return;

  for (const key of Object.keys(route.query)) delete route.query[key];
  Object.assign(route.query, query);
}

const Harness = defineComponent({
  setup() {
    state.overview = useSettingsOverview();
    return () => h("div");
  },
});

function subscriptionFixture(
  overrides: Partial<UserSubscriptionInfo> = {},
): UserSubscriptionInfo {
  return {
    tier: "pro",
    status: "active",
    recipesLimit: null,
    ingredientsLimit: null,
    features: {},
    priceCents: 1999,
    currency: "MXN",
    billingInterval: "monthly",
    currentPeriodEnd: "2026-10-15T12:00:00.000Z",
    cancelAtPeriodEnd: false,
    isTrial: false,
    trialEnd: null,
    ...overrides,
  };
}

const SESSION_SUBSCRIPTION = subscriptionFixture();
const FRESH_SUBSCRIPTION = subscriptionFixture({ cancelAtPeriodEnd: true });

function billingCalls(): number {
  return state.request.mock.calls.filter(
    ([path]) => path === "/api/billing/subscription",
  ).length;
}

beforeEach(() => {
  state.request.mockReset();
  state.refreshSession.mockReset();
  state.query = {};
  state.routes.length = 0;
  state.revision.value = 0;
  state.sessionSubscription = SESSION_SUBSCRIPTION;
  state.request.mockImplementation(async (path: string) => {
    if (path === "/api/usage-counts") return { recipes: 2, ingredients: 3 };
    if (path === "/api/billing/subscription") return FRESH_SUBSCRIPTION;
    if (path === "/api/stripe/sync-session") return { ok: true };
    throw Object.assign(new Error("stub sin ruta"), { status: 404 });
  });
});

describe("useSettingsOverview", () => {
  it("sin pestaña de facturación usa el snapshot de sesión", async () => {
    await mountSuspended(Harness);
    await flushPromises();

    expect(billingCalls()).toBe(0);
    expect(state.overview.subscription.value).toBe(SESSION_SUBSCRIPTION);
  });

  it("un deep link a facturación la pide al montar", async () => {
    state.query = { tab: "billing" };
    await mountSuspended(Harness);
    await flushPromises();

    expect(billingCalls()).toBe(1);
    expect(state.overview.subscription.value).toBe(FRESH_SUBSCRIPTION);
  });

  it("activar la pestaña después la pide sin recargar", async () => {
    await mountSuspended(Harness);
    await flushPromises();
    expect(billingCalls()).toBe(0);

    setQuery({ tab: "billing" });
    await nextTick();
    await flushPromises();

    expect(billingCalls()).toBe(1);
  });

  it("revalidar la sesión con facturación activa vuelve a pedirla", async () => {
    state.query = { tab: "billing" };
    await mountSuspended(Harness);
    await flushPromises();
    expect(billingCalls()).toBe(1);

    state.revision.value += 1;
    await nextTick();
    await flushPromises();

    expect(billingCalls()).toBe(2);
  });

  it("una revalidación fuera de facturación no gasta peticiones, pero al volver sí", async () => {
    state.query = { tab: "billing" };
    await mountSuspended(Harness);
    await flushPromises();

    setQuery({ tab: "profile" });
    state.revision.value += 1;
    await nextTick();
    await flushPromises();
    expect(billingCalls()).toBe(1);

    setQuery({ tab: "billing" });
    await nextTick();
    await flushPromises();
    expect(billingCalls()).toBe(2);
  });

  it("esqueletiza mientras no hay suscripción fresca", async () => {
    state.query = { tab: "billing" };
    let confirm: (value: UserSubscriptionInfo) => void = () => {};
    state.request.mockImplementation(async (path: string) => {
      if (path === "/api/usage-counts") return { recipes: 2, ingredients: 3 };
      return new Promise<UserSubscriptionInfo>((resolve) => {
        confirm = resolve;
      });
    });

    await mountSuspended(Harness);
    expect(state.overview.pending.value).toBe(true);

    confirm(FRESH_SUBSCRIPTION);
    await flushPromises();
    expect(state.overview.pending.value).toBe(false);
  });

  it("no esqueletiza al revalidar datos ya visibles", async () => {
    state.query = { tab: "billing" };
    await mountSuspended(Harness);
    await flushPromises();
    expect(state.overview.pending.value).toBe(false);

    let confirm: (value: UserSubscriptionInfo) => void = () => {};
    state.request.mockImplementation(async (path: string) => {
      if (path === "/api/usage-counts") return { recipes: 2, ingredients: 3 };
      return new Promise<UserSubscriptionInfo>((resolve) => {
        confirm = resolve;
      });
    });

    state.revision.value += 1;
    await nextTick();
    expect(state.overview.pending.value).toBe(false);

    confirm(FRESH_SUBSCRIPTION);
    await flushPromises();
    expect(state.overview.pending.value).toBe(false);
  });

  it("cae al snapshot de sesión si el API de facturación falla", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    state.request.mockImplementation(async (path: string) => {
      if (path === "/api/usage-counts") return { recipes: 0, ingredients: 0 };
      throw Object.assign(new Error("not found"), { status: 404 });
    });
    state.query = { tab: "billing" };

    await mountSuspended(Harness);
    await flushPromises();

    expect(state.overview.subscription.value).toBe(SESSION_SUBSCRIPTION);
    logged.mockRestore();
  });

  it("con ?session_id sincroniza el checkout y refresca la sesión", async () => {
    state.query = { tab: "billing", session_id: "cs_test_123" };

    await mountSuspended(Harness);
    await flushPromises();

    expect(state.request).toHaveBeenCalledWith(
      "/api/stripe/sync-session",
      expect.objectContaining({
        method: "POST",
        body: { sessionId: "cs_test_123" },
      }),
    );
    expect(state.refreshSession).toHaveBeenCalledTimes(1);
    expect(billingCalls()).toBe(1);
  });

  it("un fallo de los contadores no tumba la página", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    state.request.mockImplementation(async (path: string) => {
      if (path === "/api/usage-counts") {
        throw Object.assign(new Error("boom"), { status: 500 });
      }
      throw Object.assign(new Error("stub sin ruta"), { status: 404 });
    });

    await mountSuspended(Harness);
    await flushPromises();

    expect(state.overview.failed.value).toBe(true);
    expect(state.overview.counts.value).toEqual({ recipes: 0, ingredients: 0 });
    logged.mockRestore();
  });
});
