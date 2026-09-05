import { createHash } from "node:crypto";

type JsonPrimitive = boolean | null | number | string;
type CanonicalJson = JsonPrimitive | readonly CanonicalJson[] | { readonly [key: string]: CanonicalJson };

function canonicalize(value: unknown): CanonicalJson {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }

  throw new TypeError("Nilai request tidak dapat dinormalisasi.");
}

export function hashRequest(value: unknown): string {
  const canonical = JSON.stringify(canonicalize(value));

  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

