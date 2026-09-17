/**
 * Pestañas de `/settings`, sincronizadas con la URL.
 *
 * El baseline togglaba clases y hacía `history.pushState`: aquí la pestaña vive
 * en `?tab=` y el router resuelve back/forward y deep links. `profile` es la
 * única que no viaja en la query (paridad con el href del baseline).
 */
export type SettingsTab = "profile" | "preferences" | "billing";

export type SettingsTabDefinition = {
  id: SettingsTab;
  label: string;
  icon: string;
};

export const DEFAULT_SETTINGS_TAB: SettingsTab = "profile";

export const SETTINGS_TABS: readonly SettingsTabDefinition[] = [
  { id: "profile", label: "Perfil", icon: "lucide:user" },
  { id: "preferences", label: "Preferencias", icon: "lucide:palette" },
  { id: "billing", label: "Facturación", icon: "lucide:credit-card" },
];

/** Un `?tab=` desconocido o ausente cae en Perfil. */
export function resolveSettingsTab(raw: unknown): SettingsTab {
  const match = SETTINGS_TABS.find((tab) => tab.id === raw);
  return match ? match.id : DEFAULT_SETTINGS_TAB;
}

export function settingsTabHref(tab: SettingsTab): string {
  return tab === DEFAULT_SETTINGS_TAB ? "/settings" : `/settings?tab=${tab}`;
}
