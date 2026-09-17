<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { PricingPlan, UserSubscriptionInfo } from "@recetario/types";
import BillingIntervalToggle from "./BillingIntervalToggle.vue";
import PlanFeatureList from "./PlanFeatureList.vue";
import PlanPrice from "./PlanPrice.vue";
import type { BillingInterval } from "./billing-interval";
import { planAction } from "./billing-plan-state";

/**
 * Selector de planes del tab de facturación (puerto del `PricingModal.astro`).
 *
 * Reutiliza las piezas de Task 5 (`BillingIntervalToggle`, `PlanPrice`,
 * `PlanFeatureList`) sin forzar el layout de `/pricing`, y emite la elección:
 * la confirmación y el checkout viven en `BillingSection`.
 */
const props = defineProps<{
  plans: PricingPlan[];
  subscription: UserSubscriptionInfo;
  pending: boolean;
}>();

const emit = defineEmits<{
  choose: [{ plan: PricingPlan; interval: BillingInterval }];
}>();

const open = defineModel<boolean>("open", { required: true });

const dialog = ref<{ open: () => void; close: () => void } | null>(null);
const interval = ref<BillingInterval>("monthly");

const currentTier = computed(() => props.subscription.tier);
const currentInterval = computed<BillingInterval>(
  () => props.subscription.billingInterval ?? "monthly",
);

function actionFor(plan: PricingPlan) {
  return planAction(
    currentTier.value,
    currentInterval.value,
    plan.id,
    interval.value,
  );
}

function syncDialog(): void {
  if (open.value) {
    // El baseline reinicia el periodo a mensual cada vez que se abre.
    interval.value = "monthly";
    dialog.value?.open();
  } else {
    dialog.value?.close();
  }
}

watch(open, syncDialog);
onMounted(syncDialog);

function close(): void {
  if (props.pending) return;
  open.value = false;
}
</script>

<template>
  <Dialog
    id="pricing-modal"
    ref="dialog"
    size="5xl"
    scroll
    :submitting="pending"
    @close="open = false"
  >
    <div class="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 class="text-foreground text-2xl font-black">Planes y precios</h2>
        <p class="text-muted-foreground mt-1 text-sm">
          Elige el plan que mejor se adapte a tu negocio.
        </p>
      </div>
      <Button
        variant="ghost"
        icon="x"
        icon-only
        aria-label="Cerrar"
        data-close-pricing-modal
        @click="close"
      />
    </div>

    <div class="mb-6 flex justify-center">
      <BillingIntervalToggle v-model="interval" />
    </div>

    <FeedbackAlert
      v-if="plans.length === 0 && !pending"
      type="error"
      message="No pudimos cargar los planes. Recarga la página para reintentar."
    />

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <template v-if="pending && plans.length === 0">
        <Card v-for="index in 3" :key="`skeleton-${index}`" padding="md">
          <Skeleton class="h-6 w-1/2" />
          <Skeleton class="mt-4 h-10 w-3/4" />
          <div class="mt-6 space-y-3">
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-5/6" />
          </div>
        </Card>
      </template>

      <Card
        v-for="plan in plans"
        :key="plan.id"
        padding="md"
        class="flex flex-col"
        :class="
          plan.id === 'pro' ? 'border-accent-300 ring-accent-200 ring-1' : ''
        "
        :data-plan="plan.id"
      >
        <Badge
          v-if="plan.badge"
          variant="tier"
          :color="plan.id === 'pro' ? 'accent' : 'success'"
          class="mb-3 self-start"
        >
          {{ plan.badge.text }}
        </Badge>

        <h3 class="text-foreground text-lg font-black">{{ plan.name }}</h3>
        <p class="text-muted-foreground mt-1 text-sm">{{ plan.description }}</p>

        <div class="mt-3">
          <PlanPrice :plan="plan" :interval="interval" />
        </div>

        <div class="mt-4">
          <Button
            :variant="plan.id === 'pro' ? 'primary' : 'secondary'"
            size="sm"
            class="w-full"
            data-subscribe-btn
            :disabled="actionFor(plan).disabled || pending"
            @click="emit('choose', { plan, interval })"
          >
            {{ actionFor(plan).label }}
          </Button>
        </div>

        <div class="mt-4 flex-1">
          <PlanFeatureList :features="plan.features" />
        </div>
      </Card>
    </div>
  </Dialog>
</template>
