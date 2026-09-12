import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it, vi } from "vitest";
import Badge from "~/components/ui/atoms/Badge.vue";
import Button from "~/components/ui/atoms/Button.vue";
import Icon from "~/components/ui/atoms/Icon.vue";
import Input from "~/components/ui/atoms/Input.vue";
import SectionHeading from "~/components/ui/atoms/SectionHeading.vue";
import Skeleton from "~/components/ui/atoms/Skeleton.vue";
import UnitCostDisplay from "~/components/ui/atoms/UnitCostDisplay.vue";
import Card from "~/components/ui/molecules/Card.vue";
import EmptyState from "~/components/ui/molecules/EmptyState.vue";
import FeedbackAlert from "~/components/ui/molecules/FeedbackAlert.vue";
import PasswordInput from "~/components/ui/molecules/PasswordInput.vue";
import UpgradePrompt from "~/components/ui/molecules/UpgradePrompt.vue";
import Dialog from "~/components/ui/organisms/Dialog.vue";

describe("Icon", () => {
  it("renderiza el ícono registrado sin el prefijo lucide:", async () => {
    const wrapper = await mountSuspended(Icon, {
      props: { name: "lucide:plus" },
    });
    expect(wrapper.find("svg").exists()).toBe(true);
  });

  it("renderiza vacío cuando el nombre no está registrado", async () => {
    const wrapper = await mountSuspended(Icon, {
      props: { name: "lucide:no-existe" },
    });
    expect(wrapper.find("svg").exists()).toBe(false);
  });

  it("propaga size y atributos al svg", async () => {
    const wrapper = await mountSuspended(Icon, {
      props: { name: "info", size: 24 },
      attrs: { class: "text-accent-600", "aria-hidden": "true" },
    });
    const svg = wrapper.find("svg");
    expect(svg.attributes("width")).toBe("24");
    expect(svg.attributes("aria-hidden")).toBe("true");
    expect(svg.classes()).toContain("text-accent-600");
  });
});

describe("Button", () => {
  it("usa variant primary y size md por defecto", async () => {
    const wrapper = await mountSuspended(Button, { slots: { default: "OK" } });
    const button = wrapper.find("button");
    expect(button.attributes("type")).toBe("button");
    expect(button.classes()).toContain("bg-accent-600");
    expect(button.classes()).toContain("min-h-11");
  });

  it("aplica las clases de cada variante", async () => {
    const secondary = await mountSuspended(Button, {
      props: { variant: "secondary" },
    });
    expect(secondary.find("button").classes()).toContain("border-border");

    const danger = await mountSuspended(Button, {
      props: { variant: "danger" },
    });
    expect(danger.find("button").classes()).toContain("bg-danger-solid");

    const ghost = await mountSuspended(Button, { props: { variant: "ghost" } });
    expect(ghost.find("button").classes()).toContain("hover:bg-muted");
  });

  it("aplica las clases de cada tamaño", async () => {
    const sm = await mountSuspended(Button, { props: { size: "sm" } });
    expect(sm.find("button").classes()).toContain("min-h-10");

    const lg = await mountSuspended(Button, { props: { size: "lg" } });
    expect(lg.find("button").classes()).toContain("min-h-12");
  });

  it("cae a ghost cuando iconAccent se usa sin iconOnly", async () => {
    const wrapper = await mountSuspended(Button, {
      props: { variant: "iconAccent" },
      slots: { default: "Etiqueta" },
    });
    const classes = wrapper.find("button").classes();
    expect(classes).toContain("rounded-xl");
    expect(classes).not.toContain("hover:text-accent-600");
  });

  it("iconOnly omite la etiqueta y usa el tamaño cuadrado", async () => {
    const wrapper = await mountSuspended(Button, {
      props: { iconOnly: true, icon: "plus", ariaLabel: "Agregar" },
      slots: { default: "no debería renderizarse" },
    });
    const button = wrapper.find("button");
    expect(button.text()).toBe("");
    expect(button.classes()).toContain("min-w-10");
    expect(button.attributes("aria-label")).toBe("Agregar");
    expect(button.find("svg").exists()).toBe(true);
  });

  it("con loading queda deshabilitado, aria-busy y con spinner", async () => {
    const wrapper = await mountSuspended(Button, {
      props: { loading: true },
      slots: { default: "Guardando" },
    });
    const button = wrapper.find("button");
    expect(button.attributes("disabled")).toBeDefined();
    expect(button.attributes("aria-busy")).toBe("true");
    expect(button.find("svg").exists()).toBe(true);
  });

  it("con disabled no expone aria-busy", async () => {
    const wrapper = await mountSuspended(Button, { props: { disabled: true } });
    const button = wrapper.find("button");
    expect(button.attributes("disabled")).toBeDefined();
    expect(button.attributes("aria-busy")).toBeUndefined();
  });

  it("con href renderiza un ancla y no un botón", async () => {
    const wrapper = await mountSuspended(Button, {
      props: { href: "/pricing" },
      slots: { default: "Precios" },
    });
    expect(wrapper.find("button").exists()).toBe(false);
    expect(wrapper.find("a").attributes("href")).toBe("/pricing");
  });

  it("hace fallthrough de id, aria-label, data-* y class", async () => {
    const wrapper = await mountSuspended(Button, {
      attrs: {
        id: "btn-1",
        "aria-label": "Enviar",
        "data-qa": "submit",
        class: "extra",
      },
      slots: { default: "Enviar" },
    });
    const button = wrapper.find("button");
    expect(button.attributes("id")).toBe("btn-1");
    expect(button.attributes("aria-label")).toBe("Enviar");
    expect(button.attributes("data-qa")).toBe("submit");
    expect(button.classes()).toContain("extra");
  });

  it("respeta type=submit", async () => {
    const wrapper = await mountSuspended(Button, { props: { type: "submit" } });
    expect(wrapper.find("button").attributes("type")).toBe("submit");
  });
});

