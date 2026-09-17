import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS_TAB,
  SETTINGS_TABS,
  resolveSettingsTab,
  settingsTabHref,
} from "../../app/features/settings/settings-tabs";

describe("resolveSettingsTab", () => {
  it("acepta las tres pestañas", () => {
    expect(resolveSettingsTab("profile")).toBe("profile");
    expect(resolveSettingsTab("preferences")).toBe("preferences");
    expect(resolveSettingsTab("billing")).toBe("billing");
  });

  it("cae en Perfil con valores ausentes o desconocidos", () => {
    expect(DEFAULT_SETTINGS_TAB).toBe("profile");
    expect(resolveSettingsTab(undefined)).toBe("profile");
    expect(resolveSettingsTab(null)).toBe("profile");
    expect(resolveSettingsTab("")).toBe("profile");
    expect(resolveSettingsTab("billing2")).toBe("profile");
    expect(resolveSettingsTab(42)).toBe("profile");
    expect(resolveSettingsTab(["billing"])).toBe("profile");
  });
});

describe("settingsTabHref", () => {
  it("omite la query en la pestaña por defecto", () => {
    expect(settingsTabHref("profile")).toBe("/settings");
  });

  it("expone `?tab=` en el resto", () => {
    expect(settingsTabHref("preferences")).toBe("/settings?tab=preferences");
    expect(settingsTabHref("billing")).toBe("/settings?tab=billing");
  });
});

describe("SETTINGS_TABS", () => {
  it("declara labels e iconos en orden", () => {
    expect(SETTINGS_TABS.map((tab) => tab.id)).toEqual([
      "profile",
      "preferences",
      "billing",
    ]);
    expect(SETTINGS_TABS.map((tab) => tab.label)).toEqual([
      "Perfil",
      "Preferencias",
      "Facturación",
    ]);
    for (const tab of SETTINGS_TABS) {
      expect(tab.icon).toMatch(/^lucide:/);
    }
  });
});
