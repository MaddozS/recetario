<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string;
    title: string;
    subtitle?: string;
    level?: "h1" | "h2" | "h3";
  }>(),
  { level: "h2" },
);
</script>

<template>
  <div>
    <component
      :is="level"
      class="text-foreground flex items-center gap-2 text-lg font-bold"
    >
      <Icon
        v-if="icon"
        :name="`lucide:${icon}`"
        :size="20"
        class="text-accent-600"
      />
      {{ title }}
    </component>
    <p v-if="subtitle" class="text-muted-foreground mt-1 text-sm">
      {{ subtitle }}
    </p>
  </div>
</template>
