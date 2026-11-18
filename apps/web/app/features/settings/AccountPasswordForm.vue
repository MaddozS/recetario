<script setup lang="ts">
import { computed, ref } from 'vue';
import { getRuleResults } from '@recetario/auth/password';
import PasswordRules from '~/features/auth/PasswordRules.vue';
import { emptyAccountPasswordForm } from './account-form';
import type { AccountPasswordFormValues } from './account-form';
import type { AccountOutcome } from './useAccountSettings';
import { PASSWORD_UPDATED_MESSAGE } from './settings-messages';

/**
 * Formulario de contraseña. Muestra las 5 reglas en vivo (misma política que
 * sign-up/reset) y valida en módulo puro antes de llamar: un formulario
 * inválido no genera peticiones. En éxito limpia los campos.
 */
const props = defineProps<{
  submit: (values: AccountPasswordFormValues) => Promise<AccountOutcome>;
  submitting: boolean;
}>();

const form = ref<AccountPasswordFormValues>(emptyAccountPasswordForm());
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null);

const ruleResults = computed(() => getRuleResults(form.value.newPassword));

async function onSubmit(): Promise<void> {
  feedback.value = null;
  const outcome = await props.submit({ ...form.value });

  if (outcome.ok) {
    form.value = emptyAccountPasswordForm();
    feedback.value = { type: 'success', message: PASSWORD_UPDATED_MESSAGE };
    return;
  }

  feedback.value = { type: 'error', message: outcome.message };
}
</script>

<template>
  <Card padding="lg">
    <h2 class="text-foreground text-lg font-bold">Cambiar contraseña</h2>
    <p class="text-muted-foreground mt-1 text-sm">
      Usa al menos 8 caracteres para tu nueva contraseña.
    </p>

    <div v-if="feedback" class="mt-4">
      <FeedbackAlert :type="feedback.type" :message="feedback.message" />
    </div>

    <form class="mt-4 max-w-sm space-y-4" @submit.prevent="onSubmit">
      <PasswordInput
        id="current-password"
        v-model="form.currentPassword"
        label="Contraseña actual"
        autocomplete="current-password"
        required
      />
      <div>
        <PasswordInput
          id="new-password"
          v-model="form.newPassword"
          label="Nueva contraseña"
          placeholder="Mínimo 8 caracteres"
          autocomplete="new-password"
          required
        />
        <PasswordRules :results="ruleResults" />
      </div>
      <PasswordInput
        id="confirm-new-password"
        v-model="form.confirmPassword"
        label="Confirmar contraseña"
        placeholder="Repite tu contraseña"
        autocomplete="new-password"
        required
      />
      <Button
        id="change-password-btn"
        variant="primary"
        type="submit"
        icon="lock"
        :loading="submitting"
      >
        Cambiar contraseña
      </Button>
    </form>
  </Card>
</template>
