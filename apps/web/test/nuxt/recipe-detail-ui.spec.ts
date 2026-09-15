import { mountSuspended } from "@nuxt/test-utils/runtime";
import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";
import FinancialSummary from "~/features/recipes/FinancialSummary.vue";
import IngredientPicker from "~/features/recipes/IngredientPicker.vue";
import RecipeActionsMenu from "~/features/recipes/RecipeActionsMenu.vue";
import RecipeDeleteDialog from "~/features/recipes/RecipeDeleteDialog.vue";
import RecipeDetailHeader from "~/features/recipes/RecipeDetailHeader.vue";
import RecipeIngredientEditor from "~/features/recipes/RecipeIngredientEditor.vue";
import RecipeIngredientsPanel from "~/features/recipes/RecipeIngredientsPanel.vue";
import RecipeIngredientView from "~/features/recipes/RecipeIngredientView.vue";
import RecipeMultiplier from "~/features/recipes/RecipeMultiplier.vue";
import RecipeTabs from "~/features/recipes/RecipeTabs.vue";
import { RECIPE_TABS } from "~/features/recipes/useRecipeDetail";
import { buildFinancialEditFields } from "~/features/recipes/recipe-detail-form";
import type {
  IngredientRow,
  RecipeDetailRecord,
} from "~/features/recipes/recipe-detail-form";
import { buildFinancialRows } from "~/features/recipes/recipe-financials";
import { toRecipeSummary } from "~/features/recipes/recipe-state";
import type { MutationOutcome } from "~/features/recipes/useRecipes";

/**
 * Componentes del detalle de receta. Recordatorio del proyecto: con
 * `mountSuspended` los eventos se assertan con listeners espía en `attrs` (el
 * wrapper es el del `Suspense`, así que `emitted()` llega vacío).
 */

type IngredientInDetail =
  RecipeDetailRecord["ingredients"][number]["ingredient"];

const HARINA: IngredientInDetail = {
  id: 1,
  name: "Harina de trigo",
  unit: "kg",
  price: 25,
  purchaseQuantity: 1,
  brand: "Del Campo",
};

const PLATANO: IngredientInDetail = {
  id: 2,
  name: "Plátano",
  unit: "kg",
  price: 18,
  purchaseQuantity: 2,
};

const DETAIL: RecipeDetailRecord = {
  id: 1,
  name: "Tarta de Chocolate",
  category: "Postres",
  desiredMargin: 30,
  fixedCostsPercentage: 10,
  updatedAt: "2026-09-14T10:00:00.000Z",
  ingredients: [
    {
      ingredientId: 1,
      quantity: 0.5,
      unit: "kg",
      comment: "Para la masa",
      ingredient: HARINA,
    },
    {
      ingredientId: 1,
      quantity: 100,
      unit: "g",
      ingredient: HARINA,
    },
  ],
  presentations: [],
  recipeFixedCosts: [],
};

const ROWS: IngredientRow[] = [
  {
    key: "k1",
    ingredientId: 1,
    label: "Harina de trigo (Del Campo)",
    quantity: "0.5",
    unit: "kg",
    comment: "",
  },
  {
    key: "k2",
    ingredientId: 2,
    label: "Plátano",
    quantity: "2",
    unit: "kg",
    comment: "",
  },
];

const FINANCIAL_ROWS = buildFinancialRows({
  hasAdvancedCosts: false,
  costoDirectoTotal: 33,
  recipeFixedCosts: [],
  multiplier: 1,
  fixedCostsPercentageValue: 10,
  desiredMarginValue: 30,
}).rows;

function noopCallbacks() {
  return {
    addRow: vi.fn(),
    removeRow: vi.fn(),
    patchRow: vi.fn(),
  };
}

