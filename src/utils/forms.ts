/**
 * Value to send for an optional text field.
 *
 * The backend's PATCH handlers ignore omitted fields (they only apply values that
 * are present), so clearing a field while EDITING must send an empty string - sending
 * `undefined` (the usual `value || undefined`) means "leave unchanged" and the old
 * text silently comes back. On CREATE an empty field is simply left out.
 */
export const optionalText = (value: string, editing: boolean): string | undefined => {
  const trimmed = value.trim();
  if (editing) return trimmed;
  return trimmed || undefined;
};
