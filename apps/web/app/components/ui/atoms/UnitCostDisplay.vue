<script setup lang="ts">
withDefaults(
  defineProps<{
    defaultUnit: string;
    value?: string;
  }>(),
  { value: "$0.00" },
);
</script>

<template>
  <div class="flex items-start gap-3">
    <div
      class="bg-card text-accent-600 shadow-accent-100 mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm dark:shadow-none"
    >
      <Icon name="lucide:info" :size="18" />
    </div>

    <div>
      <p
        class="text-secondary-foreground text-xs font-bold tracking-[0.16em] uppercase"
      >
        Costo unitario calculado:
      </p>
      <div class="mt-1 flex items-end gap-2">
        <span
          class="text-accent-700 font-mono text-3xl font-semibold tabular-nums"
        >
          {{ value }}
        </span>
        <span class="text-accent-800 pb-1 text-sm font-semibold">
          / <span>{{ defaultUnit }}</span>
        </span>
      </div>
    </div>
  </div>
</template>
