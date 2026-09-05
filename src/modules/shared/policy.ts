import { appError } from "./errors";

export function requireApprovedDecision(
  approved: boolean | undefined,
  decision: string,
): void {
  if (approved === true) {
    return;
  }

  throw appError("CONFLICT", {
    details: { decision: "OPEN", policy: decision },
    message: `Kebijakan ${decision} belum disetujui.`,
  });
}

