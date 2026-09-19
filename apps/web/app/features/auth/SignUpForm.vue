<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { getRuleResults, validatePassword } from "@recetario/auth/password";
import GoogleSignInButton from "./GoogleSignInButton.vue";
import PasswordRules from "./PasswordRules.vue";
import { getSafeRedirect } from "./auth-redirect";
import { useAuthApi } from "./useAuthApi";

/**
 * Registro con email/contraseña o Google.
 *
 * Con `requireEmailVerification` el API no crea sesión: la vista de éxito es la
 * de "Verifica tu email" y se recuerda el email en `sessionStorage` para
 * sobrevivir recargas (mismo contrato que el original).
 */
const SIGNUP_EMAIL_KEY = "kitchcalc:signup_email";

const props = defineProps<{ redirect?: string | null }>();

const { signUpWithEmail, resendVerificationEmail } = useAuthApi();
const overlay = useState<string | null>("loading-overlay", () => null);

const firstName = ref("");
const lastName = ref("");
const email = ref("");
const password = ref("");
const confirmation = ref("");

const error = ref<string | null>(null);
const pending = ref(false);
const googleError = ref<string | null>(null);

const verifying = ref(false);
const verifiedEmail = ref("");
const resendState = ref<"idle" | "sending" | "sent" | "error">("idle");

const ruleResults = computed(() => getRuleResults(password.value));
const showRules = computed(() => password.value.length > 0);
const oauthTarget = computed(() => getSafeRedirect(props.redirect));

const matchState = computed<"match" | "mismatch" | null>(() => {
  if (confirmation.value.length === 0) return null;
  return password.value === confirmation.value ? "match" : "mismatch";
});

const resendStatus = computed(() => {
  switch (resendState.value) {
    case "sent":
      return {
        text: "Correo reenviado. Revisa tu bandeja.",
        class: "text-success",
      };
    case "error":
      return {
        text: "Error al reenviar. Intenta de nuevo.",
        class: "text-danger",
      };
    default:
      return null;
  }
});

onMounted(() => {
  const stored = sessionStorage.getItem(SIGNUP_EMAIL_KEY);
  if (stored) showVerification(stored);
});

function showVerification(value: string): void {
  verifiedEmail.value = value;
  verifying.value = true;
  resendState.value = "idle";
}

function focusField(id: string): void {
  document.getElementById(id)?.focus();
}

async function submit(): Promise<void> {
  if (pending.value) return;

  error.value = null;
  googleError.value = null;

  const first = firstName.value.trim();
  const last = lastName.value.trim();

  if (!first) {
    error.value = "El nombre no puede estar vacío.";
    focusField("sign-up-first-name");
    return;
  }
  if (!last) {
    error.value = "El apellido no puede estar vacío.";
    focusField("sign-up-last-name");
    return;
  }
  if (!validatePassword(password.value).valid) {
    error.value = "La contraseña no cumple los requisitos de seguridad.";
    return;
  }
  if (password.value !== confirmation.value) {
    error.value = "Las contraseñas no coinciden.";
    return;
  }

  pending.value = true;
  overlay.value = "Creando cuenta…";

  try {
    const address = email.value.trim();
    await signUpWithEmail({
      email: address,
      password: password.value,
      firstName: first,
      lastName: last,
    });
    sessionStorage.setItem(SIGNUP_EMAIL_KEY, address);
    showVerification(address);
  } catch (cause) {
    error.value =
      cause instanceof Error && cause.message
        ? cause.message
        : "Error al crear la cuenta.";
  } finally {
    overlay.value = null;
    pending.value = false;
  }
}

async function resend(): Promise<void> {
  if (resendState.value === "sending") return;

  resendState.value = "sending";
  try {
    await resendVerificationEmail(verifiedEmail.value);
    resendState.value = "sent";
  } catch {
    resendState.value = "error";
  }
}
</script>

