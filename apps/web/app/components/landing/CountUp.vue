<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

/**
 * Número que cuenta desde 0 al montar (las tarjetas del hero siempre están en
 * viewport). Respeta `prefers-reduced-motion` y cancela el frame al desmontar.
 */
const props = withDefaults(
  defineProps<{
    value: number;
    prefix?: string;
    decimals?: number;
  }>(),
  { prefix: "$", decimals: 2 },
);

const DURATION_MS = 800;
const EASING_EXPONENT = 4;

function format(value: number): string {
  return `${props.prefix}${value.toFixed(props.decimals)}`;
}

const progress = ref(0);
const display = computed(() => format(props.value * progress.value));

let frame = 0;

function animate(): void {
  const start = performance.now();

  function step(now: number): void {
    const elapsed = Math.min((now - start) / DURATION_MS, 1);
    progress.value = 1 - Math.pow(1 - elapsed, EASING_EXPONENT);
    if (elapsed < 1) frame = requestAnimationFrame(step);
  }

  frame = requestAnimationFrame(step);
}

onMounted(() => {
  const reducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) {
    progress.value = 1;
    return;
  }

  animate();
});

onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <span>{{ display }}</span>
</template>
