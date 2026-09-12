<script setup lang="ts">
import { ref } from "vue";

type DialogHandle = { open: () => void; close: () => void };

// Bloque temporal de QA visual del sistema de diseño portado.
// Lo retira la Task 5 junto con el resto del contenido de la landing.
const qaDialog = ref<DialogHandle | null>(null);
const password = ref("");

useHead({
  title: "KitchCalc",
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});
</script>

<template>
  <div>
    <SectionHeading
      icon="chef-hat"
      title="KitchCalc"
      subtitle="Fundación Nuxt 4. Muestra temporal del sistema de diseño; se retira en la Task 5."
      level="h1"
    />

    <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <p class="section-label mb-3">Button · variantes</p>
        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button class="w-full sm:w-auto"> Primario </Button>
          <Button variant="secondary" class="w-full sm:w-auto">
            Secundario
          </Button>
          <Button variant="danger" class="w-full sm:w-auto"> Peligro </Button>
          <Button variant="ghost" class="w-full sm:w-auto"> Ghost </Button>
        </div>
        <div class="mt-3 flex flex-wrap gap-3">
          <Button
            variant="iconAccent"
            icon-only
            icon="plus"
            aria-label="Agregar"
          />
          <Button
            variant="iconDanger"
            icon-only
            icon="trash-2"
            aria-label="Eliminar"
          />
          <Button variant="ghost" icon-only icon="pencil" aria-label="Editar" />
        </div>
      </Card>

      <Card>
        <p class="section-label mb-3">Button · tamaños y estados</p>
        <div
          class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
        >
          <Button size="sm" class="w-full sm:w-auto"> sm </Button>
          <Button size="md" class="w-full sm:w-auto"> md </Button>
          <Button size="lg" class="w-full sm:w-auto"> lg </Button>
        </div>
        <div
          class="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
        >
          <Button loading class="w-full sm:w-auto"> Guardando </Button>
          <Button disabled class="w-full sm:w-auto"> Deshabilitado </Button>
          <Button href="/pricing" icon="tag" class="w-full sm:w-auto">
            Link
          </Button>
        </div>
      </Card>

      <Card>
        <p class="section-label mb-3">Badge · variantes y colores</p>
        <div class="flex flex-wrap items-center gap-2">
          <Badge>accent</Badge>
          <Badge color="success"> success </Badge>
          <Badge color="danger"> danger </Badge>
          <Badge color="warning"> warning </Badge>
          <Badge color="neutral"> neutral </Badge>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="tier" size="md"> tier md </Badge>
          <Badge variant="outline"> outline </Badge>
          <Badge variant="status" color="success"> status </Badge>
        </div>
      </Card>

      <Card padding="lg" hover accent>
        <p class="section-label mb-3">Card · hover + accent · Skeleton</p>
        <div class="space-y-2">
          <Skeleton class="h-4 w-3/4" />
          <Skeleton class="h-4 w-1/2" />
          <Skeleton class="h-4 w-2/3" />
        </div>
      </Card>

      <Card>
        <p class="section-label mb-3">FeedbackAlert</p>
        <FeedbackAlert type="success" message="Ingrediente guardado" />
        <FeedbackAlert
          type="error"
          message="No se puede eliminar"
          :recipes="['Brownie', 'Pan de masa madre']"
        />
      </Card>

      <Card>
        <p class="section-label mb-3">
          Input · PasswordInput · UnitCostDisplay
        </p>
        <div class="space-y-4">
          <Input
            v-model="password"
            label="Nombre"
            name="qa-input"
            placeholder="Harina 000"
          />
          <PasswordInput
            id="qa-password"
            v-model="password"
            label="Contraseña"
            required
          />
          <UnitCostDisplay default-unit="kg" value="$12.50" />
        </div>
      </Card>

      <Card>
        <p class="section-label mb-3">EmptyState · Dialog</p>
        <EmptyState
          icon="lucide:book-plus"
          title="No hay recetas"
          description="Crea tu primera receta para empezar a costear."
          action-label="Nueva receta"
          class="py-4"
          @action="qaDialog?.open()"
        />
        <div class="mt-4 flex justify-center">
          <Button variant="secondary" icon="plus" @click="qaDialog?.open()">
            Abrir diálogo
          </Button>
        </div>
      </Card>

      <Card>
        <p class="section-label mb-3">SectionHeading · niveles</p>
        <div class="space-y-4">
          <SectionHeading icon="book-open" title="h3" level="h3" />
          <SectionHeading
            icon="package-search"
            title="h2 con subtítulo"
            subtitle="Subtítulo de apoyo"
            level="h2"
          />
        </div>
      </Card>
    </div>

    <Dialog
      id="qa-dialog"
      ref="qaDialog"
      title="Diálogo de prueba"
      description="Cierre por backdrop o Escape; se bloquea con aria-busy."
    >
      <p class="text-muted-foreground text-sm">
        Contenido de ejemplo del organismo portado.
      </p>
      <div class="mt-5 flex justify-end">
        <Button variant="secondary" @click="qaDialog?.close()"> Cerrar </Button>
      </div>
    </Dialog>
  </div>
</template>
