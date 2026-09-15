import { mountSuspended } from "@nuxt/test-utils/runtime";
import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";
import IngredientCostPreview from "~/features/ingredients/IngredientCostPreview.vue";
import IngredientCreateCard from "~/features/ingredients/IngredientCreateCard.vue";
import IngredientCreateDialog from "~/features/ingredients/IngredientCreateDialog.vue";
import IngredientDeleteDialog from "~/features/ingredients/IngredientDeleteDialog.vue";
import IngredientEditDialog from "~/features/ingredients/IngredientEditDialog.vue";
import IngredientFormFields from "~/features/ingredients/IngredientFormFields.vue";
import IngredientsListCard from "~/features/ingredients/IngredientsListCard.vue";
import type { IngredientRecord } from "~/features/ingredients/ingredient-state";
import type { MutationOutcome } from "~/features/ingredients/useIngredients";

function ingredient(
  id: number,
  overrides: Partial<IngredientRecord> = {},
): IngredientRecord {
  return {
    id,
    name: `Insumo ${id}`,
    unit: "kg",
    price: 10,
    purchaseQuantity: 1,
    ...overrides,
  };
}

function okSubmit(): (values: unknown) => Promise<MutationOutcome> {
  return vi.fn(async (): Promise<MutationOutcome> => ({ ok: true }));
}

function stubDialog(element: HTMLDialogElement) {
  const showModal = vi.fn();
  const close = vi.fn();
  element.showModal = showModal;
  element.close = close;
  return { showModal, close };
}

const EMPTY_FIELDS = {
  name: "",
  supplier: "",
  brand: "",
  price: "",
  purchaseQuantity: "1",
  unit: "kg",
};

describe("IngredientFormFields", () => {
  it("renderiza los cinco campos y las nueve unidades", async () => {
    const wrapper = await mountSuspended(IngredientFormFields, {
      props: { idPrefix: "desktop", ...EMPTY_FIELDS },
    });

    expect(wrapper.findAll("input")).toHaveLength(5);
    const select = wrapper.find("select");
    expect(select.attributes("aria-label")).toBe("Unidad de medida");
    expect(select.findAll("option")).toHaveLength(9);
    expect(select.element.value).toBe("kg");
    expect(wrapper.find("#desktop-name").attributes("placeholder")).toContain(
      "Harina",
    );
    expect(wrapper.find("#desktop-price").attributes("placeholder")).toBe(
      "0.00",
    );
  });

  it("propaga los cambios de cada campo", async () => {
    const onUpdateName = vi.fn();
    const onUpdateQuantity = vi.fn();
    const onUpdateUnit = vi.fn();
    const wrapper = await mountSuspended(IngredientFormFields, {
      props: { idPrefix: "mobile", ...EMPTY_FIELDS },
      attrs: {
        "onUpdate:name": onUpdateName,
        "onUpdate:purchaseQuantity": onUpdateQuantity,
        "onUpdate:unit": onUpdateUnit,
      },
    });

    await wrapper.find("#mobile-name").setValue("Harina");
    await wrapper.find("#mobile-purchase-quantity").setValue("2,5");
    await wrapper.find("select").setValue("lt");

    expect(onUpdateName).toHaveBeenCalledWith("Harina");
    expect(onUpdateQuantity).toHaveBeenCalledWith("2,5");
    expect(onUpdateUnit).toHaveBeenCalledWith("lt");
  });

  it("la variante edit pide dos columnas y no usa placeholders", async () => {
    const wrapper = await mountSuspended(IngredientFormFields, {
      props: { idPrefix: "edit", variant: "edit", ...EMPTY_FIELDS },
    });

    const nameField =
      wrapper.find("#edit-name").element.parentElement?.parentElement;
    expect(nameField?.className).toContain("md:col-span-2");
    expect(wrapper.find("#edit-name").attributes("placeholder")).toBe("");
    expect(wrapper.find("#edit-price").attributes("placeholder")).toBe("");
  });
});

describe("IngredientCostPreview", () => {
  it("calcula el costo unitario con la unidad elegida", async () => {
    const wrapper = await mountSuspended(IngredientCostPreview, {
      props: { price: "25", purchaseQuantity: "2", unit: "kg" },
    });

    expect(wrapper.text()).toContain("$12.50");

    await wrapper.setProps({ unit: "lt" });
    expect(wrapper.text()).toContain("lt");
  });

  it("muestra $0.00 mientras los datos no son válidos", async () => {
    const wrapper = await mountSuspended(IngredientCostPreview, {
      props: { price: "25", purchaseQuantity: "", unit: "kg" },
    });

    expect(wrapper.text()).toContain("$0.00");
  });
});

