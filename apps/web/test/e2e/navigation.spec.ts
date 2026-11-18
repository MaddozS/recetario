import { expect, test } from '@nuxt/test-utils/playwright';
import { url } from '@nuxt/test-utils/e2e';

/**
 * Navegación entre secciones del shell. Dos contratos:
 *
 * 1. Es SPA: el click no recarga el documento (una marca en `window` sobrevive).
 * 2. Da feedback inmediato: el enlace destino queda pendiente desde el mismo
 *    frame del click, sin esperar a que la navegación resuelva.
 */

const SESSION_COOKIE = {
  name: 'better-auth.session_token',
  value: 'stub-session-token',
};
const MOBILE = { width: 375, height: 800 };
const DESKTOP = { width: 1280, height: 800 };

declare global {
  interface Window {
    __navProbe?: number;
  }
}

test('escritorio: navegar entre secciones no recarga el documento y marca el destino pendiente', async ({
  page,
  goto,
}) => {
  await page.context().addCookies([{ ...SESSION_COOKIE, url: url('/') }]);
  await page.setViewportSize(DESKTOP);
  await goto('/recipes');

  // La marca sólo sobrevive si la navegación fue client-side.
  await page.evaluate(() => {
    window.__navProbe = 1;
  });

  await page.locator('#sidebar-nav').getByRole('link', { name: 'Ingredientes' }).click();

  await expect(page.locator('#sidebar-nav a[data-pending="1"]')).toHaveText('Ingredientes');

  await expect(page).toHaveURL(/\/ingredients$/);
  await expect(page.locator('#sidebar-nav a[data-pending]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__navProbe)).toBe(1);
});

test('móvil: el bottom nav marca el destino pendiente', async ({ page, goto }) => {
  await page.context().addCookies([{ ...SESSION_COOKIE, url: url('/') }]);
  await page.setViewportSize(MOBILE);
  await goto('/recipes');

  await page.locator('#bottom-nav').getByRole('link', { name: 'Ingredientes' }).click();

  await expect(page.locator('#bottom-nav a[data-pending="1"]')).toHaveText('Ingredientes');

  await expect(page).toHaveURL(/\/ingredients$/);
  await expect(page.locator('#bottom-nav a[data-pending]')).toHaveCount(0);
});
