<script setup lang="ts">
import { computed } from "vue";
import { authPageTitleFor } from "#shared/utils/seo";
import AuthCard from "~/features/auth/AuthCard.vue";
import SignInForm from "~/features/auth/SignInForm.vue";
import { queryString } from "~/features/auth/auth-redirect";

definePageMeta({ layout: "auth", middleware: "guest" });

useNoindexSeo(authPageTitleFor("/sign-in"));

const route = useRoute();
const redirect = computed(() => queryString(route.query.redirect));
const errorCode = computed(() => queryString(route.query.error));
const reason = computed(() => queryString(route.query.reason));
</script>

<template>
  <AuthCard
    icon="chef-hat"
    title="Iniciar sesión"
    subtitle="Accede a tu recetario"
  >
    <SignInForm :redirect="redirect" :error-code="errorCode" :reason="reason" />
  </AuthCard>
</template>
