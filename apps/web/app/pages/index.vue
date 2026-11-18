<script setup lang="ts">
import { usePricingPlans } from '~/features/billing/usePricingPlans';

definePageMeta({ layout: 'public' });

const { plans, pending, error } = usePricingPlans();

usePageSeo('/');
</script>

<template>
  <div class="pb-16 md:pb-0">
    <!-- Arco de decisión y conversión:
         1. Hero: qué es, costo vs margen y promesa clara.
         2. Problema: dolor de insumos al alza y recetas en hojas de cálculo.
         3. Funciones: solución concreta (tabs en móvil, vitrina en desktop).
         4. Cómo funciona: 3 pasos + simulador interactivo de margen.
         5. Confianza: segmentos de clientes y garantías verificables.
         6. Precios: planes transparentes con Basic destacado.
         7. FAQ: resolución de objeciones y soporte.
         8. CTA final: conversión con plan gratis sin tarjeta.
         9. Sticky CTA: persistencia de conversión en móvil. -->
    <LandingHeroSection />
    <LandingProblemSection />
    <LandingFeaturesSection />
    <LandingHowItWorksSection />
    <LandingTrustSection />
    <LandingPricingSection :plans="plans" :pending="pending" :error="error" />
    <LandingFAQSection />
    <LandingCTASection />
    <LandingStickyCta />
  </div>
</template>
