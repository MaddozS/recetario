import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PricingPlan, UserSubscriptionInfo } from "@recetario/types";
import BillingSection from "~/features/billing/BillingSection.vue";

/**
 * Tab de facturación (Task 11): estados de suscripción, uso, portal y flujo de
 * cambio de plan con confirmación. Los `<dialog>` se stubean (el entorno de test
 * no implementa `showModal`) y el checkout nunca resuelve para poder assertar el
 * payload sin que jsdom intente navegar.
 */

const state = vi.hoisted(() => ({
  query: {} as Record<string, string>,
  request: vi.fn(),
}));

mockNuxtImport("useRoute", () => () => ({ query: state.query }));
mockNuxtImport("useApi", () => () => state.request);

const PLANS: PricingPlan[] = [
  {
    id: "free",
    tier: "free",
    name: "Free",
    description: "Para empezar a costear",
    badge: null,
    currency: "MXN",
    monthlyPriceId: null,
    monthlyDisplay: null,
    yearlyPriceId: null,
    yearlyDisplay: null,
    yearlyPerMonthDisplay: null,
    features: [{ text: "Hasta 10 recetas", included: true }],
  },
  {
    id: "basic",
    tier: "basic",
    name: "Basic",
    description: "Para negocios en crecimiento",
    badge: { text: "Recomendado" },
    currency: "MXN",
    monthlyPriceId: "price_basic_monthly",
    monthlyDisplay: "$9.99",
    yearlyPriceId: "price_basic_yearly",
    yearlyDisplay: "$95.90",
    yearlyPerMonthDisplay: "$7.99",
    features: [{ text: "Hasta 75 recetas", included: true }],
  },
  {
    id: "pro",
    tier: "pro",
    name: "Pro",
    description: "Para profesionales",
    badge: { text: "Más popular" },
    currency: "MXN",
    monthlyPriceId: "price_pro_monthly",
    monthlyDisplay: "$19.99",
    yearlyPriceId: "price_pro_yearly",
    yearlyDisplay: "$191.90",
    yearlyPerMonthDisplay: "$15.99",
    features: [{ text: "Recetas ilimitadas", included: true }],
  },
];

