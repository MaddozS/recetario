import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { enableAutoUnmount } from "@vue/test-utils";
import { computed, defineComponent, h } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanFeature, PricingPlan } from "@recetario/types";
import LandingPricingSection from "~/components/landing/PricingSection.vue";
import BillingIntervalToggle from "~/features/billing/BillingIntervalToggle.vue";
import PlanCard from "~/features/billing/PlanCard.vue";
import PlanFeatureList from "~/features/billing/PlanFeatureList.vue";
import PlanPrice from "~/features/billing/PlanPrice.vue";
import { usePricingPlans } from "~/features/billing/usePricingPlans";

/**
 * `enableAutoUnmount` es obligatorio desde que hay un test del composable:
 * `useAsyncData` guarda handler y datos por clave en el payload del app de test
 * (`purgeCachedData` limpia la entrada al desmontar), así que sin desmontar el
 * segundo montaje heredaría el resultado del primero.
 */
enableAutoUnmount(afterEach);

const authMock = vi.hoisted(() => ({ isAuthenticated: false }));
const apiMock = vi.hoisted(() => ({ request: vi.fn() }));

mockNuxtImport("useAuth", () => () => ({
  state: { value: { status: "anonymous" } },
  isAuthenticated: computed(() => authMock.isAuthenticated),
  user: computed(() => null),
  subscription: computed(() => null),
  preferences: computed(() => ({ theme: "system", accentColor: "coral" })),
  hasFeature: () => false,
  expire: () => {},
}));

mockNuxtImport("useApi", () => () => apiMock.request);

const FREE_FEATURES: PlanFeature[] = [
  { text: "Hasta 10 recetas", included: true },
  { text: "Duplicar recetas", included: false },
];

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
    features: FREE_FEATURES,
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
    features: [
      { text: "Exportar a PDF", included: false, status: "coming_soon" },
    ],
  },
  {
    id: "pro",
    tier: "pro",
    name: "Pro",
    description: "Para profesionales",
    badge: { text: "Mas popular" },
    currency: "MXN",
    monthlyPriceId: "price_pro_monthly",
    monthlyDisplay: "$19.99",
    yearlyPriceId: "price_pro_yearly",
    yearlyDisplay: "$191.90",
    yearlyPerMonthDisplay: "$15.99",
    features: [{ text: "Recetas ilimitadas", included: true }],
  },
];

beforeEach(() => {
  authMock.isAuthenticated = false;
});

describe("BillingIntervalToggle", () => {
  it("emite el periodo elegido con click y con flechas", async () => {
    const onUpdate = vi.fn();
    const wrapper = await mountSuspended(BillingIntervalToggle, {
      props: { modelValue: "monthly", "onUpdate:modelValue": onUpdate },
    });

    await wrapper.findAll("button")[1]!.trigger("click");
    expect(onUpdate).toHaveBeenCalledWith("yearly");

    onUpdate.mockClear();
    await wrapper.find('[role="radiogroup"]').trigger("keydown", {
      key: "ArrowRight",
    });
    expect(onUpdate).toHaveBeenCalledWith("yearly");
  });

  it("marca la opción activa con aria-checked", async () => {
    const wrapper = await mountSuspended(BillingIntervalToggle, {
      props: { modelValue: "yearly" },
    });

    const radios = wrapper.findAll('[role="radio"]');
    expect(radios.map((radio) => radio.attributes("aria-checked"))).toEqual([
      "false",
      "true",
    ]);
  });
});

describe("PlanPrice", () => {
  it("muestra el precio mensual y el anual con su facturación", async () => {
    const wrapper = await mountSuspended(PlanPrice, {
      props: { plan: PLANS[1]!, interval: "monthly" },
    });

    expect(wrapper.text()).toContain("$9.99");
    expect(wrapper.text()).toContain("Facturado mensualmente");

    await wrapper.setProps({ interval: "yearly" });
    expect(wrapper.text()).toContain("$7.99");
    expect(wrapper.text()).toContain("$95.90 facturados anualmente");
  });

  it("el plan free siempre es Gratis", async () => {
    const wrapper = await mountSuspended(PlanPrice, {
      props: { plan: PLANS[0]!, interval: "yearly" },
    });

    expect(wrapper.text()).toContain("Gratis");
    expect(wrapper.text()).not.toContain("MXN");
  });
});

describe("PlanFeatureList", () => {
  it("distingue incluidas, no incluidas y próximas", async () => {
    const wrapper = await mountSuspended(PlanFeatureList, {
      props: {
        features: [
          { text: "Incluida", included: true },
          { text: "No incluida", included: false },
          { text: "Próximamente", included: false, status: "coming_soon" },
        ],
      },
    });

    expect(wrapper.findAll(".lucide-check")).toHaveLength(1);
    expect(wrapper.findAll(".lucide-x")).toHaveLength(1);
    expect(wrapper.findAll(".lucide-clock")).toHaveLength(1);
    expect(wrapper.text()).toContain("Próximamente");
  });

  it("expone el estado de cada fila en texto, no sólo por ícono", async () => {
    const wrapper = await mountSuspended(PlanFeatureList, {
      props: {
        features: [
          { text: "Hasta 10 recetas", included: true },
          { text: "Duplicar recetas", included: false },
          { text: "Exportar a PDF", included: false, status: "coming_soon" },
        ],
      },
    });

    expect(wrapper.find("ul").exists()).toBe(true);

    const rows = wrapper.findAll("li");
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.find(".sr-only").text())).toEqual([
      "Incluido:",
      "No incluido:",
      "Próximamente:",
    ]);
    expect(
      rows.map((row) => row.findAll("span").map((span) => span.text())),
    ).toEqual([
      ["Incluido:", "Hasta 10 recetas"],
      ["No incluido:", "Duplicar recetas"],
      ["Próximamente:", "Exportar a PDF"],
    ]);
    expect(rows.map((row) => row.find("svg").classes()[1])).toEqual([
      "lucide-check",
      "lucide-x",
      "lucide-clock",
    ]);
    expect(
      rows.every((row) => row.find("svg").attributes("aria-hidden") === "true"),
    ).toBe(true);
  });
});

