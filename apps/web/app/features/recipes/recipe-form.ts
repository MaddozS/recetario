import type { CreateRecipeInput } from "@recetario/types";

/**
 * Formulario de receta en su forma de UI y su traducción al contrato del API.
 * Módulo puro y sin aliases: cubierto en `test/unit`.
 *
 * Paridad con el formulario del baseline: sólo el nombre es editable al crear (la
 * categoría y los costos se capturan en la vista de edición).
 */
export const MAX_RECIPE_NAME_LENGTH = 120;

export type RecipeFormValues = {
  name: string;
};

export function createEmptyRecipeForm(): RecipeFormValues {
  return { name: "" };
}

/** Gate del botón de submit: nombre no vacío y dentro del máximo del API. */
export function isRecipeFormValid(values: RecipeFormValues): boolean {
  const name = values.name.trim();
  return name.length > 0 && name.length <= MAX_RECIPE_NAME_LENGTH;
}

export function toRecipeInput(values: RecipeFormValues): CreateRecipeInput {
  return { name: values.name.trim() };
}
