import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { enableAutoUnmount, flushPromises } from "@vue/test-utils";
import { computed, defineComponent, h } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useProductionPlanner } from "~/features/production/useProductionPlanner";
import type {
  ProductionCatalogRecipe,
  ProductionRecipeRecord,
} from "~/features/production/production-types";
import { ApiError } from "~/utils/api-error";

/**
 * Composable del planificador: parseo de la query, tope del plan, escrituras
 * con `replace`, gate por feature, detalle bajo demanda y errores. La API, la
 * ruta y la navegación se mockean; el cálculo y los módulos puros ya están
 * cubiertos en `test/unit`.
 *
 * `enableAutoUnmount` es obligatorio aquí: `useAsyncData` guarda el handler y
 * los datos por clave en el payload del app de test, así que sin desmontar
 * entre tests el segundo montaje reutilizaría el closure del primero
 * (`purgeCachedData` limpia la entrada al desmontar).
 */
enableAutoUnmount(afterEach);

const state = vi.hoisted(() => ({
  request: vi.fn(),
  query: {} as Record<string, unknown>,
  routes: [] as { query: Record<string, unknown> }[],
  navigate: vi.fn(),
  byIdsCalls: [] as number[][],
  lastNavigate: null as unknown as {
    to: { path?: string; query?: Record<string, unknown> };
    options?: unknown;
  } | null,
  hasFeature: true,
  tier: "pro",
  emptyFirstByIds: false,
}));

mockNuxtImport("useApi", () => () => state.request);

mockNuxtImport("useAuth", () => () => ({
  isAuthenticated: computed(() => true),
  subscription: computed(() => ({ tier: state.tier, features: {} })),
  hasFeature: () => state.hasFeature,
}));

mockNuxtImport("useRoute", async () => {
  // El import dinámico evita el binding hoisteado del factory (Vitest lo iza
  // por encima de los imports del spec).
  const { reactive } = await import("vue");
  return () => {
    // Cada montaje recibe su propia copia reactiva de la query: las instancias
    // que deja atrás `mountSuspended` no reaccionan a la query del test actual
    // ni vuelven a pedir detalles.
    const route = reactive({ query: { ...state.query } });
    state.routes.push(route);
    return route;
  };
});

mockNuxtImport("navigateTo", () => state.navigate);

function setQuery(query: Record<string, unknown>): void {
  state.query = { ...query };
  const route = state.routes.at(-1);
  if (!route) return;

  for (const key of Object.keys(route.query)) delete route.query[key];
  Object.assign(route.query, query);
}

const CATALOG: ProductionCatalogRecipe[] = [
  {
    id: 1,
    name: "Tarta de Chocolate",
    category: "Postres",
    ingredientCount: 1,
  },
  { id: 2, name: "Pan de Masa Madre", category: "Panes", ingredientCount: 1 },
  { id: 3, name: "Flan de Café", category: "Postres", ingredientCount: 1 },
  { id: 4, name: "Brownie Clásico", ingredientCount: 0 },
];

function detail(
  id: number,
  name: string,
  overrides: Partial<ProductionRecipeRecord> = {},
): ProductionRecipeRecord {
  return {
    id,
    name,
    desiredMargin: 0,
    fixedCostsPercentage: 0,
    ingredients: [
      {
        ingredientId: 1,
        quantity: 1,
        unit: "kg",
        ingredient: {
          id: 1,
          name: "Harina de trigo",
          unit: "kg",
          price: 25,
          purchaseQuantity: 1,
        },
      },
    ],
    presentations: [],
    recipeFixedCosts: [],
    ...overrides,
  };
}

const DETAILS = [
  detail(1, "Tarta de Chocolate"),
  detail(2, "Pan de Masa Madre"),
  detail(3, "Flan de Café"),
  detail(4, "Brownie Clásico"),
];

function requestedIds(path: string): number[] {
  const search = path.split("?")[1] ?? "";
  const value = new URLSearchParams(search).get("ids") ?? "";
  return value
    .split(",")
    .map(Number)
    .filter((id) => Number.isInteger(id));
}

