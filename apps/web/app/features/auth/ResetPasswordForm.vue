<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { getRuleResults, validatePassword } from "@recetario/auth/password";
import PasswordRules from "./PasswordRules.vue";
import { useCountdown } from "./useCountdown";
import { useAuthApi } from "./useAuthApi";

/**
 * Nueva contraseña con token de un solo uso.
 *
 * Sin `?token=` el bloque de enlace inválido se renderiza en SSR; con token, la
 * validación corre al montar y el countdown (`remainingSeconds`) muestra la
 * vista expirada al agotarse. El countdown se limpia al desmontar.
 */
const props = defineProps<{
  token?: string | null;
  email?: string | null;
}>();

const { validateResetToken, submitPasswordReset } = useAuthApi();
const {
  label: countdownLabel,
  start: startCountdown,
  stop,
} = useCountdown(showExpired);

const view = ref<"form" | "expired" | "success">("form");
const tokenStatus = ref<string | null>(null);
const error = ref<string | null>(null);
const pending = ref(false);
const password = ref("");
const confirmation = ref("");

const ruleResults = computed(() => getRuleResults(password.value));
const successMessage = ref("Tu contraseña ha sido restablecida correctamente.");

// El CTA de la vista expirada lleva el email para que el formulario llegue
// prellenado (la nota del original lo promete).
const forgotHref = computed(() =>
  props.email
    ? `/forgot-password?email=${encodeURIComponent(props.email)}`
    : "/forgot-password",
);

function showExpired(): void {
  view.value = "expired";
  tokenStatus.value = "El enlace ha expirado";
}

onMounted(async () => {
  if (!props.token) return;

  try {
    const validation = await validateResetToken(props.token);
    if (!validation.valid) {
      showExpired();
      return;
    }
    if (validation.remainingSeconds !== undefined) {
      startCountdown(validation.remainingSeconds);
    }
  } catch {
    showExpired();
  }
});

async function submit(): Promise<void> {
  if (pending.value || !props.token) return;

  error.value = null;

  if (!validatePassword(password.value).valid) {
    error.value = "La contraseña no cumple todos los requisitos.";
    return;
  }
  if (password.value !== confirmation.value) {
    error.value = "Las contraseñas no coinciden.";
    return;
  }

  pending.value = true;
  try {
    successMessage.value = await submitPasswordReset(
      props.token,
      password.value,
    );
    stop();
    view.value = "success";
  } catch (cause) {
    error.value =
      cause instanceof Error && cause.message
        ? cause.message
        : "Error al restablecer la contraseña.";
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div>
    <div
      v-if="!token"
      data-reset-invalid
      class="border-danger-border bg-danger-bg text-danger rounded-xl border px-4 py-3 text-center text-sm font-semibold"
    >
      Enlace inválido o expirado.
      <div class="mt-3">
        <Button variant="secondary" href="/forgot-password" size="sm">
          Solicitar nuevo enlace
        </Button>
      </div>
    </div>

    <p
      v-if="tokenStatus"
      data-reset-status
      class="border-warning-border bg-warning-bg text-warning mb-4 rounded-xl border px-4 py-3 text-sm font-semibold"
    >
      {{ tokenStatus }}
    </p>

    <template v-if="view === 'form'">
      <FeedbackAlert v-if="error" type="error" :message="error" />

      <div class="mb-4 text-center">
        <div
          class="bg-warning-bg inline-flex items-center gap-2 rounded-lg px-4 py-2"
        >
          <Icon name="lucide:clock" :size="16" class="text-warning" />
          <span
            data-reset-countdown
            class="text-warning font-mono text-lg font-bold"
          >
            {{ countdownLabel }}
          </span>
        </div>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <PasswordInput
            id="reset-password"
            v-model="password"
            label="Nueva contraseña"
            placeholder="Mínimo 8 caracteres"
            autocomplete="new-password"
            required
          />
          <PasswordRules :results="ruleResults" />
        </div>
        <PasswordInput
          id="reset-confirmation"
          v-model="confirmation"
          label="Confirmar contraseña"
          placeholder="Repite tu contraseña"
          autocomplete="new-password"
          required
        />
        <Button
          id="reset-submit"
          variant="primary"
          type="submit"
          class="w-full"
          :loading="pending"
        >
          {{ pending ? "Restableciendo..." : "Restablecer contraseña" }}
        </Button>
      </form>
    </template>

    <div v-else-if="view === 'success'" data-reset-success class="text-center">
      <div
        class="bg-success-bg mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl"
      >
        <Icon name="lucide:check" :size="28" class="text-success" />
      </div>
      <h2 class="text-foreground text-xl font-bold">Contraseña actualizada</h2>
      <p class="text-muted-foreground mt-2 text-sm">
        {{ successMessage }}
      </p>
      <div class="mt-6">
        <Button variant="primary" href="/sign-in" class="w-full">
          Iniciar sesión
        </Button>
      </div>
    </div>

    <div v-else data-reset-expired class="text-center">
      <div
        class="bg-danger-bg mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl"
      >
        <Icon name="lucide:clock" :size="28" class="text-danger" />
      </div>
      <h2 class="text-foreground text-xl font-bold">Enlace expirado</h2>
      <p class="text-muted-foreground mt-2 text-sm">
        Este enlace ha expirado. Solicita uno nuevo para continuar.
      </p>
      <div class="mt-6">
        <Button variant="primary" :href="forgotHref" class="w-full">
          Solicitar nuevo enlace
        </Button>
      </div>
      <p v-if="email" class="text-muted-foreground mt-4 text-xs">
        Te redirigimos al formulario con tu email prellenado.
      </p>
    </div>
  </div>
</template>
