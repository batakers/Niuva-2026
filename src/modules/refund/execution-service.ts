import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdmin, type AdminAccess } from "@/lib/auth/admin";
import { requireAdminPermission } from "../admin/permissions";
import { parseWithValidation } from "../shared/validation";
import { RefundExecutionRepository } from "./execution-repository";
import { refundManualAuthorizeSchema, refundManualConfirmSchema, refundManualRevokeSchema, refundSubmitSchema } from "./execution-schema";
import { createMidtransRefundGateway, type RefundGateway, type RefundQueryResult, type RefundSubmissionResult } from "./gateway";

export class RefundExecutionService {
  constructor(private readonly options: { repository?: RefundExecutionRepository; authorizeAdmin?: () => Promise<AdminAccess>; gatewayFactory?: () => RefundGateway; source?: Readonly<Record<string, string | undefined>> } = {}) {}
  private repository() { return this.options.repository ?? new RefundExecutionRepository(); }
  private async owner() {
    const access = await (this.options.authorizeAdmin ?? requireAdmin)();
    requireAdminPermission(access, "PAYMENT_REFUND_FULL");
    return access;
  }
  private gateway() { return (this.options.gatewayFactory ?? (() => createMidtransRefundGateway(this.options.source ?? process.env)))(); }
  async submit(raw: unknown) {
    const access = await this.owner(), input = parseWithValidation(refundSubmitSchema, raw), repository = this.repository();
    const intent = await repository.beginSubmission(access, input);
    if (!intent) return;
    let status: RefundQueryResult;
    try { status = await this.gateway().getStatus(intent.target, AbortSignal.timeout(8000)); }
    catch { status = { kind: "unavailable", reason: "PROVIDER_ERROR" }; }
    const command = await repository.reserveSubmission(access, intent, status, (this.options.source ?? process.env).NIUVA_REFUND_MERCHANT_BINDING);
    if (!command) return;
    let result: RefundSubmissionResult;
    try { result = await this.gateway().submit(command, AbortSignal.timeout(8000)); }
    catch { result = { kind: "unknown", reason: "PROVIDER_ERROR" }; }
    await repository.finishSubmission(intent, result);
  }
  async reconcile(orderId: string) {
    const access = await this.owner(), repository = this.repository(), targets = await repository.targetsForOwner(access, parseWithValidation(z.uuid(), orderId));
    const gateway = targets.length ? this.gateway() : null, runId = randomUUID();
    for (const target of targets) {
      let result: RefundQueryResult;
      try { result = await gateway!.getStatus(target.target, AbortSignal.timeout(8000)); }
      catch { result = { kind: "unavailable", reason: "PROVIDER_ERROR" }; }
      await repository.observe(target, runId, result);
      if (result.kind === "unavailable") break;
    }
  }
  async authorizeManual(raw: unknown) { return this.repository().authorizeManual(await this.owner(), parseWithValidation(refundManualAuthorizeSchema, raw)); }
  async confirmManual(raw: unknown) { return this.repository().confirmManual(await this.owner(), parseWithValidation(refundManualConfirmSchema, raw)); }
  async revokeManual(raw: unknown) { return this.repository().revokeManual(await this.owner(), parseWithValidation(refundManualRevokeSchema, raw)); }
}