<template>
  <div>
    <div v-if="!verifying">
      <div class="mb-8 text-center">
        <div
          class="bg-accent-50 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
        >
          <Icon name="lucide:chef-hat" :size="28" class="text-accent-600" />
        </div>
        <h1 class="text-foreground text-2xl font-black">Crear cuenta</h1>
        <p class="text-muted-foreground mt-1 text-sm">
          Regístrate para empezar a costear
        </p>
      </div>

      <FeedbackAlert v-if="error" type="error" :message="error" />

      <p class="text-muted-foreground mb-4 text-xs">
        <span class="text-danger font-bold">*</span> Campos obligatorios
      </p>

      <form class="space-y-4" @submit.prevent="submit">
        <Input
          id="sign-up-first-name"
          v-model="firstName"
          name="first_name"
          label="Nombre"
          placeholder="Tu nombre"
          autocomplete="given-name"
          required
        />
        <Input
          id="sign-up-last-name"
          v-model="lastName"
          name="last_name"
          label="Apellido"
          placeholder="Tu apellido"
          autocomplete="family-name"
          required
        />
        <Input
          id="sign-up-email"
          v-model="email"
          name="email"
          type="email"
          label="Email"
          placeholder="tu@email.com"
          autocomplete="email"
          required
        />
        <div>
          <PasswordInput
            id="sign-up-password"
            v-model="password"
            label="Contraseña"
            placeholder="Mínimo 8 caracteres"
            autocomplete="new-password"
            required
            :minlength="8"
          />
          <PasswordRules v-if="showRules" :results="ruleResults" />
        </div>
        <div>
          <PasswordInput
            id="sign-up-confirmation"
            v-model="confirmation"
            label="Confirmar contraseña"
            placeholder="Repite tu contraseña"
            autocomplete="new-password"
            required
            :minlength="8"
          />
          <p
            v-if="matchState"
            data-password-match
            class="mt-1 text-xs"
            :class="matchState === 'match' ? 'text-success' : 'text-danger'"
          >
            {{
              matchState === "match"
                ? "✓ Las contraseñas coinciden"
                : "✗ Las contraseñas no coinciden"
            }}
          </p>
        </div>
        <Button
          id="sign-up-submit"
          variant="primary"
          type="submit"
          class="w-full"
          :loading="pending"
        >
          {{ pending ? "Creando cuenta..." : "Crear cuenta" }}
        </Button>
      </form>

      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center">
          <div class="border-border w-full border-t" />
        </div>
        <div class="relative flex justify-center text-xs uppercase">
          <span class="bg-card text-muted-foreground px-3">o</span>
        </div>
      </div>

      <FeedbackAlert v-if="googleError" type="error" :message="googleError" />

      <GoogleSignInButton
        label="Continuar con Google"
        :redirect-to="oauthTarget"
        @error="googleError = $event"
      />

      <p class="text-muted-foreground mt-6 text-center text-sm">
        ¿Ya tienes cuenta?
        <Button variant="secondary" href="/sign-in" size="sm" class="ml-1">
          Inicia sesión
        </Button>
      </p>
    </div>

    <div
      v-else
      data-sign-up-verified
      class="flex flex-col items-center text-center"
    >
      <div
        class="bg-success-bg mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
      >
        <Icon name="lucide:mail-check" :size="28" class="text-success" />
      </div>
      <h1 class="text-foreground text-2xl font-black">Verifica tu email</h1>
      <p class="text-muted-foreground mt-1 text-sm">
        Te enviamos un enlace de verificación a
      </p>
      <p class="text-foreground mt-1 font-semibold" data-verified-email>
        {{ verifiedEmail }}
      </p>
      <p class="text-muted-foreground mt-3 text-xs">
        Haz clic en el enlace del correo para activar tu cuenta. Si no lo ves,
        revisa tu carpeta de spam.
      </p>
      <div class="mt-6 w-full space-y-3">
        <Button
          id="resend-verification"
          variant="secondary"
          type="button"
          class="w-full"
          :loading="resendState === 'sending'"
          :disabled="resendState === 'sent'"
          @click="resend"
        >
          {{ resendState === "sending" ? "Enviando..." : "Reenviar correo" }}
        </Button>
        <span
          v-if="resendStatus"
          class="text-xs"
          :class="resendStatus.class"
          role="status"
        >
          {{ resendStatus.text }}
        </span>
      </div>
      <div class="mt-4">
        <Button variant="secondary" href="/sign-in" size="sm">
          Ir al inicio de sesión
        </Button>
      </div>
    </div>
  </div>
</template>
