import { expect, test } from '@nuxt/test-utils/playwright';
import { url } from '@nuxt/test-utils/e2e';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { PREFERENCE_ACCENT_COLORS } from '@recetario/types';
import { freezeAnimations, scrollPositions, scrollTo } from './support/page-sweep';

/**
 * Barrido de accesibilidad (Task 13a) sobre las superficies reales del rework:
 * públicas indexables, auth y privadas, en 375 y 1280. Bloqueante: cualquier
 * violación `serious`/`critical` falla la suite.
 *
 * Hallazgo 2 del review de landings (2026-09-20): el barrido público estaba en
 * verde con la landing publicando un fallo AA. Dos motivos, los dos corregidos
 * aquí:
 * 1. Se escaneaba una sola posición de scroll y el estado que fallaba —el enlace
 *    activo del navbar, `a[data-spy-active]`— sólo existe mientras su sección
 *    está en viewport: sin scrollear, el nodo ni siquiera está marcado. Ahora el
 *    barrido recorre la página por tramos y une los hallazgos de cada uno.
 * 2. Las públicas se recorren por tramos, en sus dos anchos. La matriz de tema
 *    sigue viva en las superficies privadas (`ACCENT_SURFACES`): el marketing se
 *    fuerza claro (`app.vue`), así que ahí una pasada oscura medía el mismo
 *    documento con otro valor de cookie.
 *
 * `incomplete` no se vuelve bloqueante a ciegas ni se ignora: axe no puede
 * decidir el fondo del texto que cae sobre un `background-image`, así que todo
 * nodo `color-contrast` incompleto tiene que estar en `DOCUMENTED_INCOMPLETE`
 * (regla, selector, motivo y el ratio que mide la sonda de píxeles de
 * `contrast.spec.ts`). Un nodo incompleto sin documentar falla la suite con la
 * lista de los que faltan.
 *
 * La lista está **vacía a propósito**: el rediseño quitó los degradados
 * decorativos (fondo del hero, lavado de "cómo funciona" y banda CTA) y con
 * ellos los nodos que axe no podía juzgar. Es un gate fail-closed: si alguien
 * vuelve a poner texto sobre una imagen de fondo, el barrido falla y obliga a
 * documentarlo con el ratio medido.
 *
 * Las suites de auth, privadas y acentos siguen con un barrido de un solo estado
 * (`scanOnce`) y asertan sólo `violations`, como antes: su deuda no depende del
 * scroll.
 */

type AnalyzeResult = Awaited<ReturnType<AxeBuilder['analyze']>>;

/** Hallazgo aplanado a nodo: lo que se une entre tramos y se documenta. */
type Finding = {
  rule: string;
  impact: string | null;
  help: string;
  target: string;
  summary: string;
};

const MOBILE = { width: 375, height: 800 };
const DESKTOP = { width: 1280, height: 800 };

const PUBLIC_PAGES = ['/', '/funciones', '/pricing', '/privacy', '/terms'] as const;
const AUTH_PAGES = ['/sign-in'] as const;
const PRIVATE_PAGES = ['/recipes', '/ingredients', '/settings', '/produccion'] as const;

/**
 * Nodos que axe deja en `incomplete` y quién responde por ellos.
 *
 * `selector` es el ancla estable del nodo (se comprueba con `element.matches`
 * sobre el elemento que axe señala, así que no hay que copiar los selectores
 * generados por axe). `ratio` es lo que mide la sonda de píxeles de
 * `contrast.spec.ts` en el peor punto de esos nodos: si baja de AA, ese gate
 * falla antes de que este se quede corto.
 *
 * Hoy no hay ninguno en las públicas (el texto ya no cae sobre degradados). Cada
 * entrada futura es deuda nueva y existe sólo porque axe no puede decidir el
 * fondo, nunca porque el par esté exento.
 */
const DOCUMENTED_INCOMPLETE: {
  rule: string;
  selector: string;
  reason: string;
  ratio: string;
}[] = [];