describe("RecipeDetailHeader", () => {
  it("muestra el título, la categoría y la última modificación en vista", async () => {
    const wrapper = await mountSuspended(RecipeDetailHeader, {
      props: {
        recipeId: 1,
        name: "Tarta de Chocolate",
        category: "Postres",
        savedCategory: "Postres",
        editMode: false,
        saving: false,
        updatedText: "hoy 10:00 a. m.",
        multiplier: 1,
        canDuplicate: true,
      },
    });

    expect(wrapper.find("#recipe-title-view").text()).toBe(
      "Tarta de Chocolate",
    );
    expect(wrapper.text()).toContain("Postres");
    expect(wrapper.text()).toContain("Actualizado hoy 10:00 a. m.");
    expect(wrapper.find("#recipe-cancel-edit").exists()).toBe(false);
    expect(wrapper.find("input[name='recipeName']").exists()).toBe(false);
  });

  it("muestra la categoría por defecto sin categoría asignada", async () => {
    const wrapper = await mountSuspended(RecipeDetailHeader, {
      props: {
        recipeId: 1,
        name: "Brownie",
        category: "",
        savedCategory: "",
        editMode: false,
        saving: false,
        updatedText: "",
        multiplier: 1,
        canDuplicate: false,
      },
    });

    expect(wrapper.text()).toContain("Sin categoría");
    expect(wrapper.text()).not.toContain("Actualizado");
  });

  it("en edición cambia el título por inputs y muestra la barra de guardado", async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const onUpdateName = vi.fn();

    const wrapper = await mountSuspended(RecipeDetailHeader, {
      props: {
        recipeId: 1,
        name: "Tarta de Chocolate",
        category: "Postres",
        savedCategory: "Postres",
        editMode: true,
        saving: false,
        updatedText: "hoy 10:00 a. m.",
        multiplier: 1,
        canDuplicate: true,
      },
      attrs: { onSave, onCancel, "onUpdate:name": onUpdateName },
    });

    expect(wrapper.find("#recipe-title-view").exists()).toBe(false);
    // Paridad con Astro: badge y «Actualizado» siguen visibles mientras se edita.
    expect(wrapper.text()).toContain("Actualizado hoy 10:00 a. m.");
    expect(wrapper.find("#recipe-cancel-edit").exists()).toBe(true);

    const nameInput = wrapper.find("input[name='recipeName']");
    expect((nameInput.element as HTMLInputElement).value).toBe(
      "Tarta de Chocolate",
    );

    await nameInput.setValue("Tarta v2");
    expect(onUpdateName).toHaveBeenCalledWith("Tarta v2");

    await wrapper.find("#recipe-cancel-edit").trigger("click");
    expect(onCancel).toHaveBeenCalled();

    const saveButton = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Guardar Receta"));
    await saveButton?.trigger("click");
    expect(onSave).toHaveBeenCalled();
  });

  it("deja el multiplicador en móvil cuando no está en edición", async () => {
    const onMultiplier = vi.fn();
    const wrapper = await mountSuspended(RecipeDetailHeader, {
      props: {
        recipeId: 1,
        name: "Tarta",
        category: "Postres",
        savedCategory: "Postres",
        editMode: false,
        saving: false,
        updatedText: "",
        multiplier: 1,
        canDuplicate: false,
      },
      attrs: { onMultiplier },
    });

    const increases = wrapper.findAll("button[aria-label='Aumentar mezclas']");
    expect(increases).toHaveLength(2);

    await increases[0]?.trigger("click");
    expect(onMultiplier).toHaveBeenCalledWith(1.5);
  });
});

describe("RecipeMultiplier", () => {
  it("suma y resta con el paso heredado", async () => {
    const onChange = vi.fn();
    const wrapper = await mountSuspended(RecipeMultiplier, {
      props: { multiplier: 1 },
      attrs: { onChange },
    });

    await wrapper
      .find("button[aria-label='Aumentar mezclas']")
      .trigger("click");
    expect(onChange).toHaveBeenLastCalledWith(1.5);

    await wrapper
      .find("button[aria-label='Disminuir mezclas']")
      .trigger("click");
    expect(onChange).toHaveBeenLastCalledWith(0.5);
  });

  it("usa paso de 1 cuando la mezcla llega a 2 y nunca baja de 0.01", async () => {
    const onChange = vi.fn();
    const wrapper = await mountSuspended(RecipeMultiplier, {
      props: { multiplier: 2 },
      attrs: { onChange },
    });

    await wrapper
      .find("button[aria-label='Aumentar mezclas']")
      .trigger("click");
    expect(onChange).toHaveBeenLastCalledWith(3);

    const lower = await mountSuspended(RecipeMultiplier, {
      props: { multiplier: 0.5 },
      attrs: { onChange },
    });
    await lower.find("button[aria-label='Disminuir mezclas']").trigger("click");
    expect(onChange).toHaveBeenLastCalledWith(0.01);
  });

  it("emite el valor tecleado y resalta el multiplicador ajustado", async () => {
    const onChange = vi.fn();
    const wrapper = await mountSuspended(RecipeMultiplier, {
      props: { multiplier: 1 },
      attrs: { onChange },
    });

    expect(wrapper.text()).toContain("Mezclas");
    const input = wrapper.find("input[aria-label='Multiplicador']");
    expect((input.element as HTMLInputElement).value).toBe("1");

    await input.setValue("4");
    expect(onChange).toHaveBeenLastCalledWith(4);

    const adjusted = await mountSuspended(RecipeMultiplier, {
      props: { multiplier: 2 },
    });
    expect(adjusted.classes()).toContain("border-accent-200");
  });
});

