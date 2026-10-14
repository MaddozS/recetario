<script setup lang="ts">
import { ref } from 'vue';
import type { AccountNameFormValues } from './account-form';
import type { AccountOutcome } from './useAccountSettings';
import { NAME_UPDATED_MESSAGE } from './settings-messages';

/**
 * Formulario de nombre, con la mutación como **function prop** (patrón de los
 * slices): la card muestra pending/éxito/error y el perfil se actualiza desde la
 * respuesta confirmada (`applyProfile`).
 */
const props = defineProps<{
  initial: AccountNameFormValues;
  submit: (values: AccountNameFormValues) => Promise<AccountOutcome>;
  submitting: boolean;
}>();

const form = ref<AccountNameFormValues>({ ...props.initial });
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null);

async function onSubmit(): Promise<void> {
  feedback.value = null;
  const outcome = await props.submit({ ...form.value });

  feedback.value = outcome.ok
    ? { type: 'success', message: NAME_UPDATED_MESSAGE }
    : { type: 'error', message: outcome.message };
}
</script>

<template>
  <Card padding="lg">
    <h2 class="text-foreground text-lg font-bold">Nombre</h2>
    <p class="text-muted-foreground mt-1 text-sm">Actualiza tu nombre y apellido.</p>

    <div v-if="feedback" class="mt-4">
      <FeedbackAlert :type="feedback.type" :message="feedback.message" />
    </div>

    <form class="mt-4 max-w-sm space-y-4" @submit.prevent="onSubmit">
      <Input
        id="first-name"
        v-model="form.firstName"
        name="firstName"
        label="Nombre"
        required
        autocomplete="given-name"
      />
      <Input
        id="last-name"
        v-model="form.lastName"
        name="lastName"
        label="Apellido"
        required
        autocomplete="family-name"
      />
      <Button
        id="change-name-btn"
        variant="primary"
        type="submit"
        icon="user"
        :loading="submitting"
      >
        Guardar nombre
      </Button>
    </form>
  </Card>
</template>
