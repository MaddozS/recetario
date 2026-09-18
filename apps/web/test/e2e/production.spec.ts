import { expect, test } from "@nuxt/test-utils/playwright";
import { url } from "@nuxt/test-utils/e2e";
import type { APIRequestContext, Page } from "@playwright/test";

/**
 * Planificador de producción contra el stub del API: gate de Free, tope de
 * Basic, deep links con mezclas y presentaciones, selección interactiva sin
 * recarga, búsqueda que no oculta lo seleccionado, back/forward, impresión y
 * paridad de información en móvil.
 *
 * El fixture siembra cuatro recetas (2 categorías + sin categoría): la Tarta
 * con presentaciones (Entera $12×8, Porción $5×24) y el Pan sin ellas; los
 * precios de ingredientes son los del stub (harina $25/kg, plátano $9/kg).
 */

const SESSION_COOKIE = "better-auth.session_token=stub-session-token";
const MOBILE = { width: 375, height: 800 };
const DESKTOP = { width: 1280, height: 800 };

const PRODUCTION_RECIPES = [
  {
    id: 1,
    name: "Tarta de Chocolate",
    category: "Postres",
    desiredMargin: 30,
    fixedCostsPercentage: 10,
    recipeFixedCosts: [],
    updatedAt: "2026-09-14T10:00:00.000Z",
    ingredients: [{ ingredientId: 1, quantity: 1, unit: "kg" }],
    presentations: [
      {
        id: 10,
        name: "Entera",
        unitsPerBatch: 8,
        salePrice: 12,
        fixedCosts: [],
      },
      {
        id: 11,
        name: "Porción",
        unitsPerBatch: 24,
        salePrice: 5,
        fixedCosts: [],
      },
    ],
  },
  {
    id: 2,
    name: "Pan de Masa Madre",
    category: "Panes",
    desiredMargin: 25,
    fixedCostsPercentage: 0,
    recipeFixedCosts: [],
    updatedAt: "2026-09-13T10:00:00.000Z",
    ingredients: [{ ingredientId: 1, quantity: 0.5, unit: "kg" }],
    presentations: [],
  },
  {
    id: 3,
    name: "Flan de Café",
    category: "Postres",
    desiredMargin: 0,
    fixedCostsPercentage: 0,
    recipeFixedCosts: [],
    updatedAt: "2026-09-12T10:00:00.000Z",
    ingredients: [],
    presentations: [],
  },
  {
    id: 4,
    name: "Brownie Clásico",
    desiredMargin: 0,
    fixedCostsPercentage: 0,
    recipeFixedCosts: [],
    updatedAt: "2026-09-11T10:00:00.000Z",
    ingredients: [],
    presentations: [],
  },
];

async function resetProduction(request: APIRequestContext): Promise<void> {
  const recipes = await request.post(url("/api/__qa/recipes/reset"), {
    data: { recipes: PRODUCTION_RECIPES },
  });
  expect(recipes.ok()).toBe(true);

  const ingredients = await request.post(url("/api/__qa/ingredients/reset"), {
    data: {},
  });
  expect(ingredients.ok()).toBe(true);
}

async function readRecipesState(
  request: APIRequestContext,
): Promise<{ byIdsAttempts: number }> {
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

function row(page: Page, name: string) {
  return page.locator("[data-recipe-row]", { hasText: name });
}

test("Free: gate con UpgradePrompt, sin pedir el detalle y sin caché compartida", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetProduction(request);
  await signIn(page, "free");
  await page.setViewportSize(DESKTOP);
  await goto("/produccion");

  await expect(page.getByText("Funcion no disponible")).toBeVisible();
  await expect(
    page.getByText("Planifica hasta 3 recetas simultáneas", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Suscribirse a Basic/ }),
  ).toHaveAttribute("href", "/pricing?plan=basic");
  // El catálogo tampoco se pide: el gate corta antes.
  await expect(page.locator("[data-recipe-row]")).toHaveCount(0);

  const state = await readRecipesState(request);
  expect(state.byIdsAttempts).toBe(0);

  const response = await request.get(url("/produccion"), {
    headers: { cookie: `${SESSION_COOKIE}; qa-plan=free` },
  });
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");

  expect(consoleErrors).toEqual([]);
});