function flatten(result: AnalyzeResult, key: 'violations' | 'incomplete'): Finding[] {
  return result[key].flatMap((violation) =>
    violation.nodes.map((node) => ({
      rule: violation.id,
      impact: violation.impact ?? null,
      help: violation.help,
      target: node.target.join(' '),
      summary: (node.failureSummary ?? '').replace(/\s+/g, ' ').trim(),
    }))
  );
}

/** Un análisis de axe sobre el estado actual de la página. */
async function analyze(page: Page): Promise<{ violations: Finding[]; incomplete: Finding[] }> {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return {
    violations: flatten(result, 'violations'),
    incomplete: flatten(result, 'incomplete'),
  };
}

function describeFindings(findings: Finding[]): string {
  return findings
    .map(
      (finding) =>
        `- ${finding.rule} [${finding.impact}] ${finding.help}\n` +
        `    ${finding.target}\n` +
        `      ${finding.summary}`
    )
    .join('\n');
}

function blocking(findings: Finding[]): Finding[] {
  return findings.filter(
    (finding) => finding.impact === 'serious' || finding.impact === 'critical'
  );
}

function expectNoBlocking(findings: Finding[]): void {
  // Se aserta la longitud con el detalle como mensaje: el diff de objetos de
  // Playwright es ilegible cuando hay muchas violaciones.
  const serious = blocking(findings);
  expect(serious.length, describeFindings(serious)).toBe(0);
}

/**
 * Barrido de la página completa: recorre los tramos y une los hallazgos de cada
 * uno, porque el estado que se busca (scroll-spy, reveals, capturas cargadas)
 * sólo existe en su tramo.
 */
async function scan(page: Page): Promise<{
  violations: Finding[];
  incomplete: Finding[];
}> {
  await freezeAnimations(page);

  const violations = new Map<string, Finding>();
  const incomplete = new Map<string, Finding>();

  for (const position of await scrollPositions(page)) {
    await scrollTo(page, position);
    const result = await analyze(page);
    for (const finding of result.violations) {
      violations.set(`${finding.rule}|${finding.target}`, finding);
    }
    for (const finding of result.incomplete) {
      incomplete.set(`${finding.rule}|${finding.target}`, finding);
    }
  }

  return {
    violations: [...violations.values()],
    incomplete: [...incomplete.values()],
  };
}

/**
 * Barrido de un solo estado, para las superficies sin estado ligado al scroll.
 *
 * axe analiza el documento entero —lo que se le escapa es el estado, no lo que
 * queda bajo el pliegue—, así que en auth, privadas y acentos (donde nada
 * depende del scroll-spy del landing) asentar y medir una vez cubre lo mismo sin
 * pagar once análisis de axe por página.
 */
async function scanOnce(page: Page): Promise<{
  violations: Finding[];
  incomplete: Finding[];
}> {
  await freezeAnimations(page);
  return await analyze(page);
}

/** Comprueba que cada `color-contrast` incompleto esté documentado. */
async function expectDocumentedIncomplete(page: Page, findings: Finding[]): Promise<void> {
  const undecided = findings.filter((finding) => finding.rule === 'color-contrast');
  if (undecided.length === 0) return;

  const documented = await page.evaluate(
    ({ targets, selectors }) =>
      targets.map((target) => {
        let element: Element | null = null;
        try {
          element = document.querySelector(target);
        } catch {
          element = null;
        }
        return element !== null && selectors.some((selector) => element.closest(selector) !== null);
      }),
    {
      targets: undecided.map((finding) => finding.target),
      selectors: DOCUMENTED_INCOMPLETE.map((entry) => entry.selector),
    }
  );

  const undocumented = undecided.filter((_, index) => !documented[index]);
  expect(
    undocumented.length,
    `nodos 'color-contrast' incompletos sin documentar en ` +
      `DOCUMENTED_INCOMPLETE (regla + selector + motivo + ratio medido):\n` +
      describeFindings(undocumented)
  ).toBe(0);
}

