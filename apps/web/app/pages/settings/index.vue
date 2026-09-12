<script setup lang="ts">
useHead({
  title: "Configuración | KitchCalc",
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});
</script>

<template>
  <div>
    <SectionHeading
      icon="settings"
      title="Configuración"
      subtitle="Slice pendiente: Task 11."
      level="h1"
    />
    <Card class="mt-6">
      <div class="flex flex-wrap items-center gap-3">
        <Badge color="warning"> Pendiente </Badge>
        <p class="text-muted-foreground text-sm">
          Esta ruta se implementa en la Task 11 (settings y billing).
        </p>
      </div>
    </Card>
  </div>
</template>
