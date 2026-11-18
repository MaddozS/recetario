<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { PricingPlan, UserSubscriptionInfo } from '@recetario/types';
import {
  getRemainingIngredients,
  getRemainingRecipes,
  isPaid,
} from '@recetario/stripe/subscription';
import BillingUsageCard from './BillingUsageCard.vue';
import ConfirmPlanChangeDialog from './ConfirmPlanChangeDialog.vue';
import PlanChangeDialog from './PlanChangeDialog.vue';
import { useBillingPortal } from './useBillingPortal';
import { useCheckout } from './useCheckout';
import { usePricingPlans } from './usePricingPlans';
import {
  formatBillingDate,
  formatSubscriptionPrice,
  planPriceSuffix,
  subscriptionCurrencyLabel,
} from './billing-format';
import {
  INGREDIENTS_WARNING_THRESHOLD,
  RECIPES_WARNING_THRESHOLD,
  currentPlanLabel,
  isPlanChangeUpgrade,
  planChangeCopy,
  planDisplayName,
  subscriptionSummaryLine,
  targetPlanLabel,
} from './billing-plan-state';
import type { BillingInterval } from './billing-interval';

/**
 * Tab de facturación: plan actual (trial, cancelación, cambio programado),
 * uso, funciones incluidas, portal de Stripe y cambio de plan con confirmación.
 *
 * La suscripción llega de la página (`useSettingsOverview`: fresca o de
 * sesión); las mutaciones viven aquí y nunca recargan.
 */
const props = withDefaults(
  defineProps<{
    subscription: UserSubscriptionInfo;
    counts: { recipes: number; ingredients: number };
    loading: boolean;
    failed: boolean;
    subscriptionFailed?: boolean;
  }>(),
  {
    subscriptionFailed: false,
  }
);

const emit = defineEmits<{ retry: [] }>();

const FEATURE_ITEMS = [
  { key: 'recipe_duplicate', label: 'Duplicar recetas' },
  { key: 'recipe_photos', label: 'Fotos de recetas' },
  { key: 'stock_tracking', label: 'Stock de ingredientes' },
  { key: 'production_planner', label: 'Planificador de producción' },
  { key: 'pdf_export', label: 'Exportar a PDF' },
  { key: 'advanced_costs', label: 'Costos fijos avanzados' },
  { key: 'change_history', label: 'Historial de cambios' },
  { key: 'data_import_export', label: 'Importar/Exportar datos' },
] as const;

const route = useRoute();
const { plans, pending: plansPending } = usePricingPlans();
const { pending: portalPending, error: portalError, openPortal } = useBillingPortal();
const { pending: checkoutPending, error: checkoutError, startCheckout, clearError } = useCheckout();

const planOpen = ref(false);
const confirmOpen = ref(false);
const selection = ref<{ plan: PricingPlan; interval: BillingInterval } | null>(null);

const currentTier = computed(() => props.subscription.tier);
const currentInterval = computed<BillingInterval>(
  () => props.subscription.billingInterval ?? 'monthly'
);
const isPaidPlan = computed(() => isPaid(props.subscription));
const remainingRecipes = computed(() =>
  getRemainingRecipes(props.subscription, props.counts.recipes)
);
const remainingIngredients = computed(() =>
  getRemainingIngredients(props.subscription, props.counts.ingredients)
);

const showSuccess = computed(() => route.query.success === '1');
const showCanceled = computed(() => route.query.canceled === '1');
const periodEndLabel = computed(() => formatBillingDate(props.subscription.currentPeriodEnd));
const trialEndLabel = computed(
  () => formatBillingDate(props.subscription.trialEnd) ?? periodEndLabel.value
);
// El baseline usaba `currentPeriodEnd` para "a partir del"; el campo correcto
// del cambio programado es `effectiveDate` (coinciden en la práctica).
const scheduledDateLabel = computed(
  () => formatBillingDate(props.subscription.scheduledChange?.effectiveDate) ?? periodEndLabel.value
);
const scheduledTargetName = computed(
  () => props.subscription.scheduledChange?.targetPlanName ?? ''
);

const planActionLabel = computed(() => {
  if (currentTier.value === 'free') return 'Suscribirse';
  if (currentTier.value === 'basic') return 'Actualizar a Pro';
  return 'Cambiar plan';
});

const confirmation = computed(() => {
  if (!selection.value) return null;

  const { plan, interval } = selection.value;
  const currentPlanName = currentPlanLabel(currentTier.value, currentInterval.value);
  const targetPlanName = targetPlanLabel(plan.name, interval);
  const isUpgrade = isPlanChangeUpgrade(
    currentTier.value,
    currentInterval.value,
    plan.id,
    interval
  );

  return {
    currentPlanName,
    targetPlanName,
    copy: planChangeCopy({
      isUpgrade,
      currentPlanName,
      targetPlanName,
      effectiveDate: periodEndLabel.value ?? 'el final del periodo actual',
    }),
  };
});

