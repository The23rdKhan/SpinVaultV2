/**
 * Standard Server Action / mutation response contract ([§N.2](docs/admin-content-dashboard-sprint-plan.md)).
 */
export type FieldErrors = Record<string, string[] | undefined>;

export type ActionError = {
  code: string;
  message: string;
  fieldErrors?: FieldErrors;
};

export type ActionSuccess<T> = { ok: true; data: T };

export type ActionFailure = { ok: false; error: ActionError };

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export function success<T>(data: T): ActionSuccess<T> {
  return { ok: true, data };
}

export function failure(
  code: string,
  message: string,
  fieldErrors?: FieldErrors,
): ActionFailure {
  return { ok: false, error: { code, message, fieldErrors } };
}

/** Map Zod v4 flatten() shape into ActionFailure.fieldErrors */
export function zodFieldErrors(flat: {
  fieldErrors?: Record<string, string[] | undefined>;
  formErrors?: string[];
}): FieldErrors | undefined {
  const merged = { ...flat.fieldErrors };
  if (flat.formErrors?.length) {
    merged._form = flat.formErrors;
  }
  return Object.keys(merged).length ? merged : undefined;
}