test("Basic: deep link con 4 recetas se recorta a 3 y muestra el banner al editar", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetProduction(request);
  await signIn(page, "basic");
  await page.setViewportSize(DESKTOP);
  await goto("/produccion?recipes=1,2,3,4&batches=2,1,1,1");

  // El deep link arranca en resultados con la selección recortada.
  await expect(page.locator("[data-stage='results']")).toBeVisible();
  await expect(page.locator("[data-results-count]")).toHaveText(
    "3 recetas · 4 mezclas",
  );
  // Tarta: 2 mezclas ($50.00) + Pan ($12.50) + Flan ($0.00).
  await expect(
    page.locator("[data-financial-row='Costo Insumos']"),
  ).toContainText("$62.50");

  await page.getByRole("button", { name: "Editar selección" }).click();
  await expect(page.locator("[data-selected-count]")).toHaveText("3");
  await expect(page.locator("[data-upgrade-banner]")).toBeVisible();
  await expect(
    page.getByText("Límite de 3 recetas alcanzado en plan Basic."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: /Actualizar a Pro para planificar recetas ilimitadas/,
    }),
  ).toHaveAttribute("href", "/pricing");
  // La cuarta receta queda fuera de alcance.
  await expect(
    row(page, "Brownie Clásico").locator("input[type='checkbox']"),
  ).toBeDisabled();

  expect(consoleErrors).toEqual([]);
});

test("Pro: selección, cálculo sin recarga, mezclas y presentación", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetProduction(request);
  await signIn(page, "pro");
  await page.setViewportSize(DESKTOP);
  await goto("/produccion");

  // Marcador de página: una recarga completa lo borraría.
  await page.evaluate(() => {
    (window as unknown as { __qaMarker?: boolean }).__qaMarker = true;
  });

  await row(page, "Tarta de Chocolate")
    .locator("input[type='checkbox']")
    .check();
  await row(page, "Pan de Masa Madre")
    .locator("input[type='checkbox']")
    .check();
  await expect(page).toHaveURL(/recipes=1(,|%2C)2/);
  await expect(page.locator("[data-selected-count]")).toHaveText("2");

  // Mezclas con el stepper y cambio manual.
  await row(page, "Tarta de Chocolate")
    .locator("[data-batch-step='0.5']")
    .click();
  await expect(page).toHaveURL(/batches=1\.5(,|%2C)1/);
  await row(page, "Tarta de Chocolate")
    .locator("[data-batch-step='0.5']")
    .click();
  await expect(page).toHaveURL(/batches=2(,|%2C)1/);
  await row(page, "Pan de Masa Madre").locator("[data-batches]").fill("1.5");
  await row(page, "Pan de Masa Madre").locator("[data-batches]").blur();
  await expect(page).toHaveURL(/batches=2(,|%2C)1\.5/);

  // Presentación explícita de la Tarta.
  const presentation = row(page, "Tarta de Chocolate").locator(
    "[data-presentation-select]",
  );
  await expect(presentation).toBeVisible();
  await presentation.selectOption("10");
  await expect(page).toHaveURL(/presentations=10(,|%2C)0/);

  await page.getByRole("button", { name: "Calcular producción" }).click();
  await expect(page.locator("[data-results-count]")).toHaveText(
    "2 recetas · 3.5 mezclas",
  );
  // Tarta 2 mezclas ($50.00) + Pan 1.5 ($18.75) = $68.75 de insumos.
  await expect(
    page.locator("[data-financial-row='Costo Insumos']"),
  ).toContainText("$68.75");
  await expect(
    page.locator("[data-financial-row='Ingresos Proyectados']"),
  ).toContainText("$192.00");
  // El desglose arranca colapsado: se abre para ver las presentaciones.
  const breakdown = page.locator("[data-recipe-breakdown='1']");
  await breakdown.locator("summary").click();
  const entera = breakdown.locator("[data-presentation-row]", {
    hasText: "Entera",
  });
  await expect(entera).toBeVisible();
  await expect(entera).toContainText("Seleccionada");
  await expect(
    breakdown.locator("[data-presentation-row]", { hasText: "Porción" }),
  ).toContainText("Más rentable");

  expect(
    await page.evaluate(
      () => (window as unknown as { __qaMarker?: boolean }).__qaMarker === true,
    ),
  ).toBe(true);

  // Volver a la selección no pierde lo marcado.
  await page.getByRole("button", { name: "Editar selección" }).click();
  await expect(page.locator("[data-selected-count]")).toHaveText("2");
  expect(consoleErrors).toEqual([]);
});

