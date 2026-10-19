import "server-only";
import { z } from "zod";
import { requireAdmin, type AdminAccess } from "@/lib/auth/admin";
import { parseWithValidation } from "../shared/validation";
import { RefundRepository } from "./repository";
import { refundAdminIntakeSchema, refundRefreshSchema, refundRequestSchema, refundReturnSchema, refundReviewSchema } from "./schema";

export class RefundService {
  constructor(private readonly options: { repository?: RefundRepository; authorizeAdmin?: () => Promise<AdminAccess> } = {}) {}
  private repository() { return this.options.repository ?? new RefundRepository(); }
  async customerOrder(customerId: string, orderId: string) {
    return this.repository().readCustomer(parseWithValidation(z.uuid(), customerId), parseWithValidation(z.uuid(), orderId));
  }
  async adminOrder(orderId: string) {
    const access = await (this.options.authorizeAdmin ?? requireAdmin)();
    return this.repository().readAdmin(access, parseWithValidation(z.uuid(), orderId));
  }
  async request(customerId: string, raw: unknown) {
    return this.repository().request(parseWithValidation(z.uuid(), customerId), parseWithValidation(refundRequestSchema, raw));
  }
  async intake(raw: unknown) {
    const access = await (this.options.authorizeAdmin ?? requireAdmin)();
    return this.repository().intake(access, parseWithValidation(refundAdminIntakeSchema, raw));
  }
  async approve(raw: unknown) {
    const access = await (this.options.authorizeAdmin ?? requireAdmin)();
    return this.repository().approve(access, parseWithValidation(refundReviewSchema, raw));
  }
  async refresh(raw: unknown) {
    const access = await (this.options.authorizeAdmin ?? requireAdmin)();
    return this.repository().refresh(access, parseWithValidation(refundRefreshSchema, raw));
  }
  async receiveReturn(raw: unknown) {
    const access = await (this.options.authorizeAdmin ?? requireAdmin)();
    return this.repository().receiveReturn(access, parseWithValidation(refundReturnSchema, raw));
  }
}