describe("Input", () => {
  it("deriva el id del name y muestra label y asterisco", async () => {
    const wrapper = await mountSuspended(Input, {
      props: { label: "Correo", name: "email", required: true },
    });
    expect(wrapper.find("label").attributes("for")).toBe("email");
    expect(wrapper.find("label").text()).toContain("*");
    expect(wrapper.find("input").attributes("required")).toBeDefined();
  });

  it("muestra el error y el borde de peligro", async () => {
    const wrapper = await mountSuspended(Input, {
      props: { name: "email", error: "Requerido" },
    });
    expect(wrapper.text()).toContain("Requerido");
    expect(wrapper.find("input").classes()).toContain("border-danger-border");
  });

  it("monospace aplica font-mono", async () => {
    const wrapper = await mountSuspended(Input, {
      props: { name: "cost", monospace: true },
    });
    expect(wrapper.find("input").classes()).toContain("font-mono");
  });

  it("emite update:modelValue al escribir", async () => {
    const onUpdate = vi.fn();
    const wrapper = await mountSuspended(Input, {
      props: { name: "q" },
      attrs: { "onUpdate:modelValue": onUpdate },
    });
    await wrapper.find("input").setValue("harina");
    expect(onUpdate).toHaveBeenCalledWith("harina");
    expect(wrapper.find("input").element.value).toBe("harina");
  });

  it("hace fallthrough de attrs al input, no al wrapper", async () => {
    const wrapper = await mountSuspended(Input, {
      props: { name: "q" },
      attrs: { class: "extra", "aria-label": "Buscar" },
    });
    expect(wrapper.find("input").classes()).toContain("extra");
    expect(wrapper.find("input").attributes("aria-label")).toBe("Buscar");
    expect(wrapper.find("div").classes()).not.toContain("extra");
  });
});

