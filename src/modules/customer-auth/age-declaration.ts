import { z } from "zod";
import { appError } from "../shared/errors";

export const AGE_DECLARATION_VERSION = "AGE-18-SELF-DECLARATION-2026-10-05-v1";
export const AGE_DECLARATION_LABEL = "Saya menyatakan bahwa saya berusia 18 tahun atau lebih.";
export const ageDeclarationSchema = z.literal("on", {
  error: "Pernyataan usia 18 tahun atau lebih wajib disetujui.",
});

export type RecordedAgeDeclaration = {
  ageDeclarationVersion: string | null;
  ageDeclaredAt: Date | null;
};

export function assertRecordedAgeDeclaration(record: RecordedAgeDeclaration, now: Date): void {
  const declaredAt = record.ageDeclaredAt?.getTime();
  if (record.ageDeclarationVersion !== AGE_DECLARATION_VERSION
    || declaredAt === undefined || !Number.isFinite(declaredAt) || declaredAt > now.getTime()) {
    throw appError("CUSTOMER_AUTH_UNAVAILABLE");
  }
}

export function getAgeGateStatus() {
  return { closed: true, minimumAge: 18, method: "SELF_DECLARATION", version: AGE_DECLARATION_VERSION } as const;
}
