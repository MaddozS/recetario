import { expect, test } from "@nuxt/test-utils/playwright";
import { url } from "@nuxt/test-utils/e2e";
import type { APIRequestContext, Page } from "@playwright/test";

/**
 * Slice del listado de recetas contra el stub del API: SSR de stats e
 * insights, búsqueda accent-insensitive, filtro por categoría con
 * query/back-forward, crear y duplicar navegando a `?edit=true` sin recarga, y
 * eliminar en sitio sin recargar. Cubre Free (gate de duplicar y límite de
 * plan) y Pro.
 *
 * El stub arranca con tres recetas: Tarta de Chocolate (Postres, 3
 * ingredientes), Pan de Masa Madre (Panes, 2) y Brownie Clásico (sin
 * categoría, 0 ingredientes).
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

  // La pill de ingredientes sale del mapa de uso: se fija al default del stub
  // para que el SSR sea determinista entre archivos de test.
  const ingredients = await request.post(url("/api/__qa/ingredients/reset"), {
    data: {},
  });
  expect(ingredients.ok()).toBe(true);
}

async function readRecipesState(request: APIRequestContext): Promise<{
  recipes: { id: number; name: string; category: string | null }[];
  postAttempts: number;
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

function cards(page: Page) {
  return page.locator("a.recipe-grid-card");
}

/** Card del grid que enlaza a la receta `id`, con su menú de acciones. */
function cardOf(page: Page, id: number) {
  return page
    .locator(`a.recipe-grid-card[href='/recipes/${id}']`)
    .locator("xpath=..");
}

test("SSR: stats, insights, recientes y cards renderizados", async ({
  request,
}) => {
  await resetRecipes(request);

  const response = await request.get(url("/recipes"), {
    headers: { cookie: SESSION_COOKIE },
  });

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");

  // Los marcadores de hidratación de Vue no aportan al contenido.
  const html = (await response.text()).replace(/<!--[\s\S]*?-->/g, "");
  expect(html).toContain("3 Recetas");
  expect(html).toContain("2 Categorías");
  expect(html).toContain("1 Ingrediente");
  expect(html).toContain("Recetas por completar");
  expect(html).toContain("sin ingredientes asignados");
  expect(html).toContain("sin categoría asignada");
  expect(html).toContain("Última modificación");
  expect(html).toContain("Recientemente actualizadas");
  expect(html).toContain("Tarta de Chocolate");
  expect(html).toContain("Pan de Masa Madre");
  expect(html).toContain("Brownie Clásico");
  expect(html).toContain("Nueva Receta");
});

test("búsqueda accent-insensitive y estado sin resultados", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes");

  const search = page.locator("input[type='search']");

  await search.fill("clasico");
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText("Brownie Clásico");

  await search.fill("chocolate");
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText("Tarta de Chocolate");

  // Sólo busca en el nombre: la categoría no entra en la búsqueda.
  await search.fill("postres");
  await expect(cards(page)).toHaveCount(0);
  await expect(page.getByText("No se encontraron recetas")).toBeVisible();

  await search.fill("queso");
  await expect(page.getByText("No se encontraron recetas")).toBeVisible();

  await search.fill("");
  await expect(cards(page)).toHaveCount(3);
  expect(consoleErrors).toEqual([]);
});

test("filtro por categoría: URL, deep link y back/forward", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes");

  // Deep link con SSR ya filtrado.
  await goto("/recipes?category=Panes");
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText("Pan de Masa Madre");
  await expect(page.getByRole("button", { name: /^Panes/ })).toHaveClass(
    /bg-accent-solid/,
  );

  // Cambio de pill (pushState) y limpieza del filtro.
  await page.getByRole("button", { name: /^Postres/ }).click();
  await expect(page).toHaveURL(/category=Postres/);
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText("Tarta de Chocolate");

  await page.getByRole("button", { name: "Sin categoría" }).click();
  await expect(page).toHaveURL(/category=$/);
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText("Brownie Clásico");

  // Back/forward refleja el filtro de la URL sin recargar.
  await page.goBack();
  await expect(page).toHaveURL(/category=Postres/);
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText("Tarta de Chocolate");

  await page.getByRole("button", { name: "Limpiar filtro" }).click();
  await expect(page).not.toHaveURL(/category=/);
  await expect(cards(page)).toHaveCount(3);
  expect(consoleErrors).toEqual([]);
});

test("crear: navega a la edición sin recargar y el listado queda al día", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes");

  // Marcador de página: si hubiera recarga completa, desaparecería.
  await page.evaluate(() => {
    (window as unknown as { __qaMarker?: boolean }).__qaMarker = true;
  });

  await page.getByRole("button", { name: "Nueva Receta" }).click();
  await page.locator("#create-recipe-name").fill("Brownie de la casa");
  await page.getByRole("button", { name: "Crear receta" }).click();

  await expect(page).toHaveURL(/\/recipes\/4\?edit=true$/);
  expect(
    await page.evaluate(
      () => (window as unknown as { __qaMarker?: boolean }).__qaMarker === true,
    ),
  ).toBe(true);

  const state = await readRecipesState(request);
  expect(state.postAttempts).toBe(1);
  expect(state.recipes.map((recipe) => recipe.name)).toContain(
    "Brownie de la casa",
  );

  // Al volver, la lista cacheada ya incluye la receta nueva (reducer previo).
  await page.goBack();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(cards(page)).toHaveCount(4);
  await expect(page.getByText("4 Recetas")).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("crear en móvil: dialog dentro del viewport y pills con scroll", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request);
  await signIn(page);
  await page.setViewportSize(MOBILE);
  await goto("/recipes");

  const scrolls = await page.evaluate(() => {
    const pills = document.querySelectorAll("button");
    const container = Array.from(pills).find((pill) =>
      pill.textContent?.includes("Postres"),
    )?.parentElement;
    return container ? container.scrollWidth > container.clientWidth : false;
  });
  expect(scrolls).toBe(true);

  await page.getByRole("button", { name: "Nueva Receta" }).click();

  const dialog = page.locator("#create-recipe-modal");
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box?.width ?? 0).toBeLessThanOrEqual(MOBILE.width);

  await page.locator("#create-recipe-name").fill("Tarta de limón");
  await page.getByRole("button", { name: "Crear receta" }).click();

  await expect(page).toHaveURL(/\/recipes\/4\?edit=true$/);
  expect(consoleErrors).toEqual([]);
});

