<script setup lang="ts">
import { computed } from "vue";

const route = useRoute();

// Placeholder: sólo comprueba que el segmento dinámico llega a la página.
const recipeId = computed(() => String(route.params.recipe ?? ""));

// Task 9 reemplaza la etiqueta estática por el nombre real de la receta.
definePageMeta({
  layout: "private",
  middleware: "auth",
  breadcrumbs: [{ label: "Recetas", href: "/recipes" }, { label: "Receta" }],
});

useHead({
  title: "Receta | KitchCalc",
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});
</script>

<template>
  <div>
    <SectionHeading
      icon="chef-hat"
      title="Detalle de receta"
      :subtitle="`Slice pendiente: Task 9 · id: ${recipeId}`"
      level="h1"
    />
    <Card class="mt-6">
      <div class="flex flex-wrap items-center gap-3">
        <Badge color="warning"> Pendiente </Badge>
        <p class="text-muted-foreground text-sm">
          Esta ruta se implementa en la Task 9 (detalle y edición base de
          receta).
        </p>
      </div>
    </Card>
  </div>
</template>