const Harness = defineComponent({
  async setup() {
    const planner = await useProductionPlanner();

    return () =>
      h("div", [
        h(
          "span",
          { "data-h": "count" },
          String(planner.selections.value.length),
        ),
        h(
          "span",
          { "data-h": "ids" },
          planner.selections.value.map((item) => item.recipeId).join(","),
        ),
        h(
          "span",
          { "data-h": "batches" },
          planner.selections.value.map((item) => item.batches).join(","),
        ),
        h("span", { "data-h": "atLimit" }, String(planner.atLimit.value)),
        h("span", { "data-h": "max" }, String(planner.maxRecipes.value)),
        h(
          "span",
          { "data-h": "banner" },
          String(!planner.isPro.value && planner.atLimit.value),
        ),
        h("span", { "data-h": "gated" }, String(planner.gated.value)),
        h("span", { "data-h": "failed" }, String(planner.loadFailed.value)),
        h(
          "span",
          { "data-h": "pending" },
          String(planner.resultsPending.value),
        ),
        h(
          "span",
          { "data-h": "perRecipe" },
          planner.results.value.summary.perRecipe
            .map((recipe) => recipe.recipeName)
            .join(","),
        ),
        h(
          "span",
          { "data-h": "totalCost" },
          String(planner.results.value.summary.totalProductionCost),
        ),
        h("span", { "data-h": "label" }, planner.selectionLabel.value),
        h("span", { "data-h": "stage" }, planner.stage.value),
        h("span", { "data-h": "visible" }, String(planner.visibleCount.value)),
        h("button", {
          "data-h": "toggle-3",
          onClick: () => void planner.toggle(3),
        }),
        h("button", {
          "data-h": "toggle-4",
          onClick: () => void planner.toggle(4),
        }),
        h("button", {
          "data-h": "toggle-all",
          onClick: () => void planner.toggleAll(true),
        }),
        h("button", {
          "data-h": "step-1",
          onClick: () => void planner.stepBatchesFor(1, 1),
        }),
        h("button", {
          "data-h": "batches-1",
          onClick: () => void planner.updateBatches(1, "2.5"),
        }),
        h("button", {
          "data-h": "presentation-2",
          onClick: () => void planner.updatePresentation(2, 9),
        }),
        h("button", {
          "data-h": "calculate",
          onClick: () => planner.showResults(),
        }),
        h("button", {
          "data-h": "edit",
          onClick: () => planner.editSelection(),
        }),
      ]);
  },
});

type HarnessWrapper = Awaited<ReturnType<typeof mountHarness>>;

function harnessText(wrapper: HarnessWrapper, hook: string): string {
  return wrapper.find(`[data-h="${hook}"]`).text();
}

async function mountHarness(options: { emptyFirstByIds?: boolean } = {}) {
  if (options.emptyFirstByIds) {
    state.emptyFirstByIds = true;
  }
  return mountSuspended(Harness);
}

