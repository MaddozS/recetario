import { expect, test } from '@nuxt/test-utils/playwright';
import { url } from '@nuxt/test-utils/e2e';

/**
 * Flujos de autenticación contra el stub del API: metadata SSR, cabeceras de
 * no-caché, los cinco flujos y el smoke del inicio de OAuth (sin proveedor).
 */

const SESSION_COOKIE = 'better-auth.session_token=stub-session-token';
const MOBILE = { width: 375, height: 800 };
const DESKTOP = { width: 1280, height: 800 };

const AUTH_PAGES = [
  { path: '/sign-in', title: 'Iniciar sesión | KitchCalc' },
  { path: '/sign-up', title: 'Crear cuenta | KitchCalc' },
  { path: '/forgot-password', title: 'Recuperar contraseña | KitchCalc' },
  { path: '/reset-password', title: 'Nueva contraseña | KitchCalc' },
  { path: '/verify-email', title: 'Verificar correo | KitchCalc' },
] as const;

function metaTags(html: string): Record<string, string>[] {
  return [...html.matchAll(/<meta\s+([^>]*)>/gi)].map((match) => {
    const attributes: Record<string, string> = {};
    for (const attribute of (match[1] ?? '').matchAll(/([\w:-]+)="([^"]*)"/g)) {
      attributes[attribute[1] ?? ''] = attribute[2] ?? '';
    }
    return attributes;
  });
}

function metaContent(html: string, attribute: 'name' | 'property', value: string): string | null {
  return metaTags(html).find((tag) => tag[attribute] === value)?.content ?? null;
}

function canonicalHref(html: string): string | null {
  return (
    [...html.matchAll(/<link\s+([^>]*)>/gi)]
      .map((match) => {
        const attributes: Record<string, string> = {};
        for (const attribute of (match[1] ?? '').matchAll(/([\w:-]+)="([^"]*)"/g)) {
          attributes[attribute[1] ?? ''] = attribute[2] ?? '';
        }
        return attributes;
      })
      .find((tag) => tag.rel === 'canonical')?.href ?? null
  );
}

for (const page of AUTH_PAGES) {
  test(`SSR de ${page.path}: título propio, noindex y sin canonical`, async ({ request }) => {
    const response = await request.get(url(page.path));
    expect(response.status()).toBe(200);

    const html = await response.text();
    expect(html).toContain('lang="es"');
    expect(html).toContain(`<title>${page.title}</title>`);
    expect(metaContent(html, 'name', 'robots')).toBe('noindex, nofollow');
    expect(canonicalHref(html)).toBeNull();
    expect(metaContent(html, 'property', 'og:url')).toBeNull();
    expect([...html.matchAll(/<h1[\s>]/g)]).toHaveLength(1);
  });
}

test('el token y el email de la URL no entran en metadata ni en cabeceras indexables', async ({
  request,
}) => {
  const response = await request.get(url('/reset-password?token=secreto-123&email=qa@example.com'));
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('private, no-store');
  expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');

  const html = await response.text();
  for (const tag of metaTags(html)) {
    expect(tag.content ?? '').not.toContain('secreto-123');
    expect(tag.content ?? '').not.toContain('qa@example.com');
  }
  expect(canonicalHref(html)).toBeNull();

  const verify = await request.get(url('/verify-email?token=secreto-456&callbackURL=/recipes'));
  expect(verify.headers()['x-robots-tag']).toBe('noindex, nofollow');
});

