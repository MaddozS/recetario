<script setup lang="ts">
import { ref, type ComponentPublicInstance } from 'vue';
import {
  BILLING_INTERVALS,
  BILLING_INTERVAL_LABELS,
  type BillingInterval,
} from './billing-interval';

/**
 * Toggle Mensual/Anual como radiogroup: flechas para cambiar y foco en la opción
 * activa (el original sólo lo tenía en la landing). Sustituye al toggle que
 * reescribía clases del DOM.
 */
const props = defineProps<{ modelValue: BillingInterval }>();
const emit = defineEmits<{ 'update:modelValue': [value: BillingInterval] }>();

const buttons = ref<HTMLButtonElement[]>([]);

function registerButton(element: Element | ComponentPublicInstance | null, index: number): void {
  if (element instanceof HTMLButtonElement) {
    buttons.value[index] = element;
  }
}

function select(period: BillingInterval): void {
  emit('update:modelValue', period);
}

function onKeydown(event: KeyboardEvent): void {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    return;
  }
  event.preventDefault();

  const currentIndex = BILLING_INTERVALS.indexOf(props.modelValue);
  const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
  const nextIndex = (currentIndex + step + BILLING_INTERVALS.length) % BILLING_INTERVALS.length;
  const next = BILLING_INTERVALS[nextIndex] ?? 'monthly';

  select(next);
  buttons.value[nextIndex]?.focus();
}

function buttonClass(period: BillingInterval): string {
  return period === props.modelValue
    ? 'bg-card text-foreground min-h-11 rounded-lg px-5 text-sm font-semibold shadow-sm transition-all'
    : 'text-muted-foreground min-h-11 rounded-lg px-5 text-sm font-semibold transition-all';
}
</script>

<template>
  <div
    class="bg-muted inline-flex rounded-xl p-1"
    role="radiogroup"
    aria-label="Periodo de facturación"
    @keydown="onKeydown"
  >
    <button
      v-for="(period, index) in BILLING_INTERVALS"
      :key="period"
      :ref="(element: Element | ComponentPublicInstance | null) => registerButton(element, index)"
      type="button"
      role="radio"
      :aria-checked="period === modelValue ? 'true' : 'false'"
      :data-period="period"
      :class="buttonClass(period)"
      @click="select(period)"
    >
      {{ BILLING_INTERVAL_LABELS[period] }}
      <span v-if="period === 'yearly'" class="text-success text-xs font-bold"> -20% </span>
    </button>
  </div>
</template>