describe("RecipeTabs", () => {
  it("marca el tab activo y emite la selección", async () => {
    const onSelect = vi.fn();
    const wrapper = await mountSuspended(RecipeTabs, {
      props: { tabs: RECIPE_TABS, active: "ingredientes" },
      attrs: { onSelect },
    });

    const buttons = wrapper.findAll("button[role='tab']");
    expect(buttons.map((button) => button.text())).toEqual([
      "Ingredientes",
      "Costos Fijos",
      "Presentaciones",
    ]);
    expect(buttons[0]?.attributes("aria-selected")).toBe("true");
    expect(buttons[0]?.classes()).toContain("text-accent-600");
    expect(buttons[1]?.attributes("aria-selected")).toBe("false");

    await buttons[2]?.trigger("click");
    expect(onSelect).toHaveBeenCalledWith("presentaciones");
  });

  it("navega con las flechas y mueve el foco", async () => {
    const onSelect = vi.fn();
    const wrapper = await mountSuspended(RecipeTabs, {
      props: { tabs: RECIPE_TABS, active: "ingredientes" },
      attrs: { onSelect },
      attachTo: document.body,
    });

    const buttons = wrapper.findAll("button[role='tab']");
    await buttons[0]?.trigger("keydown", { key: "ArrowRight" });
    expect(onSelect).toHaveBeenLastCalledWith("costos-fijos");

    await buttons[1]?.trigger("keydown", { key: "ArrowLeft" });
    expect(onSelect).toHaveBeenLastCalledWith("ingredientes");

    await buttons[0]?.trigger("keydown", { key: "ArrowUp" });
    expect(onSelect).toHaveBeenLastCalledWith("presentaciones");

    await buttons[2]?.trigger("keydown", { key: "Escape" });
    expect(onSelect).toHaveBeenCalledTimes(3);
  });
});

describe("FinancialSummary", () => {
  it("pinta las filas, el highlight y el valor secundario", async () => {
    const wrapper = await mountSuspended(FinancialSummary, {
      props: { rows: FINANCIAL_ROWS, highlightRow: 2 },
    });

    expect(wrapper.text()).toContain("Costo Insumos");
    expect(wrapper.text()).toContain("$33.00");
    expect(wrapper.text()).toContain("Gastos Operativos");
    expect(wrapper.text()).toContain("+$3.30");
    expect(wrapper.text()).toContain("$36.30");

    const values = wrapper.findAll("[data-financial-value]");
    expect(values[2]?.classes()).toContain("text-accent-600");
    expect(wrapper.find("input").exists()).toBe(false);
  });

  it("en edición cambia por inputs sólo las filas con campo", async () => {
    const onMargin = vi.fn();
    const onFixedCosts = vi.fn();

    const wrapper = await mountSuspended(FinancialSummary, {
      props: {
        rows: FINANCIAL_ROWS,
        highlightRow: 2,
        fields: buildFinancialEditFields(false),
        editable: true,
        desiredMargin: "30",
        fixedCostsPercentage: "10",
      },
      attrs: {
        "onUpdate:desiredMargin": onMargin,
        "onUpdate:fixedCostsPercentage": onFixedCosts,
      },
    });

    const inputs = wrapper.findAll("input");
    expect(inputs).toHaveLength(2);
    expect(
      (
        wrapper.find("#fs-edit-fixedCostsPercentage")
          .element as HTMLInputElement
      ).value,
    ).toBe("10");
    expect(
      (wrapper.find("#fs-edit-desiredMargin").element as HTMLInputElement)
        .value,
    ).toBe("30");

    await wrapper.find("#fs-edit-desiredMargin").setValue("45");
    expect(onMargin).toHaveBeenCalledWith("45");

    await wrapper.find("#fs-edit-fixedCostsPercentage").setValue("20");
    expect(onFixedCosts).toHaveBeenCalledWith("20");
  });

  it("con advanced_costs sólo edita el margen", async () => {
    const rows = buildFinancialRows({
      hasAdvancedCosts: true,
      costoDirectoTotal: 33,
      recipeFixedCosts: [],
      multiplier: 1,
      fixedCostsPercentageValue: 10,
      desiredMarginValue: 30,
    }).rows;

    const wrapper = await mountSuspended(FinancialSummary, {
      props: {
        rows,
        highlightRow: 2,
        fields: buildFinancialEditFields(true),
        editable: true,
        desiredMargin: "30",
        fixedCostsPercentage: "10",
      },
    });

    expect(wrapper.text()).toContain("Total Costos Fijos");
    expect(wrapper.findAll("input")).toHaveLength(1);
    expect(wrapper.find("#fs-edit-desiredMargin").exists()).toBe(true);
  });
});

