import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPasswordForm from '~/features/auth/ForgotPasswordForm.vue';
import ResetPasswordForm from '~/features/auth/ResetPasswordForm.vue';
import SignInForm from '~/features/auth/SignInForm.vue';
import SignUpForm from '~/features/auth/SignUpForm.vue';
import VerifyEmailStatus from '~/features/auth/VerifyEmailStatus.vue';

/**
 * Formularios de auth contra un `useRequestFetch` falso: así se cubre también
 * el transporte real (`useAuthApi` + normalizador de errores) sin tocar el API.
 */
const api = vi.hoisted(() => ({
  calls: [] as Array<{ path: string; body: unknown }>,
  respond: (async () => ({})) as (path: string, body: unknown) => Promise<unknown>,
}));

mockNuxtImport('useRequestFetch', () => () => {
  return async (path: string, init: { body?: unknown } = {}) => {
    api.calls.push({ path, body: init.body });
    return await api.respond(path, init.body);
  };
});

function httpError(status: number, data: unknown): unknown {
  return { status, data, response: { status } };
}

beforeEach(() => {
  api.calls = [];
  api.respond = async () => ({});
  sessionStorage.clear();
});

describe('SignInForm', () => {
  it('traduce el error de OAuth y el motivo del redirect a alertas', async () => {
    const wrapper = await mountSuspended(SignInForm, {
      props: { errorCode: 'state_mismatch', reason: 'session_expired' },
    });

    expect(wrapper.text()).toContain('Error de seguridad. Intenta de nuevo.');
    expect(wrapper.text()).toContain('Tu sesión expiró. Vuelve a iniciar sesión.');
  });

  it('con credenciales inválidas muestra el error genérico', async () => {
    api.respond = async () => {
      throw httpError(401, {
        message: 'Invalid email or password',
        code: 'INVALID_EMAIL_OR_PASSWORD',
      });
    };

    const wrapper = await mountSuspended(SignInForm, { props: {} });
    await wrapper.find('#sign-in-email').setValue('qa@example.com');
    await wrapper.find('#sign-in-password').setValue('incorrecta');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(api.calls[0]?.path).toBe('/api/auth/sign-in/email');
    expect(api.calls[0]?.body).toEqual({
      email: 'qa@example.com',
      password: 'incorrecta',
    });
    expect(wrapper.text()).toContain('Credenciales inválidas.');
    expect(wrapper.find('[data-sign-in-verify]').exists()).toBe(false);
  });

  it('con el email sin verificar ofrece reenviar el correo', async () => {
    api.respond = async (path) => {
      if (path === '/api/auth/sign-in/email') {
        throw httpError(403, {
          message: 'Email not verified',
          code: 'EMAIL_NOT_VERIFIED',
        });
      }
      return { status: true };
    };

    const wrapper = await mountSuspended(SignInForm, { props: {} });
    await wrapper.find('#sign-in-email').setValue('unverified@example.com');
    await wrapper.find('#sign-in-password').setValue('Temporal123!');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const verify = wrapper.find('[data-sign-in-verify]');
    expect(verify.exists()).toBe(true);

    await verify.find('button').trigger('click');
    await flushPromises();

    expect(api.calls[1]?.path).toBe('/api/auth/send-verification-email');
    expect(verify.text()).toContain('Reenviado. Revisa tu correo!');
  });
});

