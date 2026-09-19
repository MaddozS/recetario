import { expect, test } from "@nuxt/test-utils/playwright";
import { url } from "@nuxt/test-utils/e2e";
import type { APIRequestContext, Page } from "@playwright/test";

/**
 * Costos fijos de la receta y presentaciones de venta (Task 10) contra el stub
 * del API: SSR de ambas tabs, CRUD autónomo sin recargas, resumen financiero y
 * importes por pieza recalculados en sitio, semántica de `salePrice`, planes
 * con y sin `advanced_costs`, validaciones locales y errores sin CTA engañoso.
 *
 * Cada test siembra su propia receta con `__qa/recipes/reset`: los seeds por
 * defecto de la Task 9 (Tarta con 3 filas y sin costos fijos) se quedan como
 * están para no mover sus números.
 */

const SESSION_COOKIE = "better-auth.session_token=stub-session-token";
const MOBILE = { width: 375, height: 800 };
const DESKTOP = { width: 1280, height: 800 };

type Seed = Record<string, unknown>;

function recipeWith(overrides: Seed = {}): Seed {
  return {
    recipes: [
      {
        id: 1,
        name: "Tarta de Chocolate",
        category: "Postres",
        desiredMargin: 30,
        fixedCostsPercentage: 10,
        updatedAt: "2026-09-14T10:00:00.000Z",
        ingredients: [
          { ingredientId: 1, quantity: 0.5, unit: "kg" },
          { ingredientId: 2, quantity: 2, unit: "kg" },
          { ingredientId: 1, quantity: 100, unit: "g" },
        ],
        ...overrides,
      },
    ],
  };
}

const FIXED_COSTS = [
  {
    id: 11,
    name: "Luz",
    type: "AMOUNT",
    base: "PER_BATCH",
    value: 50,
  },
  {
    id: 12,
    name: "Mano de obra",
    type: "AMOUNT",
    base: "PER_HOUR",
    value: 60,
    hours: 2,
  },
  {
    id: 13,
    name: "IVA",
    type: "PERCENTAGE",
    base: "PER_BATCH",
    value: 16,
  },
];

const PRESENTATIONS = [
  {
    id: 21,
    name: "Caja de 6",
    unitsPerBatch: 6,
    salePrice: null,
    fixedCosts: [],
  },
  {
    id: 22,
    name: "Docena",
    unitsPerBatch: 12,
    salePrice: 30,
    fixedCosts: [],
  },
];

async function resetRecipes(
  request: APIRequestContext,
  seed: Seed = {},
): Promise<void> {
  const recipes = await request.post(url("/api/__qa/recipes/reset"), {
    data: seed,
  });
  expect(recipes.ok()).toBe(true);

  const ingredients = await request.post(url("/api/__qa/ingredients/reset"), {
    data: {},
  });
  expect(ingredients.ok()).toBe(true);
}

type RecipeState = {
  recipes: {
    id: number;
    recipeFixedCosts: {
      id: number;
      name: string;
      type: string;
      base: string;
      value: number;
      hours?: number | null;
    }[];
    presentations: {
      id: number;
      name: string;
      unitsPerBatch: number;
      salePrice: number | null;
    }[];
  }[];
  fixedCostAttempts: number;
  presentationAttempts: number;
  lastPresentationPatch: Record<string, unknown> | null;
};

async function readRecipeState(
  request: APIRequestContext,
): Promise<RecipeState> {
  const response = await request.get(url("/api/__qa/recipes/state"));
  return await response.json();
}

async function signIn(
  page: Page,
  plan?: "free" | "basic" | "pro",
): Promise<void> {
  const cookies = [
    {
      name: "better-auth.session_token",
      value: "stub-session-token",
      url: url("/"),
    },
  ];
  if (plan) cookies.push({ name: "qa-plan", value: plan, url: url("/") });
  await page.context().addCookies(cookies);
}

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

