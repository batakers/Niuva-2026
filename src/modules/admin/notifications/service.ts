import type { AdminAccess } from "@/lib/auth/admin";
import { z } from "zod";
import { parseWithValidation } from "@/modules/shared/validation";
import { requireAdminPermission } from "../permissions";
import { activityGroup, activityTitle } from "../activity-timeline";
import { PrismaAdminNotificationRepository, type NotificationEvent } from "./repository";
import { resolveActivityTarget } from "./target";
import type { AdminNotificationItem, NotificationFeed } from "./types";

const cursorSchema = z.string().max(100).regex(/^[A-Za-z0-9_-]+$/).transform(value => Buffer.from(value, "base64url").toString("utf8")).pipe(z.uuid());
const querySchema = z.object({ cursor: cursorSchema.nullish(), unread: z.boolean().optional() }).strict();
const readSchema = z.object({ ids: z.array(z.uuid()).min(1).max(100).transform(ids => [...new Set(ids)]) }).strict();
const statusSchema = z.object({ status: z.string().optional(), processingResult: z.string().optional() });

export function requiresNotificationAttention(event: Pick<NotificationEvent, "action" | "entityType" | "afterJson">): boolean {
  if (["inquiry.submitted", "inquiry.notification.failed", "custom-print.request.submitted", "custom-print.request.model-attached", "custom-print.request.notification.failed", "admin.invitation.failed", "quote.declined", "b2b.quote.declined", "finance.b2b-payment.confirmed"].includes(event.action)) return true;
  const result = statusSchema.safeParse(event.afterJson);
  if (!result.success) return false;
  if (event.action === "payment.webhook.processed") return ["SETTLED", "AMOUNT_MISMATCH", "PROVIDER_TRANSACTION_CONFLICT", "SETTLEMENT_STATUS_CODE_INVALID", "LATE_SETTLEMENT_REFUND_REQUIRED", "PARTIAL_REFUND_REQUIRES_EXCEPTION"].includes(result.data.processingResult ?? "");
  return event.entityType === "Shipment" && ["EXCEPTION", "FAILED", "RETURNED"].includes(result.data.status ?? "");
}

export class AdminNotificationService {
  constructor(private readonly repository: PrismaAdminNotificationRepository = new PrismaAdminNotificationRepository()) {}

  async bootstrap(access: AdminAccess): Promise<NotificationFeed> {
    requireAdminPermission(access, "AUDIT_READ");
    await this.repository.activate(access);
    return this.feed(access, undefined, false, []);
  }
  async poll(access: AdminAccess, input: unknown): Promise<NotificationFeed> {
    requireAdminPermission(access, "AUDIT_READ");
    const query = parseWithValidation(querySchema, input);
    await this.repository.assertActive(access);
    if (!await this.repository.hasState(access)) return this.bootstrap(access);
    const toasts: AdminNotificationItem[] = [];
    // Claim routine events too, so they cannot block a later attention event.
    for (const event of await this.repository.pending(access)) {
      const item = await this.item(event, false);
      const claimed = await this.repository.claim(access, event.id);
      if (claimed && item.requiresAttention && item.href && event.actorId !== access.profile.id) toasts.push(item);
    }
    return this.feed(access, query.cursor ?? undefined, query.unread ?? false, toasts);
  }
  async markRead(access: AdminAccess, input: unknown): Promise<void> {
    requireAdminPermission(access, "AUDIT_READ");
    const { ids } = parseWithValidation(readSchema, input);
    await this.repository.markRead(access, ids);
  }
  private async item(event: NotificationEvent, isRead: boolean): Promise<AdminNotificationItem> {
    return { id: event.id, title: activityTitle(event.action), group: activityGroup(event.entityType, event.action), href: await resolveActivityTarget(event, this.repository.targets), createdAt: event.createdAt.toISOString(), isRead, requiresAttention: requiresNotificationAttention(event) };
  }
  private async feed(access: AdminAccess, cursor: string | undefined, unread: boolean, toastCandidates: readonly AdminNotificationItem[]): Promise<NotificationFeed> {
    const [events, unreadCount] = await Promise.all([this.repository.page(access, cursor, unread), this.repository.unreadCount(access)]);
    const rows = events.slice(0, 30);
    return { items: await Promise.all(rows.map(event => this.item(event, Boolean(event.notificationReceipts[0]?.readAt)))), unreadCount, nextCursor: events.length > 30 && rows.length ? Buffer.from(rows[rows.length - 1]!.id).toString("base64url") : null, toastCandidates };
  }
}