describe('SignUpForm', () => {
  it('marca las reglas y detecta la confirmación distinta', async () => {
    const wrapper = await mountSuspended(SignUpForm, { props: {} });

    expect(wrapper.findAll('[data-rule]')).toHaveLength(0);

    await wrapper.find('#sign-up-password').setValue('Abcdef1!');
    const rules = wrapper.findAll('[data-rule]');
    expect(rules).toHaveLength(5);
    expect(rules.map((rule) => rule.attributes('data-passed'))).toEqual(['1', '1', '1', '1', '1']);

    await wrapper.find('#sign-up-password').setValue('abc');
    expect(wrapper.findAll('[data-rule]').map((rule) => rule.attributes('data-passed'))).toEqual([
      '0',
      '0',
      '1',
      '0',
      '0',
    ]);

    await wrapper.find('#sign-up-confirmation').setValue('otra');
    expect(wrapper.find('[data-password-match]').text()).toContain('no coinciden');
  });

  it('al registrar pasa a la vista de verificación con el email', async () => {
    const wrapper = await mountSuspended(SignUpForm, { props: {} });

    await wrapper.find('#sign-up-first-name').setValue('QA');
    await wrapper.find('#sign-up-last-name').setValue('Prueba');
    await wrapper.find('#sign-up-email').setValue('qa@example.com');
    await wrapper.find('#sign-up-password').setValue('Temporal123!');
    await wrapper.find('#sign-up-confirmation').setValue('Temporal123!');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(api.calls[0]?.path).toBe('/api/auth/sign-up/email');
    expect(api.calls[0]?.body).toMatchObject({
      email: 'qa@example.com',
      firstName: 'QA',
      lastName: 'Prueba',
      name: 'QA Prueba',
    });
    expect(wrapper.find('[data-sign-up-verified]').exists()).toBe(true);
    expect(wrapper.find('[data-verified-email]').text()).toBe('qa@example.com');
    expect(sessionStorage.getItem('kitchcalc:signup_email')).toBe('qa@example.com');
  });

  it('el error del API se muestra tal cual', async () => {
    api.respond = async () => {
      throw httpError(400, {
        message:
          'La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y un carácter especial.',
      });
    };

    const wrapper = await mountSuspended(SignUpForm, { props: {} });
    await wrapper.find('#sign-up-first-name').setValue('QA');
    await wrapper.find('#sign-up-last-name').setValue('Prueba');
    await wrapper.find('#sign-up-email').setValue('qa@example.com');
    await wrapper.find('#sign-up-password').setValue('Temporal123!');
    await wrapper.find('#sign-up-confirmation').setValue('Temporal123!');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('La contraseña debe tener al menos 8');
  });
});

