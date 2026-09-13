/**
 * Registro explícito de íconos lucide usados por la app.
 *
 * La clave es el nombre en kebab-case tal como lo escriben los llamados
 * (`<Icon name="lucide:book-open" />`), sin el prefijo `lucide:`.
 *
 * Se importan los **datos** del ícono (`__iconData`: nombre + nodos SVG), no
 * los componentes de `@lucide/vue`: sus componentes funcionales llaman a
 * `inject()` y el primer render SSR pierde la instancia de Vue cuando el
 * ícono vive dentro del `Suspense` de un layout, devolviendo 500 en la primera
 * petición de cada proceso. `Icon.vue` compone el `<svg>` con los mismos
 * atributos que lucide (verificado en `test/nuxt/ui-components.spec.ts`).
 *
 * Tres claves conservan el vocabulario del árbol Astro pero apuntan al nombre
 * canónico actual de lucide (`alert-triangle` → `triangle-alert`,
 * `arrow-up-circle` → `circle-arrow-up`, `check-circle` → `circle-check`);
 * `trash-2` apunta a `trash` porque lucide fusionó ambos glifos (mismo
 * trazado que en `@lucide/astro@1.28`).
 */

import type { LucideIconData } from "~/types/icons";

import { __iconData as triangleAlertIcon } from "@lucide/vue/dist/esm/icons/triangle-alert.mjs";
import { __iconData as arrowLeftIcon } from "@lucide/vue/dist/esm/icons/arrow-left.mjs";
import { __iconData as circleArrowUpIcon } from "@lucide/vue/dist/esm/icons/circle-arrow-up.mjs";
import { __iconData as boldIcon } from "@lucide/vue/dist/esm/icons/bold.mjs";
import { __iconData as bookOpenIcon } from "@lucide/vue/dist/esm/icons/book-open.mjs";
import { __iconData as bookPlusIcon } from "@lucide/vue/dist/esm/icons/book-plus.mjs";
import { __iconData as bookXIcon } from "@lucide/vue/dist/esm/icons/book-x.mjs";
import { __iconData as calculatorIcon } from "@lucide/vue/dist/esm/icons/calculator.mjs";
import { __iconData as checkIcon } from "@lucide/vue/dist/esm/icons/check.mjs";
import { __iconData as circleCheckIcon } from "@lucide/vue/dist/esm/icons/circle-check.mjs";
import { __iconData as chefHatIcon } from "@lucide/vue/dist/esm/icons/chef-hat.mjs";
import { __iconData as chevronDownIcon } from "@lucide/vue/dist/esm/icons/chevron-down.mjs";
import { __iconData as chevronLeftIcon } from "@lucide/vue/dist/esm/icons/chevron-left.mjs";
import { __iconData as chevronRightIcon } from "@lucide/vue/dist/esm/icons/chevron-right.mjs";
import { __iconData as clockIcon } from "@lucide/vue/dist/esm/icons/clock.mjs";
import { __iconData as cookingPotIcon } from "@lucide/vue/dist/esm/icons/cooking-pot.mjs";
import { __iconData as copyIcon } from "@lucide/vue/dist/esm/icons/copy.mjs";
import { __iconData as creditCardIcon } from "@lucide/vue/dist/esm/icons/credit-card.mjs";
import { __iconData as ellipsisVerticalIcon } from "@lucide/vue/dist/esm/icons/ellipsis-vertical.mjs";
import { __iconData as eyeIcon } from "@lucide/vue/dist/esm/icons/eye.mjs";
import { __iconData as eyeOffIcon } from "@lucide/vue/dist/esm/icons/eye-off.mjs";
import { __iconData as factoryIcon } from "@lucide/vue/dist/esm/icons/factory.mjs";
import { __iconData as fileTextIcon } from "@lucide/vue/dist/esm/icons/file-text.mjs";
import { __iconData as folderOpenIcon } from "@lucide/vue/dist/esm/icons/folder-open.mjs";
import { __iconData as foldersIcon } from "@lucide/vue/dist/esm/icons/folders.mjs";
import { __iconData as headingIcon } from "@lucide/vue/dist/esm/icons/heading.mjs";
import { __iconData as infoIcon } from "@lucide/vue/dist/esm/icons/info.mjs";
import { __iconData as italicIcon } from "@lucide/vue/dist/esm/icons/italic.mjs";
import { __iconData as keyRoundIcon } from "@lucide/vue/dist/esm/icons/key-round.mjs";
import { __iconData as listIcon } from "@lucide/vue/dist/esm/icons/list.mjs";
import { __iconData as listChecksIcon } from "@lucide/vue/dist/esm/icons/list-checks.mjs";
import { __iconData as listOrderedIcon } from "@lucide/vue/dist/esm/icons/list-ordered.mjs";
import { __iconData as lockIcon } from "@lucide/vue/dist/esm/icons/lock.mjs";
import { __iconData as logOutIcon } from "@lucide/vue/dist/esm/icons/log-out.mjs";
import { __iconData as mailCheckIcon } from "@lucide/vue/dist/esm/icons/mail-check.mjs";
import { __iconData as menuIcon } from "@lucide/vue/dist/esm/icons/menu.mjs";
import { __iconData as monitorIcon } from "@lucide/vue/dist/esm/icons/monitor.mjs";
import { __iconData as moonIcon } from "@lucide/vue/dist/esm/icons/moon.mjs";
import { __iconData as packageIcon } from "@lucide/vue/dist/esm/icons/package.mjs";
import { __iconData as packagePlusIcon } from "@lucide/vue/dist/esm/icons/package-plus.mjs";
import { __iconData as packageSearchIcon } from "@lucide/vue/dist/esm/icons/package-search.mjs";
import { __iconData as paletteIcon } from "@lucide/vue/dist/esm/icons/palette.mjs";
import { __iconData as pencilIcon } from "@lucide/vue/dist/esm/icons/pencil.mjs";
import { __iconData as plusIcon } from "@lucide/vue/dist/esm/icons/plus.mjs";
import { __iconData as saveIcon } from "@lucide/vue/dist/esm/icons/save.mjs";
import { __iconData as searchIcon } from "@lucide/vue/dist/esm/icons/search.mjs";
import { __iconData as searchXIcon } from "@lucide/vue/dist/esm/icons/search-x.mjs";
import { __iconData as settingsIcon } from "@lucide/vue/dist/esm/icons/settings.mjs";
import { __iconData as sunIcon } from "@lucide/vue/dist/esm/icons/sun.mjs";
import { __iconData as tagIcon } from "@lucide/vue/dist/esm/icons/tag.mjs";
import { __iconData as timerIcon } from "@lucide/vue/dist/esm/icons/timer.mjs";
import { __iconData as trashIcon } from "@lucide/vue/dist/esm/icons/trash.mjs";
import { __iconData as trendingUpIcon } from "@lucide/vue/dist/esm/icons/trending-up.mjs";
import { __iconData as userIcon } from "@lucide/vue/dist/esm/icons/user.mjs";
import { __iconData as xIcon } from "@lucide/vue/dist/esm/icons/x.mjs";
import { __iconData as zapIcon } from "@lucide/vue/dist/esm/icons/zap.mjs";

