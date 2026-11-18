<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { LANDING_CTAS } from '~/features/landing/landing-ctas';

const { isAuthenticated } = useAuth();
const isVisible = ref(false);

let heroObserver: IntersectionObserver | null = null;
let bottomObserver: IntersectionObserver | null = null;

let heroInView = true;
let bottomInView = false;

function updateVisibility(): void {
  isVisible.value = !heroInView && !bottomInView;
}

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') return;

  const hero = document.querySelector('[data-landing-hero]');
  if (hero) {
    heroObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          heroInView = entry.isIntersecting;
        }
        updateVisibility();
      },
      { threshold: 0.1 }
    );
    heroObserver.observe(hero);
  }

  const bottomTargets = [
    document.getElementById('pricing'),
    document.getElementById('precios'),
    document.getElementById('cta'),
  ].filter((el): el is HTMLElement => el !== null);

  if (bottomTargets.length > 0) {
    bottomObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (
            entry.target.id === 'pricing' ||
            entry.target.id === 'precios' ||
            entry.target.id === 'cta'
          ) {
            bottomInView = entries.some((e) => e.isIntersecting);
          }
        }
        updateVisibility();
      },
      { threshold: 0.1 }
    );
    for (const target of bottomTargets) {
      bottomObserver.observe(target);
    }
  }
});

onBeforeUnmount(() => {
  heroObserver?.disconnect();
  bottomObserver?.disconnect();
  heroObserver = null;
  bottomObserver = null;
});
</script>

<template>
  <div
    data-sticky-cta
    class="fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ease-out md:hidden"
    :class="isVisible ? 'translate-y-0' : 'pointer-events-none translate-y-full'"
    :aria-hidden="isVisible ? undefined : 'true'"
    :inert="!isVisible"
  >
    <div
      class="border-border bg-card border-t px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-xl"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-foreground truncate text-xs font-bold">KitchCalc</p>
          <p class="text-muted-foreground truncate text-[11px]">Plan gratis sin caducidad</p>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <a
            href="#pricing"
            class="focus-ring border-border bg-muted text-foreground hover:bg-hover-muted rounded-xl border px-3 py-2 text-xs font-bold transition-colors"
          >
            Planes
          </a>
          <Button
            variant="primary"
            class="min-h-9 px-3.5 py-2 text-xs"
            :href="isAuthenticated ? LANDING_CTAS.app : LANDING_CTAS.signUp"
          >
            {{ isAuthenticated ? 'Ir a la app' : 'Comenzar' }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  div {
    transition: none !important;
  }
}
</style>
