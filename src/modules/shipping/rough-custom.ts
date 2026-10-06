import { createHash } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { z } from "zod";

import { requireAdmin, type AdminAccess } from "@/lib/auth/admin";
import { getPrismaClient } from "@/lib/db/prisma";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";

import { createBiteshipRateGatewayFromEnvironment, type BiteshipRateProvider } from "./biteship";

export const estimatedPackageSchema = z.object({
  weightGrams: z.number().int().positive().max(100_000),
  lengthCm: z.number().positive().max(200),
  widthCm: z.number().positive().max(200),
  heightCm: z.number().positive().max(200),
  declaredValueRp: z.number().int().positive().max(1_000_000_000),
}).strict();
export const roughDestinationSchema = z.object({
  postalCode: z.string().regex(/^\d{5}$/),
  areaId: z.string().trim().min(2).max(80).optional(),
}).strict();

type RoughResult = Readonly<{
  status: "AVAILABLE";
  checkedAt: string;
  lowerRp: string;
  upperRp: string;
  package: z.infer<typeof estimatedPackageSchema>;
  destination: z.infer<typeof roughDestinationSchema>;
  couriers: readonly Readonly<{ code: string; name: string; service: string; priceRp: string; eta?: string }>[];
}> | Readonly<{ status: "PENDING"; message: string }>;

const cache = new Map<string, { expiresAt: number; promise: Promise<RoughResult> }>();
const CACHE_TTL_MS = 10 * 60_000;
const MAX_CACHE_KEYS = 256;

export class RoughCustomShippingService {
  constructor(private readonly dependencies: Readonly<{
    authorizeAdmin?: () => Promise<AdminAccess>;
    now?: () => Date;
    prisma?: PrismaClient;
    provider?: BiteshipRateProvider;
    allowedCouriers?: readonly string[];
  }> = {}) {}

  private get prisma() { return this.dependencies.prisma ?? getPrismaClient(); }

  async saveEstimatedPackage(requestId: string, input: unknown) {
    const packageData = parseWithValidation(estimatedPackageSchema, input);
    const admin = await (this.dependencies.authorizeAdmin ?? requireAdmin)();
    requireAdminPermission(admin, "CUSTOM_PRINT_REVIEW");
    const updated = await this.prisma.customPrintRequest.updateMany({
      where: { id: requestId, status: { notIn: ["CANCELLED", "DECLINED"] } },
      data: { estimatedPackage: packageData },
    });
    if (updated.count !== 1) throw appError("NOT_FOUND");
    return packageData;
  }

  async checkRates(customerId: string, requestId: string, destinationInput: unknown): Promise<RoughResult> {
    const destination = parseWithValidation(roughDestinationSchema, destinationInput);
    const request = await this.prisma.customPrintRequest.findFirst({
      where: { id: requestId, customerId },
      select: { referenceNumber: true, estimatedPackage: true },
    });
    if (request === null) throw appError("NOT_FOUND");
    const packageResult = estimatedPackageSchema.safeParse(request.estimatedPackage);
    if (!packageResult.success) return { status: "PENDING", message: "Ongkir menyusul. Paket perkiraan belum dicatat operator." };
    const packageData = packageResult.data;
    const key = createHash("sha256").update(JSON.stringify({ customerId, requestId, destination, packageData })).digest("hex");
    const now = (this.dependencies.now ?? (() => new Date()))();
    const existing = cache.get(key);
    if (existing && existing.expiresAt > now.getTime()) return existing.promise;

    const promise = this.fetchRates(request.referenceNumber, packageData, destination, now);
    if (cache.size >= MAX_CACHE_KEYS) cache.delete(cache.keys().next().value ?? "");
    cache.set(key, { expiresAt: now.getTime() + CACHE_TTL_MS, promise });
    return promise;
  }

  private async fetchRates(referenceNumber: string, packageData: z.infer<typeof estimatedPackageSchema>,
    destination: z.infer<typeof roughDestinationSchema>, checkedAt: Date): Promise<RoughResult> {
    let provider: BiteshipRateProvider;
    try { provider = this.dependencies.provider ?? createBiteshipRateGatewayFromEnvironment(); }
    catch { return { status: "PENDING", message: "Ongkir menyusul. Provider testing belum tersedia." }; }
    const allowed = this.dependencies.allowedCouriers ?? (process.env.BITESHIP_COURIERS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (allowed.length === 0) return { status: "PENDING", message: "Ongkir menyusul. Daftar kurir testing belum tersedia." };
    try {
      const rates = await provider.getRates({
        destination: { countryCode: "ID", ...destination },
        items: [{ sku: referenceNumber, name: "Custom print Niuva", quantity: 1,
          valueRp: packageData.declaredValueRp, weightGrams: packageData.weightGrams,
          lengthCm: packageData.lengthCm, widthCm: packageData.widthCm, heightCm: packageData.heightCm }],
      });
      const permitted = rates.filter((rate) => allowed.includes(rate.courierCode.toLowerCase()));
      if (permitted.length === 0) return { status: "PENDING", message: "Ongkir menyusul. Tidak ada opsi kurir yang diizinkan." };
      const values = permitted.map((rate) => rate.priceRp);
      const lowerRp = values.reduce((min, value) => value.lt(min) ? value : min).toFixed(0);
      const upperRp = values.reduce((max, value) => value.gt(max) ? value : max).toFixed(0);
      return { status: "AVAILABLE", checkedAt: checkedAt.toISOString(), lowerRp, upperRp,
        package: packageData, destination,
        couriers: permitted.map((rate) => ({ code: rate.courierCode, name: rate.courierName,
          service: rate.serviceName, priceRp: rate.priceRp.toFixed(0),
          ...(rate.etaText === undefined ? {} : { eta: rate.etaText }) })) };
    } catch {
      return { status: "PENDING", message: "Ongkir menyusul. Layanan testing belum memberikan rate." };
    }
  }
}
