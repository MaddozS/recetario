/**
 * Parsea un valor de formulario a número.
 *
 * Normaliza el input reemplazando coma (,) por punto (.) para
 * aceptar formatos decimales en español. Retorna `NaN` si el
 * valor está vacío o no es convertible.
 *
 * @example
 * parseNumberInput("12,50")   // → 12.5
 * parseNumberInput("")        // → NaN
 * parseNumberInput(null)      // → NaN
 */
export const parseNumberInput = (value: FormDataEntryValue | null): number => {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!normalized) return Number.NaN;
  return Number(normalized);
};