/** Marca viva de la página: si el documento se recarga, desaparece. */
async function markPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __qaMarker?: boolean }).__qaMarker = true;
  });
}

async function pageAlive(page: Page): Promise<boolean> {
  return await page.evaluate(
    () => (window as unknown as { __qaMarker?: boolean }).__qaMarker === true,
  );
}

function fixedCostCards(page: Page) {
  return page.locator("#panel-costos-fijos [data-fixed-cost-card]");
}

function presentationCards(page: Page) {
  return page.locator("#panel-presentaciones [data-presentation-card]");
}

function financialRow(page: Page, label: string) {
  return page.locator(`[data-financial-row='${label}']`);
}

test("SSR: costos fijos con badges, horas y resumen; presentaciones con precios", async ({
  request,
}) => {
  await resetRecipes(
    request,
    recipeWith({ recipeFixedCosts: FIXED_COSTS, presentations: PRESENTATIONS }),
  );

  const response = await request.get(url("/recipes/1"), {
    headers: { cookie: SESSION_COOKIE },
  });
  expect(response.status()).toBe(200);

  const html = (await response.text()).replace(/<!--[\s\S]*?-->/g, "");
  expect(html).toContain("Costos Fijos de la Receta");
  expect(html).toContain("Luz");
  expect(html).toContain("Monto");
  expect(html).toContain("Por Mezcla");
  expect(html).toContain("$50.00");
  expect(html).toContain("Por Hora");
  expect(html).toContain("(2h)");
  expect(html).toContain("Porcentaje");
  expect(html).toContain("16%");

  // Resumen con advanced_costs (Pro por defecto): 50 + 120 + 16 % de 33 = $175.28
  expect(html).toContain("Total Costos Fijos");
  expect(html).toContain("$175.28");
  expect(html).toContain("$208.28");

  // Presentaciones: la sin precio guardado muestra el sugerido; la otra, su precio.
  expect(html).toContain("Caja de 6");
  expect(html).toContain("Docena");
  expect(html).toContain("Presentaciones de Venta");
  expect(html).toContain("Rinde:");
});

test("SSR: estado vacío de costos fijos y de presentaciones", async ({
  request,
}) => {
  await resetRecipes(request, recipeWith());

  const response = await request.get(url("/recipes/1#costos-fijos"), {
    headers: { cookie: SESSION_COOKIE },
  });

  const html = await response.text();
  expect(html).toContain("No hay costos fijos definidos para esta receta.");
  expect(html).toContain("Aún no hay presentaciones de venta");
  expect(html).toContain("Crear presentación");
});

test("costos fijos: crear sin recarga, con resumen recalculado", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request, recipeWith());
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes/1#costos-fijos");

  await expect(page.locator("[data-recipe-fixed-costs-empty]")).toBeVisible();

  await markPage(page);

  await page.locator("[data-open-fixed-cost]").click();
  const createCard = page.locator("[data-fc-mode='create']");
  await expect(createCard).toBeVisible();
  // El estado vacío se retira mientras se captura el costo.
  await expect(page.locator("[data-recipe-fixed-costs-empty]")).toBeHidden();

  await createCard.locator("[data-fc-name-input]").fill("Renta");
  await createCard.locator("[data-fc-value-input]").fill("100");
  await createCard.locator("[data-fc-save]").click();

  await expect(page.getByText("Costo fijo creado.")).toBeVisible();
  await expect(createCard).toBeHidden();
  await expect(fixedCostCards(page)).toHaveCount(1);
  await expect(fixedCostCards(page).first()).toContainText("Renta");
  await expect(financialRow(page, "Total Costos Fijos")).toContainText(
    "$100.00",
  );
  await expect(financialRow(page, "Costo Total Receta")).toContainText(
    "$133.00",
  );

  expect(await pageAlive(page)).toBe(true);
  const state = await readRecipeState(request);
  expect(state.fixedCostAttempts).toBe(1);
  expect(state.recipes[0]?.recipeFixedCosts).toEqual([
    {
      id: 1,
      name: "Renta",
      type: "AMOUNT",
      base: "PER_BATCH",
      value: 100,
      hours: null,
    },
  ]);
  expect(consoleErrors).toEqual([]);
});