test("deep link y back/forward conservan el plan", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetProduction(request);
  await signIn(page, "pro");
  await page.setViewportSize(DESKTOP);
  await goto("/recipes");
  await goto("/produccion?recipes=1,2&batches=1,1");

  await expect(page.locator("[data-stage='results']")).toBeVisible();
  await expect(page.locator("[data-results-count]")).toHaveText(
    "2 recetas · 2 mezclas",
  );
  await expect(page.locator(".ingredients-table")).toContainText("1.50 kg");

  await goto("/recipes");
  await page.goBack();
  await expect(page).toHaveURL(/recipes=1(,|%2C)2/);
  await expect(page.locator("[data-results-count]")).toHaveText(
    "2 recetas · 2 mezclas",
  );
  await expect(page.locator(".ingredients-table")).toContainText(
    "Harina de trigo",
  );

  expect(consoleErrors).toEqual([]);
});

test("búsqueda accent-insensitive que no oculta lo seleccionado", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetProduction(request);
  await signIn(page, "pro");
  await page.setViewportSize(DESKTOP);
  await goto("/produccion");

  const search = page.locator("#recipe-search");
  await search.fill("cafe");
  await expect(page.locator("[data-recipe-row]")).toHaveCount(1);
  await expect(page.getByText("Flan de Café")).toBeVisible();

  await search.fill("sushi");
  await expect(page.locator("[data-search-empty]")).toBeVisible();

  // Al seleccionar la Tarta, sigue visible aunque no coincida.
  await search.fill("");
  await row(page, "Tarta de Chocolate")
    .locator("input[type='checkbox']")
    .check();
  await search.fill("pan");
  await expect(page.locator("[data-recipe-row]")).toHaveCount(2);
  await expect(page.getByText("Tarta de Chocolate")).toBeVisible();
  await expect(page.locator("[data-search-empty]")).toBeHidden();

  expect(consoleErrors).toEqual([]);
});

test("impresión: el botón llama a window.print y el modo print oculta controles", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetProduction(request);
  await signIn(page, "pro");
  await page.setViewportSize(DESKTOP);
  await goto("/produccion?recipes=1&batches=1");

  await page.evaluate(() => {
    (window as unknown as { __printCalls?: number }).__printCalls = 0;
    window.print = () => {
      const state = window as unknown as { __printCalls?: number };
      state.__printCalls = (state.__printCalls ?? 0) + 1;
    };
  });

  await page
    .getByRole("button", { name: "Imprimir hoja de producción" })
    .click();
  expect(
    await page.evaluate(
      () => (window as unknown as { __printCalls?: number }).__printCalls,
    ),
  ).toBe(1);

  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".no-print")).toBeHidden();
  await expect(page.locator(".ingredients-table")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Editar selección" }),
  ).toBeHidden();

  expect(consoleErrors).toEqual([]);
});

test("móvil: la hoja conserva la información con etiquetas por celda", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetProduction(request);
  await signIn(page, "pro");
  await page.setViewportSize(MOBILE);
  await goto("/produccion?recipes=1,2&batches=1,1");

  const sheet = page.locator(".ingredients-table");
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("Harina de trigo");
  await expect(sheet).toContainText("1.50 kg");
  await expect(sheet).toContainText("1 insumo en total");

  // La etiqueta de celda (sólo móvil) lleva la misma información que la
  // cabecera de escritorio.
  const amountLabel = sheet
    .locator("span.md\\:hidden")
    .filter({ hasText: /^Cantidad$/ })
    .first();
  await expect(amountLabel).toBeVisible();
  await expect(amountLabel).toHaveClass(/md:hidden/);

  // En escritorio la etiqueta se oculta y manda la cabecera de la tabla.
  await page.setViewportSize(DESKTOP);
  await expect(amountLabel).toBeHidden();

  expect(consoleErrors).toEqual([]);
});
