import { z } from "zod";

import { DEPLOYMENT_TIERS, type DeploymentTier } from "../../lib/env/deployment";

export type DatabaseBindingExpectation = Readonly<{ tier: DeploymentTier; bindingId: string }>;

export type DatabaseBindingFailure = "CONFIG_INVALID" | "MARKER_MISSING" | "MARKER_INVALID" | "MARKER_MISMATCH";

export class DatabaseBindingError extends Error {
  constructor(readonly reason: DatabaseBindingFailure) {
    super(`Database binding unavailable (${reason}).`);
    this.name = "DatabaseBindingError";
  }
}

const expectationSchema = z.object({
  bindingId: z.string().trim().toLowerCase().uuid(),
  tier: z.enum(DEPLOYMENT_TIERS),
});

const markerSchema = expectationSchema.extend({ id: z.literal(1) });

export function readDatabaseBindingExpectation(
  source: Readonly<Record<string, string | undefined>>,
  tier: DeploymentTier,
): DatabaseBindingExpectation {
  const parsed = expectationSchema.safeParse({ bindingId: source.NIUVA_DATABASE_BINDING_ID, tier });
  if (!parsed.success) throw new DatabaseBindingError("CONFIG_INVALID");
  return Object.freeze(parsed.data);
}

export function assertDatabaseBinding(expected: DatabaseBindingExpectation, row: unknown): void {
  const expectation = expectationSchema.safeParse(expected);
  if (!expectation.success) throw new DatabaseBindingError("CONFIG_INVALID");
  if (row === undefined || row === null) throw new DatabaseBindingError("MARKER_MISSING");
  const marker = markerSchema.safeParse(row);
  if (!marker.success) throw new DatabaseBindingError("MARKER_INVALID");
  if (marker.data.bindingId !== expectation.data.bindingId || marker.data.tier !== expectation.data.tier) {
    throw new DatabaseBindingError("MARKER_MISMATCH");
  }
}
