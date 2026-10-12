<script setup lang="ts">
import { usePricingPlans } from "~/features/billing/usePricingPlans";

definePageMeta({ layout: "public" });

const { plans, pending, error } = usePricingPlans();

usePageSeo("/");
</script>

<template>
  <div>
    <!-- Arco de decisión: primero qué es, después por qué importa, qué hace,
         cómo lo hace y cuánto cuesta. Antes abría con las funciones y cerraba
         con una banda CTA, sin el problema ni una vía de contacto. -->
    <LandingHeroSection />
    <LandingProblemSection />
    <LandingFeaturesSection />
    <LandingHowItWorksSection />
    <LandingPricingSection :plans="plans" :pending="pending" :error="error" />
    <LandingContactSection />
    <LandingCTASection />
  </div>
</template>
