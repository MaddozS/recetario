import { expect, test } from "@nuxt/test-utils/playwright";
import { url } from "@nuxt/test-utils/e2e";
import type { APIRequestContext, Page } from "@playwright/test";

/**
 * Slice del detalle y la edición base de receta contra el stub del API: SSR del
 * detalle (ingredientes repetidos, notas, resumen financiero), tabs con hash,
 * multiplicador reactivo, edición por `?edit=true`, guardado sin recarga,
 * cancelar, validación local, error del API, eliminar y duplicar.
 *
 * El stub siembra la Tarta con 3 filas —harina 0.5 kg (con nota), plátano 2 kg y
 * harina 100 g (repetida)—, `desiredMargin: 30` y `fixedCostsPercentage: 10`
 * ($33.00 de costo directo con los precios sembrados).
 */

const SESSION_COOKIE = "better-auth.session_token=stub-session-token";
const MOBILE = { width: 375, height: 800 };
const DESKTOP = { width: 1280, height: 800 };

async function resetRecipes(
  request: APIRequestContext,
  seed: Record<string, unknown> = {},
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

async function readRecipesState(request: APIRequestContext): Promise<{
  recipes: { id: number; name: string; category: string | null }[];
  postAttempts: number;
  patchAttempts: number;
  deleteAttempts: number;
}> {
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

function pageMenu(page: Page) {
  return {
    trigger: page.getByRole("button", { name: "Opciones de receta" }),
    item: (name: string) => page.getByRole("menuitem", { name, exact: true }),
  };
}

async function openRecipeMenu(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Opciones de receta" }).click();
}

/** Tabla de escritorio: las cards móviles cuentan igual aunque estén ocultas. */
function desktopTable(page: Page) {
  return page.locator("table");
}

/** Multiplicador visible según el breakpoint (hay dos instancias). */
function multiplierInput(page: Page, position: "desktop" | "mobile") {
  return page.locator(
    `[data-multiplier='${position}'] input[aria-label='Multiplicador']`,
  );
}

test("SSR: detalle, ingredientes repetidos, notas ocultas y cabeceras privadas", async ({
  request,
}) => {
  await resetRecipes(request);

  const response = await request.get(url("/recipes/1"), {
    headers: { cookie: SESSION_COOKIE },
  });

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");

  const html = (await response.text()).replace(/<!--[\s\S]*?-->/g, "");
  expect(html).toContain("Tarta de Chocolate");
  expect(html).toContain("Postres");
  expect(html).toContain("Actualizado");
  expect(html).toContain("Lista de Ingredientes");
  expect(html).toContain("Ver notas");
  expect(html).toContain("Ingrediente");
  expect(html).toContain("Cantidad");
  expect(html).toContain("Subtotal");
  // Ingrediente repetido: dos filas de harina, una en kg y otra en g.
  expect(html.match(/Harina de trigo/g)?.length).toBeGreaterThanOrEqual(4);
  expect(html).toContain("(Del Campo)");
  expect(html).toContain("Plátano");
  // Notas ocultas por defecto (paridad con el checkbox heredado). Vue emite la
  // clase dinámica antes que la estática, así que se acota al párrafo.
  expect(html).toMatch(/<p class="[^"]*hidden[^"]*">Para la masa<\/p>/);
  // Default del stub: plan Pro → filas con costos fijos explícitos.
  expect(html).toContain("Costo Insumos");
  expect(html).toContain("$33.00");
  expect(html).toContain("Total Costos Fijos");
  expect(html).toContain("Margen Deseado");
  expect(html).toContain("Ingredientes");
  expect(html).toContain("Costos Fijos");
  expect(html).toContain("Presentaciones");

  // Migas: el nombre real sustituye al placeholder «Receta» (Task 13a).
  const desktopBreadcrumb =
    html.match(/<nav[^>]*data-variant="desktop"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ??
    "";
  expect(desktopBreadcrumb).toContain("Recetas");
  expect(desktopBreadcrumb).toContain("Tarta de Chocolate");
  expect(desktopBreadcrumb).not.toMatch(/>Receta</);
});

test("Free: filas operativas y % editable", async ({ request }) => {
  await resetRecipes(request);

  const response = await request.get(url("/recipes/1"), {
    headers: {
      cookie: `${SESSION_COOKIE}; qa-plan=free`,
    },
  });

  const html = (await response.text()).replace(/<!--[\s\S]*?-->/g, "");
  expect(html).toContain("Gastos Operativos");
  expect(html).toContain("10%");
  expect(html).toContain("+$3.30");
  expect(html).toContain("Costo Total Real");
  expect(html).not.toContain("Total Costos Fijos");
});

test("tabs: click con hash, deep link y teclado", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);

  // Deep link: el SSR ya renderiza el panel activo.
  await goto("/recipes/1#costos-fijos");
  await expect(page.locator("#tab-costos-fijos")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator("#panel-costos-fijos")).toBeVisible();
  await expect(page.locator("#panel-ingredientes")).toBeHidden();
  await expect(page.locator("#panel-costos-fijos")).toContainText(
    "Costos Fijos de la Receta",
  );

  await page.locator("#tab-presentaciones").click();
  await expect(page).toHaveURL(/#presentaciones$/);
  await expect(page.locator("#panel-presentaciones")).toContainText(
    "Presentaciones de Venta",
  );

  // Navegación por teclado: flecha izquierda vuelve a costos fijos.
  await page.locator("#tab-presentaciones").press("ArrowLeft");
  await expect(page.locator("#tab-costos-fijos")).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.locator("#tab-ingredientes").click();
  await expect(page.locator("#panel-ingredientes")).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("notas: el toggle muestra los comentarios y persiste", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes/1");

  const comments = page.locator(".ingredient-comment");
  await expect(comments.first()).toBeHidden();

  await page.locator("#toggle-comments").check();
  await expect(desktopTable(page).locator(".ingredient-comment")).toBeVisible();
  await expect(desktopTable(page).locator(".ingredient-comment")).toContainText(
    "Para la masa",
  );

  // Persistencia: la preferencia sobrevive a una recarga.
  await goto("/recipes/1");
  await expect(desktopTable(page).locator(".ingredient-comment")).toBeVisible();

  await page.locator("#toggle-comments").uncheck();
  await expect(desktopTable(page).locator(".ingredient-comment")).toBeHidden();
  expect(consoleErrors).toEqual([]);
});

test("multiplicador: deep link, botones e input sin recargar", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);

  // Deep link: el SSR ya aplica el multiplicador (cantidades en la tabla y
  // costo directo en el resumen financiero).
  await goto("/recipes/1?multiplier=2");
  await expect(desktopTable(page).getByText("Con x2").first()).toBeVisible();
  await expect(
    page.locator("[data-financial-row='Costo Insumos']"),
  ).toContainText("$66.00");

  await page.evaluate(() => {
    (window as unknown as { __qaMarker?: boolean }).__qaMarker = true;
  });

  // Con multiplicador >= 2 el paso es 1.
  await page.getByRole("button", { name: "Aumentar mezclas" }).first().click();
  await expect(page).toHaveURL(/multiplier=3/);
  await expect(desktopTable(page).getByText("Con x3").first()).toBeVisible();
  await expect(
    page.locator("[data-financial-row='Costo Insumos']"),
  ).toContainText("$99.00");

  await page.getByRole("button", { name: "Disminuir mezclas" }).first().click();
  await expect(page).toHaveURL(/multiplier=2/);

  // El input también actualiza la query.
  const input = multiplierInput(page, "desktop");
  await input.fill("1.5");
  await input.blur();
  await expect(page).toHaveURL(/multiplier=1\.5/);
  await expect(desktopTable(page).getByText("Con x1.5").first()).toBeVisible();

  expect(
    await page.evaluate(
      () => (window as unknown as { __qaMarker?: boolean }).__qaMarker === true,
    ),
  ).toBe(true);
  expect(consoleErrors).toEqual([]);
});

test("edición: deep link ?edit=true, snapshot y cancelar", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes/1?edit=true");

  // SSR ya renderiza el editor con las filas del detalle.
  await expect(page.locator("#recipe-name-input")).toHaveValue(
    "Tarta de Chocolate",
  );
  await expect(page.locator(".edit-ingredient-row")).toHaveCount(3);
  await expect(page.locator(".quantity-input").first()).toHaveValue("0.5");
  await expect(page.locator("#recipe-title-view")).toBeHidden();

  await page.locator("#recipe-name-input").fill("Tarta a medio camino");
  await page.locator("button#recipe-cancel-edit").click();

  await expect(page).toHaveURL(/\/recipes\/1$/);
  await expect(page.locator("#recipe-title-view")).toHaveText(
    "Tarta de Chocolate",
  );

  // Cancelar no llamó al API y el editor olvidó los cambios.
  const state = await readRecipesState(request);
  expect(state.patchAttempts).toBe(0);
  await goto("/recipes/1?edit=true");
  await expect(page.locator("#recipe-name-input")).toHaveValue(
    "Tarta de Chocolate",
  );
  expect(consoleErrors).toEqual([]);
});

