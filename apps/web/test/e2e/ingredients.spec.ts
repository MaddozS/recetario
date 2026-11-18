import { expect, test } from '@nuxt/test-utils/playwright';
import { url } from '@nuxt/test-utils/e2e';
import type { APIRequestContext, Page } from '@playwright/test';

/**
 * Slice de ingredientes contra el stub del API: SSR de la lista, búsqueda
 * accent-insensitive, CRUD sin recarga, validación, borrado bloqueado y límite
 * de plan con CTA de upgrade sólo cuando la causa es el plan.
 */

const SESSION_COOKIE = 'better-auth.session_token=stub-session-token';
const MOBILE = { width: 375, height: 800 };
const DESKTOP = { width: 1280, height: 800 };

async function resetIngredients(
  request: APIRequestContext,
  seed: Record<string, unknown> = {}
): Promise<void> {
  const response = await request.post(url('/api/__qa/ingredients/reset'), {
    data: seed,
  });
  expect(response.ok()).toBe(true);
}

async function readIngredientsState(request: APIRequestContext): Promise<{
  ingredients: { name: string; price: number; purchaseQuantity: number }[];
  usage: Record<string, { id: number; name: string }[]>;
  postAttempts: number;
}> {
  const response = await request.get(url('/api/__qa/ingredients/state'));
  return await response.json();
}

async function signIn(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      name: 'better-auth.session_token',
      value: 'stub-session-token',
      url: url('/'),
    },
  ]);
}

function createForm(page: Page) {
  return page.locator('form:has(#desktop-name)');
}

test('SSR: lista, contador y costo unitario renderizados', async ({ request }) => {
  await resetIngredients(request);

  const response = await request.get(url('/ingredients'), {
    headers: { cookie: SESSION_COOKIE },
  });

  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('private, no-store');
  expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');

  // Los marcadores de hidratación de Vue no aportan al contenido.
  const html = (await response.text()).replace(/<!--[\s\S]*?-->/g, '');
  expect(html).toContain('Tus Ingredientes');
  expect(html).toContain('(2)');
  expect(html).toContain('Harina de trigo');
  expect(html).toContain('Plátano');
  expect(html).toContain('$25.00');
  expect(html).toContain('$9.00 / kg');
  expect(html).toContain('Sin proveedor');
  expect(html).toContain('Costo x Unidad');
  expect(html).toContain('Agregar Insumo');
});

