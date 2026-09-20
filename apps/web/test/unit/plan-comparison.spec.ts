import { describe, expect, it } from "vitest";
import { comparePlans } from "../../app/features/billing/plan-comparison";
import { planFixture } from "./support/plan-fixture";

/** Tres slots: cantidades (texto distinto), booleano (mismo texto) e idéntico. */
const CATALOG = [
  planFixture("free", [
    { text: "Hasta 10 recetas", included: true },
    { text: "Duplicar recetas", included: false },
    { text: "Costeo básico con márgenes", included: true },
  ]),
  planFixture("basic", [
    { text: "Hasta 75 recetas", included: true },
    { text: "Duplicar recetas", included: true },
    { text: "Costeo básico con márgenes", included: true },
  ]),
  planFixture("pro", [
    { text: "Recetas ilimitadas", included: true },
    { text: "Duplicar recetas", included: true },
    { text: "Costeo básico con márgenes", included: true },
  ]),
];

describe("comparePlans", () => {
  it("separa lo que cambia de lo que comparten los tres planes", () => {
    const { changing, shared } = comparePlans(CATALOG);

    expect(shared.map(({ text }) => text)).toEqual([
      "Costeo básico con márgenes",
    ]);
    expect(changing).toHaveLength(2);
  });

  it("cada celda lleva el texto y el estado de su propio plan", () => {
    const { changing } = comparePlans(CATALOG);

    expect(changing[0]).toEqual([
      { text: "Hasta 10 recetas", state: "included" },
      { text: "Hasta 75 recetas", state: "included" },
      { text: "Recetas ilimitadas", state: "included" },
    ]);
    expect(changing[1]).toEqual([
      { text: "Duplicar recetas", state: "excluded" },
      { text: "Duplicar recetas", state: "included" },
      { text: "Duplicar recetas", state: "included" },
    ]);
  });

  it("el mismo texto con estados distintos sigue siendo una diferencia", () => {
    const { changing, shared } = comparePlans([
      planFixture("free", [{ text: "Duplicar recetas", included: false }]),
      planFixture("pro", [{ text: "Duplicar recetas", included: true }]),
    ]);

    expect(shared).toEqual([]);
    expect(changing[0]?.[0]?.state).toBe("excluded");
    expect(changing[0]?.[1]?.state).toBe("included");
  });

  it("lo próximamente cuenta como estado propio de cada plan", () => {
    const { changing } = comparePlans([
      planFixture("free", [
        { text: "Exportar a PDF", included: false, status: "coming_soon" },
      ]),
      planFixture("pro", [
        { text: "Exportar a PDF", included: true, status: "coming_soon" },
      ]),
    ]);

    expect(changing).toEqual([]);
  });

  it("un plan más corto deja celdas vacías en vez de desplazar la tabla", () => {
    const { changing } = comparePlans([
      planFixture("free", [
        { text: "Hasta 10 recetas", included: true },
        { text: "Duplicar recetas", included: false },
      ]),
      planFixture("pro", [{ text: "Recetas ilimitadas", included: true }]),
    ]);

    expect(changing[1]?.[0]?.text).toBe("Duplicar recetas");
    expect(changing[1]?.[1]).toEqual({ text: null, state: null });
  });

  it("sin planes no hay comparación", () => {
    expect(comparePlans([])).toEqual({ changing: [], shared: [] });
  });
});