function openPlanDialog(): void {
  clearError();
  planOpen.value = true;
}

function onChoose(payload: { plan: PricingPlan; interval: BillingInterval }): void {
  clearError();
  selection.value = payload;
  confirmOpen.value = true;
}

// Al cerrarse la confirmación se limpia la elección (el dialog vuelve a abrirse
// con un payload nuevo).
watch(confirmOpen, (value) => {
  if (!value) selection.value = null;
});

async function confirmChange(): Promise<void> {
  if (!selection.value) return;

  const origin = window.location.origin;
  await startCheckout(selection.value.plan, selection.value.interval, {
    successUrl: `${origin}/settings?tab=billing&success=1`,
    cancelUrl: `${origin}/settings?tab=billing&canceled=1`,
  });
}
</script>

<template>
  <div data-tab-content="billing" class="space-y-6">
    <div v-if="subscriptionFailed" class="space-y-3" data-subscription-error>
      <FeedbackAlert type="error" message="No se pudo sincronizar el estado de tu suscripción." />
      <Button variant="secondary" icon="refresh-cw" @click="emit('retry')"> Reintentar </Button>
    </div>

    <template v-else>
      <div
        v-if="!loading && showSuccess"
        class="border-success-border bg-success-bg rounded-2xl border p-4"
      >
        <div class="flex items-center gap-3">
          <Icon name="lucide:check-circle" :size="20" class="text-success" />
          <div>
            <p class="text-success font-semibold">Pago exitoso</p>
            <p class="text-success text-sm">Tu suscripción ha sido activada.</p>
          </div>
        </div>
      </div>

      <div
        v-if="!loading && showCanceled"
        class="border-warning-border bg-warning-bg rounded-2xl border p-4"
      >
        <div class="flex items-center gap-3">
          <Icon name="lucide:alert-triangle" :size="20" class="text-warning" />
          <div>
            <p class="text-warning font-semibold">Pago cancelado</p>
            <p class="text-warning text-sm">No se realizó ningún cargo.</p>
          </div>
        </div>
      </div>

      <div
        v-if="!loading && subscription.isTrial && trialEndLabel"
        class="border-accent-200 bg-accent-50 rounded-2xl border p-4"
      >
        <div class="flex items-center gap-3">
          <Icon name="lucide:clock" :size="20" class="text-accent-600" />
          <div>
            <p class="text-accent-800 font-semibold">Periodo de prueba activo</p>
            <p class="text-accent-800 text-sm">Tu prueba termina el {{ trialEndLabel }}.</p>
          </div>
        </div>
      </div>

      <div
        v-if="!loading && subscription.cancelAtPeriodEnd && periodEndLabel"
        class="border-warning-border bg-warning-bg rounded-2xl border p-4"
      >
        <div class="flex items-center gap-3">
          <Icon name="lucide:alert-triangle" :size="20" class="text-warning" />
          <div>
            <p class="text-warning font-semibold">Suscripción cancelada</p>
            <p class="text-warning text-sm">
              Tu plan seguirá activo hasta el {{ periodEndLabel }}.
            </p>
          </div>
        </div>
      </div>

      <Card padding="lg" data-plan-summary>
        <template v-if="loading">
          <div
            class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
            data-plan-skeleton
          >
            <div class="space-y-2">
              <Skeleton class="h-3 w-20" />
              <Skeleton class="h-8 w-40" />
              <Skeleton class="h-4 w-60" />
            </div>
            <div class="space-y-2 sm:text-right">
              <Skeleton class="h-7 w-28 sm:ml-auto" />
              <Skeleton class="h-5 w-24 sm:ml-auto" />
            </div>
          </div>
          <div class="mt-6 flex flex-wrap gap-3">
            <Skeleton class="h-10 w-32" />
            <Skeleton class="h-10 w-44" />
          </div>
        </template>

        <template v-else>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-muted-foreground text-xs font-bold tracking-[0.18em] uppercase">
                Plan actual
              </p>
              <h2 class="text-foreground mt-1 text-2xl font-black">
                {{ planDisplayName(subscription.tier) }}
              </h2>
              <p class="text-muted-foreground mt-1 text-sm">
                {{ subscriptionSummaryLine(subscription) }}
              </p>
            </div>
            <div class="text-left sm:text-right">
              <p
                v-if="formatSubscriptionPrice(subscription)"
                class="text-foreground text-2xl font-black whitespace-nowrap"
              >
                {{ subscriptionCurrencyLabel(subscription) }}
                {{ formatSubscriptionPrice(subscription) }}
                <span class="text-subtle-foreground text-sm font-semibold">
                  {{ planPriceSuffix(subscription.billingInterval) }}
                </span>
              </p>
              <Badge
                v-if="subscription.scheduledChange"
                variant="status"
                color="warning"
                class="mt-1"
              >
                Cambio programado
              </Badge>
              <Badge
                v-if="subscription.cancelAtPeriodEnd && !subscription.scheduledChange"
                variant="status"
                color="warning"
                class="mt-1"
              >
                Cancelado
              </Badge>
              <Badge
                v-if="subscription.status === 'trialing'"
                variant="status"
                color="accent"
                class="mt-1"
              >
                Trial
              </Badge>
            </div>
          </div>

          <div
            v-if="subscription.scheduledChange && periodEndLabel"
            class="border-warning-border bg-warning-bg/50 text-warning mt-3 rounded-xl border p-3 text-xs font-semibold"
            data-scheduled-change
          >
            <div class="flex items-center gap-2 font-bold">
              <Icon name="lucide:clock" :size="16" class="text-warning-solid shrink-0" />
              <span>Cambio de plan programado</span>
            </div>
            <!-- prettier-ignore -->
            <p class="text-warning/90 mt-1 leading-relaxed font-normal">
              Tu plan <strong>{{ subscription.tier.toUpperCase() }}</strong> estará activo
              hasta el <strong>{{ periodEndLabel }}</strong> y cambiará a
              <strong>{{ scheduledTargetName }}</strong> a partir del
              <strong>{{ scheduledDateLabel }}</strong>.
            </p>
          </div>

          <div v-if="portalError" class="mt-3">
            <FeedbackAlert type="error" :message="portalError" />
          </div>

          <div class="mt-6 flex flex-wrap gap-3">
            <Button
              variant="primary"
              icon="arrow-up-circle"
              :disabled="portalPending"
              data-open-pricing-modal
              @click="openPlanDialog"
            >
              {{ planActionLabel }}
            </Button>
            <Button
              v-if="isPaidPlan"
              id="manage-subscription-btn"
              variant="secondary"
              icon="credit-card"
              :loading="portalPending"
              @click="openPortal"
            >
              Gestionar suscripción
            </Button>
          </div>
        </template>
      </Card>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2" data-usage-cards>
        <template v-if="loading">
          <Card v-for="index in 2" :key="`usage-skeleton-${index}`" padding="lg">
            <Skeleton class="h-4 w-1/3" />
            <Skeleton class="mt-4 h-2 w-full" />
          </Card>
        </template>

        <template v-else-if="!failed">
          <BillingUsageCard
            label="Recetas"
            unit="recetas"
            :count="counts.recipes"
            :limit="subscription.recipesLimit"
            :remaining="remainingRecipes"
            :threshold="RECIPES_WARNING_THRESHOLD"
          />
          <BillingUsageCard
            label="Ingredientes"
            unit="ingredientes"
            :count="counts.ingredients"
            :limit="subscription.ingredientsLimit"
            :remaining="remainingIngredients"
            :threshold="INGREDIENTS_WARNING_THRESHOLD"
          />
        </template>
      </div>

      <div v-if="failed && !subscriptionFailed" class="space-y-3">
        <FeedbackAlert type="error" message="No se pudieron cargar los contadores de uso." />
        <Button variant="secondary" icon="refresh-cw" @click="emit('retry')"> Reintentar </Button>
      </div>

      <Card padding="lg" data-plan-features>
        <h3 class="text-secondary-foreground mb-4 text-sm font-bold">Funciones incluidas</h3>
        <div v-if="loading" class="grid grid-cols-1 gap-3 md:grid-cols-2" data-features-skeleton>
          <div
            v-for="feature in FEATURE_ITEMS"
            :key="`feature-skeleton-${feature.key}`"
            class="flex items-center gap-2"
          >
            <Skeleton class="h-4 w-4 shrink-0 rounded-full" />
            <Skeleton class="h-4 w-32" />
          </div>
        </div>
        <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div
            v-for="feature in FEATURE_ITEMS"
            :key="feature.key"
            class="flex items-center gap-2 text-sm"
            :class="
              subscription.features[feature.key] === true
                ? 'text-secondary-foreground'
                : 'text-subtle-foreground'
            "
          >
            <Icon
              :name="subscription.features[feature.key] === true ? 'lucide:check' : 'lucide:x'"
              :size="16"
              :class="
                subscription.features[feature.key] === true
                  ? 'text-success'
                  : 'text-subtle-foreground'
              "
            />
            {{ feature.label }}
          </div>
        </div>
      </Card>

      <PlanChangeDialog
        v-model:open="planOpen"
        :plans="plans"
        :subscription="subscription"
        :pending="checkoutPending || plansPending"
        @choose="onChoose"
      />

      <ConfirmPlanChangeDialog
        v-model:open="confirmOpen"
        :copy="confirmation?.copy ?? null"
        :current-plan-name="confirmation?.currentPlanName ?? ''"
        :target-plan-name="confirmation?.targetPlanName ?? ''"
        :submitting="checkoutPending"
        :error="checkoutError"
        @confirm="confirmChange"
      />
    </template>
  </div>
</template>
