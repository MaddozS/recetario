import { describe, expect, it } from 'vitest';
import {
  NAME_UPDATED_MESSAGE,
  PASSWORD_UPDATED_MESSAGE,
  PREFERENCES_SAVED_MESSAGE,
  resolveAccountNameError,
  resolveAccountPasswordError,
} from '../../app/features/settings/settings-messages';

describe('mensajes de éxito', () => {
  it('conserva el copy del baseline', () => {
    expect(NAME_UPDATED_MESSAGE).toBe('Nombre actualizado correctamente.');
    expect(PASSWORD_UPDATED_MESSAGE).toBe('Contraseña actualizada correctamente.');
    expect(PREFERENCES_SAVED_MESSAGE).toBe('Preferencias guardadas correctamente.');
  });
});

describe('resolveAccountNameError', () => {
  it('usa el mensaje del envelope en errores 4xx', () => {
    expect(
      resolveAccountNameError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'La contraseña actual es incorrecta.',
      })
    ).toBe('La contraseña actual es incorrecta.');
  });

  it('no filtra mensajes internos de un 5xx', () => {
    expect(
      resolveAccountNameError({
        status: 500,
        code: 'INTERNAL',
        message: 'Internal server error',
      })
    ).toBe('Error al actualizar el nombre.');
  });

  it('distingue el fallo de red del genérico', () => {
    expect(resolveAccountNameError(new Error('fetch failed'))).toBe(
      'Error de conexión al actualizar el nombre.'
    );
    expect(resolveAccountNameError('boom')).toBe('Error al actualizar el nombre.');
    expect(resolveAccountNameError(undefined)).toBe('Error al actualizar el nombre.');
  });
});

describe('resolveAccountPasswordError', () => {
  it('usa el mensaje del envelope cuando existe', () => {
    expect(
      resolveAccountPasswordError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'La contraseña actual es incorrecta.',
      })
    ).toBe('La contraseña actual es incorrecta.');
  });

  it('cae al copy de conexión o genérico', () => {
    expect(resolveAccountPasswordError(new Error('fetch failed'))).toBe(
      'Error de conexión al cambiar la contraseña.'
    );
    expect(resolveAccountPasswordError({ status: 500 })).toBe('Error al cambiar la contraseña.');
  });
});
