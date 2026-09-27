import { getServerCapabilities } from "@/lib/env/server";
import { appError, isAppError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";

import { calculateCustomerPreviewSnapshot, customerPreviewRequestSchema, isCustomerPreviewMesh } from "./customer-preview";
import { CustomPrintRequestRepository } from "./repository";

type PreviewRepository = Pick<CustomPrintRequestRepository,
  "findCustomerPreviewFile" | "findActiveCustomerPreviewRules">;

export class CustomerPreviewService {
  constructor(
    private readonly repository: PreviewRepository = new CustomPrintRequestRepository(),
    private readonly uploadsEnabled: () => boolean = () => getServerCapabilities().customUploads,
  ) {}

  async preview(input: unknown, customerId: string) {
    const parsed = parseWithValidation(customerPreviewRequestSchema, input);
    let enabled = false;
    try { enabled = this.uploadsEnabled(); } catch { /* invalid provider configuration fails closed */ }
    if (!enabled) return { status: "REVIEW_REQUIRED" as const };

    const file = await this.repository.findCustomerPreviewFile(parsed.fileId, customerId);
    if (file === null) throw appError("NOT_FOUND");
    if (file.deletedAt !== null || file.uploadStatus !== "UPLOADED" ||
      file.customPrintRequestLinks.length > 0 || file.b2bInquiryLinks.length > 0) {
      throw appError("CONFLICT", { message: "File belum siap untuk simulasi pada request baru." });
    }
    if (!isCustomerPreviewMesh(file.extension) ||
      (parsed.materialRequested !== "PLA" && parsed.materialRequested !== "ABS")) {
      return { status: "REVIEW_REQUIRED" as const };
    }

    const rules = await this.repository.findActiveCustomerPreviewRules();
    if (rules.length !== 1) return { status: "REVIEW_REQUIRED" as const };
    try {
      const snapshot = calculateCustomerPreviewSnapshot({
        ...parsed,
        fileExtension: file.extension,
        rule: rules[0],
      });
      return snapshot === null ? { status: "REVIEW_REQUIRED" as const } : {
        status: "READY" as const,
        materialSubtotalRp: snapshot.result.materialSubtotalRp,
        machineSubtotalRp: snapshot.result.machineSubtotalRp,
        finalTotalRp: snapshot.result.finalTotalRp,
        ruleVersion: snapshot.pricingRule.version,
      };
    } catch (error) {
      if (isAppError(error) && error.code === "PRICING_RULE_NOT_APPROVED") {
        return { status: "REVIEW_REQUIRED" as const };
      }
      throw error;
    }
  }
}
