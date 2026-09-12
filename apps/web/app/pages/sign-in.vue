<script setup lang="ts">
useHead({
  title: "Iniciar sesión | KitchCalc",
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});
</script>

<template>
  <div>
    <SectionHeading
      icon="key-round"
      title="Iniciar sesión"
      subtitle="Slice pendiente: Task 6."
      level="h1"
    />
    <Card class="mt-6">
      <div class="flex flex-wrap items-center gap-3">
        <Badge color="warning"> Pendiente </Badge>
        <p class="text-muted-foreground text-sm">
          Esta ruta se implementa en la Task 6 (flujos de autenticación).
        </p>
      </div>
    </Card>
  </div>
</template>
