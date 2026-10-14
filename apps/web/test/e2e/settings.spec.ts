import { expect, test } from '@nuxt/test-utils/playwright';
import { url } from '@nuxt/test-utils/e2e';
import type { APIRequestContext, Page } from '@playwright/test';

/**
 * Settings, preferencias y billing (Task 11) contra el stub del API: 301 de
 * `/settings/billing`, tabs con URL/back-forward, perfil y contraseña sin
 * recargas, persistencia de tema/acento con rollback, y facturación completa
 * (planes, trial/cancelado/programado, uso, portal y cambio de plan).
 *
 * Cada test resetea el estado de cuenta/preferencias/billing con
 * `__qa/settings/reset`; los planes se controlan con cookies (`qa-plan`,
 * `qa-subscription`, `qa-usage`) y las sentinelas de error con `qa-prefs`,
 * `qa-portal` o `qa-sync`.
 */

const SESSION_COOKIE = 'better-auth.session_token=stub-session-token';
const MOBILE = { width: 375, height: 800 };
const DESKTOP = { width: 1280, height: 800 };

type SignInOptions = {
  plan?: 'free' | 'basic' | 'pro';
  subscription?: 'trial' | 'canceled' | 'scheduled';
  usage?: 'low';
  preferences?: 'error';
  portal?: 'error';
  sync?: 'error';
};

async function signIn(page: Page, options: SignInOptions = {}): Promise<void> {
  const cookies = [
    {
      name: 'better-auth.session_token',
      value: 'stub-session-token',
      url: url('/'),
    },
  ];

  const flag = (name: string, value: string | undefined) => {
    if (value) cookies.push({ name, value, url: url('/') });
  };

  flag('qa-plan', options.plan);
  flag('qa-subscription', options.subscription);
  flag('qa-usage', options.usage);
  flag('qa-prefs', options.preferences);
  flag('qa-portal', options.portal);
  flag('qa-sync', options.sync);

  await page.context().addCookies(cookies);
}

async function resetSettings(request: APIRequestContext): Promise<void> {
  const response = await request.post(url('/api/__qa/settings/reset'), {
    data: {},
  });
  expect(response.ok()).toBe(true);
}

type SettingsState = {
  firstName: string;
  lastName: string;
  preferences: { theme: string; accentColor: string };
  nameAttempts: number;
  passwordAttempts: number;
  preferencesPutAttempts: number;
  portalAttempts: number;
  syncAttempts: number;
  checkoutAttempts: number;
  lastCheckout: {
    priceId?: string;
    successUrl?: string;
    cancelUrl?: string;
  } | null;
};

async function readSettingsState(request: APIRequestContext): Promise<SettingsState> {
  const response = await request.get(url('/api/__qa/settings/state'));
  return await response.json();
}

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
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
    () => (window as unknown as { __qaMarker?: boolean }).__qaMarker === true
  );
}

test('cada test parte del estado de settings reseteado', async ({ request, page, goto }) => {
  await resetSettings(request);
  await signIn(page);
  await goto('/settings', { waitUntil: 'hydration' });

  const state = await readSettingsState(request);
  expect(state.preferences).toEqual({ theme: 'dark', accentColor: 'emerald' });
  expect(state.nameAttempts).toBe(0);
});

test('pestañas: SSR en Perfil, navegación con query y back/forward', async ({
  page,
  goto,
  request,
}) => {
  await resetSettings(request);
  await signIn(page);
  const consoleErrors = trackConsoleErrors(page);

  await goto('/settings', { waitUntil: 'hydration' });
  await markPage(page);

  await expect(page.locator('[data-tab="profile"]')).toHaveAttribute('data-tab-active', '1');
  await expect(page.locator('[data-tab-content="profile"]')).toBeVisible();

  await page.locator('[data-tab="preferences"]').click();
  await expect(page).toHaveURL(/tab=preferences/);
  await expect(page.locator('[data-tab-content="preferences"]')).toBeVisible();
  await expect(page.locator('[data-tab-content="profile"]')).toBeHidden();

  await page.locator('[data-tab="billing"]').click();
  await expect(page).toHaveURL(/tab=billing/);
  await expect(page.locator('[data-tab-content="billing"]')).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/tab=preferences/);
  await expect(page.locator('[data-tab-content="preferences"]')).toBeVisible();

  await page.goBack();
  await expect(page).not.toHaveURL(/tab=/);
  await expect(page.locator('[data-tab-content="profile"]')).toBeVisible();

  // Sólo hubo navegación de cliente: el documento sigue vivo.
  expect(await pageAlive(page)).toBe(true);
  expect(consoleErrors).toEqual([]);
});