describe("Badge", () => {
  it("usa accent y size sm por defecto", async () => {
    const wrapper = await mountSuspended(Badge, {
      slots: { default: "Nuevo" },
    });
    const span = wrapper.find("span");
    expect(span.classes()).toContain("bg-accent-100");
    expect(span.classes()).toContain("text-[10px]");
    expect(span.text()).toBe("Nuevo");
  });

  it("colorea según el token semántico", async () => {
    const wrapper = await mountSuspended(Badge, {
      props: { color: "success" },
    });
    expect(wrapper.find("span").classes()).toContain("bg-success-bg");
  });

  it("cambia de radio según la variante y de escala según el tamaño", async () => {
    const outline = await mountSuspended(Badge, {
      props: { variant: "outline" },
    });
    expect(outline.find("span").classes()).toContain("rounded-lg");

    const md = await mountSuspended(Badge, { props: { size: "md" } });
    expect(md.find("span").classes()).toContain("text-[11px]");
  });
});

describe("Skeleton", () => {
  it("renderiza el placeholder con la animación y acepta class", async () => {
    const wrapper = await mountSuspended(Skeleton, { attrs: { class: "h-4" } });
    const div = wrapper.find("div");
    expect(div.classes()).toContain("animate-pulse");
    expect(div.classes()).toContain("h-4");
    // El `&nbsp;` interno sostiene la altura del placeholder.
    expect(div.element.textContent).toHaveLength(1);
  });
});

describe("SectionHeading", () => {
  it("usa h2 por defecto", async () => {
    const wrapper = await mountSuspended(SectionHeading, {
      props: { title: "Recetas" },
    });
    expect(wrapper.find("h2").text()).toBe("Recetas");
  });

  it("respeta el nivel dinámico", async () => {
    const wrapper = await mountSuspended(SectionHeading, {
      props: { title: "Recetas", level: "h1" },
    });
    expect(wrapper.find("h1").exists()).toBe(true);
    expect(wrapper.find("h2").exists()).toBe(false);
  });

  it("renderiza icono y subtítulo", async () => {
    const wrapper = await mountSuspended(SectionHeading, {
      props: { title: "Recetas", subtitle: "Tus recetas", icon: "book-open" },
    });
    expect(wrapper.find("svg").exists()).toBe(true);
    expect(wrapper.text()).toContain("Tus recetas");
  });
});

describe("UnitCostDisplay", () => {
  it("muestra el valor por defecto y la unidad", async () => {
    const wrapper = await mountSuspended(UnitCostDisplay, {
      props: { defaultUnit: "kg" },
    });
    expect(wrapper.text()).toContain("$0.00");
    expect(wrapper.text()).toContain("kg");
  });

  it("muestra el valor recibido", async () => {
    const wrapper = await mountSuspended(UnitCostDisplay, {
      props: { defaultUnit: "g", value: "$0.42" },
    });
    expect(wrapper.text()).toContain("$0.42");
  });
});

describe("Card", () => {
  it("usa padding md y borde neutro por defecto", async () => {
    const wrapper = await mountSuspended(Card);
    const classes = wrapper.find("div").classes();
    expect(classes).toContain("p-5");
    expect(classes).toContain("border-border");
  });

  it("padding lg, hover y accent cambian las clases", async () => {
    const wrapper = await mountSuspended(Card, {
      props: { padding: "lg", hover: true, accent: true },
    });
    const classes = wrapper.find("div").classes();
    expect(classes).toContain("p-6");
    expect(classes).toContain("transition-all");
    expect(classes).toContain("border-accent-100");
  });
});

describe("FeedbackAlert", () => {
  it("success usa role status y aria-live polite", async () => {
    const wrapper = await mountSuspended(FeedbackAlert, {
      props: { type: "success", message: "Guardado" },
    });
    expect(wrapper.attributes("role")).toBe("status");
    expect(wrapper.attributes("aria-live")).toBe("polite");
    expect(wrapper.attributes("aria-atomic")).toBe("true");
    expect(wrapper.classes()).toContain("bg-success-bg");
  });

  it("error usa role alert y lista las recetas bloqueantes", async () => {
    const wrapper = await mountSuspended(FeedbackAlert, {
      props: {
        type: "error",
        message: "No se puede eliminar",
        recipes: ["Brownie", "Flan"],
      },
    });
    expect(wrapper.attributes("role")).toBe("alert");
    expect(wrapper.attributes("aria-live")).toBe("assertive");
    expect(wrapper.text()).toContain("Brownie, Flan");
  });

  it("omite la lista cuando no hay recetas", async () => {
    const wrapper = await mountSuspended(FeedbackAlert, {
      props: { type: "error", message: "Error" },
    });
    expect(wrapper.text()).not.toContain("Recetas que lo usan");
  });
});

