import type { Page } from "@playwright/test";
import { freezeAnimations, scrollPositions, scrollTo } from "./page-sweep";

/**
 * Sonda de contraste medida sobre píxeles renderizados.
 *
 * axe deja en `incomplete` todo texto que cae sobre un `background-image`: en el
 * landing eso son los 21–41 nodos del hero, "cómo funciona" y las cards de plan
 * ("Element's background color could not be determined due to a background
 * gradient"). La allowlist de `a11y.spec.ts` documenta esos nodos, y este archivo
 * es quien los juzga de verdad: oculta el color del texto, captura el viewport y
 * muestrea el fondo real debajo de cada caja de línea, degradados incluidos.
 *
 * Decisiones que hacen la medición honesta:
 * - Se muestrea el píxel, no se compone el CSS: el degradado radial del hero, el
 *   `color-mix` en `oklab` y la superposición del navbar quedan como los pinta el
 *   navegador.
 * - El texto se recompone con su alfa efectiva (alfa del color × `opacity` de los
 *   ancestros) sobre el píxel medido, así que `text-white/70` se mide como se ve.
 * - El criterio por nodo es el peor punto muestreado: si un tramo del degradado
 *   falla, el nodo falla.
 * - Los controles del navbar son fijos y opacos: las cajas que quedan debajo se
 *   descartan en ese tramo (se miden cuando el scroll las deja libres).
 * - Ocultar el color también apaga los íconos dibujados con `currentColor`; el
 *   fondo muestreado es el que el texto tiene por debajo, que es lo que se juzga.
 */

type Rgb = [number, number, number];

type SamplePoint = { x: number; y: number };

type TextSample = {
  key: string;
  text: string;
  path: string;
  color: Rgb;
  alpha: number;
  fontSize: number;
  fontWeight: number;
  points: SamplePoint[];
};

export type ContrastMeasurement = {
  path: string;
  text: string;
  ratio: number;
  required: number;
  fontSize: number;
  fontWeight: number;
  color: string;
  declared: string;
  alpha: number;
  background: string;
  point: SamplePoint;
};

const MAX_TEXT_LENGTH = 48;

/**
 * El asentado pasa antes por aquí: los runners que transpilan con esbuild
 * (`keepNames`, p. ej. `tsx` al iterar la sonda desde la terminal) envuelven cada
 * función ligada a un nombre dentro de `page.evaluate` en una llamada a
 * `__name`, un helper del transpilador que no existe en la página. El runner de
 * Playwright no lo inyecta, pero el shim es inocuo en los dos caminos y evita que
 * la sonda dependa de cómo se lance.
 */
async function installNameShim(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scope = globalThis as unknown as Record<string, unknown>;
    scope.__name ??= (value: unknown) => value;
  });
}

