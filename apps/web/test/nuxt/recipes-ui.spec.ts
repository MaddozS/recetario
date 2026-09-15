import { mountSuspended } from "@nuxt/test-utils/runtime";
import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";
import RecentRecipes from "~/features/recipes/RecentRecipes.vue";
import RecipeCreateDialog from "~/features/recipes/RecipeCreateDialog.vue";
import RecipeDeleteDialog from "~/features/recipes/RecipeDeleteDialog.vue";
import RecipeDuplicateDialog from "~/features/recipes/RecipeDuplicateDialog.vue";
import RecipeGridCard from "~/features/recipes/RecipeGridCard.vue";
import RecipesEmptyState from "~/features/recipes/RecipesEmptyState.vue";
import RecipesGrid from "~/features/recipes/RecipesGrid.vue";
import RecipesInsights from "~/features/recipes/RecipesInsights.vue";
import RecipesStats from "~/features/recipes/RecipesStats.vue";
import RecipesToolbar from "~/features/recipes/RecipesToolbar.vue";
import type { RecipeRecord } from "~/features/recipes/recipe-state";
import type { MutationOutcome } from "~/features/recipes/useRecipes";

const TWO_HOURS_AGO = new Date(
  Date.now() - (2 * 60 * 60 * 1000 + 60 * 1000),
).toISOString();

function recipe(
  id: number,
  overrides: Partial<RecipeRecord> = {},
): RecipeRecord {
  return {
    id,
    name: `Receta ${id}`,
    ingredientCount: 1,
    updatedAt: "2026-09-14T10:00:00.000Z",
    ...overrides,
  };
}

const TARTA = recipe(1, {
  name: "Tarta de Chocolate",
  category: "Postres",
  ingredientCount: 3,
});
const PAN = recipe(2, {
  name: "Pan de Masa Madre",
  category: "Panes",
  ingredientCount: 2,
  updatedAt: TWO_HOURS_AGO,
});
const BROWNIE = recipe(3, {
  name: "Brownie Clásico",
  ingredientCount: 0,
});

const CATEGORIES = [
  { value: "Postres", label: "Postres", count: 1 },
  { value: "Panes", label: "Panes", count: 1 },
];

function okSubmit(): (value: unknown) => Promise<MutationOutcome> {
  return vi.fn(async (): Promise<MutationOutcome> => ({ ok: true, id: 42 }));
}

function okConfirm(): (recipeId: number) => Promise<MutationOutcome> {
  return vi.fn(async (): Promise<MutationOutcome> => ({ ok: true, id: 42 }));
}

function stubDialog(element: HTMLDialogElement) {
  const showModal = vi.fn();
  const close = vi.fn();
  element.showModal = showModal;
  element.close = close;
  return { showModal, close };
}

describe("RecipesStats", () => {
  it("muestra recetas, categorías e ingredientes", async () => {
    const wrapper = await mountSuspended(RecipesStats, {
      props: { recipeCount: 4, categoryCount: 2, ingredientCount: 3 },
    });

    expect(wrapper.text()).toContain("4 Recetas");
    expect(wrapper.text()).toContain("2 Categorías");
    expect(wrapper.text()).toContain("3 Ingredientes");
  });

  it("usa el singular y oculta los contadores en cero", async () => {
    const wrapper = await mountSuspended(RecipesStats, {
      props: { recipeCount: 1, categoryCount: 0, ingredientCount: 0 },
    });

    expect(wrapper.text()).toContain("1 Receta");
    expect(wrapper.text()).not.toContain("Categoría");
    expect(wrapper.text()).not.toContain("Ingrediente");
  });
});

describe("RecipesInsights", () => {
  it("cuenta recetas incompletas y sin categoría", async () => {
    const wrapper = await mountSuspended(RecipesInsights, {
      props: {
        incompleteCount: 2,
        withoutCategoryCount: 1,
        lastUpdatedAt: TWO_HOURS_AGO,
      },
    });

    expect(wrapper.text()).toContain("Recetas por completar");
    expect(wrapper.text()).toContain("2 recetas");
    expect(wrapper.text()).toContain("sin ingredientes asignados");
    expect(wrapper.text()).toContain("sin categoría asignada");
    expect(wrapper.text()).toContain("Última modificación");
    expect(wrapper.text()).toContain("hace 2 h");
  });

  it("celebra cuando no hay pendientes y sin actividad sin fechas", async () => {
    const wrapper = await mountSuspended(RecipesInsights, {
      props: {
        incompleteCount: 0,
        withoutCategoryCount: 0,
        lastUpdatedAt: null,
      },
    });

    expect(wrapper.text()).toContain("Todas tienen ingredientes");
    expect(wrapper.text()).toContain("Todas están categorizadas");
    expect(wrapper.text()).toContain("Sin actividad");
  });
});