test('deep link a preferencias: SSR correcto', async ({ page, goto, request }) => {
  await resetSettings(request);
  await signIn(page);
  await goto('/settings?tab=preferences', { waitUntil: 'hydration' });

  await expect(page.locator('[data-tab="preferences"]')).toHaveAttribute('data-tab-active', '1');
  await expect(page.locator('[data-tab-content="preferences"]')).toBeVisible();
});

test('/settings/billing responde 301 preservando la query', async ({ request }) => {
  const response = await request.get(url('/settings/billing?success=1&extra=2'), {
    maxRedirects: 0,
    headers: { cookie: SESSION_COOKIE },
  });

  expect(response.status()).toBe(301);
  const location = response.headers().location ?? '';
  expect(location).toContain('/settings?tab=billing&success=1&extra=2');
});

test('perfil: el nombre se actualiza sin recargar y el error no pisa el valor', async ({
  page,
  goto,
  request,
}) => {
  await resetSettings(request);
  await signIn(page);
  const consoleErrors = trackConsoleErrors(page);

  await goto('/settings', { waitUntil: 'hydration' });
  await markPage(page);

  await page.locator('#first-name').fill('Ada');
  await page.locator('#last-name').fill('Byron');
  await page.locator('#change-name-btn').click();

  await expect(page.getByText('Nombre actualizado correctamente.')).toBeVisible();
  await expect(page.locator('#profile-user-name')).toHaveText('Ada Byron');
  expect(await pageAlive(page)).toBe(true);

  // Sentinela: el error queda inline y conserva lo escrito.
  await page.locator('#first-name').fill('Fallo');
  await page.locator('#change-name-btn').click();
  await expect(page.getByText('Error al actualizar el nombre.')).toBeVisible();
  await expect(page.locator('#first-name')).toHaveValue('Fallo');

  const state = await readSettingsState(request);
  expect(state.nameAttempts).toBe(2);
  expect(state.firstName).toBe('Ada');
  // El 500 de la sentinela es esperado: no hay otros errores de consola.
  expect(consoleErrors.every((message) => message.includes('500'))).toBe(true);
});

test('contraseña: éxito, error del servidor y validación local sin peticiones', async ({
  page,
  goto,
  request,
}) => {
  await resetSettings(request);
  await signIn(page);
  await goto('/settings', { waitUntil: 'hydration' });

  // Validación local: no llega ninguna petición.
  await page.locator('#current-password').fill('Temporal123!');
  await page.locator('#new-password').fill('corta');
  await page.locator('#confirm-new-password').fill('corta');
  await page.locator('#change-password-btn').click();
  await expect(
    page.getByText(
      'La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y un carácter especial.'
    )
  ).toBeVisible();

  // Contraseña actual incorrecta: mensaje en español del envelope.
  await page.locator('#new-password').fill('NuevaClave1!');
  await page.locator('#confirm-new-password').fill('NuevaClave1!');
  await page.locator('#current-password').fill('incorrecta');
  await page.locator('#change-password-btn').click();
  await expect(page.getByText('La contraseña actual es incorrecta.')).toBeVisible();

  // Éxito: limpia los campos y confirma.
  await page.locator('#current-password').fill('Temporal123!');
  await page.locator('#change-password-btn').click();
  await expect(page.getByText('Contraseña actualizada correctamente.')).toBeVisible();
  await expect(page.locator('#new-password')).toHaveValue('');

  const state = await readSettingsState(request);
  expect(state.passwordAttempts).toBe(2);
});