/** Quita el color del texto (y su sombra) sin tocar el layout. */
async function hideText(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        color: transparent !important;
        text-shadow: none !important;
        -webkit-text-fill-color: transparent !important;
      }
    `,
  });
}

const formatRgb = ([r, g, b]: Rgb): string => `rgb(${r}, ${g}, ${b})`;

/** Luminancia relativa WCAG 2.1. */
const luminance = ([r, g, b]: Rgb): number => {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrast = (a: Rgb, b: Rgb): number => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

/** Compone el texto (con su alfa) sobre el fondo medido. */
const composite = (foreground: Rgb, alpha: number, background: Rgb): Rgb =>
  foreground.map((channel, index) =>
    Math.round(channel * alpha + background[index] * (1 - alpha)),
  ) as Rgb;

/** Umbral WCAG 2.1: 3:1 para texto grande (≥24px, o ≥18.66px en negrita). */
const requiredRatio = (fontSize: number, fontWeight: number): number =>
  fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700) ? 3 : 4.5;

/**
 * Recoge los nodos de texto visibles en el tramo actual, con sus cajas de línea
 * y los puntos a muestrear (interiores, para no rozar el antialias del borde).
 *
 * `requireOpaqueText` distingue las dos pasadas de `measureContrast`: la primera
 * sólo quiere texto realmente visible (su color y su alfa), la segunda mide la
 * geometría con los glifos ya transparentes, así que ahí el color no filtra nada.
 */
async function collectSamples(
  page: Page,
  { requireOpaqueText = true }: { requireOpaqueText?: boolean } = {},
): Promise<TextSample[]> {
  return await page.evaluate(
    ({ maxLength, opaqueOnly }) => {
      const SKIPPED_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT"]);
      const INSET = 2;
      const MIN_SIZE = 6;

      const clamp01 = (value: number): number =>
        Math.min(1, Math.max(0, value));

      /** Lineal → sRGB (transferencia de la especificación CSS Color 4). */
      const gamma = (value: number): number =>
        clamp01(value) <= 0.0031308
          ? clamp01(value) * 12.92
          : 1.055 * clamp01(value) ** (1 / 2.4) - 0.055;

      const toRgb = (channels: number[]): [number, number, number] =>
        channels.map((channel) => Math.round(gamma(channel) * 255)) as [
          number,
          number,
          number,
        ];

      /** OKLab → sRGB lineal (matriz de la especificación). */
      const oklabToRgb = (lightness: number, a: number, b: number) => {
        const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
        const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
        const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
        return toRgb([
          4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
          -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
          -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
        ]);
      };

      /**
       * Color computado → sRGB 8 bits + alfa. Chromium conserva `oklch()` en el
       * valor computado de los tokens oscuros, así que no basta con `rgb()`.
       * Cualquier sintaxis no soportada falla en voz alta en vez de medir negro.
       */
      const parseColor = (
        value: string,
      ): { rgb: [number, number, number]; alpha: number } => {
        const trimmed = value.trim();
        if (trimmed.startsWith("#")) {
          const hex = trimmed.slice(1);
          return {
            rgb: [0, 2, 4].map((index) =>
              Number.parseInt(hex.slice(index, index + 2), 16),
            ) as [number, number, number],
            alpha: 1,
          };
        }

        const open = trimmed.indexOf("(");
        const name = trimmed.slice(0, open).toLowerCase();
        const body = trimmed.slice(open + 1, trimmed.lastIndexOf(")"));
        const [head, alphaPart] = body.split("/");
        const parts = head.trim().split(/[\s,]+/);
        const number = (index: number): number =>
          Number.parseFloat(parts[index] ?? "0");
        const alphaOf = (legacyIndex: number): number => {
          if (alphaPart !== undefined) {
            return (
              Number.parseFloat(alphaPart) / (alphaPart.includes("%") ? 100 : 1)
            );
          }
          return parts.length > legacyIndex ? number(legacyIndex) : 1;
        };

        if (name === "rgb" || name === "rgba") {
          // Ya viene en sRGB con transferencia aplicada: no se vuelve a convertir.
          return {
            rgb: [number(0), number(1), number(2)].map((channel) =>
              Math.round(clamp01(channel / 255) * 255),
            ) as [number, number, number],
            alpha: alphaOf(3),
          };
        }
        if (name === "oklch") {
          const hue = (number(2) * Math.PI) / 180;
          return {
            rgb: oklabToRgb(
              number(0),
              number(1) * Math.cos(hue),
              number(1) * Math.sin(hue),
            ),
            alpha: alphaOf(3),
          };
        }
        if (name === "oklab") {
          return {
            rgb: oklabToRgb(number(0), number(1), number(2)),
            alpha: alphaOf(3),
          };
        }
        throw new Error(
          `color no soportado en la sonda de contraste: ${value}`,
        );
      };

      const pathOf = (element: Element): string => {
        const parts: string[] = [];
        let node: Element | null = element;
        while (node && node !== document.body) {
          const parent: Element | null = node.parentElement;
          if (!parent) break;
          const index = Array.from(parent.children).indexOf(node) + 1;
          parts.unshift(`${node.tagName.toLowerCase()}:nth-child(${index})`);
          node = parent;
        }
        return parts.join(" > ");
      };

      const navbar = document.querySelector("nav");
      const safeTop = navbar
        ? Math.max(0, navbar.getBoundingClientRect().bottom)
        : 0;
      const safeBottom = window.innerHeight;

      const samples: TextSample[] = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
      );

      let node = walker.nextNode();
      while (node) {
        const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
        const element = node.parentElement;
        if (text.length > 0 && element) {
          const insideInert = element.closest("[inert]") !== null;
          if (!insideInert && !SKIPPED_TAGS.has(element.tagName)) {
            const style = window.getComputedStyle(element);
            const visible =
              style.visibility === "visible" && style.display !== "none";

            let opacity = Number(style.opacity);
            for (
              let ancestor = element.parentElement;
              ancestor;
              ancestor = ancestor.parentElement
            ) {
              opacity *= Number(window.getComputedStyle(ancestor).opacity);
            }

            if (visible && opacity > 0.05) {
              // El navbar es fijo y opaco: tapa lo que pasa por debajo, así que
              // las cajas de debajo se miden cuando el scroll las deja libres.
              // Su propio texto, en cambio, va sobre su fondo: se mide siempre.
              const top = element.closest("nav") ? 0 : safeTop;
              const range = document.createRange();
              range.selectNodeContents(node);
              const points: SamplePoint[] = [];
              const rects = Array.from(range.getClientRects()).filter(
                (rect) => {
                  const insideViewport =
                    rect.height >= MIN_SIZE &&
                    rect.width >= MIN_SIZE &&
                    rect.top >= top &&
                    rect.bottom <= safeBottom &&
                    rect.right > 0 &&
                    rect.left < window.innerWidth;
                  return insideViewport;
                },
              );

              for (const rect of rects) {
                const left = rect.left + INSET;
                const right = rect.right - INSET;
                const top = rect.top + INSET;
                const bottom = rect.bottom - INSET;
                if (right <= left || bottom <= top) continue;
                const middleY = (top + bottom) / 2;
                const middleX = (left + right) / 2;
                points.push(
                  { x: left + (right - left) * 0.2, y: middleY },
                  { x: middleX, y: middleY },
                  { x: left + (right - left) * 0.8, y: middleY },
                  { x: middleX, y: top },
                  { x: middleX, y: bottom },
                );
              }

              if (points.length > 0) {
                const { rgb, alpha: colorAlpha } = parseColor(style.color);
                const effectiveAlpha = colorAlpha * opacity;

                // Texto del todo transparente no es texto legible: no hay nada que
                // medir (p. ej. glifos que sólo existen para lectores de pantalla).
                if (!opaqueOnly || effectiveAlpha > 0.1) {
                  const path = pathOf(element);
                  samples.push({
                    key: `${path}|${text}`,
                    text:
                      text.length > maxLength
                        ? `${text.slice(0, maxLength)}…`
                        : text,
                    path,
                    color: rgb,
                    alpha: effectiveAlpha,
                    fontSize: Number.parseFloat(style.fontSize),
                    fontWeight: Number(style.fontWeight),
                    points,
                  });
                }
              }
            }
          }
        }
        node = walker.nextNode();
      }

      return samples;
    },
    { maxLength: MAX_TEXT_LENGTH, opaqueOnly: requireOpaqueText },
  );
}

/** Decodifica la captura en la página y devuelve el píxel de cada punto. */
async function samplePixels(
  page: Page,
  shot: string,
  points: SamplePoint[],
): Promise<Rgb[]> {
  return await page.evaluate(
    async ({ base64, targets }) => {
      const response = await fetch(`data:image/png;base64,${base64}`);
      const bitmap = await createImageBitmap(await response.blob());
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("sin contexto 2d para leer la captura");
      context.drawImage(bitmap, 0, 0);
      const { data, width, height } = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );

      return targets.map(({ x, y }) => {
        const px = Math.min(width - 1, Math.max(0, Math.round(x)));
        const py = Math.min(height - 1, Math.max(0, Math.round(y)));
        const index = (py * width + px) * 4;
        return [
          data[index] ?? 0,
          data[index + 1] ?? 0,
          data[index + 2] ?? 0,
        ] as [number, number, number];
      });
    },
    { base64: shot, targets: points },
  );
}

/**
 * Recorre la superficie por tramos y devuelve, por cada nodo de texto, el peor
 * contraste medido contra el fondo que realmente tiene detrás.
 *
 * Dos pasadas, porque ocultar el texto para medir el fondo también borra su color
 * computado: la primera recoge color, alfa, tamaño y cajas de cada nodo con el
 * texto visible; la segunda —ya con los glifos transparentes— captura el viewport
 * en cada tramo y muestrea el fondo debajo de esas mismas cajas.
 */
export async function measureContrast(
  page: Page,
  { scrollStep = 0.9 }: { scrollStep?: number } = {},
): Promise<ContrastMeasurement[]> {
  await installNameShim(page);
  await freezeAnimations(page);

  const positions = await scrollPositions(page, scrollStep);

  // Un nodo puede tomar varios colores según el estado (el enlace activo del
  // navbar pasa de gris a acento al scrollear): se guardan todas sus variantes y
  // la medición las juzga todas contra el fondo de esa misma caja.
  const declared = new Map<string, TextSample[]>();
  for (const y of positions) {
    await scrollTo(page, y);
    for (const sample of await collectSamples(page)) {
      const variants = declared.get(sample.key) ?? [];
      const known = variants.some(
        (variant) =>
          variant.color.join() === sample.color.join() &&
          variant.alpha === sample.alpha,
      );
      if (!known) variants.push(sample);
      declared.set(sample.key, variants);
    }
  }

  await hideText(page);

  const measurements = new Map<string, ContrastMeasurement>();
  for (const y of positions) {
    await scrollTo(page, y);
    const samples = await collectSamples(page, { requireOpaqueText: false });
    if (samples.length === 0) continue;

    const shot = (await page.screenshot({ type: "png" })).toString("base64");
    const pixels = await samplePixels(
      page,
      shot,
      samples.flatMap((sample) => sample.points),
    );

    let cursor = 0;
    for (const sample of samples) {
      const variants = declared.get(sample.key) ?? [];
      for (const point of sample.points) {
        const background = pixels[cursor];
        cursor += 1;
        if (!background) continue;

        for (const variant of variants) {
          const key = `${sample.key}|${variant.color.join()}`;
          const required = requiredRatio(variant.fontSize, variant.fontWeight);
          const rendered = composite(variant.color, variant.alpha, background);
          const ratio = contrast(rendered, background);
          const previous = measurements.get(key);
          if (!previous || ratio < previous.ratio) {
            measurements.set(key, {
              path: variant.path,
              text: variant.text,
              ratio,
              required,
              fontSize: variant.fontSize,
              fontWeight: variant.fontWeight,
              color: formatRgb(rendered),
              declared: formatRgb(variant.color),
              alpha: variant.alpha,
              background: formatRgb(background),
              point,
            });
          }
        }
      }
    }
  }

  return [...measurements.values()];
}

/** Los nodos medidos que no llegan a su umbral: es lo que falla la superficie. */
export async function collectContrastFailures(
  page: Page,
  options: { scrollStep?: number } = {},
): Promise<ContrastMeasurement[]> {
  const measurements = await measureContrast(page, options);
  return measurements.filter((entry) => entry.ratio < entry.required);
}

/** Mensaje legible para el assert (Playwright no imprime arrays de objetos). */
export function formatFailures(failures: ContrastMeasurement[]): string {
  if (failures.length === 0) return "sin fallos de contraste";
  return failures
    .map(
      (failure) =>
        `- ${failure.ratio.toFixed(2)}:1 (necesita ${failure.required}:1) ` +
        `"${failure.text}" ${failure.fontSize}px/${failure.fontWeight}\n` +
        `    ${failure.path}\n` +
        `    texto ${failure.color} (declarado ${failure.declared} al ` +
        `${Math.round(failure.alpha * 100)}%) sobre ${failure.background} en ` +
        `(${Math.round(failure.point.x)}, ${Math.round(failure.point.y)})`,
    )
    .join("\n");
}