test("guardar sin recarga: alerta, PATCH y listado al día al volver", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes");

  // Entrar a editar desde el menú de la card (deja el listado en el historial).
  const card = page
    .locator("a.recipe-grid-card[href='/recipes/1']")
    .locator("xpath=..");
  await card.getByRole("button", { name: "Acciones" }).click();
  await page.getByRole("menuitem", { name: "Editar", exact: true }).click();
  await expect(page).toHaveURL(/\/recipes\/1\?edit=true$/);

  await page.evaluate(() => {
    (window as unknown as { __qaMarker?: boolean }).__qaMarker = true;
  });

  await page.locator("#recipe-name-input").fill("Tarta v2");
  await page.locator("#fs-edit-desiredMargin").fill("40");
  await page.locator(".quantity-input").first().fill("0.75");
  await page.getByRole("button", { name: "Guardar Receta" }).click();

  // Guardado en sitio: mismo documento, sin `?edit` y con éxito visible.
  await expect(page).toHaveURL(/\/recipes\/1$/);
  await expect(page.getByText("Receta guardada correctamente.")).toBeVisible();
  await expect(page.locator("#recipe-title-view")).toHaveText("Tarta v2");
  // La miga sigue el nombre sin recargar.
  await expect(page.locator('nav[data-variant="desktop"]')).toContainText(
    "Tarta v2",
  );
  await expect(page.getByText("40%").first()).toBeVisible();

  const state = await readRecipesState(request);
  expect(state.patchAttempts).toBe(1);
  expect(state.recipes.find((recipe) => recipe.id === 1)?.name).toBe(
    "Tarta v2",
  );

  // Al volver con el historial (navegación cliente) el listado se remonta y
  // refetchea: el nombre nuevo está ahí.
  await page.goBack();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(
    page.locator("a.recipe-grid-card[href='/recipes/1']"),
  ).toContainText("Tarta v2");
  expect(consoleErrors).toEqual([]);
});

