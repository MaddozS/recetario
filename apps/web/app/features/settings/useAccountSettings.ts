import {
  accountOkResponseSchema,
  accountProfileResponseSchema,
} from "@recetario/types";
import {
  validateAccountNameForm,
  validateAccountPasswordForm,
} from "./account-form";
import type {
  AccountNameFormValues,
  AccountPasswordFormValues,
} from "./account-form";
import {
  resolveAccountNameError,
  resolveAccountPasswordError,
} from "./settings-messages";

export type AccountMutation = "name" | "password";

export type AccountOutcome = { ok: true } | { ok: false; message: string };

const BUSY_OUTCOME: AccountOutcome = {
  ok: false,
  message: "Ya hay una operación en curso. Espera a que termine.",
};

/**
 * Mutaciones de perfil y contraseña.
 *
 * Validación pura **antes** de llamar (0 requests si el formulario es inválido)
 * y escritura del estado de sesión sólo con la respuesta confirmada
 * (`applyProfile`). Sin overlay global: el `loading` vive en cada botón.
 */
export function useAccountSettings() {
  const api = useApi();
  const { applyProfile } = useAuth();
  const mutation = ref<AccountMutation | null>(null);

  async function updateName(
    values: AccountNameFormValues,
  ): Promise<AccountOutcome> {
    const validation = validateAccountNameForm(values);
    if (validation) return { ok: false, message: validation };
    if (mutation.value) return BUSY_OUTCOME;

    mutation.value = "name";
    try {
      const profile = await api("/api/account/update-name", {
        method: "POST",
        body: {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
        },
        schema: accountProfileResponseSchema,
      });
      applyProfile(profile);
      return { ok: true };
    } catch (cause) {
      return { ok: false, message: resolveAccountNameError(cause) };
    } finally {
      mutation.value = null;
    }
  }

  async function changePassword(
    values: AccountPasswordFormValues,
  ): Promise<AccountOutcome> {
    const validation = validateAccountPasswordForm(values);
    if (validation) return { ok: false, message: validation };
    if (mutation.value) return BUSY_OUTCOME;

    mutation.value = "password";
    try {
      await api("/api/account/change-password", {
        method: "POST",
        body: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
        schema: accountOkResponseSchema,
      });
      return { ok: true };
    } catch (cause) {
      return { ok: false, message: resolveAccountPasswordError(cause) };
    } finally {
      mutation.value = null;
    }
  }

  return { mutation, updateName, changePassword };
}
