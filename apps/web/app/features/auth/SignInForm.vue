<script setup lang="ts">
import { computed, ref } from 'vue';
import { AuthApiError } from './auth-error';
import { resolveAuthErrorMessage, resolveAuthReasonMessage } from './auth-messages';
import { getSafeRedirect } from './auth-redirect';
import GoogleSignInButton from './GoogleSignInButton.vue';
import { useAuthApi } from './useAuthApi';

/**
 * Acceso con email/contraseña o Google. El `?redirect=` se revalida aquí
 * (nunca se navega a un destino externo) y el `?error=`/`?reason=` de la URL se
 * traducen a las alertas del original.
 */
const props = defineProps<{
  redirect?: string | null;
  errorCode?: string | null;
  reason?: string | null;
}>();

const { signInWithEmail, resendVerificationEmail } = useAuthApi();
const overlay = useState<string | null>('loading-overlay', () => null);

const email = ref('');
const password = ref('');
const error = ref<string | null>(null);
const pending = ref(false);

const emailNotVerified = ref(false);
const resendState = ref<'idle' | 'sending' | 'sent' | 'error'>('idle');

const oauthMessage = computed(() => resolveAuthErrorMessage(props.errorCode));
const reasonMessage = computed(() => resolveAuthReasonMessage(props.reason));
const target = computed(() => getSafeRedirect(props.redirect));

const resendLabel = computed(() => {
  switch (resendState.value) {
    case 'sending':
      return 'Enviando...';
    case 'sent':
      return 'Reenviado. Revisa tu correo!';
    case 'error':
      return 'Error. Reintentar';
    default:
      return 'Reenviar correo';
  }
});

async function submit(): Promise<void> {
  if (pending.value) return;

  error.value = null;
  emailNotVerified.value = false;
  resendState.value = 'idle';
  pending.value = true;
  overlay.value = 'Iniciando sesión…';

  try {
    await signInWithEmail(email.value.trim(), password.value);
    sessionStorage.removeItem('kitchcalc:signup_email');
    await navigateTo(target.value, { external: true });
  } catch (cause) {
    if (cause instanceof AuthApiError && cause.code === 'EMAIL_NOT_VERIFIED') {
      emailNotVerified.value = true;
    } else {
      error.value = 'Credenciales inválidas.';
    }
  } finally {
    overlay.value = null;
    pending.value = false;
  }
}

async function resend(): Promise<void> {
  if (resendState.value === 'sending' || resendState.value === 'sent') return;

  resendState.value = 'sending';
  try {
    await resendVerificationEmail(email.value.trim());
    resendState.value = 'sent';
  } catch {
    resendState.value = 'error';
  }
}

function onOauthError(message: string): void {
  error.value = message;
}
</script>

<template>
  <div>
    <FeedbackAlert v-if="oauthMessage" type="error" :message="oauthMessage" />

    <p
      v-if="reasonMessage"
      class="border-border bg-background text-muted-foreground mb-4 rounded-xl border px-4 py-3 text-sm font-semibold"
      role="status"
    >
      {{ reasonMessage }}
    </p>

    <div
      v-if="emailNotVerified"
      data-sign-in-verify
      role="alert"
      class="border-warning-border bg-warning-bg text-warning mb-4 rounded-xl border px-4 py-3 text-sm font-semibold"
    >
      Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja.
      <button
        type="button"
        class="font-bold underline hover:opacity-80 disabled:pointer-events-none disabled:opacity-60"
        :disabled="resendState === 'sending' || resendState === 'sent'"
        @click="resend"
      >
        {{ resendLabel }}
      </button>
    </div>
    <FeedbackAlert v-else-if="error" type="error" :message="error" />

    <form class="space-y-4" @submit.prevent="submit">
      <Input
        id="sign-in-email"
        v-model="email"
        name="email"
        type="email"
        label="Email"
        placeholder="tu@email.com"
        autocomplete="email"
        required
      />
      <PasswordInput
        id="sign-in-password"
        v-model="password"
        label="Contraseña"
        autocomplete="current-password"
        required
        :show-required="false"
      />
      <Button id="sign-in-submit" variant="primary" type="submit" class="w-full" :loading="pending">
        {{ pending ? 'Iniciando sesión...' : 'Iniciar sesión' }}
      </Button>
      <p class="text-center">
        <Button variant="secondary" href="/forgot-password" size="sm">
          ¿Olvidaste tu contraseña?
        </Button>
      </p>
    </form>

    <div class="relative my-6">
      <div class="absolute inset-0 flex items-center">
        <div class="border-border w-full border-t" />
      </div>
      <div class="relative flex justify-center text-xs uppercase">
        <span class="bg-card text-muted-foreground px-3">o</span>
      </div>
    </div>

    <GoogleSignInButton :redirect-to="target" @error="onOauthError" />

    <p class="text-muted-foreground mt-6 text-center text-sm">
      ¿No tienes cuenta?
      <Button variant="secondary" href="/sign-up" size="sm" class="ml-1"> Regístrate </Button>
    </p>
  </div>
</template>
