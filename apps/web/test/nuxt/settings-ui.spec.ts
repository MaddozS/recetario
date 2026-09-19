import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { computed, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsTabs from "~/features/settings/SettingsTabs.vue";
import AccountNameForm from "~/features/settings/AccountNameForm.vue";
import AccountPasswordForm from "~/features/settings/AccountPasswordForm.vue";
import ProfileSection from "~/features/settings/ProfileSection.vue";
import PreferencesSection from "~/features/settings/PreferencesSection.vue";
import { useTheme } from "~/composables/useTheme";
import { validateAccountPasswordForm } from "~/features/settings/account-form";
import type { AccountPasswordFormValues } from "~/features/settings/account-form";
import type { AccountOutcome } from "~/features/settings/useAccountSettings";

/**
 * Pestañas, formularios de cuenta y preferencias (Task 11). Con
 * `mountSuspended` los eventos se miran con listeners espía; los `<dialog>` no
 * se usan aquí (los dialogs de planes viven en `billing-ui.spec.ts`).
 *
 * La validación vive en el composable (patrón de Task 10): los mocks de
 * `submit` la replican con el módulo puro para probar la integración del
 * formulario; que no haya peticiones con datos inválidos se cubre en e2e y en
 * el test de `ProfileSection`.
 */

const state = vi.hoisted(() => ({
  request: vi.fn(),
  applyPreferences: vi.fn(),
  applyProfile: vi.fn(),
  preferencesRef: null as unknown as {
    value: { theme: string; accentColor: string };
  },
}));

mockNuxtImport("useApi", () => () => state.request);

mockNuxtImport("useAuth", () => {
  const preferences = ref({ theme: "system", accentColor: "coral" });
  state.preferencesRef = preferences;

  return () => ({
    state: { value: { status: "authenticated" } },
    isAuthenticated: computed(() => true),
    user: computed(() => ({
      id: "qa-user",
      email: "qa@example.com",
      name: "QA Prueba",
      firstName: "QA",
      lastName: "Prueba",
      image: null,
      role: "USER",
      hasPasswordAuth: true,
    })),
    subscription: computed(() => null),
    preferences: computed(() => ({ ...preferences.value })),
    hasFeature: () => false,
    applyPreferences: (next: { theme: string; accentColor: string }) => {
      preferences.value = { ...next };
      state.applyPreferences(next);
    },
    applyProfile: (next: { firstName: string; lastName: string }) => {
      state.applyProfile(next);
    },
    expire: vi.fn(),
  });
});

function clearCookies(): void {
  for (const cookie of document.cookie.split(";")) {
    document.cookie = `${cookie.split("=")[0]?.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  }
}

function okSubmit(): (values: unknown) => Promise<AccountOutcome> {
  return vi.fn(async (): Promise<AccountOutcome> => ({ ok: true }));
}

/** Replica la validación del composable dentro del mock de submit. */
function validatingPasswordSubmit(): (
  values: AccountPasswordFormValues,
) => Promise<AccountOutcome> {
  return vi.fn(
    async (values: AccountPasswordFormValues): Promise<AccountOutcome> => {
      const validation = validateAccountPasswordForm(values);
      return validation ? { ok: false, message: validation } : { ok: true };
    },
  );
}

describe("SettingsTabs", () => {
  it("marca la pestaña activa y enlaza las demás con ?tab=", async () => {
    const wrapper = await mountSuspended(SettingsTabs, {
      props: { active: "preferences" },
    });

    const preferences = wrapper.find('[data-tab="preferences"]');
    expect(preferences.attributes("href")).toBe("/settings?tab=preferences");
    expect(preferences.attributes("data-tab-active")).toBe("1");
    expect(preferences.attributes("aria-current")).toBe("page");

    const profile = wrapper.find('[data-tab="profile"]');
    expect(profile.attributes("href")).toBe("/settings");
    expect(profile.attributes("data-tab-active")).toBe("0");
    expect(profile.attributes("aria-current")).toBeUndefined();

    expect(wrapper.text()).toContain("Perfil");
    expect(wrapper.text()).toContain("Facturación");
  });
});

describe("AccountNameForm", () => {
  it("prellena desde el perfil y confirma con el copy del baseline", async () => {
    const submit = okSubmit();
    const wrapper = await mountSuspended(AccountNameForm, {
      props: {
        initial: { firstName: "QA", lastName: "Prueba" },
        submit,
        submitting: false,
      },
    });

    expect(
      (wrapper.find("#first-name").element as HTMLInputElement).value,
    ).toBe("QA");
    expect((wrapper.find("#last-name").element as HTMLInputElement).value).toBe(
      "Prueba",
    );

    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(submit).toHaveBeenCalledWith({
      firstName: "QA",
      lastName: "Prueba",
    });
    expect(wrapper.text()).toContain("Nombre actualizado correctamente.");
  });

  it("muestra el error de la mutación sin perder los valores", async () => {
    const submit = vi.fn(
      async (): Promise<AccountOutcome> => ({
        ok: false,
        message: "Error de conexión al actualizar el nombre.",
      }),
    );
    const wrapper = await mountSuspended(AccountNameForm, {
      props: {
        initial: { firstName: "QA", lastName: "Prueba" },
        submit,
        submitting: false,
      },
    });

    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain(
      "Error de conexión al actualizar el nombre.",
    );
    expect(
      (wrapper.find("#first-name").element as HTMLInputElement).value,
    ).toBe("QA");
  });

  it("bloquea el botón mientras envía", async () => {
    const wrapper = await mountSuspended(AccountNameForm, {
      props: {
        initial: { firstName: "QA", lastName: "Prueba" },
        submit: okSubmit(),
        submitting: true,
      },
    });

    const button = wrapper.find("#change-name-btn");
    expect(button.attributes("disabled")).toBeDefined();
    expect(button.attributes("aria-busy")).toBe("true");
  });
});

describe("AccountPasswordForm", () => {
  it("muestra los mensajes del outcome para datos inválidos", async () => {
    const submit = validatingPasswordSubmit();
    const wrapper = await mountSuspended(AccountPasswordForm, {
      props: { submit, submitting: false },
    });

    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.text()).toContain("Por favor completa todos los campos.");

    await wrapper.find("#current-password").setValue("Temporal123!");
    await wrapper.find("#new-password").setValue("corta");
    await wrapper.find("#confirm-new-password").setValue("corta");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.text()).toContain("al menos 8 caracteres");
  });

  it("ilustra las 5 reglas en vivo", async () => {
    const wrapper = await mountSuspended(AccountPasswordForm, {
      props: { submit: validatingPasswordSubmit(), submitting: false },
    });

    expect(wrapper.findAll("[data-rule]")).toHaveLength(5);
    await wrapper.find("#new-password").setValue("NuevaClave1!");
    expect(
      wrapper
        .findAll("[data-rule]")
        .every((rule) => rule.attributes("data-passed") === "1"),
    ).toBe(true);
  });

  it("envía la contraseña válida y limpia los campos", async () => {
    const submit = validatingPasswordSubmit();
    const wrapper = await mountSuspended(AccountPasswordForm, {
      props: { submit, submitting: false },
    });

    await wrapper.find("#current-password").setValue("Temporal123!");
    await wrapper.find("#new-password").setValue("NuevaClave1!");
    await wrapper.find("#confirm-new-password").setValue("NuevaClave1!");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(submit).toHaveBeenCalledWith({
      currentPassword: "Temporal123!",
      newPassword: "NuevaClave1!",
      confirmPassword: "NuevaClave1!",
    });
    expect(wrapper.text()).toContain("Contraseña actualizada correctamente.");
    expect(
      (wrapper.find("#new-password").element as HTMLInputElement).value,
    ).toBe("");
  });

  it("exige que la confirmación coincida y conserva lo escrito", async () => {
    const submit = validatingPasswordSubmit();
    const wrapper = await mountSuspended(AccountPasswordForm, {
      props: { submit, submitting: false },
    });

    await wrapper.find("#current-password").setValue("Temporal123!");
    await wrapper.find("#new-password").setValue("NuevaClave1!");
    await wrapper.find("#confirm-new-password").setValue("NuevaClave2!");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Las contraseñas no coinciden.");
    expect(
      (wrapper.find("#new-password").element as HTMLInputElement).value,
    ).toBe("NuevaClave1!");
  });
});

describe("ProfileSection (composable real)", () => {
  beforeEach(() => {
    state.request.mockReset();
    state.applyProfile.mockReset();
  });

  it("no llama al API con una contraseña inválida", async () => {
    const wrapper = await mountSuspended(ProfileSection);

    await wrapper.find("#current-password").setValue("Temporal123!");
    await wrapper.find("#new-password").setValue("corta");
    await wrapper.find("#confirm-new-password").setValue("corta");
    await wrapper.findAll("form")[1]!.trigger("submit");
    await flushPromises();

    expect(state.request).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("al menos 8 caracteres");
  });

  it("envía la contraseña válida y refleja el nombre confirmado", async () => {
    state.request.mockResolvedValueOnce({ ok: true });
    const wrapper = await mountSuspended(ProfileSection);

    await wrapper.find("#current-password").setValue("Temporal123!");
    await wrapper.find("#new-password").setValue("NuevaClave1!");
    await wrapper.find("#confirm-new-password").setValue("NuevaClave1!");
    await wrapper.findAll("form")[1]!.trigger("submit");
    await flushPromises();

    expect(state.request).toHaveBeenCalledWith(
      "/api/account/change-password",
      expect.objectContaining({
        method: "POST",
        body: {
          currentPassword: "Temporal123!",
          newPassword: "NuevaClave1!",
        },
      }),
    );

    state.request.mockResolvedValueOnce({
      firstName: "Ada",
      lastName: "Byron",
    });
    await wrapper.findAll("form")[0]!.trigger("submit");
    await flushPromises();

    expect(state.request).toHaveBeenCalledWith(
      "/api/account/update-name",
      expect.objectContaining({
        method: "POST",
        body: { firstName: "QA", lastName: "Prueba" },
      }),
    );
    expect(state.applyProfile).toHaveBeenCalledWith({
      firstName: "Ada",
      lastName: "Byron",
    });
  });
});

describe("PreferencesSection", () => {
  beforeEach(() => {
    state.request.mockReset();
    state.applyPreferences.mockReset();
    state.preferencesRef.value = { theme: "system", accentColor: "coral" };
    clearCookies();
  });

  it("previsualiza, guarda y escribe las cookies desde la respuesta", async () => {
    state.request.mockResolvedValueOnce({
      userId: "qa-user",
      theme: "dark",
      accentColor: "coral",
    });

    const wrapper = await mountSuspended(PreferencesSection);
    expect(wrapper.find("#save-btn-wrapper").exists()).toBe(false);

    await wrapper.find('[data-theme-option="dark"]').trigger("click");
    expect(
      wrapper
        .find('[data-theme-option="dark"]')
        .attributes("data-theme-active"),
    ).toBe("1");
    expect(wrapper.find("#save-btn-wrapper").exists()).toBe(true);

    await wrapper.find("#save-btn-wrapper button").trigger("click");
    await flushPromises();

    expect(state.request).toHaveBeenCalledWith(
      "/api/preferences",
      expect.objectContaining({
        method: "PUT",
        body: { theme: "dark", accentColor: "coral" },
      }),
    );
    expect(state.applyPreferences).toHaveBeenCalledWith({
      theme: "dark",
      accentColor: "coral",
    });
    expect(document.cookie).toContain("kitchcalc-theme=dark");
    expect(wrapper.text()).toContain("Preferencias guardadas correctamente.");
    expect(wrapper.find("#save-btn-wrapper").exists()).toBe(false);
  });

  it("revierte la previsualización y no escribe cookies si falla", async () => {
    state.request.mockRejectedValueOnce({ status: 500, message: "boom" });

    const wrapper = await mountSuspended(PreferencesSection);
    await wrapper.find('[data-theme-option="dark"]').trigger("click");
    await wrapper.find("#save-btn-wrapper button").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Error al guardar las preferencias.");
    expect(
      wrapper
        .find('[data-theme-option="system"]')
        .attributes("data-theme-active"),
    ).toBe("1");
    expect(document.cookie).not.toContain("kitchcalc-theme=dark");
    expect(wrapper.find("#save-btn-wrapper").exists()).toBe(false);
  });

  it("selecciona el acento y lo envía junto al tema", async () => {
    state.request.mockResolvedValueOnce({
      userId: "qa-user",
      theme: "system",
      accentColor: "emerald",
    });

    const wrapper = await mountSuspended(PreferencesSection);
    await wrapper.find('[data-accent-option="emerald"]').trigger("click");
    expect(
      wrapper.find('[data-accent-option="emerald"]').attributes("aria-pressed"),
    ).toBe("true");

    await wrapper.find("#save-btn-wrapper button").trigger("click");
    await flushPromises();

    expect(state.request).toHaveBeenCalledWith(
      "/api/preferences",
      expect.objectContaining({
        body: { theme: "system", accentColor: "emerald" },
      }),
    );
    expect(document.cookie).toContain("kitchcalc-accent=emerald");
  });

  it("descarta el preview sin guardar al desmontar la pestaña", async () => {
    const wrapper = await mountSuspended(PreferencesSection);
    await wrapper.find('[data-theme-option="light"]').trigger("click");
    expect(useTheme().appearance.value.theme).toBe("light");

    wrapper.unmount();

    // Sin guardado no hay PUT ni cookie: la apariencia vuelve a lo persistido.
    expect(useTheme().appearance.value.theme).toBe("system");
    expect(state.request).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain("kitchcalc-theme=light");
  });

  it("no descarta el preview si el guardado sigue en vuelo", async () => {
    let confirm: (value: unknown) => void = () => {};
    state.request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          confirm = resolve;
        }),
    );

    const wrapper = await mountSuspended(PreferencesSection);
    await wrapper.find('[data-theme-option="dark"]').trigger("click");
    await wrapper.find("#save-btn-wrapper button").trigger("click");

    wrapper.unmount();
    confirm({ userId: "qa-user", theme: "dark", accentColor: "coral" });
    await flushPromises();

    // El guardado confirmado manda: el preview no se pisa al desmontar.
    expect(useTheme().appearance.value.theme).toBe("dark");
  });

  it("conserva lo guardado al desmontar", async () => {
    state.request.mockResolvedValueOnce({
      userId: "qa-user",
      theme: "dark",
      accentColor: "coral",
    });

    const wrapper = await mountSuspended(PreferencesSection);
    await wrapper.find('[data-theme-option="dark"]').trigger("click");
    await wrapper.find("#save-btn-wrapper button").trigger("click");
    await flushPromises();

    wrapper.unmount();

    expect(useTheme().appearance.value.theme).toBe("dark");
    expect(state.applyPreferences).toHaveBeenCalledWith({
      theme: "dark",
      accentColor: "coral",
    });
  });
});
