export interface PlanFeature {
  text: string;
  included: boolean;
  status?: "coming_soon";
}

export interface TierConfig {
  name: string;
  description: string;
  badge: { text: string; class: string } | null;
  limits: { recipes: number | null; ingredients: number | null };
  features: PlanFeature[];
}

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
      { text: "Categorias e instrucciones", included: true },
      { text: "Duplicar recetas", included: false },
      { text: "Fotos de recetas", included: false, status: "coming_soon" },
      { text: "Stock de ingredientes", included: false, status: "coming_soon" },
      { text: "Planificador de produccion", included: false },
      { text: "Exportar a PDF", included: false, status: "coming_soon" },
      {
        text: "Costos fijos avanzados",
        included: false,
        status: "coming_soon",
      },
      { text: "Historial de cambios", included: false, status: "coming_soon" },
      {
        text: "Importar/Exportar datos",
        included: false,
        status: "coming_soon",
      },
      {
        text: "Informacion nutricional",
        included: false,
        status: "coming_soon",
      },
    ],
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
      { text: "Categorias e instrucciones", included: true },
      { text: "Duplicar recetas", included: true },
      {
        text: "Fotos de recetas (1 por receta)",
        included: true,
        status: "coming_soon",
      },
      { text: "Stock de ingredientes", included: true, status: "coming_soon" },
      { text: "Planificador de produccion (hasta 3 recetas)", included: true },
      { text: "Exportar a PDF", included: false, status: "coming_soon" },
      {
        text: "Costos fijos avanzados",
        included: false,
        status: "coming_soon",
      },
      { text: "Historial de cambios", included: false, status: "coming_soon" },
      {
        text: "Importar/Exportar datos",
        included: false,
        status: "coming_soon",
      },
      {
        text: "Informacion nutricional",
        included: false,
        status: "coming_soon",
      },
    ],
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
      { text: "Categorias e instrucciones", included: true },
      { text: "Duplicar recetas", included: true },
      {
        text: "Fotos de recetas + galeria",
        included: true,
        status: "coming_soon",
      },
      { text: "Stock de ingredientes", included: true, status: "coming_soon" },
      { text: "Planificador de produccion ilimitado", included: true },
      { text: "Exportar a PDF", included: true, status: "coming_soon" },
      { text: "Costos fijos avanzados", included: true, status: "coming_soon" },
      { text: "Historial de cambios", included: true, status: "coming_soon" },
      {
        text: "Importar/Exportar datos",
        included: true,
        status: "coming_soon",
      },
      {
        text: "Informacion nutricional",
        included: true,
        status: "coming_soon",
      },
    ],
  },
};
