import type { FormField, FormFieldType } from "@/lib/types";

const FIELD_TYPES = new Set<FormFieldType>(["text", "email", "phone", "textarea", "select"]);

export function validateDateOnly(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
    ? value
    : undefined;
}

export function validateFormFields(value: unknown): FormField[] | null {
  if (!Array.isArray(value) || value.length > 20) return null;
  const ids = new Set<string>();
  const fields: FormField[] = [];

  for (const item of value) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return null;
    const candidate = item as Record<string, unknown>;
    if (
      typeof candidate.id !== "string" ||
      !/^[a-z][a-z0-9_]{1,39}$/.test(candidate.id) ||
      ids.has(candidate.id) ||
      typeof candidate.label !== "string" ||
      !candidate.label.trim() ||
      candidate.label.trim().length > 100 ||
      typeof candidate.type !== "string" ||
      !FIELD_TYPES.has(candidate.type as FormFieldType) ||
      typeof candidate.required !== "boolean"
    ) {
      return null;
    }

    ids.add(candidate.id);
    const field: FormField = {
      id: candidate.id,
      label: candidate.label.trim(),
      type: candidate.type as FormFieldType,
      required: candidate.required,
    };
    if (field.type === "select") {
      if (
        !Array.isArray(candidate.options) ||
        candidate.options.length < 2 ||
        candidate.options.length > 20 ||
        candidate.options.some(
          (option) => typeof option !== "string" || !option.trim() || option.length > 100,
        )
      ) {
        return null;
      }
      field.options = candidate.options.map((option) => (option as string).trim());
    }
    fields.push(field);
  }

  const requiredFields: Record<string, FormFieldType> = {
    full_name: "text",
    email: "email",
    phone: "phone",
  };
  if (
    Object.entries(requiredFields).some(([id, type]) => {
      const field = fields.find((item) => item.id === id);
      return !field || field.type !== type || !field.required;
    })
  ) {
    return null;
  }

  return fields;
}

export function validateApplicationAnswers(
  fields: FormField[],
  answers: unknown,
): Record<string, string> | null {
  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) return null;
  const submitted = answers as Record<string, unknown>;
  const normalized: Record<string, string> = {};

  for (const field of fields) {
    const value = submitted[field.id];
    if (value === undefined || value === null || value === "") {
      if (field.required) return null;
      continue;
    }
    if (typeof value !== "string" || value.length > 4_000) return null;
    const trimmed = value.trim();
    if (field.required && !trimmed) return null;
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
    if (field.type === "select" && !field.options?.includes(trimmed)) return null;
    normalized[field.id] = trimmed;
  }
  return normalized;
}
