import type { PlanFeature, TierConfig } from "@recetario/types";

export type { PlanFeature, TierConfig } from "@recetario/types";

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

export const TIER_CONFIG: Record<string, TierConfig> = {
  free: {
    name: "Free",
    description: "Para empezar a costear",
    badge: null,
    limits: { recipes: 10, ingredients: 30 },
    features: [
      { text: "Hasta 10 recetas", included: true },
      { text: "Hasta 30 ingredientes", included: true },
      { text: "Costeo basico con margenes", included: true },
      { text: "Categorias", included: true },
      { text: "Instrucciones de preparacion", included: false, status: "coming_soon" },
      { text: "Duplicar recetas", included: false },
      { text: "Fotos de recetas", included: false, status: "coming_soon" },
      { text: "Stock de ingredientes", included: false, status: "coming_soon" },
      { text: "Planificador de produccion", included: false },
      { text: "Exportar a PDF", included: false, status: "coming_soon" },
      { text: "Costos fijos avanzados", included: false, status: "coming_soon" },
      { text: "Historial de cambios", included: false, status: "coming_soon" },
      { text: "Importar/Exportar datos", included: false, status: "coming_soon" },
      { text: "Informacion nutricional", included: false, status: "coming_soon" },
    ] satisfies PlanFeature[],
  },
  basic: {
    name: "Basic",
    description: "Para negocios en crecimiento",
    badge: { text: "Recomendado", class: "bg-success-bg text-success" },
    limits: { recipes: 75, ingredients: null },
    features: [
      { text: "Hasta 75 recetas", included: true },
      { text: "Ingredientes ilimitados", included: true },
      { text: "Costeo basico con margenes", included: true },
      { text: "Categorias", included: true },
      { text: "Instrucciones de preparacion", included: true, status: "coming_soon" },
      { text: "Duplicar recetas", included: true },
      { text: "Fotos de recetas (1 por receta)", included: true, status: "coming_soon" },
      { text: "Stock de ingredientes", included: true, status: "coming_soon" },
      { text: "Planificador de produccion (hasta 3 recetas)", included: true },
      { text: "Exportar a PDF", included: false, status: "coming_soon" },
      { text: "Costos fijos avanzados", included: false, status: "coming_soon" },
      { text: "Historial de cambios", included: false, status: "coming_soon" },
      { text: "Importar/Exportar datos", included: false, status: "coming_soon" },
      { text: "Informacion nutricional", included: false, status: "coming_soon" },
    ] satisfies PlanFeature[],
  },
  pro: {
    name: "Pro",
    description: "Para profesionales",
    badge: { text: "Mas popular", class: "bg-accent-600 text-white" },
    limits: { recipes: null, ingredients: null },
    features: [
      { text: "Recetas ilimitadas", included: true },
      { text: "Ingredientes ilimitados", included: true },
      { text: "Costeo basico con margenes", included: true },
      { text: "Categorias", included: true },
      { text: "Instrucciones de preparacion", included: true, status: "coming_soon" },
      { text: "Duplicar recetas", included: true },
      { text: "Fotos de recetas + galeria", included: true, status: "coming_soon" },
      { text: "Stock de ingredientes", included: true, status: "coming_soon" },
      { text: "Planificador de produccion ilimitado", included: true },
      { text: "Exportar a PDF", included: true, status: "coming_soon" },
      { text: "Costos fijos avanzados", included: true, status: "coming_soon" },
      { text: "Historial de cambios", included: true, status: "coming_soon" },
      { text: "Importar/Exportar datos", included: true, status: "coming_soon" },
      { text: "Informacion nutricional", included: true, status: "coming_soon" },
    ] satisfies PlanFeature[],
  },
};
