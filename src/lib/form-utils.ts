export const parseNumberInput = (value: FormDataEntryValue | null): number => {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!normalized) return Number.NaN;
  return Number(normalized);
};
