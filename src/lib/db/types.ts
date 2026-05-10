/**
 * Tipos y modelos de datos para la capa de persistencia.
 *
 * Todos los tipos relevantes al dominio de recetas e ingredientes
 * se definen aquí para ser consumidos por el resto de módulos `db/*`.
 */

import type { Pool } from "pg";

type SqliteDatabaseSync = import("node:sqlite").DatabaseSync;

/** Representa un ingrediente/insumo con su costo de empaque. */
export type Ingredient = {
  id: number;
  name: string;
  unit: string;
  price: number;
  purchaseQuantity: number;
  brand?: string;
  supplier?: string;
};

/** Asociación entre una receta y un ingrediente con su cantidad. */
export type RecipeIngredient = {
  ingredientId: number;
  quantity: number;
  unit: string;
  comment?: string;
};

/** Relación receta-ingrediente resuelta con los datos completos del insumo. */
export type RecipeIngredientWithData = RecipeIngredient & {
  ingredient: Ingredient;
};

/** Presentación de venta (ej. "Caja de 6 piezas"). */
export type RecipePresentation = {
  id: number;
  name: string;
  unitsPerBatch: number;
  salePrice?: number;
};

/** Receta completa con ingredientes resueltos y presentaciones. */
export type RecipeWithIngredients = {
  id: number;
  name: string;
  category?: string;
  instructions?: string;
  desiredMargin: number;
  fixedCostsPercentage: number;
  updatedAt?: string;
  ingredients: RecipeIngredientWithData[];
  presentations: RecipePresentation[];
};

/** Resumen ligero de receta para listados (sidebar, índice). */
export type RecipeSummary = {
  id: number;
  name: string;
  category?: string;
  ingredientCount: number;
};

/** Input para crear un ingrediente. */
export type CreateIngredientInput = {
  name: string;
  unit: string;
  price: number;
  purchaseQuantity?: number;
  brand?: string;
  supplier?: string;
};

/** Input para actualizar parcialmente un ingrediente. */
export type UpdateIngredientInput = {
  name?: string;
  unit?: string;
  price?: number;
  purchaseQuantity?: number;
  brand?: string | null;
  supplier?: string | null;
};

/** Input para crear una presentación. */
export type CreatePresentationInput = {
  name: string;
  unitsPerBatch: number;
  salePrice?: number;
};

/** Usuario autenticado que funge como "owner" de los datos. */
export type RecipeDataUser = {
  id: string;
  email?: string | null;
};

/** Resultado de eliminación de ingrediente con posibles bloqueos. */
export type DeleteIngredientResult =
  | { status: "deleted" }
  | { status: "not-found" }
  | {
      status: "blocked";
      recipes: Array<{ id: number; name: string }>;
    };

/** Resultado de eliminación de presentación. */
export type DeletePresentationResult =
  | { status: "deleted" }
  | { status: "not-found" };

/** Resultado de eliminación de receta. */
export type DeleteRecipeResult =
  | { status: "deleted" }
  | { status: "not-found" };

/** Datos semilla para recetas (formato JSON en `data/`). */
export type RecipeSeed = {
  id: number;
  name: string;
  category?: string;
  instructions?: string;
  desiredMargin: number;
  fixedCostsPercentage: number;
  ingredients: RecipeIngredient[];
  presentations: RecipePresentation[];
};

/** Preferencias de usuario: tema y color de acento. */
export type UserPreferences = {
  userId: string;
  theme: "light" | "dark";
  accentColor: "indigo" | "violet" | "blue" | "emerald" | "rose" | "amber" | "coral";
};

/** Abstracción del motor de base de datos (Postgres o SQLite). */
export type Driver =
  | { kind: "postgres"; pool: Pool }
  | { kind: "sqlite"; db: SqliteDatabaseSync };

/** Interfaz mínima para queries de solo escritura en Postgres. */
export type PostgresQueryable = Pick<Pool, "query">;

/** Input para crear una receta. */
export type CreateRecipeInput = {
  name?: string;
  category?: string | null;
  desiredMargin?: number;
  fixedCostsPercentage?: number;
};

/** Input para actualizar una receta completa (reemplaza ingredientes). */
export type UpdateRecipeInput = {
  name: string;
  category?: string | null;
  instructions?: string;
  desiredMargin: number;
  fixedCostsPercentage: number;
  ingredients: {
    ingredientId: number;
    quantity: number;
    unit: string;
    comment: string | null;
  }[];
};
