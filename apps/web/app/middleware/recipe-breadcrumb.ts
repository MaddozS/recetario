import {
  fetchRecipeDetailPage,
  recipeDetailKey,
} from "~/features/recipes/recipe-detail-data";

/**
 * Miga de pan del detalle de receta.
 *
 * Se resuelve en middleware (antes del render) porque el layout pinta el header
 * —y con él las migas— antes de que corra el setup de la página: un `watch`
 * dentro de la página llegaba tarde en SSR y el cliente hidrataba con el
 * nombre ya puesto («Hydration completed but contains mismatches»).
 *
 * Comparte la clave de `useAsyncData` con `useRecipeDetail`, así que no hay una
 * segunda petición: el middleware la deja en el payload y la página la reutiliza.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const recipeId = typeof to.params.recipe === "string" ? to.params.recipe : "";
  if (!recipeId) return;

  const api = useApi();
  const { data } = await useAsyncData(
    recipeDetailKey(recipeId),
    () => fetchRecipeDetailPage(api, recipeId),
    { default: () => ({ status: "failed" as const }) },
  );

  setBreadcrumbTail(
    to.path,
    data.value.status === "ready" ? data.value.recipe.name : null,
  );
});
