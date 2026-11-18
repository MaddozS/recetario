<script setup lang="ts">
import { computed } from 'vue';
import type { PlanFeature } from '@recetario/types';
import {
  PLAN_FEATURE_PRESENTATION,
  planFeatureMarker,
  planFeatureState,
  type PlanFeaturePresentation,
} from './plan-feature-state';

/**
 * Lista de features de un plan: `ul`/`li` con el estado dicho en texto (oculto)
 * además del ícono y el color.
 *
 * Los íconos van `aria-hidden`, así que sin esa línea la diferencia entre
 * "incluido" y "no incluido" —que es lo que se compra— no existiría para un
 * lector de pantalla. El estado se resuelve en `plan-feature-state` (lo comparte
 * la matriz de `/pricing`) y aquí sólo se pinta: la marca dice la inclusión
 * —también la futura— y el marcador "Próximamente" avisa de lo que todavía no
 * está disponible, visible y `aria-hidden` porque la etiqueta ya lo anuncia.
 *
 * `compact` es la variante de la landing: mismos contratos, menos aire, y el
 * recorte dicho en texto ("y N funciones más") cuando los destacados no son
 * todos los que hay. La lista larga de `PlanChangeDialog` sigue en `full`.
 */
type Variant = 'full' | 'compact';

const props = withDefaults(
  defineProps<{
    features: PlanFeature[];
    variant?: Variant;
    /** Destacados que no entran en el tope: alimenta el "y N funciones más". */
    remaining?: number;
  }>(),
  { variant: 'full', remaining: 0 }
);

interface FeatureRow {
  text: string;
  presentation: PlanFeaturePresentation;
  marker: string;
}

const rows = computed<FeatureRow[]>(() =>
  props.features.map((feature) => {
    const state = planFeatureState(feature);
    return {
      text: feature.text,
      presentation: PLAN_FEATURE_PRESENTATION[state],
      marker: planFeatureMarker(state, feature.text),
    };
  })
);

const LIST_CLASSES: Record<Variant, string> = {
  full: 'space-y-3',
  compact: 'space-y-2.5',
};

/** El recorte se dice en texto: la card nunca aparenta ser el catálogo entero. */
const remainingLabel = computed(() =>
  props.remaining === 1 ? 'y 1 función más' : `y ${props.remaining} funciones más`
);
</script>

<template>
  <div>
    <ul :class="LIST_CLASSES[props.variant]">
      <li
        v-for="(row, index) in rows"
        :key="index"
        class="flex min-w-0 items-center gap-2.5 text-sm"
      >
        <Icon :name="row.presentation.icon" :size="16" :class="row.presentation.iconClass" />
        <span class="sr-only"> {{ row.presentation.label }}: </span>
        <span :class="[row.presentation.textClass, 'break-words']">
          {{ row.text }}
        </span>
        <span v-if="row.marker" aria-hidden="true" class="text-muted-foreground shrink-0 text-xs">
          {{ row.marker }}
        </span>
      </li>
    </ul>

    <p v-if="props.remaining > 0" class="text-subtle-foreground mt-3 text-sm">
      {{ remainingLabel }}
    </p>
  </div>
</template>
