import type { presentationSchema } from "@recetario/types";
import type { z } from "zod";
import { parseDecimal } from "./recipe-detail-form";
import type { RecipeFormValidation } from "./recipe-detail-form";

/**
 * Presentaciones de venta: modelo del formulario, validación, payloads,
 * reducers y los importes derivados por pieza.
 *
 * Módulo puro sin aliases: cubierto en `test/unit`. Sustituye al custom element
 * `presentation-card` del baseline, que recalculaba todo escribiendo
 * `textContent` y `className`.
 *
 * Los costos fijos por presentación siguen sin UI (paridad con el baseline, que no
 * monta `PresentationFixedCosts`), pero el cálculo los soporta porque el
 * detalle del API ya los devuelve.
 */
export type PresentationRecord = z.infer<typeof presentationSchema>;
export type PresentationFixedCost = NonNullable<
  PresentationRecord["fixedCosts"]
>[number];

export type PresentationDraft = {
  name: string;
  /** Piezas por mezcla, como texto (lo que el usuario escribe). */
  unitsPerBatch: string;
  /** Precio de venta por pieza, como texto. Vacío = sugerido (no persistido). */
  salePrice: string;
  /** El usuario tocó el precio: sin esto el `PATCH` omite `salePrice`. */
  priceDirty: boolean;
};

export const PRESENTATION_NAME_ERROR =
  "El nombre de la presentación es obligatorio.";
export const PRESENTATION_UNITS_ERROR =
  "Las piezas por mezcla deben ser mayores a 0.";
export const PRESENTATION_PRICE_ERROR =
  "El precio de venta debe ser 0 o mayor.";

export type MarginTone = "success" | "warning" | "danger";

export function formatPrice(value: number): string {
  return value.toFixed(2);
}