describe("EmptyState", () => {
  it("renderiza título y descripción", async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: {
        icon: "lucide:book-plus",
        title: "No hay recetas",
        description: "Crea la primera.",
      },
    });
    expect(wrapper.find("h3").text()).toBe("No hay recetas");
    expect(wrapper.text()).toContain("Crea la primera.");
    expect(wrapper.find("svg").exists()).toBe(true);
  });

  it("con actionHref renderiza un enlace", async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: {
        icon: "lucide:plus",
        title: "Vacío",
        description: "Sin datos",
        actionLabel: "Crear",
        actionHref: "/recipes/new",
      },
    });
    expect(wrapper.find("a").attributes("href")).toBe("/recipes/new");
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("sin actionHref renderiza un botón que emite action", async () => {
    const onAction = vi.fn();
    const wrapper = await mountSuspended(EmptyState, {
      props: {
        icon: "lucide:plus",
        title: "Vacío",
        description: "Sin datos",
        actionLabel: "Crear",
      },
      attrs: { onAction },
    });
    const button = wrapper.find("button");
    expect(button.text()).toContain("Crear");
    expect(button.classes()).toContain("lg:hidden");
    await button.trigger("click");
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("el slot action reemplaza el CTA por defecto", async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: {
        icon: "lucide:plus",
        title: "Vacío",
        description: "Sin datos",
        actionLabel: "Crear",
      },
      slots: { action: '<span data-qa="cta">Personalizado</span>' },
    });
    expect(wrapper.find("[data-qa='cta']").exists()).toBe(true);
    expect(wrapper.find("button").exists()).toBe(false);
  });
});

describe("PasswordInput", () => {
  it("renderiza el label asociado y el input en modo password", async () => {
    const wrapper = await mountSuspended(PasswordInput, {
      props: { id: "pw", label: "Contraseña", required: true },
    });
    expect(wrapper.find("label").attributes("for")).toBe("pw");
    expect(wrapper.find("label").text()).toContain("*");
    expect(wrapper.find("input").attributes("type")).toBe("password");
  });

  it("showRequired=false oculta el asterisco", async () => {
    const wrapper = await mountSuspended(PasswordInput, {
      props: {
        id: "pw",
        label: "Contraseña",
        required: true,
        showRequired: false,
      },
    });
    expect(wrapper.find("label").text()).not.toContain("*");
  });

  it("el toggle local alterna el tipo y el aria-label", async () => {
    const wrapper = await mountSuspended(PasswordInput, {
      props: { id: "pw", label: "Contraseña" },
    });
    const toggle = wrapper.find("button");
    expect(toggle.attributes("aria-label")).toBe("Mostrar contraseña");

    await toggle.trigger("click");
    expect(wrapper.find("input").attributes("type")).toBe("text");
    expect(wrapper.find("button").attributes("aria-label")).toBe(
      "Ocultar contraseña",
    );

    await wrapper.find("button").trigger("click");
    expect(wrapper.find("input").attributes("type")).toBe("password");
  });

  it("propaga disabled al input y al toggle", async () => {
    const wrapper = await mountSuspended(PasswordInput, {
      props: { id: "pw", label: "Contraseña", disabled: true },
    });
    expect(wrapper.find("input").attributes("disabled")).toBeDefined();
    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
  });
});

