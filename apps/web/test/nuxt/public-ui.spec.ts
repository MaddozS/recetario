import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { computed } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanFeature, PricingPlan } from "@recetario/types";
import LandingPricingSection from "~/components/landing/PricingSection.vue";
import BillingIntervalToggle from "~/features/billing/BillingIntervalToggle.vue";
import PlanFeatureList from "~/features/billing/PlanFeatureList.vue";
import PlanPrice from "~/features/billing/PlanPrice.vue";

const authMock = vi.hoisted(() => ({ isAuthenticated: false }));

mockNuxtImport("useAuth", () => () => ({
  state: { value: { status: "anonymous" } },
  isAuthenticated: computed(() => authMock.isAuthenticated),
  user: computed(() => null),
  subscription: computed(() => null),
  preferences: computed(() => ({ theme: "system", accentColor: "coral" })),
  hasFeature: () => false,
  expire: () => {},
}));

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
    badge: { text: "Recomendado", class: "bg-success-bg text-success" },
    currency: "MXN",
    monthlyPriceId: "price_basic_monthly",
    monthlyDisplay: "$9.99",
    yearlyPriceId: "price_basic_yearly",
    yearlyDisplay: "$95.90",
    yearlyPerMonthDisplay: "$7.99",
    features: [{ text: "Exportar a PDF", included: false, status: "coming_soon" }],
  },
  {
    id: "pro",
    tier: "pro",
    name: "Pro",
    description: "Para profesionales",
    badge: { text: "Mas popular", class: "bg-accent-600 text-white" },
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
    expect(anonymous.findAll("a").map((link) => link.attributes("href"))).toEqual([
      "/sign-in?redirect=/recipes",
      "/sign-in?redirect=/pricing",
      "/sign-in?redirect=/pricing",
    ]);

    authMock.isAuthenticated = true;
    const authenticated = await mountSuspended(LandingPricingSection, {
      props: { plans: PLANS },
    });
    expect(authenticated.findAll("a").map((link) => link.attributes("href"))).toEqual([
      "/recipes",
      "/pricing",
      "/pricing",
    ]);
  });

  it("sin planes muestra el aviso en vez de una grilla vacía", async () => {
    const wrapper = await mountSuspended(LandingPricingSection, {
      props: { plans: [] },
    });

    expect(wrapper.text()).toContain("No hay planes disponibles por ahora");
  });
});
