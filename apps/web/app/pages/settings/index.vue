<script setup lang="ts">
import { computed } from "vue";
import SettingsTabs from "~/features/settings/SettingsTabs.vue";
import ProfileSection from "~/features/settings/ProfileSection.vue";
import PreferencesSection from "~/features/settings/PreferencesSection.vue";
import BillingSection from "~/features/billing/BillingSection.vue";
import { resolveSettingsTab } from "~/features/settings/settings-tabs";
import { useSettingsOverview } from "~/features/settings/useSettingsOverview";

/**
 * Página de Settings: coordina la pestaña activa (`?tab=`, back/forward) y los
 * datos compartidos (contadores + suscripción refrescada). Las secciones se
 * montan una sola vez y se alternan con `v-show`, igual que el baseline, para
 * no perder borradores al cambiar de pestaña.
 */
definePageMeta({
  layout: "private",
  middleware: "auth",
  breadcrumbs: [{ label: "Configuración" }],
});

useHead({ title: "Configuración | KitchCalc" });

const route = useRoute();
const activeTab = computed(() => resolveSettingsTab(route.query.tab));

const { counts, subscription, pending, failed, refresh } =
  useSettingsOverview();
</script>

<template>
  <section class="animate-fade-in mx-auto max-w-3xl">
    <SettingsTabs :active="activeTab" />

    <ProfileSection v-show="activeTab === 'profile'" />

    <PreferencesSection v-show="activeTab === 'preferences'" />

    <BillingSection
      v-if="subscription"
      v-show="activeTab === 'billing'"
      :subscription="subscription"
      :counts="counts"
      :loading="pending"
      :failed="failed"
      @retry="refresh()"
    />
  </section>
</template>
