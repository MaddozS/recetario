<script setup lang="ts">
import { computed } from "vue";
import { authPageTitleFor } from "#shared/utils/seo";
import AuthCard from "~/features/auth/AuthCard.vue";
import ForgotPasswordForm from "~/features/auth/ForgotPasswordForm.vue";
import { queryEmail } from "~/features/auth/auth-redirect";

definePageMeta({ layout: "auth" });

useNoindexSeo(authPageTitleFor("/forgot-password"));

const route = useRoute();
// El email nunca entra en metadata, sólo en el campo prellenado.
const email = computed(() => queryEmail(route.query.email));
</script>

<template>
  <AuthCard
    icon="key-round"
    title="Restablecer contraseña"
    subtitle="Ingresa tu email y te enviaremos un enlace"
  >
    <ForgotPasswordForm :email="email" />
  </AuthCard>
</template>