/** Piezas totales con dos decimales, en el formato que mostraba el baseline. */
export function formatUnits(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export type PresentationMetricsInput = {
  unitsPerBatch: number;
  multiplier: number;
  /** Costo de la mezcla (insumos + costos fijos de receta u operativos). */
  recipeBatchCost: number;
  /** Precio sugerido de la mezcla completa (`costo / (1 - margen)`). */
  suggestedBatchPrice: number;
  /** Texto del input de precio; vacío cae al precio sugerido por pieza. */
  salePrice: string;
  presentationFixedCosts?: ReadonlyArray<{
    type: string;
    base: string;
    value: number;
  }>;
};

export type PresentationMetrics = {
  totalUnits: number;
  unitCost: number;
  unitPriceRecommended: number;
  effectiveSalePrice: number;
  unitProfit: number;
  marginPercent: number;
  marginLabel: string;
  marginTone: MarginTone;
  barWidth: number;
};

/**
 * Costos fijos de la presentación. `PER_UNIT` multiplica por el rendimiento y
 * por el multiplicador; el resto de montos sólo por el multiplicador, y los
 * porcentajes se calculan sobre el costo de la mezcla (paridad con el baseline).
 */
export function computePresentationFixedCostsTotal(
  fixedCosts: ReadonlyArray<{ type: string; base: string; value: number }>,
  unitsPerBatch: number,
  multiplier: number,
  recipeBatchCost: number,
): number {
  return fixedCosts.reduce((sum, fc) => {
    if (fc.type === "AMOUNT") {
      if (fc.base === "PER_UNIT") {
        return sum + fc.value * unitsPerBatch * multiplier;
      }
      return sum + fc.value * multiplier;
    }
    return sum + recipeBatchCost * (fc.value / 100);
  }, 0);
}

/**
 * Importes por pieza de una presentación. Los umbrales de la etiqueta de margen
 * son los del baseline: `>= 35` saludable, `>= 20` medio, si no bajo.
 */
export function computePresentationMetrics(
  input: PresentationMetricsInput,
): PresentationMetrics {
  const recipeBatchCost = Number.isFinite(input.recipeBatchCost)
    ? input.recipeBatchCost
    : 0;
  const suggestedBatchPrice = Number.isFinite(input.suggestedBatchPrice)
    ? input.suggestedBatchPrice
    : 0;
  const unitsPerBatch = Number.isFinite(input.unitsPerBatch)
    ? input.unitsPerBatch
    : 0;
  const multiplier = Number.isFinite(input.multiplier) ? input.multiplier : 0;

  const totalUnits = unitsPerBatch * multiplier;
  const hasUnits = totalUnits > 0;

  const fixedCostsTotal = computePresentationFixedCostsTotal(
    input.presentationFixedCosts ?? [],
    unitsPerBatch,
    multiplier,
    recipeBatchCost,
  );
  const effectiveBatchCost = recipeBatchCost + fixedCostsTotal;
  const effectiveRecommendedBatch = suggestedBatchPrice + fixedCostsTotal;

  const unitCost = hasUnits ? effectiveBatchCost / totalUnits : 0;
  const unitPriceRecommended = hasUnits
    ? effectiveRecommendedBatch / totalUnits
    : 0;

  const rawSalePrice = input.salePrice.trim();
  const parsedSalePrice = parseDecimal(rawSalePrice);
  const effectiveSalePrice =
    rawSalePrice === ""
      ? unitPriceRecommended
      : Number.isFinite(parsedSalePrice)
        ? parsedSalePrice
        : 0;

  const unitProfit = effectiveSalePrice - unitCost;
  const marginPercent =
    effectiveSalePrice > 0 ? (unitProfit / effectiveSalePrice) * 100 : 0;

  let marginLabel = "Bajo";
  let marginTone: MarginTone = "danger";
  if (marginPercent >= 35) {
    marginLabel = "Saludable";
    marginTone = "success";
  } else if (marginPercent >= 20) {
    marginLabel = "Medio";
    marginTone = "warning";
  }

  return {
    totalUnits,
    unitCost,
    unitPriceRecommended,
    effectiveSalePrice,
    unitProfit,
    marginPercent,
    marginLabel,
    marginTone,
    barWidth: Math.min(Math.max(marginPercent, 0), 100),
  };
}

/**
 * Siembra del formulario. Sin precio guardado el input muestra el sugerido (lo
 * hacía el baseline) pero queda limpio de "suciedad": guardar sin tocarlo no persiste
 * un importe calculado.
 */
export function presentationDraftFromRecord(
  record: Pick<PresentationRecord, "name" | "unitsPerBatch" | "salePrice">,
  suggestedUnitPrice: number,
): PresentationDraft {
  return {
    name: record.name,
    unitsPerBatch: String(record.unitsPerBatch),
    salePrice: formatPrice(
      record.salePrice != null ? record.salePrice : suggestedUnitPrice,
    ),
    priceDirty: false,
  };
}

export function validatePresentationDraft(
  draft: PresentationDraft,
): RecipeFormValidation {
  const name = draft.name.trim();
  if (name.length === 0 || name.length > 120) {
    return { valid: false, message: PRESENTATION_NAME_ERROR };
  }

  const units = parseDecimal(draft.unitsPerBatch);
  if (!(units > 0)) {
    return { valid: false, message: PRESENTATION_UNITS_ERROR };
  }

  const rawSalePrice = draft.salePrice.trim();
  if (rawSalePrice !== "") {
    const salePrice = parseDecimal(rawSalePrice);
    if (!Number.isFinite(salePrice) || salePrice < 0) {
      return { valid: false, message: PRESENTATION_PRICE_ERROR };
    }
  }

  return { valid: true };
}

export type PresentationCreatePayload = {
  name: string;
  unitsPerBatch: number;
  salePrice?: number;
};

export type PresentationUpdatePayload = {
  name: string;
  unitsPerBatch: number;
  /** `null` limpia el precio guardado; ausente lo deja como estaba. */
  salePrice?: number | null;
};

/** Precio vacío en el alta = sin precio declarado (el API guarda `null`). */
export function toPresentationCreatePayload(
  draft: PresentationDraft,
): PresentationCreatePayload {
  const rawSalePrice = draft.salePrice.trim();

  return {
    name: draft.name.trim(),
    unitsPerBatch: parseDecimal(draft.unitsPerBatch),
    ...(rawSalePrice === "" ? {} : { salePrice: parseDecimal(rawSalePrice) }),
  };
}

/**
 * El `PATCH` sólo manda `salePrice` si el usuario tocó el campo: así el precio
 * sugerido que se muestra de arranque no se persiste por accidente.
 */
export function toPresentationUpdatePayload(
  draft: PresentationDraft,
): PresentationUpdatePayload {
  const rawSalePrice = draft.salePrice.trim();

  return {
    name: draft.name.trim(),
    unitsPerBatch: parseDecimal(draft.unitsPerBatch),
    ...(draft.priceDirty
      ? { salePrice: rawSalePrice === "" ? null : parseDecimal(rawSalePrice) }
      : {}),
  };
}

/**
 * El `PATCH` de presentación responde sin `fixedCosts` (sólo el detalle de la
 * receta los trae), así que se conservan los que ya tenía la lista.
 */
export function mergePresentationResponse(
  previous: PresentationRecord | undefined,
  response: PresentationRecord,
): PresentationRecord {
  const fixedCosts = response.fixedCosts ?? previous?.fixedCosts;

  return {
    ...response,
    ...(fixedCosts ? { fixedCosts } : {}),
  };
}

export function withPresentationCreated(
  presentations: ReadonlyArray<PresentationRecord>,
  created: PresentationRecord,
): PresentationRecord[] {
  return [...presentations, mergePresentationResponse(undefined, created)];
}

export function withPresentationUpdated(
  presentations: ReadonlyArray<PresentationRecord>,
  updated: PresentationRecord,
): PresentationRecord[] {
  return presentations.map((presentation) =>
    presentation.id === updated.id
      ? mergePresentationResponse(presentation, updated)
      : presentation,
  );
}

export function withPresentationRemoved(
  presentations: ReadonlyArray<PresentationRecord>,
  presentationId: number,
): PresentationRecord[] {
  return presentations.filter(
    (presentation) => presentation.id !== presentationId,
  );
}