describe("IngredientCreateCard", () => {
  it("mantiene el submit deshabilitado hasta que el formulario es válido", async () => {
    const wrapper = await mountSuspended(IngredientCreateCard, {
      props: { submitting: false, submit: okSubmit() },
    });

    expect(
      wrapper.find("button[type='submit']").attributes("disabled"),
    ).toBeDefined();

    await wrapper.find("#desktop-name").setValue("Harina");
    await wrapper.find("#desktop-price").setValue("12,5");

    expect(
      wrapper.find("button[type='submit']").attributes("disabled"),
    ).toBeUndefined();
  });

  it("envía los valores del formulario y resetea en éxito", async () => {
    const submit = okSubmit();
    const wrapper = await mountSuspended(IngredientCreateCard, {
      props: { submitting: false, submit },
    });

    await wrapper.find("#desktop-name").setValue("Harina");
    await wrapper.find("#desktop-price").setValue("12,5");
    await wrapper.find("form").trigger("submit");
    await nextTick();

    expect(submit).toHaveBeenCalledWith({
      name: "Harina",
      supplier: "",
      brand: "",
      price: "12,5",
      purchaseQuantity: "1",
      unit: "kg",
    });
    expect(
      (wrapper.find("#desktop-name").element as HTMLInputElement).value,
    ).toBe("");
    expect(
      (wrapper.find("#desktop-purchase-quantity").element as HTMLInputElement)
        .value,
    ).toBe("1");
  });

  it("muestra el error de la mutación sin perder lo escrito", async () => {
    const submit = vi.fn(
      async (): Promise<MutationOutcome> => ({
        ok: false,
        message: "No se pudo crear el ingrediente.",
      }),
    );
    const wrapper = await mountSuspended(IngredientCreateCard, {
      props: { submitting: false, submit },
    });

    await wrapper.find("#desktop-name").setValue("Harina");
    await wrapper.find("#desktop-price").setValue("12,5");
    await wrapper.find("form").trigger("submit");
    await nextTick();

    expect(wrapper.text()).toContain("No se pudo crear el ingrediente.");
    expect(wrapper.text()).not.toContain("Actualizar plan");
    expect(
      (wrapper.find("#desktop-name").element as HTMLInputElement).value,
    ).toBe("Harina");
  });

  it("sólo ofrece el upgrade cuando la causa es el plan", async () => {
    const submit = vi.fn(
      async (): Promise<MutationOutcome> => ({
        ok: false,
        message:
          "Has alcanzado el limite de 30 ingredientes de tu plan Free. Actualiza tu plan para crear mas.",
        planLimit: true,
      }),
    );
    const wrapper = await mountSuspended(IngredientCreateCard, {
      props: { submitting: false, submit },
    });

    await wrapper.find("#desktop-name").setValue("Harina");
    await wrapper.find("#desktop-price").setValue("12,5");
    await wrapper.find("form").trigger("submit");
    await nextTick();

    const link = wrapper.find("a[href='/pricing']");
    expect(link.exists()).toBe(true);
    expect(link.text()).toBe("Actualizar plan");
  });

  it("refleja el pending en el botón", async () => {
    const wrapper = await mountSuspended(IngredientCreateCard, {
      props: { submitting: true, submit: okSubmit() },
    });

    const button = wrapper.find("button[type='submit']");
    expect(button.attributes("aria-busy")).toBe("true");
    expect(button.text()).toContain("Agregando…");
  });
});

