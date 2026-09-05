import { z } from "zod";

import { appError } from "./errors";

export function parseWithValidation<T>(
  schema: z.ZodType<T>,
  input: unknown,
): T {
  const parsed = schema.safeParse(input);

  if (parsed.success) {
    return parsed.data;
  }

  const details: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path.length > 0 ? issue.path.join(".") : "request";
    if (details[field] === undefined) {
      details[field] = issue.message;
    }
  }

  throw appError("VALIDATION_ERROR", { details });
}