test("costos fijos: crear por hora con horas y multiplicador", async ({
  page,
  goto,
  request,
}) => {
  await resetRecipes(request, recipeWith());
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes/1?multiplier=2#costos-fijos");

  await page.locator("[data-open-fixed-cost]").click();
  const createCard = page.locator("[data-fc-mode='create']");

  await createCard.locator("[data-fc-name-input]").fill("Horno");
  await createCard.locator("[data-fc-base-select]").selectOption("PER_HOUR");
  await expect(createCard.locator("[data-fc-hours-field]")).toBeVisible();
  await createCard.locator("[data-fc-value-input]").fill("40");
  await createCard.locator("[data-fc-hours-input]").fill("3");
  await createCard.locator("[data-fc-save]").click();

  await expect(fixedCostCards(page)).toHaveCount(1);
  await expect(fixedCostCards(page).first()).toContainText("(3h)");
  // Las horas no escalan con las mezclas: 120 para cualquier multiplicador.
  await expect(financialRow(page, "Total Costos Fijos")).toContainText(
    "$120.00",
  );
});

test("costos fijos: editar cambia el tipo y el resumen; cancelar no llama al API", async ({
  page,
  goto,
  request,
}) => {
  await resetRecipes(
    request,
    recipeWith({ recipeFixedCosts: [FIXED_COSTS[0]] }),
  );
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes/1#costos-fijos");

  const card = fixedCostCards(page).first();
  await card.locator("button[aria-label='Editar costo fijo']").click();
  await card.locator("[data-fc-value-input]").fill("999");
  await card.locator("[data-fc-cancel]").click();

  // Cancelar revierte y no toca el API.
  await expect(card).toContainText("$50.00");
  expect((await readRecipeState(request)).fixedCostAttempts).toBe(0);

  await markPage(page);
  await card.locator("button[aria-label='Editar costo fijo']").click();
  await card.locator("[data-fc-type-select]").selectOption("PERCENTAGE");
  await card.locator("[data-fc-value-input]").fill("10");
  await card.locator("[data-fc-save]").click();

  await expect(page.getByText("Costo fijo guardado.")).toBeVisible();
  await expect(card).toContainText("Porcentaje");
  await expect(card).toContainText("10%");
  // 10 % de $33 de costo directo.
  await expect(financialRow(page, "Total Costos Fijos")).toContainText("$3.30");
  await expect(financialRow(page, "Costo Total Receta")).toContainText(
    "$36.30",
  );

  expect(await pageAlive(page)).toBe(true);
  const state = await readRecipeState(request);
  expect(state.fixedCostAttempts).toBe(1);
  expect(state.recipes[0]?.recipeFixedCosts[0]).toMatchObject({
    type: "PERCENTAGE",
    value: 10,
  });
});

test("costos fijos: eliminar con confirmación y resumen actualizado", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(
    request,
    recipeWith({ recipeFixedCosts: [FIXED_COSTS[0], FIXED_COSTS[1]] }),
  );
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes/1#costos-fijos");

  await expect(fixedCostCards(page)).toHaveCount(2);
  await markPage(page);

  const card = fixedCostCards(page).first();
  await card.locator("button[aria-label='Editar costo fijo']").click();
  await card.locator("[data-fc-delete]").click();

  const dialog = card.locator("dialog");
  await expect(dialog).toContainText("¿Eliminar este costo fijo?");
  await dialog.locator("[data-fc-confirm-delete]").click();

  await expect(page.getByText("Costo fijo eliminado.")).toBeVisible();
  await expect(fixedCostCards(page)).toHaveCount(1);
  await expect(fixedCostCards(page).first()).toContainText("Mano de obra");
  // 2 h × $60 = $120 (las horas no escalan con las mezclas).
  await expect(financialRow(page, "Total Costos Fijos")).toContainText(
    "$120.00",
  );

  expect(await pageAlive(page)).toBe(true);
  expect(consoleErrors).toEqual([]);
});

