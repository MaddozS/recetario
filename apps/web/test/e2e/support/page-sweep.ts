import type { Page } from '@playwright/test';

/**
 * Utilidades de recorrido compartidas por los dos gates de las superficies
 * públicas: el barrido de axe (`a11y.spec.ts`) y la sonda de contraste
 * (`contrast.spec.ts`).
 *
 * Las dos necesitan lo mismo antes de medir: la página asentada (sin animaciones
 * en vuelo y sin reveals a media opacidad) y un recorrido completo por tramos,
 * porque la landing cambia de estado al scrollear: el scroll-spy sólo marca el
 * enlace activo mientras su sección está en viewport, y con él aparece el nodo
 * que el review midió en 3.54:1.
 */

/**
 * Deja la página en su estado final antes de medir.
 *
 * Las páginas privadas entran con animaciones de opacidad (`.animate-fade-in` y
 * las `statFadeIn`/`cardFadeIn` con `animation-fill-mode: both` de las stats y
 * las cards), y la landing usa `v-reveal` (`[data-reveal]` en opacidad 0 hasta
 * entrar en viewport). Sin asentar, axe mide colores mezclados con la animación
 * (o elementos aún en opacidad 0) y reporta contrastes falsos. La sonda de
 * contraste, además, necesita opacidad 1 para muestrear el fondo real.
 *
 * Ojo: una transición **ya en vuelo** no la ataja cambiar su duración —el valor
 * animado tapa al especificado—, así que en un runner lento (CI) el barrido
 * medía el hero a media opacidad y reportaba `color-contrast` falso. `none` en
 * `animation`/`transition` cancela lo que esté corriendo y deja el estado final;
 * después se espera a que no quede ninguna animación viva.
 */
export async function freezeAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
      }
      [data-reveal],
      .reveal-item,
      [data-reveal] .reveal-item {
        opacity: 1 !important;
        transform: none !important;
      }
    `,
  });
  await page.waitForFunction(() => document.getAnimations().length === 0, undefined, {
    timeout: 5_000,
  });
}

/** Posiciones de scroll a recorrer: tramos con solape y el final de la página. */
export async function scrollPositions(page: Page, step = 0.75): Promise<number[]> {
  return await page.evaluate((fraction) => {
    const height = document.documentElement.scrollHeight;
    const jump = Math.max(1, Math.round(window.innerHeight * fraction));
    const list: number[] = [];
    for (let y = 0; y < height; y += jump) list.push(y);
    list.push(Math.max(0, height - window.innerHeight));
    return list;
  }, step);
}

/**
 * Salta a una posición y espera un frame: `scroll-behavior: smooth` (el landing
 * lo activa) haría asincrónico el `scrollTo` sin `behavior: "instant"`.
 */
export async function scrollTo(page: Page, top: number): Promise<void> {
  await page.evaluate((y) => {
    window.scrollTo({ top: y, behavior: 'instant' });
  }, top);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))));
}
