<script setup lang="ts">
/**
 * Estado vacío del recetario. Copy heredado con tildes corregidas (el baseline
 * escribía "Todavia"/"aqui"/"boton"/"tambien" y mencionaba un botón del sidebar
 * que no existe).
 */
const emit = defineEmits<{ create: [] }>();
</script>

<template>
  <Card padding="lg" class="mx-auto max-w-3xl p-8! shadow-md">
    <EmptyState
      icon="lucide:book-plus"
      :icon-size="28"
      title="Todavía no tienes recetas"
      description="Entra por primera vez al recetario desde aquí y crea tu primera receta."
      title-tag="h1"
      title-classes="mt-6 text-3xl font-black text-foreground"
      desc-classes="mt-3 text-base text-muted-foreground"
    >
      <template #action>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button variant="primary" icon="plus" @click="emit('create')">
            Crear primera receta
          </Button>
          <Button variant="secondary" href="/ingredients" icon="package-search">
            Ver ingredientes
          </Button>
        </div>
      </template>
    </EmptyState>
  </Card>
</template>