describe('ResetPasswordForm', () => {
  it('sin token muestra el enlace inválido', async () => {
    const wrapper = await mountSuspended(ResetPasswordForm, {
      props: { token: null },
    });

    expect(wrapper.find('[data-reset-invalid]').exists()).toBe(true);
    expect(api.calls).toHaveLength(0);
  });

  it('con token inválido muestra la vista expirada', async () => {
    api.respond = async () => ({
      valid: false,
      error: 'El enlace ha expirado',
      code: 'EXPIRED',
    });

    const wrapper = await mountSuspended(ResetPasswordForm, {
      props: { token: 'reset-expired', email: 'qa@example.com' },
    });
    await flushPromises();

    expect(wrapper.find('[data-reset-expired]').exists()).toBe(true);
    expect(wrapper.find('[data-reset-status]').text()).toContain('El enlace ha expirado');
    // La nota del `?email=` (el original tampoco imprime la dirección).
    expect(wrapper.text()).toContain('Te redirigimos al formulario con tu email prellenado.');
    // El CTA lleva el email para que el formulario llegue prellenado.
    expect(wrapper.find('[data-reset-expired] a').attributes('href')).toBe(
      '/forgot-password?email=qa%40example.com'
    );
  });

  it('sin email, el CTA de la vista expirada no añade query', async () => {
    api.respond = async () => ({ valid: false, code: 'NOT_FOUND' });

    const wrapper = await mountSuspended(ResetPasswordForm, {
      props: { token: 'reset-malo' },
    });
    await flushPromises();

    expect(wrapper.find('[data-reset-expired] a').attributes('href')).toBe('/forgot-password');
  });

  it('con token válido cuenta atrás y se limpia al desmontar', async () => {
    vi.useFakeTimers();
    try {
      api.respond = async () => ({ valid: true, remainingSeconds: 3 });

      const wrapper = await mountSuspended(ResetPasswordForm, {
        props: { token: 'reset-valid' },
      });
      await vi.advanceTimersByTimeAsync(0);

      const countdown = wrapper.find('[data-reset-countdown]');
      expect(countdown.text()).toBe('00:03');

      await vi.advanceTimersByTimeAsync(1000);
      expect(countdown.text()).toBe('00:02');
      expect(vi.getTimerCount()).toBe(1);

      wrapper.unmount();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('al agotarse el countdown pasa a la vista expirada', async () => {
    vi.useFakeTimers();
    try {
      api.respond = async () => ({ valid: true, remainingSeconds: 2 });

      const wrapper = await mountSuspended(ResetPasswordForm, {
        props: { token: 'reset-short' },
      });
      await vi.advanceTimersByTimeAsync(2500);

      expect(wrapper.find('[data-reset-expired]').exists()).toBe(true);
      expect(wrapper.find('[data-reset-countdown]').exists()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('valida la contraseña y envía el token', async () => {
    api.respond = async (path) => {
      if (path === '/api/auth/reset-password') {
        return {
          success: true,
          message: 'Contraseña actualizada correctamente',
        };
      }
      return { valid: true, remainingSeconds: 60 };
    };

    const wrapper = await mountSuspended(ResetPasswordForm, {
      props: { token: 'reset-valid' },
    });
    await flushPromises();

    await wrapper.find('#reset-password').setValue('Temporal123!');
    await wrapper.find('#reset-confirmation').setValue('Temporal123');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Las contraseñas no coinciden.');

    await wrapper.find('#reset-confirmation').setValue('Temporal123!');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(api.calls[1]?.path).toBe('/api/auth/reset-password');
    expect(api.calls[1]?.body).toEqual({
      token: 'reset-valid',
      password: 'Temporal123!',
    });
    expect(wrapper.find('[data-reset-success]').exists()).toBe(true);
  });
});

describe('ForgotPasswordForm', () => {
  it('prellena el email de `?email=` y lo envía', async () => {
    const wrapper = await mountSuspended(ForgotPasswordForm, {
      props: { email: 'qa@example.com' },
    });

    const input = wrapper.find('#forgot-email');
    expect((input.element as HTMLInputElement).value).toBe('qa@example.com');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(api.calls[0]?.path).toBe('/api/auth/forgot-password');
    expect(api.calls[0]?.body).toEqual({ email: 'qa@example.com' });
  });

  it('sin `?email=` el campo arranca vacío', async () => {
    const wrapper = await mountSuspended(ForgotPasswordForm, {
      props: { email: null },
    });

    expect((wrapper.find('#forgot-email').element as HTMLInputElement).value).toBe('');
  });
});

describe('VerifyEmailStatus', () => {
  it('sin token muestra el error sin llamar al API', async () => {
    const wrapper = await mountSuspended(VerifyEmailStatus, {
      props: { token: null, callbackUrl: '/sign-in' },
    });
    await flushPromises();

    expect(wrapper.find('[data-verify-error]').exists()).toBe(true);
    expect(wrapper.find('[data-verify-error-message]').text()).toContain('No se encontró el token');
    expect(api.calls).toHaveLength(0);
  });

  it('con token inválido muestra el mensaje del servidor', async () => {
    api.respond = async () => {
      throw httpError(401, { message: 'Invalid token', code: 'INVALID_TOKEN' });
    };

    const wrapper = await mountSuspended(VerifyEmailStatus, {
      props: { token: 'malo', callbackUrl: '/sign-in' },
    });
    await flushPromises();

    expect(wrapper.find('[data-verify-error-message]').text()).toContain('Invalid token');
  });

  it('con token válido confirma y respeta el callbackURL', async () => {
    api.respond = async () => ({ status: true, user: null });

    const wrapper = await mountSuspended(VerifyEmailStatus, {
      props: { token: 'verify-valid', callbackUrl: '/recipes?category=pan' },
    });
    await flushPromises();

    expect(api.calls[0]?.path).toBe('/api/auth/verify-email?token=verify-valid');
    expect(wrapper.find('[data-verify-success]').exists()).toBe(true);
    expect(wrapper.find('[data-verify-success] a').attributes('href')).toBe(
      '/recipes?category=pan'
    );
  });
});
