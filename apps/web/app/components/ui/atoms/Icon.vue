<script setup lang="ts">
import { computed, watch } from "vue";
import { getIcon } from "~/utils/icon-registry";

const props = withDefaults(
  defineProps<{
    name: string;
    size?: number;
  }>(),
  { size: 16 },
);

defineOptions({ inheritAttrs: false });

const icon = computed(() => getIcon(props.name));

if (import.meta.dev) {
  watch(
    () => props.name,
    (name) => {
      if (!icon.value) {
        console.warn(
          `Icon: "${name}" no está en ICON_REGISTRY (app/utils/icon-registry.ts).`,
        );
      }
    },
    { immediate: true },
  );
}
</script>

<template>
  <component :is="icon" v-if="icon" :size="size" v-bind="$attrs" />
</template>
