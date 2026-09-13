/**
 * Los íconos se importan por datos (`dist/esm/icons/*.mjs`), que no traen
 * tipos: la forma está en `app/types/icons.ts`.
 */
declare module "@lucide/vue/dist/esm/icons/*.mjs" {
  export const __iconData: import("./icons").LucideIconData;
}
