<script setup lang="ts">
import { computed, ref } from "vue";
import type { PricingPlan } from "@recetario/types";
import BillingIntervalToggle from "~/features/billing/BillingIntervalToggle.vue";
import PlanCard from "~/features/billing/PlanCard.vue";
import PlanFeatureList from "~/features/billing/PlanFeatureList.vue";
import PlanPrice from "~/features/billing/PlanPrice.vue";
import { planHighlights } from "~/features/billing/plan-highlights";
import {
  RECOMMENDED_PLAN_ID,
  displayPlanOrder,
} from "~/features/billing/plan-order";
import type { BillingInterval } from "~/features/billing/billing-interval";

/**
 * Sección `#pricing` de la landing: superficie de **decisión**, con scroll
 * horizontal con snap en móvil y tres columnas en desktop.
 *
 * Cada card muestra sus **destacados** (lo incluido y disponible que no está en
 * el plan Free, con tope de 5 y el recorte dicho en texto) y el catálogo
 * completo vive en `/pricing`, que es la superficie de comparación.
 *
 * El orden de las cards es el mismo que el de `/pricing` (recomendado primero):
 * el CTA decide por sesión (el anónimo pasa por sign-in) y el checkout vive en
 * `/pricing`, que es la página autenticable.
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

const cards = computed(() =>
  displayPlanOrder(props.plans).map((plan) => ({
    plan,
    featured: plan.id === RECOMMENDED_PLAN_ID,
    highlights: planHighlights(plan, props.plans),
  })),
);

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
  <LandingSection id="pricing">
    <LandingSectionHeading
      eyebrow="Precios"
      title="Planes y precios"
      description="Empieza gratis y sube cuando el negocio lo pida. Sin contratos ni permanencia."
    />

    <!-- El `v-reveal` va en el envoltorio (y no en la sección) porque las cards
         llevan `reveal-item`: sin un ancestro con `reveal-visible` quedarían en
         opacidad 0. -->
    <div v-reveal>
      <div class="mt-8 flex justify-center">
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
            v-for="({ plan, featured, highlights }, index) in cards"
            :key="plan.id"
            :plan-id="plan.id"
            :featured="featured"
            density="roomy"
            :class="[
              CARD_LAYOUT_CLASSES,
              featured ? 'pricing-card-hover-pro' : 'pricing-card-hover',
            ]"
            :style="`--reveal-delay: ${index * 100}ms`"
          >
            <!-- El slot del badge se reserva en las tres cards: sin él, el plan
                 sin badge adelantaba su titular y las tres columnas dejaban de
                 compararse en la misma línea. -->
            <div class="mb-4 flex h-6 items-center">
              <Badge
                v-if="plan.badge"
                variant="tier"
                :color="featured ? 'accent' : 'success'"
              >
                {{ plan.badge.text }}
              </Badge>
            </div>

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
                featured
                  ? 'bg-accent-solid text-text-on-accent hover:bg-accent-solid-hover'
                  : 'border-border bg-card text-secondary-foreground hover:bg-background border'
              "
            >
              {{ ctaLabel(plan) }}
            </NuxtLink>

            <div class="mt-6 flex min-w-0 flex-1 flex-col">
              <PlanFeatureList
                :features="highlights.features"
                variant="compact"
                :remaining="highlights.remaining"
              />

              <NuxtLink
                to="/pricing"
                class="focus-ring text-accent-text mt-auto inline-flex min-h-11 items-center gap-1 pt-3 text-sm font-bold"
                :aria-label="`Ver todas las funciones del plan ${plan.name}`"
              >
                Ver todas las funciones
                <Icon name="lucide:chevron-right" :size="16" />
              </NuxtLink>
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
  </LandingSection>
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