describe("IngredientPicker", () => {
  it("filtra sin acentos y devuelve el ingrediente elegido", async () => {
    const onPick = vi.fn();
    const wrapper = await mountSuspended(IngredientPicker, {
      props: { ingredients: [HARINA, PLATANO], label: "" },
      attrs: { onPick },
      attachTo: document.body,
    });

    const input = wrapper.find("input");
    await input.trigger("focus");
    expect(wrapper.findAll(".ingredient-option")).toHaveLength(2);

    await input.setValue("platano");
    const options = wrapper.findAll(".ingredient-option");
    expect(options).toHaveLength(1);
    expect(options[0]?.text()).toContain("Plátano");

    await options[0]?.trigger("click");
    expect(onPick).toHaveBeenCalledWith(PLATANO);
    expect(wrapper.find(".ingredient-dropdown").exists()).toBe(false);
  });

  it("limpia la selección y cierra con Escape", async () => {
    const onClear = vi.fn();
    const wrapper = await mountSuspended(IngredientPicker, {
      props: { ingredients: [HARINA, PLATANO], label: "Plátano" },
      attrs: { onClear },
      attachTo: document.body,
    });

    await wrapper.find("input").trigger("focus");
    expect(wrapper.find(".ingredient-dropdown").exists()).toBe(true);

    await wrapper.find("input").trigger("keydown", { key: "Escape" });
    expect(wrapper.find(".ingredient-dropdown").exists()).toBe(false);

    await wrapper.find("button[aria-label='Limpiar']").trigger("click");
    expect(onClear).toHaveBeenCalled();
    expect((wrapper.find("input").element as HTMLInputElement).value).toBe("");
  });
});

describe("RecipeIngredientView", () => {
  it("pinta cards en móvil y tabla en escritorio con la misma información", async () => {
    const wrapper = await mountSuspended(RecipeIngredientView, {
      props: {
        ingredients: DETAIL.ingredients,
        multiplier: 1,
        showComments: false,
      },
    });

    expect(wrapper.findAll("article")).toHaveLength(2);
    expect(wrapper.findAll("td")).toHaveLength(6);
    expect(wrapper.text()).toContain("Harina de trigo");
    expect(wrapper.text()).toContain("(Del Campo)");
    expect(wrapper.text()).toContain("Base");
    expect(wrapper.text()).toContain("Costo");
    expect(wrapper.text()).toContain("Subtotal");
    expect(wrapper.text()).toContain("$12.50");
    expect(wrapper.text()).toContain("$2.50");
    expect(wrapper.text()).not.toContain("Con x");
  });

  it("muestra la cantidad ajustada con el multiplicador", async () => {
    const wrapper = await mountSuspended(RecipeIngredientView, {
      props: {
        ingredients: DETAIL.ingredients,
        multiplier: 2,
        showComments: false,
      },
    });

    expect(wrapper.text()).toContain("Con x2");
    expect(wrapper.text()).toContain("1.00");
    expect(wrapper.text()).toContain("$25.00");
  });

  it("oculta las notas hasta que se piden", async () => {
    const hidden = await mountSuspended(RecipeIngredientView, {
      props: {
        ingredients: DETAIL.ingredients,
        multiplier: 1,
        showComments: false,
      },
    });
    expect(hidden.find(".ingredient-comment").classes()).toContain("hidden");

    const shown = await mountSuspended(RecipeIngredientView, {
      props: {
        ingredients: DETAIL.ingredients,
        multiplier: 1,
        showComments: true,
      },
    });
    expect(shown.find(".ingredient-comment").classes()).not.toContain("hidden");
    expect(shown.text()).toContain("Para la masa");
  });
});

