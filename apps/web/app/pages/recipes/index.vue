<script setup lang="ts">
useHead({
  title: "Recetas | KitchCalc",
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});
</script>

<template>
  <div>
    <SectionHeading
      icon="book-open"
      title="Recetas"
      subtitle="Slice pendiente: Tasks 8 y 9."
      level="h1"
    />
    <Card class="mt-6">
      <div class="flex flex-wrap items-center gap-3">
        <Badge color="warning"> Pendiente </Badge>
        <p class="text-muted-foreground text-sm">
          Esta ruta se implementa en las Tasks 8 y 9 (listado y detalle de
          recetas).
        </p>
      </div>
    </Card>
  </div>
</template>
