// Return shape for server actions used with useActionState.
export type FormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  // Submitted values, echoed back on failure: React 19 resets uncontrolled
  // fields after a form action, so the form re-seeds its defaults from these.
  values?: Record<string, string>;
};

export function formValues(formData: FormData, keys: readonly string[]) {
  return Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));
}

export const initialFormState: FormState = {};

// Empty form inputs arrive as "" — normalise to null for nullable columns.
export function emptyToNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}