test('preferencias: preview inmediato, guardado confirmado y cookie', async ({
  page,
  goto,
  request,
  context,
}) => {
  await resetSettings(request);
  await signIn(page);
  await goto('/settings?tab=preferences', { waitUntil: 'hydration' });
  await markPage(page);

  // Preview local: el tema cambia antes de guardar.
  await page.locator('[data-theme-option="light"]').click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expect(page.locator('#save-btn-wrapper')).toBeVisible();

  await page.locator('#save-btn-wrapper button').click();
  await expect(page.getByText('Preferencias guardadas correctamente.')).toBeVisible();
  await expect(page.locator('#save-btn-wrapper')).toBeHidden();

  const state = await readSettingsState(request);
  expect(state.preferencesPutAttempts).toBe(1);
  expect(state.preferences.theme).toBe('light');

  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === 'kitchcalc-theme')?.value).toBe('light');
  expect(await pageAlive(page)).toBe(true);

  // Acento: también se previsualiza y persiste.
  await page.locator('[data-accent-option="rose"]').click();
  await page.locator('#save-btn-wrapper button').click();
  await expect(page.locator('#save-btn-wrapper')).toBeHidden();

  const afterAccent = await readSettingsState(request);
  expect(afterAccent.preferences.accentColor).toBe('rose');
});

test('preferencias: el error revierte el preview y no escribe cookies', async ({
  page,
  goto,
  request,
  context,
}) => {
  await resetSettings(request);
  await signIn(page, { preferences: 'error' });
  await goto('/settings?tab=preferences', { waitUntil: 'hydration' });

  await page.locator('[data-theme-option="light"]').click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);

  await page.locator('#save-btn-wrapper button').click();
  await expect(page.getByText('Error al guardar las preferencias.')).toBeVisible();

  // Rollback: vuelve al tema persistido (dark) y el botón desaparece.
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('#save-btn-wrapper')).toBeHidden();

  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === 'kitchcalc-theme')?.value).toBe('dark');

  const state = await readSettingsState(request);
  expect(state.preferences.theme).toBe('dark');
});

test('preferencias: cambiar de pestaña descarta el preview sin persistir', async ({
  page,
  goto,
  request,
  context,
}) => {
  await resetSettings(request);
  await signIn(page);
  await goto('/settings?tab=preferences', { waitUntil: 'hydration' });

  // Preview local: el tema se aplica al documento antes de guardar.
  await page.locator('[data-theme-option="light"]').click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expect(page.locator('#save-btn-wrapper')).toBeVisible();

  // Al dejar la pestaña se descarta el borrador y vuelve lo persistido.
  await page.locator('[data-tab="profile"]').click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  // Volver a Preferencias rellena el borrador desde lo persistido.
  await page.locator('[data-tab="preferences"]').click();
  await expect(page.locator('#save-btn-wrapper')).toBeHidden();
  await expect(page.locator('[data-theme-option="dark"]')).toHaveAttribute(
    'data-theme-active',
    '1'
  );

  const state = await readSettingsState(request);
  expect(state.preferencesPutAttempts).toBe(0);
  expect(state.preferences.theme).toBe('dark');

  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === 'kitchcalc-theme')?.value).toBe('dark');
});

test('el toggle del login persiste con sesión y no con anónimo', async ({
  page,
  goto,
  request,
}) => {
  await resetSettings(request);
  await signIn(page);
  await page.setViewportSize(DESKTOP);

  // El login es la única superficie pública que conserva el toggle (el
  // marketing se fuerza claro). `/forgot-password` no lleva el middleware
  // `guest`, así que un usuario con sesión sí puede llegar a su cabecera.
  await goto('/forgot-password', { waitUntil: 'hydration' });

  // La sesión arranca en dark (preferencia del stub): el toggle pasa a light.
  const authenticatedToggle = page.locator('nav [data-theme-toggle]').first();
  await authenticatedToggle.click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);

  const persisted = await readSettingsState(request);
  expect(persisted.preferencesPutAttempts).toBe(1);
  expect(persisted.preferences.theme).toBe('light');

  // Anónimo: mismo gesto, sin PUT (no hay autoridad remota).
  await page.context().clearCookies();
  await resetSettings(request);
  await goto('/sign-in', { waitUntil: 'hydration' });
  await page.locator('nav [data-theme-toggle]').first().click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  const anonymous = await readSettingsState(request);
  expect(anonymous.preferencesPutAttempts).toBe(0);
});

