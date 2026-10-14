import type { Directive } from 'vue';

/**
 * Directiva `v-reveal`: revela un bloque cuando entra en el viewport.
 *
 * - SSR: emite `data-reveal` —el valor del binding decide la variante
 *   (`v-reveal.left`, `v-reveal="'right'"`) para que el primer paint ya
 *   parta de la opacidad 0 definida en el CSS del layout público.
 * - Cliente: un único `IntersectionObserver` compartido; al entrar añade
 *   `reveal-visible` y deja de observar. Con `prefers-reduced-motion` el
 *   bloque se muestra sin animación y no se observa.
 *
 * Sustituye a los dos observers globales del `LandingLayout` del baseline.
 */

const VARIANT_MODIFIERS = ['left', 'right', 'scale'] as const;

let observer: IntersectionObserver | null = null;

function variantFrom(binding: {
  value?: unknown;
  modifiers?: Partial<Record<string, boolean>>;
}): string {
  if (typeof binding.value === 'string') return binding.value;
  return VARIANT_MODIFIERS.find((name) => binding.modifiers?.[name]) ?? '';
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function getObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('reveal-visible');
        observer?.unobserve(entry.target);
      }
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  return observer;
}

const revealDirective: Directive<HTMLElement> = {
  getSSRProps(binding) {
    return { 'data-reveal': variantFrom(binding.modifiers) };
  },
  mounted(element, binding) {
    element.setAttribute('data-reveal', variantFrom(binding.modifiers));

    if (prefersReducedMotion()) {
      element.classList.add('reveal-visible');
      return;
    }

    getObserver().observe(element);
  },
  unmounted(element) {
    observer?.unobserve(element);
  },
};

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('reveal', revealDirective);
});
