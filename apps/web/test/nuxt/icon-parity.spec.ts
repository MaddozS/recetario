import { BookOpen as LucideBookOpen, Settings as LucideSettings } from '@lucide/vue';
import { createSSRApp, h, type Component } from 'vue';
// El paquete no está en el grafo de tipos de la app (Vite sí lo resuelve).
// @ts-expect-error tipos de vue/server-renderer
import { renderToString } from 'vue/server-renderer';
import { describe, expect, it } from 'vitest';
import Icon from '~/components/ui/atoms/Icon.vue';

/**
 * Contrato de paridad con lucide.
 *
 * `Icon` compone el `<svg>` desde los datos del ícono en lugar de renderizar
 * los componentes de `@lucide/vue` (sus componentes funcionales llaman a
 * `inject()` y el primer render SSR dentro del `Suspense` de un layout perdía
 * la instancia de Vue). Este test fija que el markup siga siendo idéntico:
 * mismo tag, mismos atributos (comparados sin orden) y mismos hijos.
 */
function normalizeSvg(markup: string): string {
  const document = new DOMParser().parseFromString(markup, 'text/html');
  const svg = document.querySelector('svg');
  if (!svg) throw new Error(`Sin <svg> en: ${markup}`);

  const attrs = (element: Element) =>
    [...element.attributes]
      .map((attribute) => `${attribute.name}="${attribute.value}"`)
      .sort()
      .join(' ');

  const children = [...svg.children]
    .map((child) => `${child.tagName.toLowerCase()} ${attrs(child)}`)
    .join(' | ');

  return `${svg.tagName.toLowerCase()} ${attrs(svg)} :: ${children}`;
}

function render(component: Component, props: Record<string, unknown>) {
  return renderToString(createSSRApp({ render: () => h(component, props) }));
}

describe('Icon — paridad con lucide', () => {
  it.each([
    ['settings', LucideSettings],
    ['book-open', LucideBookOpen],
  ])('compone el mismo svg que el componente de "%s"', async (name, Lucide) => {
    const shared = { size: 20, class: 'text-accent-600' };
    const ours = await render(Icon, { name: `lucide:${name}`, ...shared });
    const theirs = await render(Lucide, shared);

    expect(normalizeSvg(ours)).toBe(normalizeSvg(theirs));
  });

  it('respeta el tamaño por defecto de 16px', async () => {
    const markup = await render(Icon, { name: 'lucide:plus' });
    const svg = new DOMParser().parseFromString(markup, 'text/html').querySelector('svg');

    expect(svg?.getAttribute('width')).toBe('16');
    expect(svg?.getAttribute('height')).toBe('16');
  });
});
