import "server-only";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import type { AdminReadPage } from "@/modules/admin/operations-read-repository";
import type { CustomerDirectoryDetail, CustomerDirectoryQuery, CustomerDirectoryRow, CustomerHistoryRow } from "./types";

const customerSelect = { id: true, displayName: true, email: true, createdAt: true, _count: { select: { orders: { where: { accountClosedAt: null } }, customRequests: { where: { accountClosedAt: null } }, inquiries: { where: { accountClosedAt: null } } } } } satisfies Prisma.CustomerSelect;
type SelectedCustomer = Prisma.CustomerGetPayload<{ select: typeof customerSelect }>;
function row(value: SelectedCustomer): CustomerDirectoryRow { return { id: value.id, displayName: value.displayName, email: value.email, orderCount: value._count.orders, customPrintCount: value._count.customRequests, inquiryCount: value._count.inquiries }; }
function page<T>(items: readonly T[], filteredTotal: number): AdminReadPage<T> { return { items: items.slice(0, 20), hasNext: items.length > 20, filteredTotal }; }

export class CustomerDirectoryRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}
  async list(query: CustomerDirectoryQuery): Promise<AdminReadPage<CustomerDirectoryRow>> {
    const where: Prisma.CustomerWhereInput = query.q ? { OR: [{ email: { contains: query.q, mode: "insensitive" } }, { displayName: { contains: query.q, mode: "insensitive" } }] } : {};
    const [customers, count] = await Promise.all([this.prisma.customer.findMany({ where, select: customerSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * 20, take: 21 }), this.prisma.customer.count({ where })]);
    return page(customers.map(row), count);
  }
  async detail(id: string, query: CustomerDirectoryQuery): Promise<CustomerDirectoryDetail | null> {
    return this.prisma.$transaction(async tx => {
      const customer = await tx.customer.findUnique({ where: { id }, select: customerSelect });
      if (!customer) return null;
      const where = { customerId: id, accountClosedAt: null };
      const invoiceWhere: Prisma.InvoiceWhereInput = { billingCase: { ...where, OR: [{ order: where }, { inquiry: where }] } };
      const [orders, customPrint, inquiries] = await Promise.all([
        tx.order.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21, skip: query.tab === "orders" ? (query.page - 1) * 20 : 0, select: { id: true, orderNumber: true, status: true, createdAt: true } }),
        tx.customPrintRequest.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21, skip: query.tab === "custom-print" ? (query.page - 1) * 20 : 0, select: { id: true, referenceNumber: true, status: true, createdAt: true } }),
        tx.b2BInquiry.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21, skip: query.tab === "inquiries" ? (query.page - 1) * 20 : 0, select: { id: true, referenceNumber: true, status: true, createdAt: true } }),
      ]);
      const history = (values: readonly { id: string; status: string; createdAt: Date; referenceNumber: string }[], path: string): CustomerHistoryRow[] => values.map(value => ({ id: value.id, reference: value.referenceNumber, status: value.status, createdAt: value.createdAt, href: `/admin/${path}/${value.id}` }));
      const invoices = await tx.invoice.findMany({ where: invoiceWhere, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21, skip: query.tab === "invoices" ? (query.page - 1) * 20 : 0, select: { id: true, number: true, state: true, createdAt: true } });
      return { customer: { ...row(customer), createdAt: customer.createdAt }, query,
        orders: page(orders.map(value => ({ id: value.id, reference: value.orderNumber, status: value.status, createdAt: value.createdAt, href: `/admin/orders/${value.id}` })), customer._count.orders),
        customPrint: page(history(customPrint, "custom-print"), customer._count.customRequests),
        inquiries: page(history(inquiries, "inquiries"), customer._count.inquiries),
        invoices: page(invoices.map(invoice => ({ id: invoice.id, reference: invoice.number ?? "Draft invoice", status: invoice.state, createdAt: invoice.createdAt, href: `/admin/finance/invoices/${invoice.id}` })), await tx.invoice.count({ where: invoiceWhere })),
      };
    }, { isolationLevel: "RepeatableRead" });
  }
}
