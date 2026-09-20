import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import {
  enableAutoUnmount,
  type DOMWrapper,
  type VueWrapper,
} from "@vue/test-utils";
import { computed, defineComponent, h } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PricingPlan } from "@recetario/types";
import LandingPricingSection from "~/components/landing/PricingSection.vue";
import BillingIntervalToggle from "~/features/billing/BillingIntervalToggle.vue";
import PlanCard from "~/features/billing/PlanCard.vue";
import PlanComparison from "~/features/billing/PlanComparison.vue";
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

/**
 * Catálogo de prueba con la forma del real (`TIER_CONFIG`): mismos slots en los
 * tres tiers, con un slot que cambia de texto, uno que cambia de estado y tres
 * iguales en los tres planes.
 */
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
    features: [
      { text: "Hasta 10 recetas", included: true },
      { text: "Costeo básico con márgenes", included: true },
      { text: "Categorías", included: true },
      { text: "Duplicar recetas", included: false },
      { text: "Exportar a PDF", included: false, status: "coming_soon" },
    ],
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
      { text: "Hasta 75 recetas", included: true },
      { text: "Costeo básico con márgenes", included: true },
      { text: "Categorías", included: true },
      { text: "Duplicar recetas", included: true },
      { text: "Exportar a PDF", included: false, status: "coming_soon" },
    ],
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
    features: [
      { text: "Recetas ilimitadas", included: true },
      { text: "Costeo básico con márgenes", included: true },
      { text: "Categorías", included: true },
      { text: "Duplicar recetas", included: true },
      { text: "Exportar a PDF", included: true, status: "coming_soon" },
    ],
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

  it("la variante compacta dice en texto cuántos destacados se recortaron", async () => {
    const wrapper = await mountSuspended(PlanFeatureList, {
      props: {
        features: [
          { text: "Recetas ilimitadas", included: true },
          { text: "Ingredientes ilimitados", included: true },
        ],
        variant: "compact",
        remaining: 2,
      },
    });

    expect(wrapper.findAll("li")).toHaveLength(2);
    expect(wrapper.find("ul").classes()).toContain("space-y-2.5");
    expect(wrapper.text()).toContain("y 2 funciones más");

    await wrapper.setProps({ remaining: 1 });
    expect(wrapper.text()).toContain("y 1 función más");

    // Sin recorte no hay nota: la lista es todo lo que hay que decir.
    await wrapper.setProps({ remaining: 0 });
    expect(wrapper.text()).not.toContain("más");
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

/** Cards de plan montadas, en el orden del DOM (el que ve el visitante). */
function planIds(wrapper: VueWrapper): (string | undefined)[] {
  return wrapper
    .findAll("[data-plan]")
    .map((card) => card.attributes("data-plan"));
}

/** Links de cada card por plan: el CTA primero, el enlace al catálogo después. */
function linksByPlan(
  wrapper: VueWrapper,
): Record<string, (string | undefined)[]> {
  return Object.fromEntries(
    wrapper.findAll("[data-plan]").map((card) => [
      card.attributes("data-plan") ?? "",
      card.findAll("a").map((link) => link.attributes("href")),
    ]),
  );
}

/** Texto de un nodo con los espacios colapsados (el `sr-only` va incluido). */
function collapsedText(element: DOMWrapper<Element>): string {
  return element.text().replace(/\s+/g, " ").trim();
}

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
    expect(linksByPlan(anonymous)).toEqual({
      pro: ["/sign-in?redirect=/pricing", "/pricing"],
      free: ["/sign-in?redirect=/recipes", "/pricing"],
      basic: ["/sign-in?redirect=/pricing", "/pricing"],
    });

    authMock.isAuthenticated = true;
    const authenticated = await mountSuspended(LandingPricingSection, {
      props: { plans: PLANS },
    });
    expect(linksByPlan(authenticated)).toEqual({
      pro: ["/pricing", "/pricing"],
      free: ["/recipes", "/pricing"],
      basic: ["/pricing", "/pricing"],
    });
  });

  it("el recomendado va primero y el catálogo completo vive en /pricing", async () => {
    const wrapper = await mountSuspended(LandingPricingSection, {
      props: { plans: PLANS },
    });

    expect(planIds(wrapper)).toEqual(["pro", "free", "basic"]);
    expect(wrapper.find('[data-plan="pro"]').classes()).toContain("plan-pro");

    // Destacados: lo incluido que no está en el plan Free, y nada más.
    const pro = wrapper.find('[data-plan="pro"]');
    expect(pro.text()).toContain("Recetas ilimitadas");
    expect(pro.text()).not.toContain("Costeo básico con márgenes");
    expect(wrapper.find('[data-plan="free"]').text()).not.toContain(
      "Duplicar recetas",
    );
    expect(wrapper.text()).not.toContain("No incluido");
    // Tres enlaces con el mismo texto: el nombre accesible dice de qué plan es.
    expect(
      wrapper
        .findAll('a[href="/pricing"]')
        .map((link) => link.attributes("aria-label")),
    ).toEqual([
      "Ver todas las funciones del plan Pro",
      "Ver todas las funciones del plan Free",
      "Ver todas las funciones del plan Basic",
    ]);
  });

  it("cuando los destacados no caben, el recorte se dice en texto", async () => {
    const generous: PricingPlan = {
      ...PLANS[2]!,
      features: Array.from({ length: 7 }, (_, index) => ({
        text: `Función ${index + 1}`,
        included: true,
      })),
    };

    const wrapper = await mountSuspended(LandingPricingSection, {
      props: { plans: [generous] },
    });

    expect(wrapper.findAll('[data-plan="pro"] li')).toHaveLength(5);
    expect(wrapper.text()).toContain("y 2 funciones más");
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

describe("PlanComparison", () => {
  it("sólo compara lo que cambia: las filas iguales no se repiten por columna", async () => {
    const wrapper = await mountSuspended(PlanComparison, {
      props: { plans: PLANS },
    });

    // Columnas = planes, en el mismo orden que las cards.
    expect(wrapper.findAll("th").map(collapsedText)).toEqual([
      "Pro",
      "Free",
      "Basic",
    ]);
    // Dos slots cambian (cantidades y duplicar); los otros tres son comunes.
    expect(wrapper.findAll("tbody tr")).toHaveLength(2);
    expect(wrapper.find("caption.sr-only").exists()).toBe(true);
  });

  it("cada celda dice el estado y el texto de su propio plan", async () => {
    const wrapper = await mountSuspended(PlanComparison, {
      props: { plans: PLANS },
    });
    const rows = wrapper.findAll("tbody tr");

    expect(rows[0]!.findAll("td").map(collapsedText)).toEqual([
      "Incluido: Recetas ilimitadas",
      "Incluido: Hasta 10 recetas",
      "Incluido: Hasta 75 recetas",
    ]);
    expect(rows[1]!.findAll("td").map(collapsedText)).toEqual([
      "Incluido: Duplicar recetas",
      "No incluido: Duplicar recetas",
      "Incluido: Duplicar recetas",
    ]);
    expect(
      wrapper
        .findAll("tbody svg")
        .every((icon) => icon.attributes("aria-hidden") === "true"),
    ).toBe(true);
  });

  it("lo igual en todos los planes se lista una sola vez", async () => {
    const wrapper = await mountSuspended(PlanComparison, {
      props: { plans: PLANS },
    });

    expect(wrapper.findAll("li").map(collapsedText)).toEqual([
      "Incluido: Costeo básico con márgenes",
      "Incluido: Categorías",
      "Próximamente: Exportar a PDF",
    ]);
  });

  it("con un solo plan no hay nada que comparar", async () => {
    const wrapper = await mountSuspended(PlanComparison, {
      props: { plans: [PLANS[0]!] },
    });

    expect(wrapper.find("section").exists()).toBe(false);
  });

  it("sin filas que mostrar no pinta un encabezado huérfano", async () => {
    const empty = PLANS.map((plan) => ({ ...plan, features: [] }));
    const wrapper = await mountSuspended(PlanComparison, { props: { plans: empty } });

    expect(wrapper.find("section").exists()).toBe(false);
  });

  it("marca la columna del plan del visitante", async () => {
    const wrapper = await mountSuspended(PlanComparison, {
      props: { plans: PLANS, currentPlanId: "free" },
    });

    const headers = wrapper.findAll("th");
    expect(headers.map(collapsedText)).toEqual([
      "Pro",
      "Free Plan actual",
      "Basic",
    ]);

    // Sin sesión no hay marca: la columna Free no dice nada.
    const anonymous = await mountSuspended(PlanComparison, {
      props: { plans: PLANS },
    });
    expect(collapsedText(anonymous.findAll("th")[1]!)).toBe("Free");
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