test('búsqueda accent-insensitive y estado sin resultados', async ({ page, goto, request }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await resetIngredients(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto('/ingredients');

  const rows = page.locator('tbody tr');
  const search = page.locator("input[type='search']");

  await search.fill('platano');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Plátano');

  await search.fill('casa santos');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Harina de trigo');

  await search.fill('queso');
  await expect(rows).toHaveCount(0);
  await expect(page.getByText('No encontramos resultados')).toBeVisible();
  await expect(page.getByText('Intenta con otro nombre, proveedor o marca.')).toBeVisible();

  await search.fill('');
  await expect(rows).toHaveCount(2);
  expect(consoleErrors).toEqual([]);
});

test('crear en escritorio: coma decimal, éxito visible y sin recarga', async ({
  page,
  goto,
  request,
}) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await resetIngredients(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto('/ingredients');

  await page.evaluate(() => {
    (window as unknown as { __qaMarker?: boolean }).__qaMarker = true;
  });

  const form = createForm(page);
  await form.locator('#desktop-name').fill('Queso panela');
  await form.locator('#desktop-price').fill('12,5');
  await form.locator('#desktop-purchase-quantity').fill('2');

  await expect(page.getByText('$6.25')).toBeVisible();

  await form.getByRole('button', { name: 'Agregar Insumo' }).click();

  await expect(page.getByText('Ingrediente agregado correctamente.')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(3);
  await expect(page.getByText('Queso panela')).toBeVisible();
  await expect(page.locator("h2:has-text('Tus Ingredientes') + span")).toContainText('(3)');
  await expect(page.locator('#desktop-name')).toHaveValue('');

  // Sin recarga: el marcador de la página sigue vivo y la URL no cambió.
  expect(
    await page.evaluate(() => (window as unknown as { __qaMarker?: boolean }).__qaMarker)
  ).toBe(true);
  expect(new URL(page.url()).pathname).toBe('/ingredients');

  const state = await readIngredientsState(request);
  expect(state.postAttempts).toBe(1);
  expect(state.ingredients.at(-1)).toMatchObject({
    name: 'Queso panela',
    price: 12.5,
    purchaseQuantity: 2,
  });
  expect(consoleErrors).toEqual([]);
});

test('crear en móvil desde el dialog', async ({ page, goto, request }) => {
  await resetIngredients(request);
  await signIn(page);
  await page.setViewportSize(MOBILE);
  await goto('/ingredients');

  await page.getByRole('button', { name: 'Agregar Insumo' }).click();

  const dialog = page.locator('#create-ingredient-modal');
  await expect(dialog).toBeVisible();

  await dialog.locator('#mobile-name').fill('Mantequilla');
  await dialog.locator('#mobile-price').fill('30');
  await dialog.getByRole('button', { name: 'Agregar Insumo' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText('Ingrediente agregado correctamente.')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(3);
  await expect(page.getByText('Mantequilla')).toBeVisible();
});

test('editar: precarga el ingrediente y actualiza la fila en sitio', async ({
  page,
  goto,
  request,
}) => {
  await resetIngredients(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto('/ingredients');

  await page.evaluate(() => {
    (window as unknown as { __qaMarker?: boolean }).__qaMarker = true;
  });

  await page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: 'Editar ingrediente' })
    .click();

  const dialog = page.locator('#edit-ingredient-modal');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#edit-name')).toHaveValue('Harina de trigo');
  await expect(dialog.locator('#edit-supplier')).toHaveValue('Casa Santos');
  await expect(dialog.locator('#edit-price')).toHaveValue('25');

  await dialog.locator('#edit-name').fill('Harina integral');
  await dialog.locator('#edit-price').fill('30');
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText('Ingrediente actualizado correctamente.')).toBeVisible();
  await expect(page.locator('tbody tr').first()).toContainText('Harina integral');
  await expect(page.locator('tbody tr').first()).toContainText('$30.00');

  expect(
    await page.evaluate(() => (window as unknown as { __qaMarker?: boolean }).__qaMarker)
  ).toBe(true);
  expect(new URL(page.url()).pathname).toBe('/ingredients');
});

test('eliminar: confirma, quita la fila y baja el contador', async ({ page, goto, request }) => {
  await resetIngredients(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto('/ingredients');

  await page
    .locator('tbody tr')
    .nth(1)
    .getByRole('button', { name: 'Eliminar ingrediente' })
    .click();

  const dialog = page.locator('#delete-confirm-modal');
  await expect(dialog).toContainText(
    '¿Estás seguro de que deseas eliminar el ingrediente "Plátano"?'
  );

  await dialog.getByRole('button', { name: 'Eliminar' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText('Ingrediente eliminado correctamente.')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator("h2:has-text('Tus Ingredientes') + span")).toContainText('(1)');
});

test('borrado bloqueado: conflicto con recetas sin cerrar el dialog', async ({
  page,
  goto,
  request,
}) => {
  await resetIngredients(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto('/ingredients');

  await page
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: 'Ingrediente en uso' })
    .click();

  const dialog = page.locator('#delete-confirm-modal');
  await dialog.getByRole('button', { name: 'Eliminar' }).click();

  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('No se puede eliminar porque el ingrediente está en uso.');
  await expect(dialog).toContainText('Recetas que lo usan: Tarta de Chocolate');
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Actualizar plan' })).toHaveCount(0);
});

test('límite de plan: alerta con CTA de upgrade y sin llamar al API', async ({
  page,
  goto,
  request,
}) => {
  const ingredients = Array.from({ length: 30 }, (_, index) => ({
    id: index + 1,
    name: `Insumo ${index + 1}`,
    unit: 'kg',
    price: 10,
    purchaseQuantity: 1,
    brand: null,
    supplier: null,
  }));
  await resetIngredients(request, { ingredients, usage: {} });

  await page.context().addCookies([
    {
      name: 'better-auth.session_token',
      value: 'stub-session-token',
      url: url('/'),
    },
    { name: 'qa-plan', value: 'free', url: url('/') },
  ]);
  await page.setViewportSize(DESKTOP);
  await goto('/ingredients');

  const form = createForm(page);
  await form.locator('#desktop-name').fill('Otro insumo');
  await form.locator('#desktop-price').fill('10');
  await form.getByRole('button', { name: 'Agregar Insumo' }).click();

  await expect(page.getByRole('alert')).toContainText(
    'Has alcanzado el límite de 30 ingredientes de tu plan Free. Actualiza tu plan para crear más.'
  );
  await expect(page.getByRole('link', { name: 'Actualizar plan' })).toHaveAttribute(
    'href',
    '/pricing'
  );

  const state = await readIngredientsState(request);
  expect(state.postAttempts).toBe(0);
  expect(state.ingredients).toHaveLength(30);
});

test('error genérico: mensaje del API y sin CTA de upgrade', async ({ page, goto, request }) => {
  await resetIngredients(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto('/ingredients');

  const form = createForm(page);
  await form.locator('#desktop-name').fill('Fallo simulado');
  await form.locator('#desktop-price').fill('10');
  await form.getByRole('button', { name: 'Agregar Insumo' }).click();

  await expect(page.getByRole('alert')).toContainText('Fallo simulado del servidor');
  await expect(page.getByRole('link', { name: 'Actualizar plan' })).toHaveCount(0);
  await expect(page.locator('tbody tr')).toHaveCount(2);
});

test('validación: el submit se habilita con nombre, precio y cantidad válidos', async ({
  page,
  goto,
  request,
}) => {
  await resetIngredients(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);
  await goto('/ingredients');

  const form = createForm(page);
  const submit = form.getByRole('button', { name: 'Agregar Insumo' });

  await expect(submit).toBeDisabled();

  await form.locator('#desktop-name').fill('Queso');
  await expect(submit).toBeDisabled();

  await form.locator('#desktop-price').fill('abc');
  await expect(submit).toBeDisabled();

  await form.locator('#desktop-price').fill('0');
  await expect(submit).toBeEnabled();

  await form.locator('#desktop-purchase-quantity').fill('0');
  await expect(submit).toBeDisabled();

  await form.locator('#desktop-purchase-quantity').fill('2');
  await form.locator('#desktop-price').fill('10');
  await expect(submit).toBeEnabled();
  await expect(form.getByText('$5.00')).toBeVisible();
});