describe("IngredientsListCard", () => {
  const PLATANO = ingredient(1, {
    name: "Plátano",
    supplier: "Frutería del Sur",
    brand: "Del Campo",
    price: 25,
    purchaseQuantity: 2,
    unit: "kg",
  });
  const HARINA = ingredient(2, { name: "Harina", supplier: null });
  const INGREDIENTS = [PLATANO, HARINA];

  async function mountList(
    options: {
      ingredients?: IngredientRecord[];
      total?: number;
      search?: string;
      usage?: Record<string, string[]>;
      attrs?: Record<string, unknown>;
    } = {},
  ) {
    const ingredients = options.ingredients ?? INGREDIENTS;
    return await mountSuspended(IngredientsListCard, {
      props: {
        ingredients,
        total: options.total ?? ingredients.length,
        usage: options.usage ?? {},
        search: options.search ?? "",
      },
      attrs: options.attrs,
    });
  }

  it("renderiza la tabla con precio y costo unitario formateados", async () => {
    const wrapper = await mountList();
    const rows = wrapper.findAll("tbody tr");

    expect(rows).toHaveLength(2);
    const [firstRow, secondRow] = rows;
    expect(firstRow?.text()).toContain("Plátano");
    expect(firstRow?.text()).toContain("Marca: Del Campo");
    expect(firstRow?.text()).toContain("Frutería del Sur");
    expect(firstRow?.text()).toContain("$25.00");
    expect(firstRow?.text()).toContain("$12.50 / kg");
    expect(secondRow?.text()).toContain("Sin proveedor");
    expect(wrapper.text()).toContain("(2)");
  });

  it("marca el borrado como bloqueado cuando el ingrediente está en uso", async () => {
    const wrapper = await mountList({ usage: { "1": ["Tarta de Chocolate"] } });
    const buttons = wrapper.findAll("tbody tr").at(0)?.findAll("button") ?? [];

    expect(wrapper.findAll("tbody tr").length).toBe(2);
    expect(buttons[0]?.attributes("aria-label")).toBe("Editar ingrediente");
    expect(buttons[1]?.attributes("aria-label")).toBe("Ingrediente en uso");
  });

  it("emite edit y delete con el ingrediente de la fila", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const wrapper = await mountList({ attrs: { onEdit, onDelete } });
    const buttons = wrapper.findAll("tbody tr").at(1)?.findAll("button") ?? [];

    await buttons[0]?.trigger("click");
    await buttons[1]?.trigger("click");

    expect(onEdit).toHaveBeenCalledWith(HARINA);
    expect(onDelete).toHaveBeenCalledWith(HARINA);
  });

  it("filtra las filas ya recortadas por la búsqueda accent-insensitive", async () => {
    const wrapper = await mountList({
      ingredients: [PLATANO],
      total: 2,
      search: "platano",
    });

    expect(wrapper.findAll("tbody tr")).toHaveLength(1);
    expect(wrapper.text()).toContain("(2)");
  });

  it("muestra el bloque sin resultados sólo con búsqueda activa", async () => {
    const wrapper = await mountList({
      ingredients: [],
      total: 2,
      search: "queso",
    });

    expect(wrapper.text()).toContain("No encontramos resultados");
    expect(wrapper.text()).toContain(
      "Intenta con otro nombre, proveedor o marca.",
    );
  });

  it("propaga la búsqueda del input", async () => {
    const onUpdateSearch = vi.fn();
    const wrapper = await mountList({
      attrs: { "onUpdate:search": onUpdateSearch },
    });

    await wrapper.find("input[type='search']").setValue("harina");

    expect(onUpdateSearch).toHaveBeenCalledWith("harina");
  });

  it("con la lista vacía muestra el estado vacío y su CTA", async () => {
    const onCreate = vi.fn();
    const wrapper = await mountList({
      ingredients: [],
      total: 0,
      attrs: { onCreate },
    });

    expect(wrapper.text()).toContain("Todavía no tienes ingredientes");
    expect(wrapper.findAll("tbody tr")).toHaveLength(0);

    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[1]?.text()).toContain("Agregar Insumo");
    await buttons[1]?.trigger("click");

    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});

describe("IngredientCreateDialog", () => {
  it("abre y cierra siguiendo el modelo", async () => {
    const wrapper = await mountSuspended(IngredientCreateDialog, {
      props: { open: false, submitting: false, submit: okSubmit() },
    });
    const dialog = wrapper.find("dialog").element as HTMLDialogElement;
    const spies = stubDialog(dialog);

    await wrapper.setProps({ open: true });
    expect(spies.showModal).toHaveBeenCalledTimes(1);

    await wrapper.setProps({ open: false });
    expect(spies.close).toHaveBeenCalledTimes(1);
  });

  it("bloquea el cierre mientras envía", async () => {
    const onUpdateOpen = vi.fn();
    const wrapper = await mountSuspended(IngredientCreateDialog, {
      props: { open: false, submitting: true, submit: okSubmit() },
      attrs: { "onUpdate:open": onUpdateOpen },
    });
    stubDialog(wrapper.find("dialog").element as HTMLDialogElement);
    await wrapper.setProps({ open: true });

    await wrapper.find("button[aria-label='Cerrar modal']").trigger("click");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Cancelar")
      ?.trigger("click");

    expect(onUpdateOpen).not.toHaveBeenCalled();
  });

  it("no cierra y muestra el error cuando el submit falla", async () => {
    const submit = vi.fn(
      async (): Promise<MutationOutcome> => ({
        ok: false,
        message: "No se pudo crear el ingrediente.",
      }),
    );
    const onUpdateOpen = vi.fn();
    const wrapper = await mountSuspended(IngredientCreateDialog, {
      props: { open: false, submitting: false, submit },
      attrs: { "onUpdate:open": onUpdateOpen },
    });
    stubDialog(wrapper.find("dialog").element as HTMLDialogElement);
    await wrapper.setProps({ open: true });

    await wrapper.find("#mobile-name").setValue("Harina");
    await wrapper.find("#mobile-price").setValue("10");
    await wrapper.find("form").trigger("submit");
    await nextTick();

    expect(wrapper.text()).toContain("No se pudo crear el ingrediente.");
    expect(onUpdateOpen).not.toHaveBeenCalled();
  });

  it("cierra y resetea en éxito", async () => {
    const onUpdateOpen = vi.fn();
    const wrapper = await mountSuspended(IngredientCreateDialog, {
      props: { open: false, submitting: false, submit: okSubmit() },
      attrs: { "onUpdate:open": onUpdateOpen },
    });
    stubDialog(wrapper.find("dialog").element as HTMLDialogElement);
    await wrapper.setProps({ open: true });

    await wrapper.find("#mobile-name").setValue("Harina");
    await wrapper.find("#mobile-price").setValue("10");
    await wrapper.find("form").trigger("submit");
    await nextTick();

    expect(onUpdateOpen).toHaveBeenCalledWith(false);
    expect(
      (wrapper.find("#mobile-name").element as HTMLInputElement).value,
    ).toBe("");
  });
});