for (const path of PUBLIC_PAGES) {
  // Cada test hace 2 barridos completos (2 anchos) con ~11 análisis de axe por
  // barrido. En el runner de CI, bastante más lento que local, la página `/` no
  // cabe en el timeout por defecto de 30s y el test muere a mitad del
  // recorrido; el presupuesto va por test para no inflar el resto.
  test(
    `pública ${path}: sin violaciones blocking en 375 y 1280`,
    { timeout: 120_000 },
    async ({ page, goto }) => {
      for (const viewport of [MOBILE, DESKTOP]) {
        await page.setViewportSize(viewport);
        await goto(path, { waitUntil: 'hydration' });
        const { violations, incomplete } = await scan(page);
        expectNoBlocking(
          violations.map((finding) => ({
            ...finding,
            summary: `${viewport.width}px · ${finding.summary}`,
          }))
        );
        await expectDocumentedIncomplete(page, incomplete);
      }
    }
  );
}

for (const path of AUTH_PAGES) {
  test(`auth ${path}: sin violaciones blocking en 375 y 1280`, async ({ page, goto }) => {
    for (const viewport of [MOBILE, DESKTOP]) {
      await page.setViewportSize(viewport);
      await goto(path, { waitUntil: 'hydration' });
      const { violations } = await scanOnce(page);
      expectNoBlocking(violations);
    }
  });
}

for (const path of PRIVATE_PAGES) {
  test(`privada ${path}: sin violaciones blocking en 375 y 1280`, async ({ page, goto }) => {
    await page.context().addCookies([
      {
        name: 'better-auth.session_token',
        value: 'stub-session-token',
        url: url('/'),
      },
    ]);

    for (const viewport of [MOBILE, DESKTOP]) {
      await page.setViewportSize(viewport);
      await goto(path, { waitUntil: 'hydration' });
      const { violations } = await scanOnce(page);
      expectNoBlocking(violations);
    }
  });
}

/**
 * Superficies privadas donde el acento elegido por el usuario pinta texto y
 * fondos: chips/pills del listado, tabla de ingredientes (preview de costo),
 * planificador, detalle de receta y settings (swatches, tabs, facturación).
 * Las públicas y las de auth siempre son coral, así que las cubre el barrido
 * base.
 */
const ACCENT_SURFACES = [
  '/recipes',
  '/recipes/1',
  '/ingredients',
  '/produccion',
  '/settings?tab=preferences',
  '/settings?tab=billing',
] as const;

/**
 * Hallazgo 13a #2: el barrido base sólo medía el acento por defecto de cada
 * zona (coral en público/auth, esmeralda en privado). Aquí se recorren las 7
 * familias con las cookies de presentación —cookie-first, el middleware las
 * respeta por encima de la preferencia de la sesión— en claro y oscuro.
 *
 * Sólo 1280: las familias cambian colores, no geometría, y 375/1280 ya se
 * cubre en el barrido base de cada superficie. Encontró deuda real (texto del
 * acento sobre tinte y sobre fondo neutro en indigo/violet/blue/rose/coral
 * dark y emerald/amber/coral light); el arreglo vive en los componentes.
 */
for (const path of ACCENT_SURFACES) {
  // 7 familias x 2 temas = 14 navegaciones con su análisis de axe por test.
  // Corre holgado en local pero al límite del default de 30s en CI, así que
  // lleva el mismo presupuesto amplio que el barrido público.
  test(
    `acentos ${path}: sin violaciones blocking en 7 familias x claro/oscuro`,
    { timeout: 90_000 },
    async ({ page, goto }) => {
      await page.context().addCookies([
        {
          name: 'better-auth.session_token',
          value: 'stub-session-token',
          url: url('/'),
        },
      ]);
      await page.setViewportSize(DESKTOP);

      for (const accent of PREFERENCE_ACCENT_COLORS) {
        for (const theme of ['light', 'dark'] as const) {
          await page.context().addCookies([
            { name: 'kitchcalc-accent', value: accent, url: url('/') },
            { name: 'kitchcalc-theme', value: theme, url: url('/') },
          ]);
          await goto(path, { waitUntil: 'hydration' });
          const { violations } = await scanOnce(page);
          const serious = blocking(violations);
          expect(
            serious.length,
            `${path} · acento ${accent} · ${theme}\n${describeFindings(serious)}`
          ).toBe(0);
        }
      }
    }
  );
}
