<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { PricingPlan } from "@recetario/types";
import BillingIntervalToggle from "~/features/billing/BillingIntervalToggle.vue";
import PlanCard from "~/features/billing/PlanCard.vue";
import PlanFeatureList from "~/features/billing/PlanFeatureList.vue";
import PlanPrice from "~/features/billing/PlanPrice.vue";
import { useCheckout } from "~/features/billing/useCheckout";
import { usePricingPlans } from "~/features/billing/usePricingPlans";
import type { BillingInterval } from "~/features/billing/billing-interval";

definePageMeta({ layout: "public" });

usePageSeo("/pricing");

/**
 * `/pricing` es pública: el anónimo ve el catálogo y su CTA pasa por sign-in
 * (el checkout exige sesión en Hono). El autenticado ve su plan actual y puede
 * iniciar el checkout, con pending visible y error inline.
 *
 * `?plan=<tier>` (el enlace de `UpgradePrompt`) resalta la card objetivo y hace
 * scroll a ella en cliente; no dispara ningún checkout por sí solo. La card es
 * `PlanCard`, el mismo shell que monta la landing.
 */
const route = useRoute();
const { plans, pending: plansPending, error: plansError } = usePricingPlans();
const { isAuthenticated, subscription } = useAuth();
const {
  pending: checkoutPending,
  error: checkoutError,
  startCheckout,
} = useCheckout();

const interval = ref<BillingInterval>("monthly");
const checkoutPlanId = ref<string | null>(null);

const currentTier = computed(() => subscription.value?.tier ?? "free");
const showSuccessBanner = computed(() => route.query.success === "1");
const showCanceledBanner = computed(() => route.query.canceled === "1");

const highlightedPlan = computed<string | null>(() => {
  const raw = route.query.plan;
  if (raw !== "basic" && raw !== "pro") return null;
  return plans.value.some((plan) => plan.id === raw) ? raw : null;
});

onMounted(() => {
  const target = highlightedPlan.value;
  if (!target) return;

  const element = document.querySelector(`[data-plan="${target}"]`);
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  element?.scrollIntoView({
    block: "center",
    behavior: reducedMotion ? "auto" : "smooth",
  });
});

function isFree(plan: PricingPlan): boolean {
  return plan.id === "free";
}

function isCurrent(plan: PricingPlan): boolean {
  return plan.id === currentTier.value;
}

function buttonLabel(plan: PricingPlan): string {
  if (isCurrent(plan)) return "Plan actual";
  if (plan.id === "pro" && currentTier.value === "basic")
    return "Actualizar a Pro";
  if (!isFree(plan)) return "Suscribirse";
  return "Plan actual";
}

function anonymousLabel(plan: PricingPlan): string {
  return isFree(plan) ? "Comenzar gratis" : "Suscribirse";
}

function buttonClass(plan: PricingPlan): string {
  const base =
    "focus-ring mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-colors";

  // Sólo el autenticado ve estados bloqueados; para el anónimo todos los CTA
  // son un enlace accionable a sign-in.
  if (isAuthenticated.value && (isCurrent(plan) || isFree(plan))) {
    return `${base} border-border bg-background text-subtle-foreground cursor-not-allowed border`;
  }
  if (plan.id === "pro") {
    return `${base} bg-accent-solid text-text-on-accent hover:bg-accent-solid-hover`;
  }
  return `${base} border-border bg-card text-muted-foreground hover:bg-background border`;
}

function signInHref(plan: PricingPlan): string {
  return isFree(plan)
    ? "/sign-in?redirect=/recipes"
    : "/sign-in?redirect=/pricing";
}

async function subscribe(plan: PricingPlan): Promise<void> {
  checkoutPlanId.value = plan.id;
  await startCheckout(plan, interval.value);
  checkoutPlanId.value = null;
}
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 pt-24 pb-16 sm:px-6">
    <div
      v-if="showSuccessBanner"
      class="border-success-border bg-success-bg mb-6 rounded-2xl border p-4"
    >
      <div class="flex items-center gap-3">
        <Icon name="lucide:check-circle" :size="20" class="text-success" />
        <div>
          <p class="text-success font-semibold">Suscripción activada</p>
          <p class="text-success text-sm">
            Tu plan ya está activo. Disfruta de todas las funciones.
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="showCanceledBanner"
      class="border-warning-border bg-warning-bg mb-6 rounded-2xl border p-4"
    >
      <div class="flex items-center gap-3">
        <Icon name="lucide:alert-triangle" :size="20" class="text-warning" />
        <div>
          <p class="text-warning font-semibold">Suscripción cancelada</p>
          <p class="text-warning text-sm">
            No se realizó ningún cargo. Puedes intentarlo de nuevo cuando
            quieras.
          </p>
        </div>
      </div>
    </div>

    <Button
      v-if="isAuthenticated"
      variant="secondary"
      icon="arrow-left"
      href="/settings?tab=billing"
      size="sm"
      class="mb-6"
    >
      Volver a Facturación
    </Button>

    <div class="mb-8 text-center">
      <h1 class="text-foreground text-3xl font-black">Planes y precios</h1>
      <p class="text-muted-foreground mt-2">
        Elige el plan que mejor se adapte a tu negocio.
      </p>
    </div>

    <div class="mb-8 flex justify-center">
      <BillingIntervalToggle v-model="interval" />
    </div>

    <FeedbackAlert
      v-if="plansError"
      type="error"
      message="No pudimos cargar los planes. Recarga la página para reintentar."
    />
    <FeedbackAlert v-if="checkoutError" type="error" :message="checkoutError" />

    <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
      <template v-if="plansPending && plans.length === 0">
        <PlanCard v-for="index in 3" :key="`skeleton-${index}`">
          <Skeleton class="h-6 w-1/2" />
          <Skeleton class="mt-4 h-10 w-3/4" />
          <div class="mt-6 space-y-3">
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-5/6" />
            <Skeleton class="h-4 w-4/6" />
          </div>
        </PlanCard>
      </template>

      <PlanCard
        v-for="plan in plans"
        :key="plan.id"
        :plan-id="plan.id"
        :featured="plan.id === 'pro'"
        :highlighted="plan.id === highlightedPlan"
      >
        <Badge
          v-if="plan.badge"
          variant="tier"
          :color="plan.id === 'pro' ? 'accent' : 'success'"
          class="mb-4 self-start"
        >
          {{ plan.badge.text }}
        </Badge>

        <h2 class="text-foreground text-xl font-black">{{ plan.name }}</h2>
        <p class="text-muted-foreground mt-1 text-sm">
          {{ plan.description }}
        </p>

        <div class="mt-4">
          <PlanPrice :plan="plan" :interval="interval" />
        </div>

        <NuxtLink
          v-if="!isAuthenticated"
          :to="signInHref(plan)"
          :class="buttonClass(plan)"
        >
          {{ anonymousLabel(plan) }}
        </NuxtLink>
        <button
          v-else
          type="button"
          :class="buttonClass(plan)"
          :disabled="isCurrent(plan) || isFree(plan) || checkoutPending"
          :aria-busy="
            checkoutPending && checkoutPlanId === plan.id ? 'true' : undefined
          "
          @click="subscribe(plan)"
        >
          {{
            checkoutPending && checkoutPlanId === plan.id
              ? "Redirigiendo…"
              : buttonLabel(plan)
          }}
        </button>

        <div class="mt-6 flex-1">
          <PlanFeatureList :features="plan.features" />
        </div>
      </PlanCard>
    </div>
  </section>
</template>