export const ICON_REGISTRY: Record<string, LucideIconData> = {
  "alert-triangle": triangleAlertIcon,
  "arrow-left": arrowLeftIcon,
  "arrow-up-circle": circleArrowUpIcon,
  "bold": boldIcon,
  "book-open": bookOpenIcon,
  "book-plus": bookPlusIcon,
  "book-x": bookXIcon,
  "calculator": calculatorIcon,
  "check": checkIcon,
  "check-circle": circleCheckIcon,
  "chef-hat": chefHatIcon,
  "chevron-down": chevronDownIcon,
  "chevron-left": chevronLeftIcon,
  "chevron-right": chevronRightIcon,
  "clock": clockIcon,
  "cooking-pot": cookingPotIcon,
  "copy": copyIcon,
  "credit-card": creditCardIcon,
  "ellipsis-vertical": ellipsisVerticalIcon,
  "eye": eyeIcon,
  "eye-off": eyeOffIcon,
  "factory": factoryIcon,
  "file-text": fileTextIcon,
  "folder-open": folderOpenIcon,
  "folders": foldersIcon,
  "heading": headingIcon,
  "info": infoIcon,
  "italic": italicIcon,
  "key-round": keyRoundIcon,
  "list": listIcon,
  "list-checks": listChecksIcon,
  "list-ordered": listOrderedIcon,
  "lock": lockIcon,
  "log-out": logOutIcon,
  "mail-check": mailCheckIcon,
  "menu": menuIcon,
  "monitor": monitorIcon,
  "moon": moonIcon,
  "package": packageIcon,
  "package-plus": packagePlusIcon,
  "package-search": packageSearchIcon,
  "palette": paletteIcon,
  "pencil": pencilIcon,
  "plus": plusIcon,
  "save": saveIcon,
  "search": searchIcon,
  "search-x": searchXIcon,
  "settings": settingsIcon,
  "sun": sunIcon,
  "tag": tagIcon,
  "timer": timerIcon,
  "trash-2": trashIcon,
  "trending-up": trendingUpIcon,
  "user": userIcon,
  "x": xIcon,
  "zap": zapIcon,
};

/** Resuelve el ícono ignorando el prefijo `lucide:`. */
export function getIcon(name: string): LucideIconData | null {
  const key = name.replace(/^lucide:/, "");
  return ICON_REGISTRY[key] ?? null;
}