describe("IngredientEditDialog", () => {
  it("precarga los valores del ingrediente al abrir", async () => {
    const wrapper = await mountSuspended(IngredientEditDialog, {
      props: {
        open: false,
        ingredient: ingredient(7, {
          name: "Plátano",
          supplier: "Frutería",
          brand: "Del Campo",
          price: 12.5,
          purchaseQuantity: 2,
        }),
        submitting: false,
        submit: okSubmit(),
      },
    });
    stubDialog(wrapper.find("dialog").element as HTMLDialogElement);

    await wrapper.setProps({ open: true });

    expect((wrapper.find("#edit-name").element as HTMLInputElement).value).toBe(
      "Plátano",
    );
    expect(
      (wrapper.find("#edit-supplier").element as HTMLInputElement).value,
    ).toBe("Frutería");
    expect(
      (wrapper.find("#edit-price").element as HTMLInputElement).value,
    ).toBe("12.5");
    expect(
      (wrapper.find("#edit-purchase-quantity").element as HTMLInputElement)
        .value,
    ).toBe("2");
  });
});

describe("IngredientDeleteDialog", () => {
  it("confirma con el id y cierra en éxito", async () => {
    const confirm = vi.fn(async (): Promise<MutationOutcome> => ({ ok: true }));
    const onUpdateOpen = vi.fn();
    const wrapper = await mountSuspended(IngredientDeleteDialog, {
      props: {
        open: false,
        ingredient: ingredient(4, { name: "Harina" }),
        submitting: false,
        confirm,
      },
      attrs: { "onUpdate:open": onUpdateOpen },
    });
    stubDialog(wrapper.find("dialog").element as HTMLDialogElement);
    await wrapper.setProps({ open: true });

    expect(wrapper.text()).toContain('eliminar el ingrediente "Harina"');

    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Eliminar")
      ?.trigger("click");
    await nextTick();

    expect(confirm).toHaveBeenCalledWith(4);
    expect(onUpdateOpen).toHaveBeenCalledWith(false);
  });

  it("muestra el conflicto con las recetas sin cerrar", async () => {
    const confirm = vi.fn(
      async (): Promise<MutationOutcome> => ({
        ok: false,
        message: "No se puede eliminar porque el ingrediente está en uso.",
        recipes: ["Tarta de Chocolate", "Flan Casero"],
      }),
    );
    const onUpdateOpen = vi.fn();
    const wrapper = await mountSuspended(IngredientDeleteDialog, {
      props: {
        open: false,
        ingredient: ingredient(4, { name: "Harina" }),
        submitting: false,
        confirm,
      },
      attrs: { "onUpdate:open": onUpdateOpen },
    });
    stubDialog(wrapper.find("dialog").element as HTMLDialogElement);
    await wrapper.setProps({ open: true });

    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Eliminar")
      ?.trigger("click");
    await nextTick();

    expect(wrapper.text()).toContain("está en uso");
    expect(wrapper.text()).toContain(
      "Recetas que lo usan: Tarta de Chocolate, Flan Casero",
    );
    expect(onUpdateOpen).not.toHaveBeenCalled();
  });
});