describe("RecentRecipes", () => {
  it("enlaza cada receta con su categoría y antigüedad", async () => {
    const wrapper = await mountSuspended(RecentRecipes, {
      props: { recipes: [PAN, TARTA] },
    });

    expect(wrapper.text()).toContain("Recientemente actualizadas");
    const links = wrapper.findAll("a");
    expect(links).toHaveLength(2);
    expect(links[0]?.attributes("href")).toBe("/recipes/2");
    expect(links[0]?.text()).toContain("Pan de Masa Madre");
    expect(links[0]?.text()).toContain("Panes");
    expect(links[0]?.text()).toContain("hace 2 h");
  });
});

describe("RecipeGridCard", () => {
  it("enlaza al detalle y resume ingredientes y categoría", async () => {
    const wrapper = await mountSuspended(RecipeGridCard, {
      props: { recipe: TARTA, canDuplicate: true, index: 0 },
    });

    const link = wrapper.find("a[href='/recipes/1']");
    expect(link.exists()).toBe(true);
    expect(link.text()).toContain("Tarta de Chocolate");
    expect(link.text()).toContain("Postres");
    expect(link.text()).toContain("3 ingredientes");
  });

  it("usa el singular con un ingrediente", async () => {
    const wrapper = await mountSuspended(RecipeGridCard, {
      props: {
        recipe: recipe(5, { ingredientCount: 1 }),
        canDuplicate: true,
        index: 1,
      },
    });

    expect(wrapper.text()).toContain("1 ingrediente");
    expect(wrapper.text()).not.toContain("1 ingredientes");
  });

  it("ofrece Editar, Duplicar y Eliminar en el menú", async () => {
    const onDuplicate = vi.fn();
    const onDelete = vi.fn();
    const wrapper = await mountSuspended(RecipeGridCard, {
      props: { recipe: TARTA, canDuplicate: true, index: 0 },
      attrs: { onDuplicate, onDelete },
    });

    const buttons = wrapper.findAll("[role='menuitem']");
    expect(buttons.map((button) => button.text())).toEqual([
      "Editar",
      "Duplicar",
      "Eliminar",
    ]);
    expect(wrapper.find("a[role='menuitem']").attributes("href")).toBe(
      "/recipes/1?edit=true",
    );

    await buttons[1]?.trigger("click");
    await buttons[2]?.trigger("click");

    expect(onDuplicate).toHaveBeenCalledWith(TARTA);
    expect(onDelete).toHaveBeenCalledWith(TARTA);
  });

  it("oculta Duplicar cuando el plan no tiene la feature", async () => {
    const wrapper = await mountSuspended(RecipeGridCard, {
      props: { recipe: TARTA, canDuplicate: false, index: 0 },
    });

    expect(wrapper.findAll("[role='menuitem']")).toHaveLength(2);
    expect(wrapper.text()).not.toContain("Duplicar");
  });

  it("abre y cierra el menú con el trigger", async () => {
    const wrapper = await mountSuspended(RecipeGridCard, {
      props: { recipe: TARTA, canDuplicate: true, index: 0 },
    });

    const trigger = wrapper.find("button[aria-label='Acciones']");
    const panel = wrapper.find("[role='menu']");

    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(panel.classes()).toContain("invisible");

    await trigger.trigger("click");
    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(panel.classes()).toContain("visible");
  });
});

describe("RecipesGrid", () => {
  it("renderiza una card por receta", async () => {
    const wrapper = await mountSuspended(RecipesGrid, {
      props: { recipes: [TARTA, PAN, BROWNIE], canDuplicate: true },
    });

    const cards = wrapper.findAll("a.recipe-grid-card");
    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.attributes("href"))).toEqual([
      "/recipes/1",
      "/recipes/2",
      "/recipes/3",
    ]);
  });

  it("muestra el bloque sin resultados cuando el filtro no deja nada", async () => {
    const wrapper = await mountSuspended(RecipesGrid, {
      props: { recipes: [], canDuplicate: true },
    });

    expect(wrapper.text()).toContain("No se encontraron recetas");
  });
});

