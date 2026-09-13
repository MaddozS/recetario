<script setup lang="ts">
import { authPageTitleFor } from "#shared/utils/seo";
import AuthCard from "~/features/auth/AuthCard.vue";
import ForgotPasswordForm from "~/features/auth/ForgotPasswordForm.vue";

definePageMeta({ layout: "auth" });

useNoindexSeo(authPageTitleFor("/forgot-password"));
</script>

<template>
  <AuthCard
    icon="key-round"
    title="Restablecer contraseña"
    subtitle="Ingresa tu email y te enviaremos un enlace"
  >
    <ForgotPasswordForm />
  </AuthCard>
</template>
