<script setup lang="ts">
withDefaults(
  defineProps<{
    icon: string;
    iconSize?: number;
    title: string;
    description: string;
    titleTag?: "h1" | "h3";
    titleClasses?: string;
    descClasses?: string;
    actionLabel?: string;
    actionHref?: string;
  }>(),
  {
    iconSize: 24,
    titleTag: "h3",
    titleClasses: "mt-5 text-lg font-bold text-foreground",
    descClasses: "mt-2 text-sm text-muted-foreground",
  },
);

// El CTA sin `actionHref` ya no abre un modal por atributo: el consumidor
// escucha `action` (o reemplaza el bloque con el slot `#action`).
const emit = defineEmits<{ action: [] }>();
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col items-center">
    <div
      class="bg-accent-50 text-accent-600 flex h-14 w-14 items-center justify-center rounded-2xl"
    >
      <Icon :name="icon" :size="iconSize" />
    </div>
    <component :is="titleTag" :class="titleClasses">
      {{ title }}
    </component>
    <p :class="descClasses">
      {{ description }}
    </p>
    <slot name="action">
      <template v-if="actionLabel">
        <a
          v-if="actionHref"
          :href="actionHref"
          class="bg-accent-600 hover:bg-accent-700 mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-colors"
        >
          <Icon name="lucide:plus" :size="18" />
          {{ actionLabel }}
        </a>
        <button
          v-else
          type="button"
          class="bg-accent-600 hover:bg-accent-700 mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-colors lg:hidden"
          @click="emit('action')"
        >
          <Icon name="lucide:plus" :size="18" />
          {{ actionLabel }}
        </button>
      </template>
    </slot>
  </div>
</template>
