<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAuthApi } from './useAuthApi';

/**
 * Verificación del email por token. El `callbackURL` ya viene saneado por la
 * página (sólo rutas locales) y se usa como destino del botón de éxito.
 */
const props = defineProps<{
  token?: string | null;
  callbackUrl?: string | null;
}>();

const { verifyEmailToken } = useAuthApi();

const state = ref<'loading' | 'success' | 'error'>('loading');
const errorMessage = ref('El enlace de verificación es inválido o ha expirado.');

onMounted(async () => {
  if (!props.token) {
    state.value = 'error';
    errorMessage.value = 'No se encontró el token de verificación.';
    return;
  }

  try {
    await verifyEmailToken(props.token);
    sessionStorage.removeItem('kitchcalc:signup_email');
    state.value = 'success';
  } catch (cause) {
    state.value = 'error';
    errorMessage.value =
      cause instanceof Error && cause.message
        ? cause.message
        : 'El enlace de verificación es inválido o ha expirado.';
  }
});
</script>

<template>
  <div>
    <div v-if="state === 'loading'" data-verify-loading class="flex flex-col items-center">
      <div class="bg-accent-50 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
        <svg
          class="text-accent-600 h-7 w-7 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
      <h1 class="text-foreground text-2xl font-black">Verificando...</h1>
      <p class="text-muted-foreground mt-2 text-sm">Estamos verificando tu email.</p>
    </div>

    <div v-else-if="state === 'success'" data-verify-success class="flex flex-col items-center">
      <div
        class="bg-success-bg mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
      >
        <Icon name="lucide:mail-check" :size="28" class="text-success" />
      </div>
      <h1 class="text-foreground text-2xl font-black">Email verificado</h1>
      <p class="text-muted-foreground mt-2 text-sm">Tu email ha sido verificado correctamente.</p>
      <div class="mt-6">
        <Button variant="primary" :href="callbackUrl || '/sign-in'" class="w-full">
          Iniciar sesión
        </Button>
      </div>
    </div>

    <div v-else data-verify-error class="flex flex-col items-center">
      <div class="bg-danger-bg mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
        <Icon name="lucide:alert-triangle" :size="28" class="text-danger" />
      </div>
      <h1 class="text-foreground text-2xl font-black">Error de verificación</h1>
      <p class="text-muted-foreground mt-2 text-sm" data-verify-error-message>
        {{ errorMessage }}
      </p>
      <div class="mt-6">
        <Button variant="primary" href="/sign-in" class="w-full"> Ir al inicio de sesión </Button>
      </div>
    </div>
  </div>
</template>