function subscription(
  overrides: Partial<UserSubscriptionInfo> = {},
): UserSubscriptionInfo {
  return {
    tier: "pro",
    status: "active",
    recipesLimit: null,
    ingredientsLimit: null,
    features: { production_planner: true, advanced_costs: true },
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

function stubDialogs(wrapper: { findAll: (selector: string) => unknown[] }) {
  const spies = (wrapper.findAll("dialog") as Array<{ element: Element }>).map(
    (dialog) => {
      const showModal = vi.fn();
      const close = vi.fn();
      const element = dialog.element as HTMLDialogElement;
      element.showModal = showModal;
      element.close = close;
      return { showModal, close };
    },
  );
  return spies;
}

const COUNTS = { recipes: 2, ingredients: 5 };

function mountBilling(
  subscriptionFixture: UserSubscriptionInfo,
  extra: {
    counts?: { recipes: number; ingredients: number };
    loading?: boolean;
    failed?: boolean;
  } = {},
) {
  return mountSuspended(BillingSection, {
    props: {
      subscription: subscriptionFixture,
      counts: extra.counts ?? COUNTS,
      loading: extra.loading ?? false,
      failed: extra.failed ?? false,
    },
  });
}

beforeEach(() => {
  state.query = {};
  state.request.mockReset();
  state.request.mockImplementation(async (path: string) => {
    if (path === "/api/billing/plans") return PLANS;
    if (path === "/api/stripe/checkout") return new Promise(() => {});
    throw Object.assign(new Error("stub sin ruta"), { status: 404 });
  });
});

describe("BillingSection — plan actual", () => {
  it("muestra el plan Pro con precio, renovación y portal", async () => {
    const wrapper = await mountBilling(subscription());

    expect(wrapper.text()).toContain("KitchCalc Pro");
    expect(wrapper.text()).toContain("Se renueva el 15/10/2026");
    expect(wrapper.text()).toContain("MXN");
    expect(wrapper.text()).toContain("$19.99");
    expect(wrapper.text()).toContain("/mes");
    expect(wrapper.text()).toContain("Cambiar plan");
    expect(wrapper.find("#manage-subscription-btn").exists()).toBe(true);
    expect(wrapper.find("[data-scheduled-change]").exists()).toBe(false);
  });

  it("el plan Free es gratis para siempre y no ofrece portal", async () => {
    const wrapper = await mountBilling(
      subscription({ tier: "free", priceCents: null, recipesLimit: 10 }),
    );

    expect(wrapper.text()).toContain("KitchCalc Free");
    expect(wrapper.text()).toContain("Gratis para siempre");
    expect(wrapper.text()).toContain("Suscribirse");
    expect(wrapper.find("#manage-subscription-btn").exists()).toBe(false);
  });

  it("describe el trial y la cancelación", async () => {
    const trial = await mountBilling(
      subscription({
        status: "trialing",
        isTrial: true,
        trialEnd: "2026-10-01T12:00:00.000Z",
      }),
    );
    expect(trial.text()).toContain("Periodo de prueba activo");
    expect(trial.text()).toContain("Tu prueba termina el 1/10/2026.");
    expect(trial.text()).toContain("Trial");

    const canceled = await mountBilling(
      subscription({ cancelAtPeriodEnd: true }),
    );
    expect(canceled.text()).toContain("Suscripción cancelada");
    expect(canceled.text()).toContain(
      "Tu plan seguirá activo hasta el 15/10/2026.",
    );
    expect(canceled.text()).toContain("Cancelado");
    expect(canceled.text()).toContain("Se cancelará el 15/10/2026");
  });

  it("describe el cambio programado con la fecha efectiva", async () => {
    const wrapper = await mountBilling(
      subscription({
        scheduledChange: {
          targetTier: "basic",
          targetPlanName: "KitchCalc Basic Mensual",
          targetInterval: "monthly",
          effectiveDate: "2026-10-01T12:00:00.000Z",
        },
      }),
    );

    expect(wrapper.text()).toContain("Cambio programado");
    const box = wrapper.find("[data-scheduled-change]");
    expect(box.text()).toContain("KitchCalc Basic Mensual");
    expect(box.text()).toContain("a partir del 1/10/2026");
  });

  it("muestra los banners de retorno de Stripe", async () => {
    state.query = { success: "1" };
    const success = await mountBilling(subscription());
    expect(success.text()).toContain("Pago exitoso");
    expect(success.text()).toContain("Tu suscripción ha sido activada.");

    state.query = { canceled: "1" };
    const canceled = await mountBilling(subscription());
    expect(canceled.text()).toContain("Pago cancelado");
    expect(canceled.text()).toContain("No se realizó ningún cargo.");
  });
});

describe("BillingSection — uso y funciones", () => {
  it("avisa cuando el remanente alcanza el umbral", async () => {
    const wrapper = await mountBilling(
      subscription({
        tier: "free",
        priceCents: null,
        recipesLimit: 10,
        ingredientsLimit: 30,
      }),
      { counts: { recipes: 9, ingredients: 29 } },
    );

    expect(wrapper.text()).toContain("9 / 10");
    expect(wrapper.text()).toContain("Te quedan 1 recetas.");
    expect(wrapper.text()).toContain("Te quedan 1 ingredientes.");
    expect(wrapper.findAll("a[href='/pricing']")).toHaveLength(2);
  });

  it("no avisa cuando queda holgura", async () => {
    const wrapper = await mountBilling(
      subscription({
        tier: "free",
        priceCents: null,
        recipesLimit: 10,
        ingredientsLimit: 30,
      }),
    );

    expect(wrapper.text()).not.toContain("Te quedan");
  });

  it("lista las funciones incluidas del plan", async () => {
    const wrapper = await mountBilling(subscription());

    expect(wrapper.text()).toContain("Duplicar recetas");
    expect(wrapper.text()).toContain("Planificador de producción");
    expect(wrapper.text()).toContain("Importar/Exportar datos");
  });

  it("ofrece reintentar cuando los contadores fallan", async () => {
    const retry = vi.fn();
    const wrapper = await mountSuspended(BillingSection, {
      props: {
        subscription: subscription(),
        counts: COUNTS,
        loading: false,
        failed: true,
      },
      attrs: { onRetry: retry },
    });

    expect(wrapper.text()).toContain(
      "No se pudieron cargar los contadores de uso.",
    );
    const retryButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Reintentar"));
    await retryButton!.trigger("click");
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe("BillingSection — portal", () => {
  it("muestra el error del portal sin ocultarlo", async () => {
    state.request.mockImplementation(async (path: string) => {
      if (path === "/api/billing/plans") return PLANS;
      throw Object.assign(new Error("No subscription found"), { status: 404 });
    });

    const wrapper = await mountBilling(subscription());
    await wrapper.find("#manage-subscription-btn").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("No se pudo abrir el portal.");
    expect(state.request).toHaveBeenCalledWith(
      "/api/stripe/portal",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("BillingSection — cambio de plan", () => {
  it("abre el selector con las etiquetas por tier y periodo", async () => {
    const wrapper = await mountBilling(
      subscription({ tier: "basic", billingInterval: "monthly" }),
    );
    const dialogs = stubDialogs(wrapper as never);

    await wrapper.find("[data-open-pricing-modal]").trigger("click");
    await flushPromises();

    expect(dialogs[0]?.showModal).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Planes y precios");
    expect(wrapper.find('[data-plan="basic"]').text()).toContain("Plan actual");
    expect(wrapper.find('[data-plan="pro"]').text()).toContain(
      "Actualizar a Pro",
    );
    expect(
      wrapper.find('[data-plan="free"] button').attributes("disabled"),
    ).toBeDefined();
  });

  it("confirma un upgrade y envía el checkout con los URLs de Settings", async () => {
    const wrapper = await mountBilling(
      subscription({ tier: "basic", billingInterval: "monthly" }),
    );
    stubDialogs(wrapper as never);

    await wrapper.find("[data-open-pricing-modal]").trigger("click");
    await wrapper.find('[data-plan="pro"] button').trigger("click");
    await flushPromises();

    expect(wrapper.find("#confirm-plan-change-dialog").text()).toContain(
      "Cambio inmediato (Upgrade)",
    );
    expect(wrapper.find("[data-confirm-plan-summary]").text()).toContain(
      "BASIC Mensual",
    );

    await wrapper.find("#confirm-plan-change-btn").trigger("click");
    await flushPromises();

    const origin = window.location.origin;
    expect(state.request).toHaveBeenCalledWith(
      "/api/stripe/checkout",
      expect.objectContaining({
        method: "POST",
        body: {
          priceId: "price_pro_monthly",
          successUrl: `${origin}/settings?tab=billing&success=1`,
          cancelUrl: `${origin}/settings?tab=billing&canceled=1`,
        },
      }),
    );
  });

  it("describe el downgrade como cambio programado", async () => {
    const wrapper = await mountBilling(subscription({ tier: "pro" }));
    stubDialogs(wrapper as never);

    await wrapper.find("[data-open-pricing-modal]").trigger("click");
    await wrapper.find('[data-plan="basic"] button').trigger("click");
    await flushPromises();

    const dialog = wrapper.find("#confirm-plan-change-dialog");
    expect(dialog.text()).toContain("Cambio programado (Downgrade)");
    expect(dialog.text()).toContain("PRO Mensual");
    expect(dialog.text()).toContain("hasta 15/10/2026");
  });
});