test("validación local: sin filas o con filas incompletas no llama al API", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes/1?edit=true");

  // Una fila nueva sin ingrediente bloquea el guardado y queda señalada.
  await page.locator("#add-ingredient-btn").click();
  await expect(page.locator(".edit-ingredient-row")).toHaveCount(4);
  await page.getByRole("button", { name: "Guardar Receta" }).click();

  await expect(
    page.getByText(
      "Completa o elimina las filas sin ingrediente o con cantidad mayor a 0.",
    ),
  ).toBeVisible();
  await expect(page.locator("[data-invalid='true']")).toHaveCount(1);

  // Quitando todas las filas el mensaje cambia.
  const removes = page.locator("button[aria-label='Eliminar ingrediente']");
  for (let index = 0; index < 4; index += 1) {
    await removes.first().click();
  }
  await expect(page.locator(".edit-ingredient-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Guardar Receta" }).click();
  await expect(
    page.getByText("Agrega al menos un ingrediente antes de guardar."),
  ).toBeVisible();

  const state = await readRecipesState(request);
  expect(state.patchAttempts).toBe(0);
  expect(consoleErrors).toEqual([]);
});

test("error al guardar: permanece en edición con los cambios y la alerta", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes/1?edit=true");

  await page.locator("#recipe-name-input").fill("Fallo simulado");
  await page.getByRole("button", { name: "Guardar Receta" }).click();

  await expect(page.getByText("Fallo simulado del servidor")).toBeVisible();
  await expect(page).toHaveURL(/edit=true/);
  await expect(page.locator("#recipe-name-input")).toHaveValue(
    "Fallo simulado",
  );
  await expect(page.getByRole("link", { name: "Actualizar plan" })).toHaveCount(
    0,
  );

  const state = await readRecipesState(request);
  expect(state.patchAttempts).toBe(1);
  // El error de consola lo registra Chromium por el 500 intencional del stub.
  expect(consoleErrors.length).toBeLessThanOrEqual(1);
});

