<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    label?: string;
    name: string;
    id?: string;
    type?: 'text' | 'number' | 'email' | 'password' | 'search';
    placeholder?: string;
    required?: boolean;
    error?: string;
    monospace?: boolean;
  }>(),
  { type: 'text', placeholder: '', required: false, monospace: false }
);

defineOptions({ inheritAttrs: false });

const model = defineModel<string>();

const inputId = computed(() => props.id ?? props.name);

const LABEL_CLASSES =
  'text-muted-foreground mb-1.5 block text-[11px] font-bold uppercase tracking-[0.18em]';

const INPUT_BASE =
  'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition placeholder:text-subtle-foreground focus:border-accent-300 focus:bg-card focus:ring-2 focus:ring-accent-500/20';

const inputClasses = computed(() => [
  INPUT_BASE,
  props.monospace ? 'font-mono' : 'text-foreground',
  props.error ? 'border-danger-border bg-danger-bg/50' : '',
]);
</script>

<template>
  <div>
    <label v-if="label" :for="inputId" :class="LABEL_CLASSES">
      {{ label }}<span v-if="required" class="text-danger"> *</span>
    </label>
    <input
      :id="inputId"
      v-model="model"
      :name="name"
      :type="type"
      :required="required"
      :placeholder="placeholder"
      :class="inputClasses"
      autocomplete="off"
      v-bind="$attrs"
    />
    <p v-if="error" class="text-danger mt-1.5 text-xs font-semibold">
      {{ error }}
    </p>
  </div>
</template>