test("costos fijos: validación local sin peticiones y error del API sin upgrade", async ({
  page,
  goto,
  request,
}) => {
  await resetRecipes(request, recipeWith());
  await signIn(page, "free");
  await page.setViewportSize(DESKTOP);
  await goto("/recipes/1#costos-fijos");

  await page.locator("[data-open-fixed-cost]").click();
  const createCard = page.locator("[data-fc-mode='create']");
  await createCard.locator("[data-fc-value-input]").fill("0");
  await createCard.locator("[data-fc-save]").click();

  await expect(createCard.locator("[data-fc-error]")).toHaveText(
    "El valor debe ser un número mayor a 0.",
  );
  expect((await readRecipeState(request)).fixedCostAttempts).toBe(0);

  // Sentinela del API: error genérico, sin CTA de plan.
  await createCard.locator("[data-fc-value-input]").fill("10");
  await createCard.locator("[data-fc-name-input]").fill("Fallo simulado");
  await createCard.locator("[data-fc-save]").click();

  await expect(createCard.locator("[data-fc-error]")).toHaveText(
    "Fallo simulado del servidor",
  );
  await expect(createCard.locator("[data-fc-name-input]")).toHaveValue(
    "Fallo simulado",
  );
  await expect(page.getByRole("link", { name: "Actualizar plan" })).toHaveCount(
    0,
  );
});

test("costos fijos: el plan Free también opera y ve las filas operativas", async ({
  page,
  goto,
  request,
}) => {
  await resetRecipes(
    request,
    recipeWith({ recipeFixedCosts: [FIXED_COSTS[0]] }),
  );
  await signIn(page, "free");
  await page.setViewportSize(DESKTOP);
  await goto("/recipes/1#costos-fijos");

  // Sin advanced_costs el resumen usa el % operativo, pero el CRUD sigue vivo.
  await expect(financialRow(page, "Gastos Operativos")).toContainText("10%");
  await expect(financialRow(page, "Costo Total Real")).toContainText("$36.30");
  await expect(
    page.locator("[data-financial-row='Total Costos Fijos']"),
  ).toHaveCount(0);
  await expect(fixedCostCards(page)).toHaveCount(1);

  await page.locator("[data-open-fixed-cost]").click();
  const createCard = page.locator("[data-fc-mode='create']");
  await createCard.locator("[data-fc-name-input]").fill("Renta");
  await createCard.locator("[data-fc-value-input]").fill("25");
  await createCard.locator("[data-fc-save]").click();

  await expect(fixedCostCards(page)).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Actualizar plan" })).toHaveCount(
    0,
  );
});

test("presentaciones: crear desde el estado vacío y ver los importes", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request, recipeWith());
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes/1#presentaciones");

  await expect(page.locator("[data-presentations-empty]")).toBeVisible();
  await markPage(page);

  await page
    .locator("[data-presentations-empty]")
    .getByRole("button", { name: "Crear presentación" })
    .click();

  const dialog = page.locator("#create-presentation-dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("#create-presentation-name").fill("Caja de 6");
  await dialog.locator("#create-presentation-units").fill("6");
  await dialog.locator("[data-presentation-create-submit]").click();

  await expect(
    page.getByText("Presentación creada correctamente."),
  ).toBeVisible();
  await expect(page.locator("[data-presentations-empty]")).toBeHidden();
  await expect(presentationCards(page)).toHaveCount(1);

  const card = presentationCards(page).first();
  await expect(card.locator(".presentation-name")).toHaveValue("Caja de 6");
  // $33 de mezcla / 6 piezas = $5.50 de costo; 30 % de margen → $7.86 sugerido.
  await expect(card.locator("[data-unit-cost]")).toHaveText("$5.50");
  await expect(card.locator("[data-recommended-price]")).toHaveText("$7.86");
  // El precio sembrado es el sugerido redondeado: el margen ronda el 30 %.
  await expect(card.locator("[data-margin-label]")).toHaveText("Medio");
  await expect(card).toHaveAttribute("data-margin-tone", "warning");

  expect(await pageAlive(page)).toBe(true);
  const state = await readRecipeState(request);
  expect(state.presentationAttempts).toBe(1);
  expect(state.recipes[0]?.presentations).toEqual([
    {
      id: 1,
      name: "Caja de 6",
      unitsPerBatch: 6,
      salePrice: null,
      fixedCosts: [],
    },
  ]);
  expect(consoleErrors).toEqual([]);
});

