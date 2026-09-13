<script setup lang="ts">
import { computed } from "vue";
import { authPageTitleFor } from "#shared/utils/seo";
import AuthCard from "~/features/auth/AuthCard.vue";
import ResetPasswordForm from "~/features/auth/ResetPasswordForm.vue";
import { queryEmail, queryString } from "~/features/auth/auth-redirect";

definePageMeta({ layout: "auth" });

useNoindexSeo(authPageTitleFor("/reset-password"));

const route = useRoute();
// El token viaja en la query (nunca a metadata); `?email=` prellena el
// formulario de recuperación al que apunta la vista expirada.
const token = computed(() => queryString(route.query.token));
const email = computed(() => queryEmail(route.query.email));
</script>

<template>
  <AuthCard
    icon="lock"
    title="Nueva contraseña"
    subtitle="Elige una nueva contraseña para tu cuenta"
  >
    <ResetPasswordForm :token="token" :email="email" />
  </AuthCard>
</template>
