import type { PlanFeature, TierConfig } from '@recetario/types';

export type { PlanFeature, TierConfig } from '@recetario/types';

const BASIC_FEATURES: Record<string, boolean> = {
  recipe_duplicate: true,
  recipe_photos: true,
  stock_tracking: true,
  production_planner: true,
  production_save: false,
  production_advanced: false,
  pdf_export: false,
  advanced_costs: true,
  change_history: false,
  data_import_export: false,
  nutrition_info: false,
  cooking_mode: false,
};

const PRO_FEATURES: Record<string, boolean> = {
  recipe_duplicate: true,
  recipe_photos: true,
  stock_tracking: true,
  production_planner: true,
  production_save: true,
  production_advanced: true,
  pdf_export: true,
  advanced_costs: true,
  change_history: true,
  data_import_export: true,
  nutrition_info: true,
  cooking_mode: true,
};

export const FEATURE_FLAGS: Record<string, Record<string, boolean>> = {
  basic: BASIC_FEATURES,
  pro: PRO_FEATURES,
};

/**
 * Recetas por plan de producción en Basic. Fuente única: la UI lo anticipa y
 * `by-ids` de Hono lo exige (la web lo importa por el subpath puro
 * `@recetario/stripe/plans-config`).
 */
export const PRODUCTION_BASIC_RECIPE_LIMIT = 3;

export const FREE_FEATURES: Record<string, boolean> = {
  recipe_duplicate: false,
  recipe_photos: false,
  stock_tracking: false,
  production_planner: false,
  production_save: false,
  production_advanced: false,
  pdf_export: false,
  advanced_costs: false,
  change_history: false,
  data_import_export: false,
  nutrition_info: false,
  cooking_mode: false,
};

/**
 * `label` es la etiqueta de fila de la matriz de `/pricing`: el nombre de la
 * dimensión cuando la frase cambia entre planes. Donde falta, la frase hace de
 * etiqueta (es idéntica en los tres tiers). El orden de los slots es el
 * contrato de alineación: mismo índice, misma dimensión en los tres planes.
 */
export const TIER_CONFIG: Record<string, TierConfig> = {
  free: {
    name: 'Free',
    description: 'Para empezar a costear',
    badge: null,
    limits: { recipes: 10, ingredients: 30 },
    features: [
      { text: 'Hasta 10 recetas', label: 'Recetas', included: true },
      { text: 'Hasta 30 ingredientes', label: 'Ingredientes', included: true },
      { text: 'Costeo básico con márgenes', included: true },
      { text: 'Categorías', included: true },
      { text: 'Instrucciones de preparación', included: false, status: 'coming_soon' },
      { text: 'Duplicar recetas', included: false },
      {
        text: 'Fotos de recetas',
        label: 'Fotos de recetas',
        included: false,
        status: 'coming_soon',
      },
      { text: 'Stock de ingredientes', included: false, status: 'coming_soon' },
      { text: 'Planificador de producción', label: 'Planificador de producción', included: false },
      { text: 'Exportar a PDF', included: false, status: 'coming_soon' },
      { text: 'Costos fijos avanzados', included: false, status: 'coming_soon' },
      { text: 'Historial de cambios', included: false, status: 'coming_soon' },
      { text: 'Importar/Exportar datos', included: false, status: 'coming_soon' },
      { text: 'Información nutricional', included: false, status: 'coming_soon' },
    ] satisfies PlanFeature[],
  },
  basic: {
    name: 'Basic',
    description: 'Para negocios en crecimiento',
    badge: { text: 'Recomendado' },
    limits: { recipes: 75, ingredients: null },
    features: [
      { text: 'Hasta 75 recetas', label: 'Recetas', included: true },
      { text: 'Ingredientes ilimitados', label: 'Ingredientes', included: true },
      { text: 'Costeo básico con márgenes', included: true },
      { text: 'Categorías', included: true },
      { text: 'Instrucciones de preparación', included: true, status: 'coming_soon' },
      { text: 'Duplicar recetas', included: true },
      {
        text: 'Fotos de recetas (1 por receta)',
        label: 'Fotos de recetas',
        included: true,
        status: 'coming_soon',
      },
      { text: 'Stock de ingredientes', included: true, status: 'coming_soon' },
      {
        text: 'Planificador de producción (hasta 3 recetas)',
        label: 'Planificador de producción',
        included: true,
      },
      { text: 'Exportar a PDF', included: false, status: 'coming_soon' },
      { text: 'Costos fijos avanzados', included: false, status: 'coming_soon' },
      { text: 'Historial de cambios', included: false, status: 'coming_soon' },
      { text: 'Importar/Exportar datos', included: false, status: 'coming_soon' },
      { text: 'Información nutricional', included: false, status: 'coming_soon' },
    ] satisfies PlanFeature[],
  },
  pro: {
    name: 'Pro',
    description: 'Para profesionales',
    badge: null,
    limits: { recipes: null, ingredients: null },
    features: [
      { text: 'Recetas ilimitadas', label: 'Recetas', included: true },
      { text: 'Ingredientes ilimitados', label: 'Ingredientes', included: true },
      { text: 'Costeo básico con márgenes', included: true },
      { text: 'Categorías', included: true },
      { text: 'Instrucciones de preparación', included: true, status: 'coming_soon' },
      { text: 'Duplicar recetas', included: true },
      {
        text: 'Fotos de recetas + galería',
        label: 'Fotos de recetas',
        included: true,
        status: 'coming_soon',
      },
      { text: 'Stock de ingredientes', included: true, status: 'coming_soon' },
      {
        text: 'Planificador de producción ilimitado',
        label: 'Planificador de producción',
        included: true,
      },
      { text: 'Exportar a PDF', included: true, status: 'coming_soon' },
      { text: 'Costos fijos avanzados', included: true, status: 'coming_soon' },
      { text: 'Historial de cambios', included: true, status: 'coming_soon' },
      { text: 'Importar/Exportar datos', included: true, status: 'coming_soon' },
      { text: 'Información nutricional', included: true, status: 'coming_soon' },
    ] satisfies PlanFeature[],
  },
};