test('billing: plan Pro, plan Free y uso con avisos', async ({ page, goto, request }) => {
  await resetSettings(request);
  await signIn(page, { plan: 'free', usage: 'low' });
  await goto('/settings?tab=billing', { waitUntil: 'hydration' });

  const summary = page.locator('[data-plan-summary]');
  const usage = page.locator('[data-usage-cards]');
  const features = page.locator('[data-plan-features]');

  await expect(summary).toContainText('KitchCalc Free');
  await expect(summary).toContainText('Gratis para siempre');
  await expect(summary.getByText('Suscribirse')).toBeVisible();
  await expect(page.locator('#manage-subscription-btn')).toBeHidden();
  await expect(usage).toContainText('Te quedan 1 recetas.');
  await expect(usage).toContainText('Te quedan 1 ingredientes.');
  await expect(features).toContainText('Duplicar recetas');

  // Pro: precio, renovación y portal.
  await page.context().clearCookies();
  await signIn(page);
  await goto('/settings?tab=billing', { waitUntil: 'hydration' });

  await expect(summary).toContainText('KitchCalc Pro');
  await expect(summary).toContainText('Se renueva el 15/10/2026');
  await expect(summary).toContainText('MXN');
  await expect(summary).toContainText('$19.99');
  await expect(summary.getByText('Cambiar plan')).toBeVisible();
  await expect(page.locator('#manage-subscription-btn')).toBeVisible();
});

test('billing: trial, cancelación y cambio programado', async ({ page, goto, request }) => {
  await resetSettings(request);
  await signIn(page, { subscription: 'trial' });
  await goto('/settings?tab=billing', { waitUntil: 'hydration' });

  await expect(page.getByText('Periodo de prueba activo')).toBeVisible();
  await expect(page.getByText('Tu prueba termina el 1/10/2026.')).toBeVisible();
  await expect(page.getByText('Prueba hasta el 1/10/2026')).toBeVisible();

  await page.context().clearCookies();
  await signIn(page, { subscription: 'canceled' });
  await goto('/settings?tab=billing', { waitUntil: 'hydration' });

  await expect(page.getByText('Suscripción cancelada')).toBeVisible();
  await expect(page.getByText('Tu plan seguirá activo hasta el 15/10/2026.')).toBeVisible();
  await expect(page.getByText('Se cancelará el 15/10/2026')).toBeVisible();

  await page.context().clearCookies();
  await signIn(page, { subscription: 'scheduled' });
  await goto('/settings?tab=billing', { waitUntil: 'hydration' });

  const box = page.locator('[data-scheduled-change]');
  await expect(box).toBeVisible();
  await expect(box).toContainText('Cambio de plan programado');
  await expect(box).toContainText('KitchCalc Basic Mensual');
  await expect(box).toContainText('a partir del 15/10/2026');
  await expect(page.getByText('Cambio programado')).toBeVisible();
});

