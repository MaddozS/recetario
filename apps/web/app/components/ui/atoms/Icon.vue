<script lang="ts">
import { computed, defineComponent, h, mergeProps, useAttrs } from "vue";
import type { LucideIconData } from "~/types/icons";
import { getIcon } from "~/utils/icon-registry";

/**
 * Compone el `<svg>` del ícono desde los datos de lucide.
 *
 * No renderiza los componentes de `@lucide/vue`: son componentes funcionales
 * que leen su contexto con `inject()`, y el primer render SSR dentro del
 * `Suspense` de un layout perdía la instancia de Vue (500 en la primera
 * petición de cada proceso). Los atributos replican los de lucide —clases
 * `lucide lucide-<nombre>` y `aria-hidden` por defecto— y hay un test de
 * paridad de markup en `test/nuxt/ui-components.spec.ts`.
 */

/** Atributos del `<svg>` en el mismo orden que emite lucide. */
const SVG_ATTRIBUTES = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
} as const;

function hasA11yProp(attrs: Record<string, unknown>): boolean {
  return Object.keys(attrs).some(
    (key) => key === "role" || key.startsWith("aria-"),
  );
}

function renderIcon(
  data: LucideIconData,
  size: number,
  attrs: Record<string, unknown>,
) {
  const svgAttrs: Record<string, unknown> = {
    ...SVG_ATTRIBUTES,
    width: size,
    height: size,
  };

  for (const [key, value] of Object.entries(attrs)) {
    if (key !== "class") {
      svgAttrs[key] = value;
    }
  }
  svgAttrs.class = ["lucide", `lucide-${data.name}`, attrs.class];
  if (!hasA11yProp(attrs)) {
    svgAttrs["aria-hidden"] = "true";
  }

  return h(
    "svg",
    svgAttrs,
    data.node.map(([tag, nodeAttrs]) => {
      // `key` es metadata de lucide para sus listas: no va al DOM.
      const rest = { ...nodeAttrs } as Record<string, string>;
      delete rest.key;
      return h(tag, rest);
    }),
  );
}

export default defineComponent({
  name: "Icon",
  inheritAttrs: false,
  props: {
    name: { type: String, required: true },
    size: { type: Number, default: 16 },
  },
  setup(props) {
    const attrs = useAttrs();
    const icon = computed(() => getIcon(props.name));

    return () => {
      const data = icon.value;
      if (!data) {
        return null;
      }
      return renderIcon(data, props.size, mergeProps(attrs));
    };
  },
});
</script>