test("duplicar (Pro): navega a la copia y el contador sube", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request);
  await signIn(page, "pro");
  await page.setViewportSize(DESKTOP);
  await goto("/recipes");

  await cardOf(page, 1).getByRole("button", { name: "Acciones" }).click();
  await cardOf(page, 1).getByRole("menuitem", { name: "Duplicar" }).click();

  await expect(
    page.getByText(
      "Se creará una copia de esta receta con todos sus ingredientes y presentaciones.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Duplicar" }).click();

  await expect(page).toHaveURL(/\/recipes\/4\?edit=true$/);

  const state = await readRecipesState(request);
  expect(state.recipes).toHaveLength(4);
  expect(state.recipes.map((recipe) => recipe.name)).toContain(
    "Copia de Tarta de Chocolate",
  );

  await page.goBack();
  await expect(cards(page)).toHaveCount(4);
  expect(consoleErrors).toEqual([]);
});

test("Free: sin opción de duplicar en el menú", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request);
  await signIn(page, "free");
  await page.setViewportSize(DESKTOP);
  await goto("/recipes");

  await cardOf(page, 1).getByRole("button", { name: "Acciones" }).click();

  await expect(
    cardOf(page, 1).getByRole("menuitem", { name: "Editar" }),
  ).toBeVisible();
  await expect(
    cardOf(page, 1).getByRole("menuitem", { name: "Duplicar" }),
  ).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test("límite de plan: alerta con CTA y ningún intento de crear", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  const recipes = Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    name: `Receta ${index + 1}`,
    category: "Postres",
    ingredientCount: 1,
    updatedAt: "2026-09-14T10:00:00.000Z",
  }));
  await resetRecipes(request, { recipes });
  await signIn(page, "free");
  await page.setViewportSize(DESKTOP);
  await goto("/recipes");

  await page.getByRole("button", { name: "Nueva Receta" }).click();
  await page.locator("#create-recipe-name").fill("Receta 11");
  await page.getByRole("button", { name: "Crear receta" }).click();

  await expect(
    page.getByText(
      "Has alcanzado el límite de 10 recetas de tu plan Free. Actualiza tu plan para crear más.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Actualizar plan" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/recipes$/);

  const state = await readRecipesState(request);
  expect(state.postAttempts).toBe(0);
  expect(state.recipes).toHaveLength(10);
  expect(consoleErrors).toEqual([]);
});

test("error genérico: mensaje del API sin CTA de upgrade", async ({
  page,
  goto,
  request,
}) => {
  // Sin aserción de consola: el 500 del stub es intencional y Chromium lo
  // registra como error de recurso.
  await resetRecipes(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes");

  await page.getByRole("button", { name: "Nueva Receta" }).click();
  await page.locator("#create-recipe-name").fill("Fallo simulado");
  await page.getByRole("button", { name: "Crear receta" }).click();

  await expect(page.getByText("Fallo simulado del servidor")).toBeVisible();
  await expect(page.getByRole("link", { name: "Actualizar plan" })).toHaveCount(
    0,
  );
});

test("eliminar en sitio: fila fuera, stats al día y sin recarga", async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes");

  await page.evaluate(() => {
    (window as unknown as { __qaMarker?: boolean }).__qaMarker = true;
  });

  await cardOf(page, 1).getByRole("button", { name: "Acciones" }).click();
  await cardOf(page, 1).getByRole("menuitem", { name: "Eliminar" }).click();
  await expect(
    page.getByText("¿Eliminar esta receta? Esta acción no se puede deshacer."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Eliminar" }).click();

  await expect(page.getByText("Receta eliminada correctamente.")).toBeVisible();
  await expect(cards(page)).toHaveCount(2);
  await expect(page.getByText("Tarta de Chocolate")).toHaveCount(0);
  await expect(page.getByText("2 Recetas")).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { __qaMarker?: boolean }).__qaMarker === true,
    ),
  ).toBe(true);

  const state = await readRecipesState(request);
  expect(state.deleteAttempts).toBe(1);
  expect(state.recipes).toHaveLength(2);
  expect(consoleErrors).toEqual([]);
});

test("estado vacío: copy corregido y CTAs", async ({ page, goto, request }) => {
  const consoleErrors = trackConsoleErrors(page);
  await resetRecipes(request, { recipes: [] });
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto("/recipes");

  await expect(page.getByText("Todavía no tienes recetas")).toBeVisible();
  await expect(
    page.getByText(
      "Entra por primera vez al recetario desde aquí y crea tu primera receta.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Crear primera receta" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ver ingredientes" }),
  ).toHaveAttribute("href", "/ingredients");
  await expect(page.getByText("3 Recetas")).toHaveCount(0);

  await page.getByRole("button", { name: "Crear primera receta" }).click();
  await expect(page.locator("#create-recipe-modal")).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
