import { z } from "zod";
import type { AdminRole, Prisma, PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import type { AdminAccess } from "@/lib/auth/admin";
import { appError } from "@/modules/shared/errors";
import { resolveActivityTarget } from "./notifications/target";
import { PrismaActivityTargetReader } from "./notifications/target-repository";

const pageSchema = z.coerce.number().int().min(1).max(1000);
const PAGE_SIZE = 30;
export type AdminActivityItem = Readonly<{ id: string; title: string; group: string; actor: string; createdAt: Date; href: string | null }>;
export type AdminActivityPage = Readonly<{ items: readonly AdminActivityItem[]; page: number; hasNext: boolean }>;

const labels: Readonly<Record<string, string>> = {
  "finance.invoice.draft-created": "Draft invoice disiapkan",
  "finance.invoice.issued": "Invoice diterbitkan",
  "finance.invoice.corrected": "Invoice pengganti diterbitkan",
  "finance.invoice.voided": "Invoice dibatalkan",
  "finance.payment.recorded": "Transfer B2B terkonfirmasi dicatat",
  "finance.payment.corrected": "Pencatatan transfer B2B dikoreksi",
  "finance.payment.reversed": "Pencatatan transfer B2B dibatalkan",
  "finance.expense.recorded": "Pengeluaran dicatat",
  "finance.expense.corrected": "Pengeluaran dikoreksi",
  "finance.expense.voided": "Pencatatan pengeluaran dibatalkan",
  "finance.expense.evidence-attached": "Bukti pengeluaran dilampirkan",
  "finance.settings.updated": "Identitas dan rekening diperbarui",
  "finance.terms.updated": "Pola pembayaran B2B diperbarui",
  "site-information.published": "Informasi situs diterbitkan",
  "admin.deactivated": "Akun Admin dinonaktifkan",
  "admin.invitation.created": "Undangan Admin disiapkan",
  "admin.invitation.sent": "Undangan Admin dikirim",
  "admin.invitation.failed": "Pengiriman undangan Admin gagal",
  "admin.invitation.accepted": "Undangan Admin diterima",
  "inquiry.submitted": "Brief B2B baru diterima",
  "inquiry.notification.failed": "Notifikasi brief B2B gagal dikirim",
  "inquiry.status.transition": "Status brief B2B diperbarui",
  "custom-print.request.submitted": "Permintaan Custom Print diterima",
  "custom-print.request.model-attached": "Model Custom Print dilampirkan",
  "custom-print.request.notification.failed": "Notifikasi Custom Print gagal dikirim",
  "custom-print.request.status.transition": "Status Custom Print diperbarui",
  "custom-print.request.token-reissued": "Tautan Custom Print diperbarui",
  "order.status.transition": "Status order diperbarui",
  "order.public-token.reissued": "Tautan order diperbarui",
  "checkout.created": "Checkout dibuat",
  "checkout.replayed": "Checkout yang sama diproses ulang",
  "quote.draft.created": "Draft quote dibuat",
  "quote.sent": "Quote dikirim",
  "quote.accepted": "Quote diterima",
  "quote.declined": "Quote ditolak",
  "quote.expired": "Masa berlaku quote berakhir",
  "quote.payment.prepared": "Pembayaran quote disiapkan",
  "quote.public-token.reissued": "Tautan quote diperbarui",
  "payment.webhook.processed": "Pembaruan pembayaran diterima",
  "catalog.product.created": "Produk ditambahkan",
  "catalog.product.updated": "Produk diperbarui",
  "catalog.product.media.replaced": "Media produk diperbarui",
  "catalog.variant.created": "Varian produk ditambahkan",
  "catalog.variant.updated": "Varian produk diperbarui",
  "portfolio.project.updated": "Portfolio diperbarui",
  "portfolio.project.media.replaced": "Media portfolio diperbarui",
  "inventory.reservation.created": "Stok direservasi",
  "inventory.reservation.idempotent": "Reservasi stok yang sama dikonfirmasi",
  "shipping.address.saved": "Alamat pengiriman disimpan",
  "shipping.custom.rate.created": "Ongkir Custom Print dicatat",
  "shipping.shipment.metadata.recorded": "Data pengiriman dicatat",
  "file.upload.intent.issued": "Unggah lampiran dimulai",
  "file.upload.confirmed": "Lampiran diterima",
  "file.upload.rejected": "Lampiran ditolak",
  "file.download-url.issued": "Akses lampiran diberikan",
  "state.transition": "Status operasional diperbarui",
  "pricing-rule.activated": "Aturan harga diaktifkan",
  "pricing-rule.applied": "Tarif Custom Print diperbarui",
  "PRIVACY_REQUEST_HANDLED": "Permintaan privasi ditangani",
};

export function activityGroup(entityType: string, action: string): string {
  if (entityType === "AdminProfile" || entityType === "AdminInvitation" || action.startsWith("admin.")) return "Akses tim";
  if (entityType.includes("PRIVACY") || action.startsWith("PRIVACY_")) return "Privasi Customer";
  if (action.startsWith("inquiry.") || action.startsWith("b2b")) return "B2B Inquiries";
  if (action.startsWith("custom-print.") || action.startsWith("quote.")) return "Custom Print";
  if (action.startsWith("order.") || action.startsWith("checkout.") || action.startsWith("payment.") || action.startsWith("shipping.")) return "Orders";
  if (action.startsWith("catalog.") || action.startsWith("inventory.")) return "Products & Stock";
  if (action.startsWith("pricing-")) return "Tarif Custom Print";
  if (action.startsWith("finance.")) return "Keuangan";
  if (action.startsWith("site-information.")) return "Informasi Situs";
  if (action.startsWith("portfolio.")) return "Portfolio";
  if (action.startsWith("file.")) return "Lampiran";
  return "Operasional";
}

export function activityTitle(action: string): string {
  return labels[action] ?? "Aktivitas operasional dicatat";
}

export function activityVisibilityWhere(role: AdminRole): Prisma.AuditLogWhereInput | undefined {
  return role === "OWNER" ? undefined : { NOT: { OR: [
    { entityType: { in: ["AdminProfile", "AdminInvitation", "CUSTOMER_PRIVACY_REQUEST"] } },
    { entityType: { in: ["PricingRuleVersion", "BillingInstructions", "B2BBillingTerms"] } },
    { action: { startsWith: "admin." } }, { action: { startsWith: "PRIVACY_" } },
    { action: { startsWith: "pricing-" } }, { action: { startsWith: "finance.settings." } },
    { action: { startsWith: "finance.terms." } },
  ] } };
}

export class AdminActivityTimelineService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async list(access: AdminAccess, rawPage: unknown = 1): Promise<AdminActivityPage> {
    if (!access.profile.isActive) throw appError("FORBIDDEN");
    const parsed = pageSchema.safeParse(rawPage);
    const page = parsed.success ? parsed.data : 1;
    const ownerOnly = activityVisibilityWhere(access.profile.role);
    const events = await this.prisma.auditLog.findMany({
      where: ownerOnly,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      select: { id: true, entityType: true, entityId: true, action: true, actorType: true, createdAt: true },
    });
    return {
      page,
      hasNext: events.length > PAGE_SIZE,
      items: await Promise.all(events.slice(0, PAGE_SIZE).map(async (event) => {
        const group = activityGroup(event.entityType, event.action);
        return { id: event.id, title: activityTitle(event.action), group, actor: event.actorType === "ADMIN" ? "Tim Admin" : event.actorType === "CUSTOMER" ? "Customer" : "Sistem", createdAt: event.createdAt, href: await resolveActivityTarget(event, new PrismaActivityTargetReader(this.prisma)) };
      })),
    };
  }
}