describe("RecipeIngredientEditor", () => {
  it("lista las filas con picker, cantidad, unidad y notas", async () => {
    const callbacks = noopCallbacks();
    const wrapper = await mountSuspended(RecipeIngredientEditor, {
      props: {
        rows: ROWS,
        ingredients: [HARINA, PLATANO],
        unitOptions: ["kg", "g"],
        ...callbacks,
      },
    });

    expect(wrapper.findAll(".edit-ingredient-row")).toHaveLength(2);
    expect(wrapper.text()).toContain("Ingrediente");
    expect(wrapper.text()).toContain("Cantidad");
    expect(wrapper.text()).toContain("Notas");
    expect(wrapper.text()).toContain("Añadir Ingrediente");

    const quantities = wrapper.findAll(".quantity-input");
    expect((quantities[0]?.element as HTMLInputElement).value).toBe("0.5");
    expect(
      (wrapper.findAll(".unit-select")[0]?.element as HTMLSelectElement).value,
    ).toBe("kg");
  });

  it("propaga la edición de cantidad, unidad y notas", async () => {
    const callbacks = noopCallbacks();
    const wrapper = await mountSuspended(RecipeIngredientEditor, {
      props: {
        rows: ROWS,
        ingredients: [HARINA, PLATANO],
        unitOptions: ["kg", "g"],
        ...callbacks,
      },
    });

    await wrapper.findAll(".quantity-input")[0]?.setValue("3");
    expect(callbacks.patchRow).toHaveBeenLastCalledWith(0, { quantity: "3" });

    await wrapper.findAll(".unit-select")[0]?.setValue("g");
    expect(callbacks.patchRow).toHaveBeenLastCalledWith(0, { unit: "g" });

    await wrapper.findAll(".comment-input")[0]?.setValue("Para la masa");
    expect(callbacks.patchRow).toHaveBeenLastCalledWith(0, {
      comment: "Para la masa",
    });
  });

  it("autocompleta la unidad al elegir un ingrediente y la limpia al quitar", async () => {
    const callbacks = noopCallbacks();
    const wrapper = await mountSuspended(RecipeIngredientEditor, {
      props: {
        rows: [{ ...ROWS[0]!, ingredientId: null, label: "", unit: "" }],
        ingredients: [HARINA, PLATANO],
        unitOptions: ["kg", "g"],
        ...callbacks,
      },
      attachTo: document.body,
    });

    const input = wrapper.find(".ingredient-search-input");
    await input.trigger("focus");
    await wrapper.find(".ingredient-option").trigger("click");

    expect(callbacks.patchRow).toHaveBeenLastCalledWith(0, {
      ingredientId: HARINA.id,
      label: "Harina de trigo (Del Campo)",
      unit: "kg",
    });

    await wrapper.find("button[aria-label='Limpiar']").trigger("click");
    expect(callbacks.patchRow).toHaveBeenLastCalledWith(0, {
      ingredientId: null,
      label: "",
    });
  });

  it("añade y elimina filas por el coordinador", async () => {
    const callbacks = noopCallbacks();
    const wrapper = await mountSuspended(RecipeIngredientEditor, {
      props: {
        rows: ROWS,
        ingredients: [HARINA, PLATANO],
        unitOptions: ["kg", "g"],
        ...callbacks,
      },
    });

    await wrapper.find("#add-ingredient-btn").trigger("click");
    expect(callbacks.addRow).toHaveBeenCalledTimes(1);

    await wrapper
      .findAll("button[aria-label='Eliminar ingrediente']")[1]
      ?.trigger("click");
    expect(callbacks.removeRow).toHaveBeenCalledWith(1);
  });

  it("señala las filas inválidas tras un guardado fallido", async () => {
    const callbacks = noopCallbacks();
    const wrapper = await mountSuspended(RecipeIngredientEditor, {
      props: {
        rows: ROWS,
        ingredients: [HARINA, PLATANO],
        unitOptions: ["kg"],
        invalidKeys: ["k2"],
        ...callbacks,
      },
    });

    const rows = wrapper.findAll(".edit-ingredient-row");
    expect(rows[0]?.attributes("data-invalid")).toBeUndefined();
    expect(rows[1]?.attributes("data-invalid")).toBe("true");
    expect(rows[1]?.classes()).toContain("border-danger");
  });
});

