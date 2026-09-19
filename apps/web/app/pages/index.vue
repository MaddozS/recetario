<script setup lang="ts">
import { usePricingPlans } from "~/features/billing/usePricingPlans";

definePageMeta({ layout: "public" });

const { plans, pending, error } = usePricingPlans();

usePageSeo("/");
</script>

<template>
  <div>
    <LandingHeroSection />
    <LandingFeaturesSection />
    <LandingHowItWorksSection />
    <LandingPricingSection :plans="plans" :pending="pending" :error="error" />
    <LandingCTASection />
  </div>
</template>
