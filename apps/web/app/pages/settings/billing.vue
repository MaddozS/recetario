<script setup lang="ts">
useHead({
  title: "Facturación | KitchCalc",
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});
</script>

<template>
  <div>
    <SectionHeading
      icon="credit-card"
      title="Facturación"
      subtitle="Slice pendiente: Task 11."
      level="h1"
    />
    <Card class="mt-6">
      <div class="flex flex-wrap items-center gap-3">
        <Badge color="warning"> Pendiente </Badge>
        <p class="text-muted-foreground text-sm">
          Esta ruta se implementa en la Task 11; el 301 a
          <code>/settings?tab=billing</code> se define ahí también.
        </p>
      </div>
    </Card>
  </div>
</template>