describe("useProductionPlanner", () => {
  beforeEach(() => {
    setQuery({});
    state.routes = [];
    state.hasFeature = true;
    state.tier = "pro";
    state.byIdsCalls = [];
    state.lastNavigate = null;
    state.emptyFirstByIds = false;
    state.request.mockReset();
    state.navigate.mockReset();
    state.navigate.mockImplementation(
      async (to: { query?: Record<string, unknown> }, options?: unknown) => {
        state.lastNavigate = { to, options };
        if (to?.query) setQuery(to.query);
      },
    );
    state.request.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/recipes/by-ids")) {
        const ids = requestedIds(path);
        state.byIdsCalls.push(ids);
        if (state.emptyFirstByIds && state.byIdsCalls.length === 1) return [];
        return DETAILS.filter((recipe) => ids.includes(recipe.id));
      }
      if (path === "/api/recipes") return CATALOG;
      throw new Error(`ruta inesperada: ${path}`);
    });
  });

  it("carga el catálogo y el detalle de la selección de la query", async () => {
    setQuery({ recipes: "1,2", batches: "2,1" });

    const wrapper = await mountHarness();

    expect(harnessText(wrapper, "count")).toBe("2");
    expect(harnessText(wrapper, "ids")).toBe("1,2");
    expect(harnessText(wrapper, "batches")).toBe("2,1");
    expect(harnessText(wrapper, "perRecipe")).toBe(
      "Tarta de Chocolate,Pan de Masa Madre",
    );
    // 2 mezclas de la Tarta ($50) + 1 del Pan ($25).
    expect(harnessText(wrapper, "totalCost")).toBe("75");
    expect(harnessText(wrapper, "stage")).toBe("results");
    expect(harnessText(wrapper, "label")).toBe("2 recetas · 3 mezclas");
    expect(state.byIdsCalls).toEqual([[1, 2]]);
  });

  it("no consulta la API sin la feature del plan", async () => {
    state.hasFeature = false;

    const wrapper = await mountHarness();

    expect(harnessText(wrapper, "gated")).toBe("true");
    expect(state.request).not.toHaveBeenCalled();
  });

  it("trata el FEATURE_REQUIRED del API como gate", async () => {
    state.request.mockImplementation(async (path: string) => {
      if (path === "/api/recipes") {
        throw new ApiError("FEATURE_REQUIRED", "no disponible");
      }
      throw new Error(`ruta inesperada: ${path}`);
    });

    const wrapper = await mountHarness();

    expect(harnessText(wrapper, "gated")).toBe("true");
    expect(harnessText(wrapper, "failed")).toBe("false");
  });

  it("marca fallo de carga ante un error genérico", async () => {
    state.request.mockImplementation(async () => {
      throw new Error("boom");
    });

    const wrapper = await mountHarness();

    expect(harnessText(wrapper, "failed")).toBe("true");
    expect(harnessText(wrapper, "gated")).toBe("false");
  });

  it("recorta al tope de Basic y expone el banner", async () => {
    state.tier = "basic";
    setQuery({ recipes: "1,2,3,4" });

    const wrapper = await mountHarness();

    expect(harnessText(wrapper, "count")).toBe("3");
    expect(harnessText(wrapper, "ids")).toBe("1,2,3");
    expect(harnessText(wrapper, "max")).toBe("3");
    expect(harnessText(wrapper, "atLimit")).toBe("true");
    expect(harnessText(wrapper, "banner")).toBe("true");
    // El SSR sólo pide lo que el plan permite.
    expect(state.byIdsCalls).toEqual([[1, 2, 3]]);
  });

  it("deja pasar la selección completa con Pro", async () => {
    setQuery({ recipes: "1,2,3,4" });

    const wrapper = await mountHarness();

    expect(harnessText(wrapper, "count")).toBe("4");
    expect(harnessText(wrapper, "banner")).toBe("false");
  });

  it("escribe la query con replace al alternar una receta", async () => {
    setQuery({ recipes: "1", batches: "2" });

    const wrapper = await mountHarness();
    await wrapper.find("[data-h='toggle-3']").trigger("click");

    expect(state.lastNavigate).toEqual({
      to: { path: "/produccion", query: { recipes: "1,3", batches: "2,1" } },
      options: { replace: true },
    });
    expect(harnessText(wrapper, "count")).toBe("2");
    expect(harnessText(wrapper, "ids")).toBe("1,3");
  });

  it("no agrega recetas por encima del tope de Basic", async () => {
    state.tier = "basic";
    setQuery({ recipes: "1,2,3" });

    const wrapper = await mountHarness();
    await wrapper.find("[data-h='toggle-4']").trigger("click");

    expect(state.navigate).not.toHaveBeenCalled();
    expect(harnessText(wrapper, "count")).toBe("3");
  });

  it("quita una receta seleccionada aunque el plan esté en el tope", async () => {
    state.tier = "basic";
    setQuery({ recipes: "1,2,3" });

    const wrapper = await mountHarness();
    await wrapper.find("[data-h='toggle-3']").trigger("click");

    expect(harnessText(wrapper, "ids")).toBe("1,2");
  });

  it("avanza las mezclas de a 0.5 y normaliza el valor manual", async () => {
    setQuery({ recipes: "1" });
    const wrapper = await mountHarness();

    await wrapper.find("[data-h='step-1']").trigger("click");
    expect(state.lastNavigate?.to.query).toEqual({
      recipes: "1",
      batches: "1.5",
    });

    await wrapper.find("[data-h='batches-1']").trigger("click");
    expect(state.lastNavigate?.to.query).toEqual({
      recipes: "1",
      batches: "2.5",
    });
  });

  it("guarda la presentación elegida y la serializa alineada", async () => {
    setQuery({ recipes: "1,2", presentations: "0,5" });
    const wrapper = await mountHarness();

    await wrapper.find("[data-h='presentation-2']").trigger("click");
    expect(state.lastNavigate?.to.query).toEqual({
      recipes: "1,2",
      batches: "1,1",
      presentations: "0,9",
    });
  });

  it("selecciona todo respetando el tope del plan", async () => {
    state.tier = "basic";
    const wrapper = await mountHarness();

    await wrapper.find("[data-h='toggle-all']").trigger("click");
    expect(state.lastNavigate?.to.query).toEqual({
      recipes: "1,2,3",
      batches: "1,1,1",
    });
  });

  it("cambia de stage entre selección y resultados", async () => {
    setQuery({ recipes: "1" });
    const wrapper = await mountHarness();

    expect(harnessText(wrapper, "stage")).toBe("results");
    await wrapper.find("[data-h='edit']").trigger("click");
    expect(harnessText(wrapper, "stage")).toBe("select");
    await wrapper.find("[data-h='calculate']").trigger("click");
    expect(harnessText(wrapper, "stage")).toBe("results");
  });

  it("pide el detalle que falta y sale del estado pendiente", async () => {
    // Hidratación sin detalle (carrera con un borrado): el SSR no trajo la
    // receta 3 y el cliente la vuelve a pedir una vez.
    setQuery({ recipes: "3" });
    const wrapper = await mountHarness({ emptyFirstByIds: true });
    await flushPromises();

    expect(harnessText(wrapper, "pending")).toBe("false");
    expect(harnessText(wrapper, "perRecipe")).toBe("Flan de Café");
    expect(state.byIdsCalls).toEqual([[3], [3]]);
  });
});
