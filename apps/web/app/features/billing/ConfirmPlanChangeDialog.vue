<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import type { PlanChangeCopy } from './billing-plan-state';

/**
 * Confirmación del cambio de plan. El copy de upgrade/downgrade lo decide el
 * módulo puro (`planChangeCopy`); aquí sólo se pinta y se bloquea el cierre
 * mientras la mutación está en curso.
 */
const props = defineProps<{
  copy: PlanChangeCopy | null;
  currentPlanName: string;
  targetPlanName: string;
  submitting: boolean;
  error: string | null;
}>();

const emit = defineEmits<{ confirm: [] }>();

const open = defineModel<boolean>('open', { required: true });

const dialog = ref<{ open: () => void; close: () => void } | null>(null);

function syncDialog(): void {
  if (open.value) {
    dialog.value?.open();
  } else {
    dialog.value?.close();
  }
}

watch(open, syncDialog);
onMounted(syncDialog);

function close(): void {
  if (props.submitting) return;
  open.value = false;
}
</script>

<template>
  <Dialog
    id="confirm-plan-change-dialog"
    ref="dialog"
    title="Confirmar cambio de plan"
    description="Revisa los detalles antes de continuar"
    :submitting="submitting"
    @close="open = false"
  >
    <div class="border-border bg-card space-y-3 rounded-xl border p-4" data-confirm-plan-summary>
      <div class="text-subtle-foreground flex items-center justify-between text-xs">
        <span>Plan actual</span>
        <span class="text-foreground font-semibold">{{ currentPlanName }}</span>
      </div>
      <div class="text-subtle-foreground flex items-center justify-between text-xs">
        <span>Nuevo plan</span>
        <span class="text-accent-700 font-bold">{{ targetPlanName }}</span>
      </div>
    </div>

    <div
      v-if="copy"
      class="mt-3 space-y-1.5 rounded-xl border p-3 text-xs"
      :class="
        copy.tone === 'upgrade'
          ? 'border-accent-300 bg-accent-50/50 text-accent-800'
          : 'border-warning-border bg-warning-bg/50 text-warning'
      "
      data-confirm-change-type
    >
      <div class="flex items-center gap-2 font-bold">
        <Icon name="lucide:info" :size="16" class="shrink-0" />
        <span>{{ copy.title }}</span>
      </div>
      <p class="leading-relaxed opacity-90">{{ copy.description }}</p>
    </div>

    <div v-if="copy" class="border-border bg-muted/40 mt-3 space-y-1 rounded-xl border p-3 text-xs">
      <p class="text-foreground font-semibold">Cobro y Facturación</p>
      <p class="text-subtle-foreground leading-relaxed">
        {{ copy.chargeDetails }}
      </p>
    </div>

    <div v-if="error" class="mt-4">
      <FeedbackAlert type="error" :message="error" />
    </div>

    <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button
        variant="secondary"
        size="sm"
        :disabled="submitting"
        data-confirm-cancel
        @click="close"
      >
        Cancelar
      </Button>
      <Button
        id="confirm-plan-change-btn"
        variant="primary"
        size="sm"
        :loading="submitting"
        @click="emit('confirm')"
      >
        Confirmar cambio
      </Button>
    </div>
  </Dialog>
</template>
