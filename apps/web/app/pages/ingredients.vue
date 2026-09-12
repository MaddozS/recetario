<script setup lang="ts">
definePageMeta({
  layout: "private",
  middleware: "auth",
  breadcrumbs: [{ label: "Ingredientes" }],
});

useHead({
  title: "Ingredientes | KitchCalc",
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});
</script>

<template>
  <div>
    <SectionHeading
      icon="package-search"
      title="Ingredientes"
      subtitle="Slice pendiente: Task 7."
      level="h1"
    />
    <Card class="mt-6">
      <div class="flex flex-wrap items-center gap-3">
        <Badge color="warning"> Pendiente </Badge>
        <p class="text-muted-foreground text-sm">
          Esta ruta se implementa en la Task 7 (slice vertical de ingredientes).
        </p>
      </div>
    </Card>
  </div>
</template>