describe("PlanCard", () => {
  it("el sustrato de la card es el mismo en las dos superficies", async () => {
    const wrapper = await mountSuspended(PlanCard, {
      props: { planId: "basic" },
      slots: { default: "contenido" },
    });

    expect(wrapper.attributes("data-plan")).toBe("basic");
    expect(wrapper.attributes("data-highlighted")).toBeUndefined();
    expect(wrapper.text()).toBe("contenido");
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        "bg-card",
        "border",
        "border-border",
        "rounded-2xl",
        "shadow-sm",
        "p-6",
      ]),
    );
  });

  it("la card destacada cambia el borde y la densidad, no el sustrato", async () => {
    const wrapper = await mountSuspended(PlanCard, {
      props: { planId: "pro", featured: true, density: "roomy" },
    });

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        "bg-card",
        "rounded-2xl",
        "shadow-sm",
        "border-accent-300",
        "plan-pro",
        "dark:bg-accent-800/10",
        "p-7",
        "md:p-8",
        "xl:p-10",
      ]),
    );
    // El color del borde se decide en un solo sitio: nunca conviven los dos.
    expect(wrapper.classes()).not.toContain("border-border");
  });

  it("el resaltado de ?plan= manda sobre el destacado permanente", async () => {
    const wrapper = await mountSuspended(PlanCard, {
      props: { planId: "pro", featured: true, highlighted: true },
    });

    expect(wrapper.attributes("data-highlighted")).toBe("1");
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        "border-accent-500",
        "ring-2",
        "ring-offset-2",
        "ring-offset-background",
      ]),
    );
    expect(wrapper.classes()).not.toContain("plan-pro");
  });
});

describe("LandingPricingSection", () => {
  it("cambia los precios al alternar el periodo", async () => {
    const wrapper = await mountSuspended(LandingPricingSection, {
      props: { plans: PLANS },
    });

    const basicCard = wrapper.find('[data-plan="basic"]');
    expect(basicCard.text()).toContain("$9.99");

    await wrapper.findAll('[role="radio"]')[1]!.trigger("click");
    expect(basicCard.text()).toContain("$7.99");
    expect(basicCard.text()).toContain("$95.90");
  });

  it("el anónimo pasa por sign-in y el autenticado va a la app", async () => {
    const anonymous = await mountSuspended(LandingPricingSection, {
      props: { plans: PLANS },
    });
    expect(
      anonymous.findAll("a").map((link) => link.attributes("href")),
    ).toEqual([
      "/sign-in?redirect=/recipes",
      "/sign-in?redirect=/pricing",
      "/sign-in?redirect=/pricing",
    ]);

    authMock.isAuthenticated = true;
    const authenticated = await mountSuspended(LandingPricingSection, {
      props: { plans: PLANS },
    });
    expect(
      authenticated.findAll("a").map((link) => link.attributes("href")),
    ).toEqual(["/recipes", "/pricing", "/pricing"]);
  });

  it("sin planes muestra el aviso en vez de una grilla vacía", async () => {
    const wrapper = await mountSuspended(LandingPricingSection, {
      props: { plans: [] },
    });

    expect(wrapper.text()).toContain("No hay planes disponibles por ahora");
  });

  it("con el catálogo caído avisa y no dice que no hay planes", async () => {
    const wrapper = await mountSuspended(LandingPricingSection, {
      props: { plans: [], error: new Error("500") },
    });

    expect(wrapper.text()).toContain("No pudimos cargar los planes");
    expect(wrapper.text()).not.toContain("No hay planes disponibles por ahora");
  });
});

describe("usePricingPlans", () => {
  /**
   * Monta la sección real sobre el composable real: lo que se prueba es que el
   * fallo del API llega a la superficie en vez de convertirse en una lista
   * vacía (el hallazgo 13: una caída se contaba como "no hay planes").
   */
  const CatalogProbe = defineComponent({
    setup() {
      const { plans, pending, error } = usePricingPlans();
      return () =>
        h(LandingPricingSection, {
          plans: plans.value,
          pending: pending.value,
          error: error.value,
        });
    },
  });

  beforeEach(() => {
    apiMock.request.mockReset();
  });

  it("expone el error del API y la sección lo muestra", async () => {
    apiMock.request.mockRejectedValue(new Error("connect ECONNREFUSED"));

    const wrapper = await mountSuspended(CatalogProbe);

    expect(wrapper.text()).toContain("No pudimos cargar los planes");
    expect(wrapper.text()).not.toContain("No hay planes disponibles por ahora");
  });

  it("un catálogo vacío de verdad sigue mostrando el estado vacío", async () => {
    apiMock.request.mockResolvedValue([]);

    const wrapper = await mountSuspended(CatalogProbe);

    expect(wrapper.text()).toContain("No hay planes disponibles por ahora");
    expect(wrapper.text()).not.toContain("No pudimos cargar los planes");
  });
});
