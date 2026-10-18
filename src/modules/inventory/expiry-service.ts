import type { Prisma } from "../../generated/prisma/client";
import { createPrismaAuditRecorder, createTransitionAuditRecorder } from "../shared/audit";
import { appError } from "../shared/errors";
import { releaseExpiredWithinTransaction } from "./repository";
import { transitionReservation } from "./transitions";

export async function expireRetailReservationsIn(tx: Prisma.TransactionClient, now: Date, limit: number): Promise<number> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw appError("VALIDATION_ERROR");
  const released = await releaseExpiredWithinTransaction(tx, undefined, now, limit);
  const audit = createTransitionAuditRecorder(createPrismaAuditRecorder(tx), { actorType: "SYSTEM" });
  for (const result of released) {
    await transitionReservation({ audit, current: result.previousStatus, next: "RELEASED", entityId: result.id });
  }
  return released.length;
}
