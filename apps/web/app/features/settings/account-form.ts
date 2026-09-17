import { validatePassword } from "@recetario/auth/password";

/**
 * Modelos y validación de los formularios de cuenta.
 *
 * Sin aliases ni dependencias de Vue: cubiertos por el proyecto `unit`. La
 * validación es la misma que la del API (`validatePassword`), así que el
 * formulario nunca envía una contraseña que Hono vaya a rechazar.
 */

export type AccountNameFormValues = {
  firstName: string;
  lastName: string;
};

export type AccountProfileSource = {
  firstName: string | null;
  lastName: string | null;
};

export type AccountPasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export const ACCOUNT_REQUIRED_FIELDS_MESSAGE =
  "Por favor completa todos los campos requeridos.";
export const ACCOUNT_PASSWORD_FIELDS_MESSAGE =
  "Por favor completa todos los campos.";
export const ACCOUNT_PASSWORD_POLICY_MESSAGE =
  "La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y un carácter especial.";
export const ACCOUNT_PASSWORD_MISMATCH_MESSAGE =
  "Las contraseñas no coinciden.";

export function accountNameFormFrom(
  source: AccountProfileSource,
): AccountNameFormValues {
  return {
    firstName: source.firstName ?? "",
    lastName: source.lastName ?? "",
  };
}

/** Devuelve el mensaje de error o `null` si el formulario es válido. */
export function validateAccountNameForm(
  values: AccountNameFormValues,
): string | null {
  if (!values.firstName.trim() || !values.lastName.trim()) {
    return ACCOUNT_REQUIRED_FIELDS_MESSAGE;
  }
  return null;
}

export function emptyAccountPasswordForm(): AccountPasswordFormValues {
  return { currentPassword: "", newPassword: "", confirmPassword: "" };
}

export function validateAccountPasswordForm(
  values: AccountPasswordFormValues,
): string | null {
  if (
    !values.currentPassword ||
    !values.newPassword ||
    !values.confirmPassword
  ) {
    return ACCOUNT_PASSWORD_FIELDS_MESSAGE;
  }

  if (!validatePassword(values.newPassword).valid) {
    return ACCOUNT_PASSWORD_POLICY_MESSAGE;
  }

  if (values.newPassword !== values.confirmPassword) {
    return ACCOUNT_PASSWORD_MISMATCH_MESSAGE;
  }

  return null;
}
