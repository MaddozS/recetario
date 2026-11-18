<script setup lang="ts">
import { computed } from 'vue';
import { authPageTitleFor } from '#shared/utils/seo';
import AuthCard from '~/features/auth/AuthCard.vue';
import SignUpForm from '~/features/auth/SignUpForm.vue';
import { queryString } from '~/features/auth/auth-redirect';

definePageMeta({ layout: 'auth', middleware: 'guest' });

useNoindexSeo(authPageTitleFor('/sign-up'));

const route = useRoute();
const redirect = computed(() => queryString(route.query.redirect));
</script>

<template>
  <AuthCard>
    <SignUpForm :redirect="redirect" />
  </AuthCard>
</template>
