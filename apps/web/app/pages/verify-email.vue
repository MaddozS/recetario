<script setup lang="ts">
import { computed } from "vue";
import { authPageTitleFor } from "#shared/utils/seo";
import AuthCard from "~/features/auth/AuthCard.vue";
import VerifyEmailStatus from "~/features/auth/VerifyEmailStatus.vue";
import { queryString, safeCallbackPath } from "~/features/auth/auth-redirect";

definePageMeta({ layout: "auth" });

useNoindexSeo(authPageTitleFor("/verify-email"));

const route = useRoute();
const token = computed(() => queryString(route.query.token));
// Saneado en SSR: el botón de éxito sólo apunta a una ruta local.
const callbackUrl = computed(() => safeCallbackPath(route.query.callbackURL));
</script>

<template>
  <AuthCard centered>
    <VerifyEmailStatus :token="token" :callback-url="callbackUrl" />
  </AuthCard>
</template>