describe("RecipesToolbar", () => {
  async function mountToolbar(
    options: {
      category?: string | null;
      search?: string;
      uncategorizedCount?: number;
      attrs?: Record<string, unknown>;
    } = {},
  ) {
    return await mountSuspended(RecipesToolbar, {
      props: {
        category: options.category ?? null,
        categories: CATEGORIES,
        uncategorizedCount: options.uncategorizedCount ?? 0,
        search: options.search ?? "",
      },
      attrs: options.attrs,
    });
  }

  it("propaga la búsqueda del input", async () => {
    const onUpdateSearch = vi.fn();
    const wrapper = await mountToolbar({
      attrs: { "onUpdate:search": onUpdateSearch },
    });

    await wrapper.find("input[type='search']").setValue("chocolate");

    expect(onUpdateSearch).toHaveBeenCalledWith("chocolate");
  });

  it("selecciona una categoría y limpia al repetir la activa", async () => {
    const onSelectCategory = vi.fn();
    const wrapper = await mountToolbar({
      category: "Postres",
      attrs: { onSelectCategory },
    });

    const pills = wrapper
      .findAll("button")
      .filter((button) => button.text().startsWith("Postres"));

    await pills[0]?.trigger("click");
    expect(onSelectCategory).toHaveBeenLastCalledWith(null);

    const panes = wrapper
      .findAll("button")
      .find((button) => button.text().startsWith("Panes"));
    await panes?.trigger("click");
    expect(onSelectCategory).toHaveBeenLastCalledWith("Panes");
  });

  it("marca la pill activa y muestra Limpiar filtro", async () => {
    const onSelectCategory = vi.fn();
    const wrapper = await mountToolbar({
      category: "Postres",
      attrs: { onSelectCategory },
    });

    const active = wrapper
      .findAll("button")
      .find((button) => button.text().startsWith("Postres"));
    expect(active?.classes()).toContain("bg-accent-600");

    const clear = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Limpiar filtro"));
    expect(clear?.exists()).toBe(true);

    await clear?.trigger("click");
    expect(onSelectCategory).toHaveBeenLastCalledWith(null);
  });

  it("omite Limpiar filtro y la pill sin categoría cuando no aplican", async () => {
    const wrapper = await mountToolbar({ uncategorizedCount: 0 });

    expect(wrapper.text()).not.toContain("Limpiar filtro");
    expect(wrapper.text()).not.toContain("Sin categoría");
  });

  it("añade la pill de sin categoría con su conteo", async () => {
    const onSelectCategory = vi.fn();
    const wrapper = await mountToolbar({
      uncategorizedCount: 3,
      attrs: { onSelectCategory },
    });

    const uncategorized = wrapper
      .findAll("button")
      .find((button) => button.text().startsWith("Sin categoría"));
    expect(uncategorized?.text()).toContain("3");

    await uncategorized?.trigger("click");
    expect(onSelectCategory).toHaveBeenLastCalledWith("");
  });

  it("emite create desde el botón Nueva Receta", async () => {
    const onCreate = vi.fn();
    const wrapper = await mountToolbar({ attrs: { onCreate } });

    await wrapper.find("button[aria-label='Nueva Receta']").trigger("click");

    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});

describe("RecipesEmptyState", () => {
  it("muestra el copy corregido y sus dos CTAs", async () => {
    const onCreate = vi.fn();
    const wrapper = await mountSuspended(RecipesEmptyState, {
      attrs: { onCreate },
    });

    expect(wrapper.text()).toContain("Todavía no tienes recetas");
    expect(wrapper.text()).toContain(
      "Entra por primera vez al recetario desde aquí y crea tu primera receta.",
    );

    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.text()).toContain("Crear primera receta");
    expect(wrapper.find("a[href='/ingredients']").text()).toContain(
      "Ver ingredientes",
    );

    await buttons[0]?.trigger("click");
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});

describe("RecipeCreateDialog", () => {
  it("abre y cierra siguiendo el modelo", async () => {
    const wrapper = await mountSuspended(RecipeCreateDialog, {
      props: { open: false, submitting: false, submit: okSubmit() },
    });
    const spies = stubDialog(
      wrapper.find("dialog").element as HTMLDialogElement,
    );

    await wrapper.setProps({ open: true });
    expect(spies.showModal).toHaveBeenCalledTimes(1);

    await wrapper.setProps({ open: false });
    expect(spies.close).toHaveBeenCalledTimes(1);
  });

  it("mantiene el submit deshabilitado hasta que hay nombre", async () => {
    const wrapper = await mountSuspended(RecipeCreateDialog, {
      props: { open: false, submitting: false, submit: okSubmit() },
    });
    stubDialog(wrapper.find("dialog").element as HTMLDialogElement);
    await wrapper.setProps({ open: true });

    const button = wrapper.find("button[type='submit']");
    expect(button.attributes("disabled")).toBeDefined();

    await wrapper.find("#create-recipe-name").setValue("Brownie");

    expect(
      wrapper.find("button[type='submit']").attributes("disabled"),
    ).toBeUndefined();
  });

  it("envía el nombre, cierra y resetea en éxito", async () => {
    const submit = okSubmit();
    const onUpdateOpen = vi.fn();
    const wrapper = await mountSuspended(RecipeCreateDialog, {
      props: { open: false, submitting: false, submit },
      attrs: { "onUpdate:open": onUpdateOpen },
    });
    stubDialog(wrapper.find("dialog").element as HTMLDialogElement);
    await wrapper.setProps({ open: true });

    await wrapper.find("#create-recipe-name").setValue("Brownie clásico");
    await wrapper.find("form").trigger("submit");
    await nextTick();

    expect(submit).toHaveBeenCalledWith({ name: "Brownie clásico" });
    expect(onUpdateOpen).toHaveBeenCalledWith(false);
    expect(
      (wrapper.find("#create-recipe-name").element as HTMLInputElement).value,
    ).toBe("");
  });

  it("no cierra y muestra el error cuando el submit falla", async () => {
    const submit = vi.fn(
      async (): Promise<MutationOutcome> => ({
        ok: false,
        message: "No se pudo crear la receta.",
      }),
    );
    const onUpdateOpen = vi.fn();
    const wrapper = await mountSuspended(RecipeCreateDialog, {
      props: { open: false, submitting: false, submit },
      attrs: { "onUpdate:open": onUpdateOpen },
    });
    stubDialog(wrapper.find("dialog").element as HTMLDialogElement);
    await wrapper.setProps({ open: true });

    await wrapper.find("#create-recipe-name").setValue("Brownie");
    await wrapper.find("form").trigger("submit");
    await nextTick();

    expect(wrapper.text()).toContain("No se pudo crear la receta.");
    expect(wrapper.find("a[href='/pricing']").exists()).toBe(false);
    expect(onUpdateOpen).not.toHaveBeenCalled();
  });

  it("sólo ofrece el upgrade cuando la causa es el plan", async () => {
    const submit = vi.fn(
      async (): Promise<MutationOutcome> => ({
        ok: false,
        message:
          "Has alcanzado el límite de 10 recetas de tu plan Free. Actualiza tu plan para crear más.",
        planLimit: true,
      }),
    );
    const wrapper = await mountSuspended(RecipeCreateDialog, {
      props: { open: false, submitting: false, submit },
    });
    stubDialog(wrapper.find("dialog").element as HTMLDialogElement);
    await wrapper.setProps({ open: true });

    await wrapper.find("#create-recipe-name").setValue("Brownie");
    await wrapper.find("form").trigger("submit");
    await nextTick();

    const link = wrapper.find("a[href='/pricing']");
    expect(link.exists()).toBe(true);
    expect(link.text()).toBe("Actualizar plan");
  });

  it("bloquea el cierre y refleja el pending mientras envía", async () => {
    const onUpdateOpen = vi.fn();
    const wrapper = await mountSuspended(RecipeCreateDialog, {
      props: { open: false, submitting: true, submit: okSubmit() },
      attrs: { "onUpdate:open": onUpdateOpen },
    });
    stubDialog(wrapper.find("dialog").element as HTMLDialogElement);
    await wrapper.setProps({ open: true });

    expect(wrapper.find("button[type='submit']").attributes("aria-busy")).toBe(
      "true",
    );

    await wrapper.find("button[aria-label='Cerrar modal']").trigger("click");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Cancelar")
      ?.trigger("click");

    expect(onUpdateOpen).not.toHaveBeenCalled();
  });
});

describe("RecipeDuplicateDialog", () => {
  it("confirma con el id de la receta y cierra en éxito", async () => {
    const confirm = okConfirm();
    const onUpdateOpen = vi.fn();
    const wrapper = await mountSuspended(RecipeDuplicateDialog, {
      props: {
        open: false,
        recipe: TARTA,
        submitting: false,
        confirm,
      },
      attrs: { "onUpdate:open": onUpdateOpen },
    });
    stubDialog(wrapper.find("dialog").element as HTMLDialogElement);
    await wrapper.setProps({ open: true });

    expect(wrapper.text()).toContain("Duplicar receta");
    expect(wrapper.text()).toContain(
      "Se creará una copia de esta receta con todos sus ingredientes y presentaciones.",
    );

    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Duplicar")
      ?.trigger("click");
    await nextTick();

    expect(confirm).toHaveBeenCalledWith(1);
    expect(onUpdateOpen).toHaveBeenCalledWith(false);
  });

  it("muestra el error sin cerrar cuando la feature no está disponible", async () => {
    const confirm = vi.fn(
      async (): Promise<MutationOutcome> => ({
        ok: false,
        message: "Funcionalidad no disponible en tu plan.",
      }),
    );
    const onUpdateOpen = vi.fn();
    const wrapper = await mountSuspended(RecipeDuplicateDialog, {
      props: { open: false, recipe: TARTA, submitting: false, confirm },
      attrs: { "onUpdate:open": onUpdateOpen },
    });
    stubDialog(wrapper.find("dialog").element as HTMLDialogElement);
    await wrapper.setProps({ open: true });

    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Duplicar")
      ?.trigger("click");
    await nextTick();

    expect(wrapper.text()).toContain("Funcionalidad no disponible en tu plan.");
    expect(wrapper.find("a[href='/pricing']").exists()).toBe(false);
    expect(onUpdateOpen).not.toHaveBeenCalled();
  });
});

describe("RecipeDeleteDialog", () => {
  it("confirma con el id y cierra en éxito", async () => {
    const confirm = okConfirm();
    const onUpdateOpen = vi.fn();
    const wrapper = await mountSuspended(RecipeDeleteDialog, {
      props: { open: false, recipe: PAN, submitting: false, confirm },
      attrs: { "onUpdate:open": onUpdateOpen },
    });
    stubDialog(wrapper.find("dialog").element as HTMLDialogElement);
    await wrapper.setProps({ open: true });

    expect(wrapper.text()).toContain("Confirmar eliminación");
    expect(wrapper.text()).toContain(
      "¿Eliminar esta receta? Esta acción no se puede deshacer.",
    );

    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Eliminar")
      ?.trigger("click");
    await nextTick();

    expect(confirm).toHaveBeenCalledWith(2);
    expect(onUpdateOpen).toHaveBeenCalledWith(false);
  });

  it("mantiene el dialog abierto cuando el borrado falla", async () => {
    const confirm = vi.fn(
      async (): Promise<MutationOutcome> => ({
        ok: false,
        message: "La receta ya no existe.",
      }),
    );
    const onUpdateOpen = vi.fn();
    const wrapper = await mountSuspended(RecipeDeleteDialog, {
      props: { open: false, recipe: PAN, submitting: false, confirm },
      attrs: { "onUpdate:open": onUpdateOpen },
    });
    stubDialog(wrapper.find("dialog").element as HTMLDialogElement);
    await wrapper.setProps({ open: true });

    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Eliminar")
      ?.trigger("click");
    await nextTick();

    expect(wrapper.text()).toContain("La receta ya no existe.");
    expect(onUpdateOpen).not.toHaveBeenCalled();
  });

  it("deshabilita el borrado sin receta seleccionada", async () => {
    const wrapper = await mountSuspended(RecipeDeleteDialog, {
      props: {
        open: false,
        recipe: null,
        submitting: false,
        confirm: okConfirm(),
      },
    });
    stubDialog(wrapper.find("dialog").element as HTMLDialogElement);
    await wrapper.setProps({ open: true });

    const button = wrapper
      .findAll("button")
      .find((candidate) => candidate.text() === "Eliminar");

    expect(button?.attributes("disabled")).toBeDefined();
  });
});