test("presentaciones: editar sin tocar el precio omite salePrice; vaciarlo lo limpia", async ({
  page,
  goto,
  request,
}) => {
  await resetRecipes(
    request,
    recipeWith({ presentations: [PRESENTATIONS[1]] }),
  );
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes/1#presentaciones");

  const card = presentationCards(page).first();
  await card.locator("[data-presentation-edit]").click();
  await card.locator(".presentation-name").fill("Docena grande");
  await card.locator("[data-presentation-save]").click();

  await expect(
    page.getByText("Presentación guardada correctamente."),
  ).toBeVisible();
  await expect(card.locator(".presentation-name")).toHaveValue("Docena grande");
  // El usuario no tocó el precio: la clave no viaja y el guardado se conserva.
  let state = await readRecipeState(request);
  expect(state.lastPresentationPatch).toEqual({
    name: "Docena grande",
    unitsPerBatch: 12,
  });
  expect(state.recipes[0]?.presentations[0]?.salePrice).toBe(30);

  // Vaciarlo sí limpia el precio guardado.
  await card.locator("[data-presentation-edit]").click();
  await card.locator(".presentation-price").fill("");
  await card.locator("[data-presentation-save]").click();

  await expect(card).toHaveAttribute("data-price", "");
  state = await readRecipeState(request);
  expect(state.lastPresentationPatch).toEqual({
    name: "Docena grande",
    unitsPerBatch: 12,
    salePrice: null,
  });
  expect(state.recipes[0]?.presentations[0]?.salePrice).toBeNull();
});

test("presentaciones: margen, multiplicador y precio editable en sitio", async ({
  page,
  goto,
  request,
}) => {
  await resetRecipes(
    request,
    recipeWith({ presentations: [PRESENTATIONS[0]] }),
  );
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes/1?multiplier=2#presentaciones");

  const card = presentationCards(page).first();
  // 2 mezclas → 12 piezas de $66 → $5.50; sugerido con 30 % de margen.
  await expect(card).toContainText("Con x2:");
  await expect(card.locator("[data-yield]")).toHaveText("12");
  await expect(card.locator("[data-unit-cost]")).toHaveText("$5.50");

  await card.locator("[data-presentation-edit]").click();
  await card.locator(".presentation-price").fill("4");
  // $4 de precio contra $5.50 de costo → margen negativo y barra en 0.
  await expect(card.locator("[data-margin-label]")).toHaveText("Bajo");
  await expect(card).toHaveAttribute("data-margin-tone", "danger");

  await card.locator(".presentation-price").fill("11");
  await expect(card.locator("[data-margin-label]")).toHaveText("Saludable");
  await expect(card.locator("[data-margin-percent]")).toHaveText("50.0%");

  await card.locator("[data-presentation-save]").click();
  await expect(card).toHaveAttribute("data-price", "11");
});

