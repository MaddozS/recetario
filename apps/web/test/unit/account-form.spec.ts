import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_PASSWORD_FIELDS_MESSAGE,
  ACCOUNT_PASSWORD_MISMATCH_MESSAGE,
  ACCOUNT_PASSWORD_POLICY_MESSAGE,
  ACCOUNT_REQUIRED_FIELDS_MESSAGE,
  accountNameFormFrom,
  emptyAccountPasswordForm,
  validateAccountNameForm,
  validateAccountPasswordForm,
} from '../../app/features/settings/account-form';

describe('accountNameFormFrom', () => {
  it('convierte los nulos del perfil en cadenas vacías', () => {
    expect(accountNameFormFrom({ firstName: 'Ada', lastName: 'Lovelace' })).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expect(accountNameFormFrom({ firstName: null, lastName: null })).toEqual({
      firstName: '',
      lastName: '',
    });
  });
});

describe('validateAccountNameForm', () => {
  it('acepta un nombre completo', () => {
    expect(validateAccountNameForm({ firstName: 'Ada', lastName: 'Lovelace' })).toBeNull();
  });

  it('exige ambos campos con contenido real', () => {
    expect(validateAccountNameForm({ firstName: '', lastName: 'Lovelace' })).toBe(
      ACCOUNT_REQUIRED_FIELDS_MESSAGE
    );
    expect(validateAccountNameForm({ firstName: 'Ada', lastName: '   ' })).toBe(
      ACCOUNT_REQUIRED_FIELDS_MESSAGE
    );
  });
});

describe('validateAccountPasswordForm', () => {
  it('parte de un formulario vacío', () => {
    expect(emptyAccountPasswordForm()).toEqual({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  });

  it('exige los tres campos', () => {
    expect(
      validateAccountPasswordForm({
        currentPassword: 'Temporal123!',
        newPassword: '',
        confirmPassword: '',
      })
    ).toBe(ACCOUNT_PASSWORD_FIELDS_MESSAGE);
  });

  it('aplica la política real (8+, mayúscula, minúscula, número, especial)', () => {
    expect(
      validateAccountPasswordForm({
        currentPassword: 'Temporal123!',
        newPassword: 'Abcdef1', // 7 caracteres: no cumple
        confirmPassword: 'Abcdef1',
      })
    ).toBe(ACCOUNT_PASSWORD_POLICY_MESSAGE);

    expect(
      validateAccountPasswordForm({
        currentPassword: 'Temporal123!',
        newPassword: 'Abcdef1!', // 8 caracteres con las 5 reglas
        confirmPassword: 'Abcdef1!',
      })
    ).toBeNull();
  });

  it('la política gana sobre la coincidencia', () => {
    expect(
      validateAccountPasswordForm({
        currentPassword: 'Temporal123!',
        newPassword: 'corta',
        confirmPassword: 'otra',
      })
    ).toBe(ACCOUNT_PASSWORD_POLICY_MESSAGE);
  });

  it('exige que la confirmación coincida', () => {
    expect(
      validateAccountPasswordForm({
        currentPassword: 'Temporal123!',
        newPassword: 'NuevaClave1!',
        confirmPassword: 'NuevaClave2!',
      })
    ).toBe(ACCOUNT_PASSWORD_MISMATCH_MESSAGE);
  });
});
