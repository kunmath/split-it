type ClerkApiErrorItem = {
  longMessage?: string;
  message?: string;
  meta?: {
    paramName?: string;
  };
};

type ClerkApiErrorLike = {
  errors?: ClerkApiErrorItem[];
};

export type ParsedClerkError = {
  formError: string | null;
  fieldErrors: Record<string, string>;
};

const FIELD_ALIASES: Record<string, string> = {
  code: "code",
  emailAddress: "email",
  firstName: "firstName",
  identifier: "email",
  lastName: "lastName",
  password: "password",
};

function getErrorMessage(error: ClerkApiErrorItem) {
  return error.longMessage?.trim() || error.message?.trim() || "Something went wrong. Please try again.";
}

export function parseClerkError(error: unknown): ParsedClerkError {
  const payload = error as ClerkApiErrorLike | null;

  if (!payload?.errors?.length) {
    return {
      formError: "Something went wrong. Please try again.",
      fieldErrors: {},
    };
  }

  const fieldErrors: Record<string, string> = {};
  const formErrors: string[] = [];

  for (const issue of payload.errors) {
    const message = getErrorMessage(issue);
    const fieldName = issue.meta?.paramName ? FIELD_ALIASES[issue.meta.paramName] ?? issue.meta.paramName : undefined;

    if (fieldName) {
      fieldErrors[fieldName] ??= message;
      continue;
    }

    formErrors.push(message);
  }

  return {
    formError: formErrors[0] ?? null,
    fieldErrors,
  };
}