test('billing: upgrade con confirmación y checkout', async ({ page, goto, request }) => {
  await resetSettings(request);
  await signIn(page, { plan: 'basic' });
  const consoleErrors = trackConsoleErrors(page);

  await goto('/settings?tab=billing', { waitUntil: 'hydration' });

  await page.locator('[data-open-pricing-modal]').click();
  const modal = page.locator('#pricing-modal');
  await expect(modal).toBeVisible();
  await expect(modal.locator('[data-plan="basic"] [data-subscribe-btn]')).toHaveText('Plan actual');
  await expect(modal.locator('[data-plan="basic"] [data-subscribe-btn]')).toBeDisabled();
  await expect(modal.locator('[data-plan="pro"] [data-subscribe-btn]')).toHaveText(
    'Actualizar a Pro'
  );

  // Cambio de periodo dentro del selector.
  await expect(modal.locator('[data-plan="pro"]')).toContainText('$19.99');
  await modal.getByRole('radio', { name: /Anual/ }).click();
  await expect(modal.locator('[data-plan="pro"]')).toContainText('$191.90');

  await modal.locator('[data-plan="pro"] [data-subscribe-btn]').click();

  const confirm = page.locator('#confirm-plan-change-dialog');
  await expect(confirm).toBeVisible();
  await expect(confirm).toContainText('Cambio inmediato (Upgrade)');
  await expect(confirm).toContainText('BASIC Mensual');
  await expect(confirm).toContainText('Pro Anual');

  await confirm.locator('#confirm-plan-change-btn').click();

  // El stub devuelve el successUrl del cliente: aterriza en el banner.
  await expect(page).toHaveURL(/\/settings\?tab=billing&success=1/);
  await expect(page.getByText('Pago exitoso')).toBeVisible();

  const state = await readSettingsState(request);
  expect(state.checkoutAttempts).toBe(1);
  expect(state.lastCheckout?.priceId).toBe('price_pro_yearly');
  expect(state.lastCheckout?.successUrl).toContain('/settings?tab=billing&success=1');
  expect(state.lastCheckout?.cancelUrl).toContain('/settings?tab=billing&canceled=1');
  expect(consoleErrors).toEqual([]);
});

test('billing: downgrade se confirma como cambio programado', async ({ page, goto, request }) => {
  await resetSettings(request);
  await signIn(page);
  await goto('/settings?tab=billing', { waitUntil: 'hydration' });

  await page.locator('[data-open-pricing-modal]').click();
  await page.locator('#pricing-modal [data-plan="basic"] [data-subscribe-btn]').click();

  const confirm = page.locator('#confirm-plan-change-dialog');
  await expect(confirm).toContainText('Cambio programado (Downgrade)');
  await expect(confirm).toContainText('PRO Mensual');
  await expect(confirm).toContainText('hasta 15/10/2026');

  // Cancelar no dispara checkout.
  await confirm.locator('[data-confirm-cancel]').click();
  await expect(confirm).toBeHidden();

  const state = await readSettingsState(request);
  expect(state.checkoutAttempts).toBe(0);
});

test('billing: el portal navega y su error queda inline', async ({ page, goto, request }) => {
  await resetSettings(request);
  await signIn(page);
  await goto('/settings?tab=billing', { waitUntil: 'hydration' });

  await page.locator('#manage-subscription-btn').click();
  await page.waitForURL(/portal=1/);

  const state = await readSettingsState(request);
  expect(state.portalAttempts).toBe(1);

  // Error del portal: sin navegación y con alerta visible.
  await page.context().clearCookies();
  await signIn(page, { portal: 'error' });
  await goto('/settings?tab=billing', { waitUntil: 'hydration' });
  await page.locator('#manage-subscription-btn').click();

  await expect(page.getByText('No se pudo abrir el portal.')).toBeVisible();
  await expect(page).toHaveURL(/\/settings\?tab=billing/);
});

test('billing: ?session_id sincroniza la suscripción y refresca el plan', async ({
  page,
  goto,
  request,
}) => {
  await resetSettings(request);
  // El plan de la sesión es Free: la sincronización lo cambia a Basic.
  await signIn(page, { plan: 'free' });
  await goto('/settings?tab=billing&session_id=cs_test_123', {
    waitUntil: 'hydration',
  });

  await expect(page.getByText('KitchCalc Basic')).toBeVisible();
  await expect(page.getByText('Se renueva el 15/10/2026')).toBeVisible();

  const state = await readSettingsState(request);
  expect(state.syncAttempts).toBe(1);
});

