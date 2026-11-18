<script setup lang="ts">
import { ref } from 'vue';
import { useAuthApi } from './useAuthApi';

/**
 * Solicitud de enlace de restablecimiento.
 *
 * El API responde siempre igual (exista o no el email) para no enumerar
 * cuentas, así que la UI muestra el mismo mensaje verde también ante un fallo de
 * red: mismo contrato que el original. Acepta `?email=` para prellenar el campo
 * cuando se llega desde el enlace expirado de `/reset-password`.
 */
const props = withDefaults(defineProps<{ email?: string | null }>(), {
  email: null,
});

const { requestPasswordReset } = useAuthApi();

const email = ref(props.email ?? '');
const feedback = ref<string | null>(null);
const pending = ref(false);

async function submit(): Promise<void> {
  if (pending.value) return;

  pending.value = true;
  try {
    feedback.value = await requestPasswordReset(email.value.trim());
  } catch {
    feedback.value = 'Si el email existe, recibirás un enlace para restablecer tu contraseña.';
  } finally {
    pending.value = false;
    email.value = '';
  }
}
</script>

<template>
  <div>
    <FeedbackAlert v-if="feedback" type="success" :message="feedback" />

    <form class="space-y-4" @submit.prevent="submit">
      <Input
        id="forgot-email"
        v-model="email"
        name="email"
        type="email"
        label="Email"
        placeholder="tu@email.com"
        autocomplete="email"
        required
      />
      <Button id="forgot-submit" variant="primary" type="submit" class="w-full" :loading="pending">
        {{ pending ? 'Enviando...' : 'Enviar enlace' }}
      </Button>
    </form>

    <p class="text-muted-foreground mt-6 text-center text-sm">
      <Button variant="secondary" href="/sign-in" size="sm"> Volver al inicio de sesión </Button>
    </p>
  </div>
</template>