test('con sesión, /sign-in y /sign-up redirigen a la app', async ({ request }) => {
  for (const path of ['/sign-in', '/sign-up']) {
    const response = await request.get(url(path), {
      headers: { cookie: SESSION_COOKIE },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(302);
    expect(new URL(response.headers().location ?? '', url('/')).pathname).toBe('/recipes');
  }
});

test('sign-in: credenciales inválidas no crean sesión', async ({ page, goto }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.setViewportSize(DESKTOP);
  await goto('/sign-in', { waitUntil: 'hydration' });

  await page.locator('#sign-in-email').fill('qa@example.com');
  await page.locator('#sign-in-password').fill('incorrecta');
  await page.locator('#sign-in-submit').click();

  await expect(page.getByText('Credenciales inválidas.')).toBeVisible();
  expect(
    (await page.context().cookies()).some((cookie) => cookie.name === 'better-auth.session_token')
  ).toBe(false);
  // El 401 del API deja un "Failed to load resource" esperado en consola; aquí
  // sólo se exige que Vue no rompa.
  expect(pageErrors).toEqual([]);
});

test('sign-in: válido respeta el redirect y muestra el shell', async ({ page, goto }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.setViewportSize(DESKTOP);
  await goto('/sign-in?redirect=/pricing', { waitUntil: 'hydration' });

  await page.locator('#sign-in-email').fill('qa@example.com');
  await page.locator('#sign-in-password').fill('Temporal123!');
  await page.locator('#sign-in-submit').click();

  await page.waitForURL(/\/pricing$/);
  await expect(page.locator('h1')).toHaveText('Planes y precios');

  await goto('/recipes', { waitUntil: 'hydration' });
  await expect(page.locator('#sign-out-button')).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test('sign-in: email sin verificar ofrece reenviar el correo', async ({ page, goto }) => {
  await goto('/sign-in', { waitUntil: 'hydration' });

  await page.locator('#sign-in-email').fill('unverified@example.com');
  await page.locator('#sign-in-password').fill('Temporal123!');
  await page.locator('#sign-in-submit').click();

  const verify = page.locator('[data-sign-in-verify]');
  await expect(verify).toBeVisible();
  await verify.getByRole('button', { name: 'Reenviar correo' }).click();
  await expect(verify).toContainText('Reenviado. Revisa tu correo!');
});

test('sign-in: explica el error de OAuth y el motivo del redirect', async ({ page, goto }) => {
  await goto('/sign-in?error=state_mismatch', { waitUntil: 'hydration' });
  await expect(page.getByText('Error de seguridad. Intenta de nuevo.')).toBeVisible();

  await goto('/sign-in?reason=session_expired', { waitUntil: 'hydration' });
  await expect(page.getByText('Tu sesión expiró. Vuelve a iniciar sesión.')).toBeVisible();
});

test('sign-in: el botón de Google hace el POST social y navega al proveedor', async ({
  page,
  goto,
}) => {
  await goto('/sign-in', { waitUntil: 'hydration' });

  const request = page.waitForRequest((candidate) =>
    candidate.url().includes('/api/auth/sign-in/social')
  );
  await page.locator('[data-google-sign-in]').click();

  const socialRequest = await request;
  expect(socialRequest.method()).toBe('POST');
  expect(JSON.parse(socialRequest.postData() ?? '{}')).toEqual({
    provider: 'google',
    callbackURL: expect.stringMatching(/\/recipes$/),
  });

  // El stub devuelve una URL local: no se toca Google.
  await page.waitForURL(/oauth=stub/);
});

test('sign-up: reglas en vivo, confirmación y vista de verificación', async ({ page, goto }) => {
  await page.setViewportSize(MOBILE);
  await goto('/sign-up', { waitUntil: 'hydration' });

  await page.locator('#sign-up-first-name').fill('QA');
  await page.locator('#sign-up-last-name').fill('Prueba');
  await page.locator('#sign-up-email').fill('nuevo@example.com');

  await page.locator('#sign-up-password').fill('Abcdef1!');
  await expect(page.locator('[data-rule]')).toHaveCount(5);
  await expect(page.locator('[data-rule="min"]')).toHaveAttribute('data-passed', '1');

  await page.locator('#sign-up-confirmation').fill('Abcdef2!');
  await expect(page.locator('[data-password-match]')).toContainText('no coinciden');

  await page.locator('#sign-up-confirmation').fill('Abcdef1!');
  await page.locator('#sign-up-submit').click();

  const verified = page.locator('[data-sign-up-verified]');
  await expect(verified).toBeVisible();
  await expect(verified).toContainText('nuevo@example.com');

  // La vista pendiente sobrevive la recarga (sessionStorage).
  await page.reload();
  await expect(page.locator('[data-sign-up-verified]')).toBeVisible();
});

test('sign-up: contraseña que no cumple las reglas no llega al API', async ({ page, goto }) => {
  await goto('/sign-up', { waitUntil: 'hydration' });

  await page.locator('#sign-up-first-name').fill('QA');
  await page.locator('#sign-up-last-name').fill('Prueba');
  await page.locator('#sign-up-email').fill('nuevo@example.com');
  await page.locator('#sign-up-password').fill('abcdefgh');
  await page.locator('#sign-up-confirmation').fill('abcdefgh');
  await page.locator('#sign-up-submit').click();

  await expect(
    page.getByText('La contraseña no cumple los requisitos de seguridad.')
  ).toBeVisible();
  await expect(page.locator('[data-sign-up-verified]')).toBeHidden();
});

test('forgot-password: la respuesta es la misma exista o no el email', async ({ page, goto }) => {
  const message = 'Si el email existe, recibirás un enlace para restablecer tu contraseña.';

  await goto('/forgot-password', { waitUntil: 'hydration' });
  await page.locator('#forgot-email').fill('existe@example.com');
  await page.locator('#forgot-submit').click();
  await expect(page.getByText(message)).toBeVisible();

  await page.locator('#forgot-email').fill('no-existe@example.com');
  await page.locator('#forgot-submit').click();
  await expect(page.getByText(message)).toBeVisible();
});

test('reset-password: token válido, countdown y éxito', async ({ page, goto }) => {
  await page.setViewportSize(DESKTOP);
  await goto('/reset-password?token=reset-valid', { waitUntil: 'hydration' });

  await expect(page.locator('[data-reset-countdown]')).toHaveText('09:00');

  await page.locator('#reset-password').fill('Temporal123!');
  await page.locator('#reset-confirmation').fill('Temporal123!');
  await expect(page.locator('[data-rule="min"]')).toHaveAttribute('data-passed', '1');
  await page.locator('#reset-submit').click();

  const success = page.locator('[data-reset-success]');
  await expect(success).toBeVisible();
  await expect(success).toContainText('Contraseña actualizada');
});

test('reset-password: enlace inválido y expirado', async ({ page, goto }) => {
  await goto('/reset-password?token=reset-expired', { waitUntil: 'hydration' });

  await expect(page.locator('[data-reset-status]')).toContainText('El enlace ha expirado');
  await expect(page.locator('[data-reset-expired]')).toBeVisible();
  await expect(page.locator('#reset-submit')).toBeHidden();

  await goto('/reset-password', { waitUntil: 'hydration' });
  await expect(page.locator('[data-reset-invalid]')).toBeVisible();
});

test('reset-password: el countdown agotado muestra la vista expirada', async ({ page, goto }) => {
  await goto('/reset-password?token=reset-short', { waitUntil: 'hydration' });

  await expect(page.locator('[data-reset-countdown]')).toHaveText('00:02');
  await expect(page.locator('[data-reset-expired]')).toBeVisible({
    timeout: 8_000,
  });
});

test('reset-password: el enlace expirado lleva el email al formulario', async ({ page, goto }) => {
  await goto('/reset-password?token=reset-expired&email=qa%40example.com', {
    waitUntil: 'hydration',
  });

  await page.getByRole('link', { name: 'Solicitar nuevo enlace' }).click();
  await page.waitForURL(/\/forgot-password\?email=qa%40example\.com$/);

  await expect(page.locator('#forgot-email')).toHaveValue('qa@example.com');
});

test('verify-email: éxito con callback seguro, token inválido y ausente', async ({
  page,
  goto,
}) => {
  await page.setViewportSize(MOBILE);
  await goto('/verify-email?token=verify-valid&callbackURL=/recipes', {
    waitUntil: 'hydration',
  });

  const success = page.locator('[data-verify-success]');
  await expect(success).toBeVisible();
  await expect(success.locator('a')).toHaveAttribute('href', '/recipes');

  await goto('/verify-email?token=malo', { waitUntil: 'hydration' });
  await expect(page.locator('[data-verify-error]')).toBeVisible();

  await goto('/verify-email', { waitUntil: 'hydration' });
  await expect(page.locator('[data-verify-error-message]')).toContainText(
    'No se encontró el token'
  );
});

test('verify-email: un callback externo no se refleja en el botón', async ({ page, goto }) => {
  await goto('/verify-email?token=verify-valid&callbackURL=https://evil.example/phish', {
    waitUntil: 'hydration',
  });

  await expect(page.locator('[data-verify-success] a')).toHaveAttribute('href', '/sign-in');
});

test('las cinco páginas hidratan sin errores de consola', async ({ page, goto }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  for (const page_ of AUTH_PAGES) {
    await goto(page_.path, { waitUntil: 'hydration' });
    await expect(page.locator('h1')).toBeVisible();
  }

  expect(consoleErrors).toEqual([]);
});