describe("UpgradePrompt", () => {
  it("etiqueta y precio para el plan pro", async () => {
    const wrapper = await mountSuspended(UpgradePrompt, {
      props: { feature: "Producción", tier: "pro" },
    });
    expect(wrapper.text()).toContain("Pro");
    expect(wrapper.text()).toContain("$10/mes");
    expect(wrapper.find("a").attributes("href")).toBe("/pricing?plan=pro");
  });

  it("etiqueta y precio para el plan basic", async () => {
    const wrapper = await mountSuspended(UpgradePrompt, {
      props: { feature: "Producción", tier: "basic" },
    });
    expect(wrapper.text()).toContain("Basic");
    expect(wrapper.text()).toContain("$5/mes");
    expect(wrapper.find("a").attributes("href")).toBe("/pricing?plan=basic");
  });

  it("usa la descripción recibida sobre el mensaje por defecto", async () => {
    const wrapper = await mountSuspended(UpgradePrompt, {
      props: {
        feature: "Producción",
        tier: "pro",
        description: "Texto propio",
      },
    });
    expect(wrapper.text()).toContain("Texto propio");
    expect(wrapper.text()).not.toContain("requiere el plan");
  });

  it("el botón No gracias emite cancel", async () => {
    const onCancel = vi.fn();
    const wrapper = await mountSuspended(UpgradePrompt, {
      props: { feature: "Producción", tier: "pro" },
      attrs: { onCancel },
    });
    await wrapper.find("button").trigger("click");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("Dialog", () => {
  it("renderiza título, descripción, slot y marca data-animated", async () => {
    const wrapper = await mountSuspended(Dialog, {
      props: { id: "d1", title: "Confirmar", description: "¿Seguro?" },
      slots: { default: '<p data-qa="body">Contenido</p>' },
    });
    const dialog = wrapper.find("dialog");
    expect(dialog.attributes("id")).toBe("d1");
    expect(dialog.attributes("data-animated")).toBeDefined();
    expect(dialog.text()).toContain("Confirmar");
    expect(dialog.text()).toContain("¿Seguro?");
    expect(dialog.find("[data-qa='body']").exists()).toBe(true);
  });

  it("submitting expone aria-busy y data-submitting", async () => {
    const wrapper = await mountSuspended(Dialog, {
      props: { id: "d2", submitting: true },
    });
    const dialog = wrapper.find("dialog");
    expect(dialog.attributes("aria-busy")).toBe("true");
    expect(dialog.attributes("data-submitting")).toBe("1");
  });

  it("el backdrop no cierra mientras está ocupado", async () => {
    const wrapper = await mountSuspended(Dialog, {
      props: { id: "d3", submitting: true },
    });
    const dialog = wrapper.find("dialog").element as HTMLDialogElement;
    const close = vi.fn();
    dialog.close = close;

    dialog.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(close).not.toHaveBeenCalled();
  });

  it("el backdrop cierra cuando no está ocupado", async () => {
    const wrapper = await mountSuspended(Dialog, { props: { id: "d4" } });
    const dialog = wrapper.find("dialog").element as HTMLDialogElement;
    const close = vi.fn();
    dialog.close = close;

    dialog.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("bloquea Escape sólo mientras está ocupado", async () => {
    const busy = await mountSuspended(Dialog, {
      props: { id: "d5", submitting: true },
    });
    const busyEvent = new Event("cancel", { cancelable: true });
    busy.find("dialog").element.dispatchEvent(busyEvent);
    expect(busyEvent.defaultPrevented).toBe(true);

    const idle = await mountSuspended(Dialog, { props: { id: "d6" } });
    const idleEvent = new Event("cancel", { cancelable: true });
    idle.find("dialog").element.dispatchEvent(idleEvent);
    expect(idleEvent.defaultPrevented).toBe(false);
  });

  it("expone open y close", async () => {
    const wrapper = await mountSuspended(Dialog, { props: { id: "d7" } });
    const dialog = wrapper.find("dialog").element as HTMLDialogElement;
    const showModal = vi.fn();
    const close = vi.fn();
    dialog.showModal = showModal;
    dialog.close = close;

    const exposed = wrapper.vm as unknown as {
      open: () => void;
      close: () => void;
    };
    exposed.open();
    exposed.close();

    expect(showModal).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
