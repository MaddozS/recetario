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
 * datos compartidos (contadores + suscripción refrescada). Perfil y facturación
 * se montan una sola vez y se alternan con `v-show`, igual que el baseline, para
 * no perder borradores al cambiar de pestaña; Preferencias se monta con `v-if`
 * a propósito: su preview de tema/acento sólo vive mientras la pestaña está
 * visible y se descarta —sin persistir— al dejarla.
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

    <!-- `v-if`: el preview de apariencia muere con la pestaña. -->
    <PreferencesSection v-if="activeTab === 'preferences'" />

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