test("presentaciones: eliminar con confirmación, sin recarga", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request, recipeWith({ presentations: PRESENTATIONS }));
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes/1#presentaciones");

  await expect(presentationCards(page)).toHaveCount(2);
  await markPage(page);

  const card = presentationCards(page).first();
  await card.locator("[data-presentation-edit]").click();
  await card.locator("[data-presentation-delete]").click();

  const dialog = card.locator("dialog");
  await expect(dialog).toContainText("¿Eliminar esta presentación?");
  await dialog.locator("[data-presentation-confirm-delete]").click();

  await expect(
    page.getByText("Presentación eliminada correctamente."),
  ).toBeVisible();
  await expect(presentationCards(page)).toHaveCount(1);
  await expect(
    presentationCards(page).first().locator(".presentation-name"),
  ).toHaveValue("Docena");

  expect(await pageAlive(page)).toBe(true);
  expect(consoleErrors).toEqual([]);
});

test("presentaciones: validación local y error del API sin CTA", async ({
  page,
  goto,
  request,
}) => {
  await resetRecipes(request, recipeWith());
  await signIn(page, "free");
  await page.setViewportSize(DESKTOP);
  await goto("/recipes/1#presentaciones");

  await page.locator("[data-open-presentation]").click();
  const dialog = page.locator("#create-presentation-dialog");

  // Sin nombre ni piezas el alta queda deshabilitada.
  await expect(
    dialog.locator("[data-presentation-create-submit]"),
  ).toBeDisabled();

  await dialog.locator("#create-presentation-name").fill("Caja de 6");
  await dialog.locator("#create-presentation-units").fill("0");
  await expect(
    dialog.locator("[data-presentation-create-submit]"),
  ).toBeDisabled();

  await dialog.locator("#create-presentation-units").fill("6");
  await dialog.locator("#create-presentation-price").fill("-1");
  await expect(
    dialog.locator("[data-presentation-create-submit]"),
  ).toBeDisabled();
  expect((await readRecipeState(request)).presentationAttempts).toBe(0);

  // Sentinela del API: el error se muestra dentro del dialog y no cierra.
  await dialog.locator("#create-presentation-price").fill("12");
  await dialog.locator("#create-presentation-name").fill("Fallo simulado");
  await dialog.locator("[data-presentation-create-submit]").click();

  await expect(dialog.locator("[data-presentation-create-error]")).toHaveText(
    "Fallo simulado del servidor",
  );
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("link", { name: "Actualizar plan" })).toHaveCount(
    0,
  );
});

test("responsive: cards de presentación y costos fijos en 375 y 1280", async ({
  page,
  goto,
  request,
}) => {
  await resetRecipes(
    request,
    recipeWith({
      recipeFixedCosts: [FIXED_COSTS[0]],
      presentations: PRESENTATIONS,
    }),
  );
  await signIn(page);
  await page.setViewportSize(MOBILE);
  await goto("/recipes/1#presentaciones");

  const firstCard = presentationCards(page).first();
  const cards = presentationCards(page);

  /** Separación vertical entre la primera y la segunda card. */
  async function verticalGap(): Promise<number> {
    const [first, second] = await Promise.all([
      cards.nth(0).boundingBox(),
      cards.nth(1).boundingBox(),
    ]);
    return (second?.y ?? 0) - (first?.y ?? 0);
  }

  // En móvil las cards van en una columna: la segunda empieza más abajo.
  await expect.poll(verticalGap).toBeGreaterThan(50);
  await expect(firstCard.locator("[data-unit-cost]")).toBeVisible();
  await expect(firstCard.locator("[data-margin-label]")).toBeVisible();
  await expect(firstCard.locator(".presentation-price")).toBeVisible();

  await page.setViewportSize(DESKTOP);

  // En escritorio van en dos columnas: misma fila, distinta x.
  await expect.poll(verticalGap).toBeLessThan(5);
  const [desktopFirst, desktopSecond] = await Promise.all([
    cards.nth(0).boundingBox(),
    cards.nth(1).boundingBox(),
  ]);
  expect(desktopSecond!.x).toBeGreaterThan(desktopFirst!.x);

  await page.locator("#tab-costos-fijos").click();
  await expect(fixedCostCards(page)).toHaveCount(1);
  await expect(
    fixedCostCards(page).first().locator("[data-fc-display-value]"),
  ).toBeVisible();
});
