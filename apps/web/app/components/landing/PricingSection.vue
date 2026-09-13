<script setup lang="ts">
import { computed, ref } from "vue";
import type { PricingPlan } from "@recetario/types";
import BillingIntervalToggle from "~/features/billing/BillingIntervalToggle.vue";
import PlanFeatureList from "~/features/billing/PlanFeatureList.vue";
import PlanPrice from "~/features/billing/PlanPrice.vue";
import type { BillingInterval } from "~/features/billing/billing-interval";

/**
 * Sección `#pricing` de la landing: scroll horizontal con snap en móvil y tres
 * columnas en desktop. El CTA decide por sesión (el anónimo pasa por sign-in) y
 * el checkout vive en `/pricing`, que es la página autenticable.
 */
const props = defineProps<{
  plans: PricingPlan[];
  pending?: boolean;
  error?: unknown;
}>();

const { isAuthenticated } = useAuth();
const interval = ref<BillingInterval>("monthly");

const showEmptyState = computed(
  () => !props.pending && props.plans.length === 0,
);

function ctaHref(plan: PricingPlan): string {
  if (plan.id === "free") {
    return isAuthenticated.value ? "/recipes" : "/sign-in?redirect=/recipes";
  }
  return isAuthenticated.value ? "/pricing" : "/sign-in?redirect=/pricing";
}

function ctaLabel(plan: PricingPlan): string {
  return plan.id === "free" ? "Comenzar gratis" : `Elegir ${plan.name}`;
}
</script>

<template>
  <section id="pricing" v-reveal class="bg-background py-24 md:py-32">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 xl:px-8">
      <div v-reveal class="mx-auto max-w-2xl text-center">
        <h2
          class="landing-heading text-foreground text-3xl font-black md:text-4xl"
        >
          Planes y precios
        </h2>
        <p class="text-muted-foreground mt-4 text-lg">
          Elige el plan que mejor se adapte a tu negocio.
        </p>
      </div>

      <div v-reveal class="mt-8 flex justify-center">
        <BillingIntervalToggle v-model="interval" />
      </div>

      <FeedbackAlert
        v-if="error"
        class="mt-8"
        type="error"
        message="No pudimos cargar los planes. Recarga la página para reintentar."
      />

      <div class="relative mx-auto mt-12 max-w-5xl">
        <div class="pricing-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto py-5 sm:gap-6 lg:overflow-visible xl:gap-8">
          <template v-if="pending && plans.length === 0">
            <div
              v-for="index in 3"
              :key="`skeleton-${index}`"
              class="bg-card border-border min-w-[260px] shrink-0 snap-start rounded-2xl border p-7 sm:min-w-[320px] md:p-8 lg:min-w-0 lg:flex-1 xl:p-10"
            >
              <Skeleton class="h-6 w-1/2" />
              <Skeleton class="mt-4 h-10 w-3/4" />
              <div class="mt-6 space-y-3">
                <Skeleton class="h-4 w-full" />
                <Skeleton class="h-4 w-5/6" />
                <Skeleton class="h-4 w-4/6" />
              </div>
            </div>
          </template>

          <div
            v-for="(plan, index) in plans"
            :key="plan.id"
            :data-plan="plan.id"
            class="reveal-item bg-card relative flex min-w-[260px] shrink-0 snap-start flex-col rounded-2xl p-7 sm:min-w-[320px] md:p-8 lg:min-w-0 lg:flex-1 xl:p-10"
            :class="
              plan.id === 'pro'
                ? 'shadow-accent-tint plan-pro pricing-card-hover-pro bg-card dark:bg-accent-950/10 z-10'
                : 'pricing-card-hover shadow-sm'
            "
            :style="`--reveal-delay: ${index * 100}ms`"
          >
            <span
              v-if="plan.badge"
              class="mb-4 inline-flex items-center self-start rounded-md px-3 py-1 text-xs font-bold"
              :class="plan.badge.class"
            >
              {{ plan.badge.text }}
            </span>

            <h3 class="text-foreground text-xl font-black break-words">
              {{ plan.name }}
            </h3>
            <p class="text-muted-foreground mt-1 text-sm break-words">
              {{ plan.description }}
            </p>

            <div class="mt-4">
              <PlanPrice :plan="plan" :interval="interval" />
            </div>

            <a
              :href="ctaHref(plan)"
              class="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-center text-sm font-bold transition-all active:scale-[0.97]"
              :class="
                plan.id === 'pro'
                  ? 'bg-accent-600 hover:bg-accent-700 shadow-accent-tint text-text-on-accent'
                  : 'border-border bg-card text-secondary-foreground hover:bg-background border'
              "
            >
              {{ ctaLabel(plan) }}
            </a>

            <div class="mt-6 min-w-0 flex-1">
              <PlanFeatureList :features="plan.features" />
            </div>
          </div>

          <div
            aria-hidden="true"
            class="to-background pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-r from-transparent lg:hidden"
          />
        </div>

        <p v-if="showEmptyState" class="text-muted-foreground mt-6 text-center text-sm">
          No hay planes disponibles por ahora.
        </p>
      </div>
    </div>
  </section>
</template>

<style>
.pricing-scroll::-webkit-scrollbar {
  display: none;
}
.pricing-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
</style>