test("responsive: cards en móvil y tabla en escritorio", async ({
  page,
  goto,
  request,
}) => {
  await resetRecipes(request);
  await signIn(page);

  await page.setViewportSize(MOBILE);
  await goto("/recipes/1");
  await expect(page.locator("article").first()).toBeVisible();
  await expect(
    page.getByText("Cantidad usada en esta mezcla").first(),
  ).toBeVisible();
  await expect(page.locator("table")).toBeHidden();
  await expect(multiplierInput(page, "mobile")).toBeVisible();
  await expect(multiplierInput(page, "desktop")).toBeHidden();

  await page.setViewportSize(DESKTOP);
  await expect(page.locator("table")).toBeVisible();
  await expect(page.locator("article").first()).toBeHidden();
  await expect(multiplierInput(page, "desktop")).toBeVisible();
  await expect(multiplierInput(page, "mobile")).toBeHidden();
});

test("eliminar desde el detalle vuelve al listado sin la receta", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes/1");

  await openRecipeMenu(page);
  await pageMenu(page).item("Eliminar").click();

  const dialog = page.locator("#delete-recipe-modal");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Eliminar" }).click();

  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.locator("a.recipe-grid-card")).toHaveCount(2);
  await expect(page.getByText("Tarta de Chocolate")).toHaveCount(0);

  const state = await readRecipesState(request);
  expect(state.deleteAttempts).toBe(1);
  expect(consoleErrors).toEqual([]);
});

test("duplicar: Pro navega a la copia en edición y Free no lo ofrece", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request);
  await signIn(page, "pro");
  await page.setViewportSize(DESKTOP);
  await goto("/recipes/1");

  await openRecipeMenu(page);
  await pageMenu(page).item("Duplicar").click();

  const dialog = page.locator("#duplicate-recipe-modal");
  await dialog.getByRole("button", { name: "Duplicar" }).click();

  await expect(page).toHaveURL(/\/recipes\/4\?edit=true$/);
  await expect(page.locator("#recipe-name-input")).toHaveValue(
    "Copia de Tarta de Chocolate",
  );
  // La copia trae las filas del original.
  await expect(page.locator(".edit-ingredient-row")).toHaveCount(3);

  const state = await readRecipesState(request);
  expect(state.recipes.map((recipe) => recipe.name)).toContain(
    "Copia de Tarta de Chocolate",
  );
  expect(consoleErrors).toEqual([]);
});

test("Free: el menú del detalle no ofrece Duplicar", async ({
  page,
  goto,
  request,
}) => {
  await resetRecipes(request);
  await signIn(page, "free");
  await page.setViewportSize(DESKTOP);
  await goto("/recipes/1");

  await openRecipeMenu(page);
  await expect(page.getByRole("menuitem", { name: "Editar" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Duplicar" })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "Eliminar" })).toBeVisible();
});

test("404: una receta inexistente redirige al listado", async ({ request }) => {
  await resetRecipes(request);

  const response = await request.get(url("/recipes/999"), {
    headers: { cookie: SESSION_COOKIE },
    maxRedirects: 0,
  });

  // El SSR responde con un redirect al listado (paridad con Astro).
  expect([302, 303, 307]).toContain(response.status());
  expect(response.headers()["location"] ?? "").toContain("/recipes");
});