test('responsive: tabs y facturación en 375 sin perder información', async ({
  page,
  goto,
  request,
}) => {
  await resetSettings(request);
  await signIn(page);
  await page.setViewportSize(MOBILE);
  await goto('/settings?tab=billing', { waitUntil: 'hydration' });

  // En móvil los iconos de las tabs se ocultan pero las etiquetas quedan.
  await expect(page.locator('[data-tab="preferences"]')).toBeVisible();
  await expect(page.locator('[data-tab="preferences"] .lucide')).toBeHidden();

  const summary = page.locator('[data-plan-summary]');
  const usage = page.locator('[data-usage-cards]');
  await expect(summary.getByText('Plan actual')).toBeVisible();
  await expect(usage).toContainText('Recetas');
  await expect(usage).toContainText('Ingredientes');

  await page.setViewportSize(DESKTOP);
  await expect(page.locator('[data-tab="preferences"] .lucide')).toBeVisible();
  await expect(summary.getByText('Plan actual')).toBeVisible();
});

/**
 * Frescura sin recargar: el snapshot de sesión del documento y la suscripción
 * de la pestaña se revalidan cuando un cambio ocurre fuera de la app (Stripe).
 * El reload queda prohibido en estos casos: es justo lo que los tests
 * anteriores no cubrían, porque todos entran con `goto("/settings?tab=billing")`.
 */

test('billing: activar la pestaña revalida la suscripción sin recargar', async ({
  page,
  goto,
  request,
  context,
}) => {
  await resetSettings(request);
  await signIn(page, { plan: 'pro' });
  await goto('/settings', { waitUntil: 'hydration' });
  await markPage(page);

  // La suscripción se cancela en Stripe mientras el documento sigue vivo.
  await context.addCookies([{ name: 'qa-subscription', value: 'canceled', url: url('/') }]);

  await page.locator('[data-tab="billing"]').click();

  await expect(page.getByText('Suscripción cancelada')).toBeVisible();
  await expect(page.getByText('Tu plan seguirá activo hasta el 15/10/2026.')).toBeVisible();
  expect(await pageAlive(page)).toBe(true);
});

test('billing: una página restaurada de bfcache revalida sesión y suscripción', async ({
  page,
  goto,
  request,
  context,
}) => {
  await resetSettings(request);
  await signIn(page, { plan: 'free' });
  await goto('/settings?tab=billing', { waitUntil: 'hydration' });
  await markPage(page);

  // Plan y suscripción cambian fuera del documento (Stripe) y el navegador
  // restaura la página sin request: `pageshow` con `persisted`.
  await context.addCookies([
    { name: 'qa-plan', value: 'pro', url: url('/') },
    { name: 'qa-subscription', value: 'canceled', url: url('/') },
  ]);
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });

  await expect(page.getByText('Suscripción cancelada')).toBeVisible();
  // La sesión también: con el plan free el shell no ofrece Producción.
  await expect(page.locator('#sidebar-nav').getByText('Producción')).toBeVisible();
  expect(await pageAlive(page)).toBe(true);
});

/**
 * Flujo real de vuelta del portal. No fija el camino de bfcache —si el
 * navegador recarga el documento, el SSR ya trae el dato—: ese contrato lo
 * cubre el test sintético de `pageshow` con `persisted`.
 */
test('billing: volver del portal con Back actualiza el estado sin recargar', async ({
  page,
  goto,
  request,
  context,
}) => {
  await resetSettings(request);
  await signIn(page, { plan: 'pro' });
  await goto('/settings?tab=billing', { waitUntil: 'hydration' });

  await page.locator('#manage-subscription-btn').click();
  await page.waitForURL(/portal=1/);

  // El usuario cancela la suscripción en el portal y vuelve con el botón atrás.
  await context.addCookies([{ name: 'qa-subscription', value: 'canceled', url: url('/') }]);
  await page.goBack();

  await expect(page.getByText('Suscripción cancelada')).toBeVisible();
});
