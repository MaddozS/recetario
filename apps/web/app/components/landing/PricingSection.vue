<script setup lang="ts">
import { computed, ref } from "vue";
import type { PricingPlan } from "@recetario/types";
import BillingIntervalToggle from "~/features/billing/BillingIntervalToggle.vue";
import PlanCard from "~/features/billing/PlanCard.vue";
import PlanFeatureList from "~/features/billing/PlanFeatureList.vue";
import PlanPrice from "~/features/billing/PlanPrice.vue";
import type { BillingInterval } from "~/features/billing/billing-interval";

/**
 * Sección `#pricing` de la landing: scroll horizontal con snap en móvil y tres
 * columnas en desktop. El CTA decide por sesión (el anónimo pasa por sign-in) y
 * el checkout vive en `/pricing`, que es la página autenticable.
 *
 * La card es `PlanCard` (el mismo shell que `/pricing`); aquí sólo se le añaden
 * las clases del scroller y el hover del landing.
 */
const props = defineProps<{
  plans: PricingPlan[];
  pending?: boolean;
  error?: unknown;
}>();

const { isAuthenticated } = useAuth();
const interval = ref<BillingInterval>("monthly");

const CARD_LAYOUT_CLASSES =
  "reveal-item min-w-[260px] shrink-0 snap-start sm:min-w-[320px] lg:min-w-0 lg:flex-1";

// El vacío sólo es verdad sin error: con el API caído la sección avisa, no dice
// que el producto no tiene planes.
const showEmptyState = computed(
  () => !props.pending && !props.error && props.plans.length === 0,
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
        <div
          class="pricing-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto py-5 sm:gap-6 lg:overflow-visible xl:gap-8"
        >
          <template v-if="pending && plans.length === 0">
            <PlanCard
              v-for="index in 3"
              :key="`skeleton-${index}`"
              density="roomy"
              :class="CARD_LAYOUT_CLASSES"
            >
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
            v-for="(plan, index) in plans"
            :key="plan.id"
            :plan-id="plan.id"
            :featured="plan.id === 'pro'"
            density="roomy"
            :class="[
              CARD_LAYOUT_CLASSES,
              plan.id === 'pro' ? 'pricing-card-hover-pro' : 'pricing-card-hover',
            ]"
            :style="`--reveal-delay: ${index * 100}ms`"
          >
            <Badge
              v-if="plan.badge"
              variant="tier"
              :color="plan.id === 'pro' ? 'accent' : 'success'"
              class="mb-4 self-start"
            >
              {{ plan.badge.text }}
            </Badge>

            <h3 class="text-foreground text-xl font-black break-words">
              {{ plan.name }}
            </h3>
            <p class="text-muted-foreground mt-1 text-sm break-words">
              {{ plan.description }}
            </p>

            <div class="mt-4">
              <PlanPrice :plan="plan" :interval="interval" />
            </div>

            <NuxtLink
              :to="ctaHref(plan)"
              class="focus-ring mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-center text-sm font-bold transition-all active:scale-[0.97]"
              :class="
                plan.id === 'pro'
                  ? 'bg-accent-solid text-text-on-accent hover:bg-accent-solid-hover shadow-accent-tint'
                  : 'border-border bg-card text-secondary-foreground hover:bg-background border'
              "
            >
              {{ ctaLabel(plan) }}
            </NuxtLink>

            <div class="mt-6 min-w-0 flex-1">
              <PlanFeatureList :features="plan.features" />
            </div>
          </PlanCard>

          <div
            aria-hidden="true"
            class="to-background pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-r from-transparent lg:hidden"
          />
        </div>

        <p
          v-if="showEmptyState"
          class="text-muted-foreground mt-6 text-center text-sm"
        >
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
