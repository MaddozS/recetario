import { expect, test } from '@nuxt/test-utils/playwright';
import { url } from '@nuxt/test-utils/e2e';
import type { APIRequestContext, Page } from '@playwright/test';

/**
 * Recorrido crítico de la app (Task 13a): el smoke de `docs/qa-agent-browser.md`
 * encadenado de punta a punta contra el stub del API — anónimo, login,
 * ingrediente, receta con ingrediente/presentación/costo fijo, planificador,
 * settings y logout.
 *
 * Es el único spec que corre también en Firefox y WebKit (`*-smoke`), y vigila
 * el recorrido completo: errores de consola, `pageerror`, warnings de
 * hidratación y respuestas ≥500 inesperadas.
 */

const MOBILE = { width: 375, height: 800 };
const DESKTOP = { width: 1280, height: 800 };

/** Escucha de canal: cualquier error de consola, hidratación o 5xx falla el test. */
function watchPage(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error') errors.push(`console: ${text}`);
    if (/hydration|mismatch/i.test(text)) errors.push(`hydration: ${text}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 500) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  return errors;
}

async function resetFixtures(request: APIRequestContext): Promise<void> {
  for (const domain of ['recipes', 'ingredients', 'settings']) {
    const response = await request.post(url(`/api/__qa/${domain}/reset`), {
      data: {},
    });
    expect(response.ok()).toBe(true);
  }
}

async function resetRecipes(request: APIRequestContext): Promise<void> {
  for (const domain of ['recipes', 'ingredients']) {
    const response = await request.post(url(`/api/__qa/${domain}/reset`), {
      data: {},
    });
    expect(response.ok()).toBe(true);
  }
}

async function markPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __qaMarker?: boolean }).__qaMarker = true;
  });
}

async function pageAlive(page: Page): Promise<boolean> {
  return await page.evaluate(
    () => (window as unknown as { __qaMarker?: boolean }).__qaMarker === true
  );
}

test('recorrido crítico: anónimo → cuenta → receta → producción → settings → logout', async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = watchPage(page);
  await resetFixtures(request);
  await page.setViewportSize(DESKTOP);

  // ── 1. Anónimo: landing indexable y ruta privada explicada ────────────────
  const landing = await goto('/', { waitUntil: 'hydration' });
  expect(landing?.status()).toBe(200);
  await expect(page.locator('h1')).toHaveText(/¿Sabes cuánto te deja\s+cada receta\?/);

  // La ruta privada responde 302 explicado. Se comprueba con `request` (como
  // `smoke.spec`): visitarla en el navegador dejaba la cadena de redirect en
  // vuelo y WebKit interrumpía el `goto` siguiente del recorrido.
  const redirect = await request.get(url('/recipes'), { maxRedirects: 0 });
  expect(redirect.status()).toBe(302);
  const location = new URL(redirect.headers().location ?? '', url('/'));
  expect(location.pathname).toBe('/sign-in');
  expect(location.searchParams.get('redirect')).toBe('/recipes');
  expect(location.searchParams.get('reason')).toBe('auth_required');

  // ── 2. Login por el formulario real ───────────────────────────────────────
  await goto('/sign-in?redirect=/ingredients', { waitUntil: 'hydration' });
  await page.locator('#sign-in-email').fill('qa@example.com');
  await page.locator('#sign-in-password').fill('Temporal123!');
  await page.locator('#sign-in-submit').click();
  await page.waitForURL(/\/ingredients$/);
  await expect(page.locator('#sign-out-button')).toBeVisible();

  // ── 3. Ingrediente ────────────────────────────────────────────────────────
  await markPage(page);
  const ingredientForm = page.locator('form:has(#desktop-name)');
  await ingredientForm.locator('#desktop-name').fill('Queso panela');
  await ingredientForm.locator('#desktop-price').fill('12,5');
  await ingredientForm.locator('#desktop-purchase-quantity').fill('1');
  await ingredientForm.getByRole('button', { name: 'Agregar Insumo' }).click();

  await expect(page.getByText('Ingrediente agregado correctamente.')).toBeVisible();
  await expect(page.locator('tbody tr', { hasText: 'Queso panela' })).toBeVisible();
  expect(await pageAlive(page)).toBe(true);

  // ── 4. Receta: crear y usar el ingrediente recién creado ──────────────────
  await goto('/recipes', { waitUntil: 'hydration' });
  await page.getByRole('button', { name: 'Nueva Receta' }).click();
  await page.locator('#create-recipe-name').fill('Pan de prueba');
  await page.getByRole('button', { name: 'Crear receta' }).click();
  await expect(page).toHaveURL(/\/recipes\/\d+\?edit=true$/);
  await markPage(page);

  await page.locator('#add-ingredient-btn').click();
  const ingredientRow = page.locator('.edit-ingredient-row').last();
  await ingredientRow.locator('[data-ingredient-picker] input').fill('queso');
  await ingredientRow.locator('.ingredient-option').first().click();
  await ingredientRow.locator('.quantity-input').fill('1');

  await page.getByRole('button', { name: 'Guardar Receta' }).click();
  await expect(page).toHaveURL(/\/recipes\/\d+$/);
  await expect(page.getByText('Receta guardada correctamente.')).toBeVisible();
  expect(await pageAlive(page)).toBe(true);

  const detailPath = new URL(page.url()).pathname;
  const recipeId = detailPath.split('/').pop();

  // ── 5. Presentación y costo fijo (CRUD autónomo, sin modo edición) ────────
  await goto(`${detailPath}#presentaciones`);
  await expect(page.locator('[data-presentations-empty]')).toBeVisible();
  await page
    .locator('[data-presentations-empty]')
    .getByRole('button', { name: 'Crear presentación' })
    .click();
  const presentationDialog = page.locator('#create-presentation-dialog');
  await presentationDialog.locator('#create-presentation-name').fill('Pan completo');
  await presentationDialog.locator('#create-presentation-units').fill('1');
  await presentationDialog.locator('[data-presentation-create-submit]').click();
  await expect(page.getByText('Presentación creada correctamente.')).toBeVisible();

  await goto(`${detailPath}#costos-fijos`);
  await page.locator('[data-open-fixed-cost]').click();
  const fixedCostCard = page.locator("[data-fc-mode='create']");
  await fixedCostCard.locator('[data-fc-name-input]').fill('Renta');
  await fixedCostCard.locator('[data-fc-value-input]').fill('100');
  await fixedCostCard.locator('[data-fc-save]').click();
  await expect(page.getByText('Costo fijo creado.')).toBeVisible();
  await expect(page.locator("[data-financial-row='Costos Fijos']")).toContainText('$100.00');

  // ── 6. Planificador: deep link a resultados con la receta creada ──────────
  await goto(`/produccion?recipes=${recipeId}`, { waitUntil: 'hydration' });
  await expect(page.locator('[data-results-count]')).toContainText('1 receta');
  await expect(page.locator("[data-financial-row='Insumos']")).toContainText('$12.50');

  // ── 7. Settings: perfil y preferencias persistidas sin recarga ────────────
  await goto('/settings', { waitUntil: 'hydration' });
  await markPage(page);
  await page.locator('#first-name').fill('Ada');
  await page.locator('#last-name').fill('Byron');
  await page.locator('#change-name-btn').click();
  await expect(page.getByText('Nombre actualizado correctamente.')).toBeVisible();
  await expect(page.locator('#profile-user-name')).toHaveText('Ada Byron');
  expect(await pageAlive(page)).toBe(true);

  await goto('/settings?tab=preferences', { waitUntil: 'hydration' });
  await page.locator('[data-theme-option="light"]').click();
  await page.locator('#save-btn-wrapper button').click();
  await expect(page.getByText('Preferencias guardadas correctamente.')).toBeVisible();

  const settings = await request.get(url('/api/__qa/settings/state'));
  const state = await settings.json();
  expect(state.firstName).toBe('Ada');
  expect(state.preferencesPutAttempts).toBe(1);
  expect(state.preferences.theme).toBe('light');

  // ── 8. Logout y móvil: el shell vuelve a pedir sesión y la landing responde ─
  await page.locator('#sign-out-button').click();
  await page.waitForURL(/\/sign-in/);

  await page.setViewportSize(MOBILE);
  await goto('/', { waitUntil: 'hydration' });
  await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('smoke móvil autenticado: bottom nav, drawer y listados con sesión', async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors = watchPage(page);
  await resetRecipes(request);
  await page.context().addCookies([
    {
      name: 'better-auth.session_token',
      value: 'stub-session-token',
      url: url('/'),
    },
  ]);
  await page.setViewportSize(MOBILE);

  await goto('/recipes', { waitUntil: 'hydration' });
  await expect(page.locator('#bottom-nav')).toBeVisible();
  await expect(page.locator('a.recipe-grid-card').first()).toBeVisible();

  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await expect(page.locator('#sidebar-nav')).toContainText('Ingredientes');
  await page.keyboard.press('Escape');

  await goto('/ingredients', { waitUntil: 'hydration' });
  await expect(page.locator('h2', { hasText: 'Tus Ingredientes' })).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
