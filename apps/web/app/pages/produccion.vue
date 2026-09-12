<script setup lang="ts">
useHead({
  title: "Planificador de producción | KitchCalc",
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});
</script>

<template>
  <div>
    <SectionHeading
      icon="factory"
      title="Planificador de producción"
      subtitle="Slice pendiente: Task 12."
      level="h1"
    />
    <Card class="mt-6">
      <div class="flex flex-wrap items-center gap-3">
        <Badge color="warning"> Pendiente </Badge>
        <p class="text-muted-foreground text-sm">
          Esta ruta se implementa en la Task 12 (planificador de producción).
        </p>
      </div>
    </Card>
  </div>
</template>