describe("RecipeIngredientsPanel", () => {
  it("muestra la vista con el toggle de notas en modo lectura", async () => {
    const onToggle = vi.fn();
    const callbacks = noopCallbacks();

    const wrapper = await mountSuspended(RecipeIngredientsPanel, {
      props: {
        editMode: false,
        showComments: false,
        multiplier: 1,
        viewIngredients: DETAIL.ingredients,
        rows: ROWS,
        ingredients: [HARINA],
        unitOptions: ["kg"],
        ...callbacks,
      },
      attrs: { onToggleComments: onToggle },
    });

    expect(wrapper.text()).toContain("Lista de Ingredientes");
    expect(wrapper.text()).toContain("Ver notas");
    expect(wrapper.find(".edit-ingredient-row").exists()).toBe(false);

    const checkbox = wrapper.find("#toggle-comments");
    expect(checkbox.attributes("disabled")).toBeUndefined();
    await checkbox.setValue(true);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("muestra el editor y deshabilita las notas en edición", async () => {
    const callbacks = noopCallbacks();
    const wrapper = await mountSuspended(RecipeIngredientsPanel, {
      props: {
        editMode: true,
        showComments: false,
        multiplier: 1,
        viewIngredients: DETAIL.ingredients,
        rows: ROWS,
        ingredients: [HARINA, PLATANO],
        unitOptions: ["kg"],
        ...callbacks,
      },
    });

    expect(wrapper.findAll(".edit-ingredient-row")).toHaveLength(2);
    expect(
      wrapper.find("#toggle-comments").attributes("disabled"),
    ).toBeDefined();
  });
});

describe("RecipeActionsMenu (variante page)", () => {
  it("abre con el trigger, enfoca el primer ítem y cierra con Escape", async () => {
    const onEdit = vi.fn();
    const wrapper = await mountSuspended(RecipeActionsMenu, {
      props: { recipeId: 1, variant: "page", canDuplicate: true },
      attrs: { onEdit },
      attachTo: document.body,
    });

    const trigger = wrapper.find("button[aria-label='Opciones de receta']");
    const panel = wrapper.find("[role='menu']");
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(panel.classes()).toContain("invisible");
    expect(panel.classes()).toContain("top-full");

    await trigger.trigger("click");
    await nextTick();

    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(panel.classes()).toContain("visible");
    expect(document.activeElement?.textContent).toContain("Editar");

    await wrapper.find("[role='menu']").trigger("keydown", { key: "Escape" });
    expect(panel.classes()).toContain("invisible");
    expect(document.activeElement).toBe(trigger.element);
  });

  it("emite Editar, Duplicar y Eliminar y cierra el menú", async () => {
    const onEdit = vi.fn();
    const onDuplicate = vi.fn();
    const onDelete = vi.fn();

    const wrapper = await mountSuspended(RecipeActionsMenu, {
      props: { recipeId: 1, variant: "page", canDuplicate: true },
      attrs: { onEdit, onDuplicate, onDelete },
    });

    const items = wrapper.findAll("[role='menuitem']");
    expect(items).toHaveLength(3);

    for (const item of items) {
      await item.trigger("click");
      await wrapper
        .find("button[aria-label='Opciones de receta']")
        .trigger("click");
    }

    expect(onEdit).toHaveBeenCalled();
    expect(onDuplicate).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });

  it("oculta Duplicar sin la feature y mantiene Editar como enlace en la card", async () => {
    const page = await mountSuspended(RecipeActionsMenu, {
      props: { recipeId: 1, variant: "page", canDuplicate: false },
    });
    expect(page.findAll("[role='menuitem']")).toHaveLength(2);
    expect(page.text()).not.toContain("Duplicar");

    const card = await mountSuspended(RecipeActionsMenu, {
      props: { recipeId: 7 },
    });
    const link = card.find("a[role='menuitem']");
    expect(link.attributes("href")).toBe("/recipes/7?edit=true");
  });
});

describe("RecipeDeleteDialog desde el detalle", () => {
  it("confirma con el id de la receta resumida", async () => {
    const confirm = vi.fn(
      async (): Promise<MutationOutcome> => ({ ok: true, id: 1 }),
    );

    const wrapper = await mountSuspended(RecipeDeleteDialog, {
      props: {
        open: true,
        recipe: toRecipeSummary(DETAIL),
        submitting: false,
        confirm,
      },
    });

    const button = wrapper
      .findAll("button")
      .find((node) => node.text() === "Eliminar");
    await button?.trigger("click");

    expect(confirm).toHaveBeenCalledWith(1);
  });
});
