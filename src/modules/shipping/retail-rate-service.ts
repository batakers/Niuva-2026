import { createHash } from "node:crypto";

import Decimal from "decimal.js";
import { z } from "zod";

import type { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import type { CheckoutShippingQuote } from "@/modules/checkout/repository";
import type {
  CheckoutAddress,
  CheckoutInput,
} from "@/modules/checkout/schema";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";

import type {
  BiteshipPackageItem,
  BiteshipRate,
  BiteshipRateProvider,
} from "./biteship";

const SHIPPING_RATE_QUOTE_TTL_MS = 5 * 60 * 1_000;

export const retailShippingRateRequestSchema = z
  .object({
    destination: z
      .object({
        biteshipAreaId: z.string().trim().min(1).max(160).optional(),
        countryCode: z.literal("ID").default("ID"),
        postalCode: z.string().trim().regex(/^\d{5}$/),
      })
      .strict(),
    items: z
      .array(
        z.object({
          quantity: z.int().positive(),
          variantId: z.uuid(),
        }),
      )
      .min(1)
      .max(50),
  })
  .strict()
  .superRefine((input, context) => {
    const variantIds = input.items.map((item) => item.variantId);

    if (new Set(variantIds).size !== variantIds.length) {
      context.addIssue({
        code: "custom",
        message: "Satu variant hanya boleh muncul sekali dalam rate request.",
        path: ["items"],
      });
    }
  });

export type RetailShippingRateRequest = z.infer<
  typeof retailShippingRateRequestSchema
>;

export type RetailShippingCatalogItem = Readonly<{
  heightCm: Decimal | null;
  id: string;
  lengthCm: Decimal | null;
  priceRp: Decimal;
  productName: string;
  sku: string;
  variantName: string;
  weightGrams: Decimal;
  widthCm: Decimal | null;
}>;

export interface RetailShippingCatalogRepository {
  findPublishedVariants(
    variantIds: readonly string[],
  ): Promise<readonly RetailShippingCatalogItem[]>;
}

export type RetailShippingRateOption = Readonly<{
  courierCode: string;
  courierName: string;
  etaText?: string;
  optionId: string;
  priceRp: Decimal;
  serviceCode: string;
  serviceName: string;
}>;

export type RetailShippingRates = Readonly<{
  expiresAt: Date;
  options: readonly RetailShippingRateOption[];
}>;

export type RetailShippingRateServiceDependencies = Readonly<{
  now?: () => Date;
  provider: BiteshipRateProvider;
  repository?: RetailShippingCatalogRepository;
  quoteTtlMs?: number;
}>;

type ResolvedCatalogItem = Readonly<{
  heightCm: Decimal;
  id: string;
  lengthCm: Decimal;
  name: string;
  priceRp: Decimal;
  quantity: number;
  sku: string;
  weightGrams: Decimal;
  widthCm: Decimal;
}>;

type ResolvedShippingRates = Readonly<{
  catalogFingerprint: string;
  expiresAt: Date;
  options: readonly (RetailShippingRateOption & {
    providerPayload: Readonly<Record<string, unknown>>;
  })[];
}>;

export class RetailShippingRateService {
  private readonly clock: () => Date;
  private readonly provider: BiteshipRateProvider;
  private readonly quoteTtlMs: number;
  private readonly repositoryFactory: () => RetailShippingCatalogRepository;

  constructor(dependencies: RetailShippingRateServiceDependencies) {
    this.clock = dependencies.now ?? (() => new Date());
    this.provider = dependencies.provider;
    this.quoteTtlMs = dependencies.quoteTtlMs ?? SHIPPING_RATE_QUOTE_TTL_MS;
    this.repositoryFactory = () =>
      dependencies.repository ?? new PrismaRetailShippingCatalogRepository();

    if (!Number.isSafeInteger(this.quoteTtlMs) || this.quoteTtlMs < 1) {
      throw new RangeError("TTL rate shipping harus berupa integer positif.");
    }
  }

  async getRates(input: unknown): Promise<RetailShippingRates> {
    const parsed = parseWithValidation(retailShippingRateRequestSchema, input);
    const resolved = await this.resolveRates(parsed);

    return {
      expiresAt: resolved.expiresAt,
      options: resolved.options.map(({ providerPayload: _providerPayload, ...option }) =>
        option,
      ),
    };
  }

  async getRate(input: Readonly<{
    address: CheckoutAddress;
    items: CheckoutInput["items"];
    optionId: string;
  }>): Promise<CheckoutShippingQuote> {
    const parsed = parseWithValidation(retailShippingRateRequestSchema, {
      destination: {
        biteshipAreaId: input.address.biteshipAreaId,
        countryCode: input.address.countryCode,
        postalCode: input.address.postalCode,
      },
      items: input.items,
    });
    const resolved = await this.resolveRates(parsed);
    const selected = resolved.options.find(
      (option) => option.optionId === input.optionId,
    );

    if (selected === undefined) {
      throw appError("CONFLICT", {
        message: "Opsi pengiriman tidak lagi tersedia. Pilih ulang pengiriman.",
      });
    }

    return {
      catalogFingerprint: resolved.catalogFingerprint,
      courierCode: selected.courierCode,
      courierName: selected.courierName,
      ...(selected.etaText === undefined ? {} : { etaText: selected.etaText }),
      expiresAt: resolved.expiresAt,
      priceRp: selected.priceRp,
      providerPayload: selected.providerPayload,
      serviceCode: selected.serviceCode,
      serviceName: selected.serviceName,
    };
  }

  private async resolveRates(
    input: RetailShippingRateRequest,
  ): Promise<ResolvedShippingRates> {
    const items = await resolveCatalogItems(this.repositoryFactory(), input.items);
    const rates = await this.provider.getRates({
      destination: input.destination,
      items: items.map(toBiteshipPackageItem),
    });
    const now = this.clock();
    const expiresAt = new Date(now.getTime() + this.quoteTtlMs);

    if (!Number.isFinite(now.getTime()) || !Number.isFinite(expiresAt.getTime())) {
      throw appError("SHIPPING_PROVIDER_UNAVAILABLE");
    }

    return {
      catalogFingerprint: createRetailShippingCatalogFingerprint(items),
      expiresAt,
      options: rates.map((rate) => toRateOption(rate)),
    };
  }
}

export class PrismaRetailShippingCatalogRepository
  implements RetailShippingCatalogRepository
{
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async findPublishedVariants(
    variantIds: readonly string[],
  ): Promise<readonly RetailShippingCatalogItem[]> {
    const variants = await this.prisma.productVariant.findMany({
      where: {
        id: { in: [...variantIds] },
        isActive: true,
        product: { isPublished: true },
      },
      select: {
        heightCm: true,
        id: true,
        lengthCm: true,
        priceRp: true,
        product: { select: { name: true } },
        sku: true,
        name: true,
        weightGrams: true,
        widthCm: true,
      },
    });

    return variants.map((variant) => ({
      heightCm: variant.heightCm,
      id: variant.id,
      lengthCm: variant.lengthCm,
      priceRp: variant.priceRp,
      productName: variant.product.name,
      sku: variant.sku,
      variantName: variant.name,
      weightGrams: variant.weightGrams,
      widthCm: variant.widthCm,
    }));
  }
}

export function createRetailShippingCatalogFingerprint(
  items: readonly Readonly<{
    heightCm: { toString(): string } | null;
    id: string;
    lengthCm: { toString(): string } | null;
    priceRp: { toString(): string };
    quantity: number;
    weightGrams: { toString(): string };
    widthCm: { toString(): string } | null;
  }>[],
): string {
  const normalized = items
    .map((item) => ({
      heightCm: decimalValue(item.heightCm),
      id: item.id,
      lengthCm: decimalValue(item.lengthCm),
      priceRp: decimalValue(item.priceRp),
      quantity: item.quantity,
      weightGrams: decimalValue(item.weightGrams),
      widthCm: decimalValue(item.widthCm),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  return createHash("sha256")
    .update(JSON.stringify(normalized), "utf8")
    .digest("hex");
}

async function resolveCatalogItems(
  repository: RetailShippingCatalogRepository,
  requestedItems: RetailShippingRateRequest["items"],
): Promise<readonly ResolvedCatalogItem[]> {
  const variants = await repository.findPublishedVariants(
    requestedItems.map((item) => item.variantId),
  );
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

  return requestedItems.map((requested) => {
    const variant = variantsById.get(requested.variantId);

    if (variant === undefined) {
      throw appError("NOT_FOUND");
    }

    return {
      heightCm: requirePositivePhysicalValue(variant.heightCm, "heightCm"),
      id: variant.id,
      lengthCm: requirePositivePhysicalValue(variant.lengthCm, "lengthCm"),
      name: `${variant.productName} — ${variant.variantName}`.slice(0, 255),
      priceRp: requireNonNegativeMoney(variant.priceRp),
      quantity: requested.quantity,
      sku: requireCatalogText(variant.sku, "sku"),
      weightGrams: requirePositivePhysicalValue(variant.weightGrams, "weightGrams"),
      widthCm: requirePositivePhysicalValue(variant.widthCm, "widthCm"),
    };
  });
}

function toBiteshipPackageItem(item: ResolvedCatalogItem): BiteshipPackageItem {
  return {
    heightCm: toSafeNumber(item.heightCm, "heightCm"),
    lengthCm: toSafeNumber(item.lengthCm, "lengthCm"),
    name: item.name,
    quantity: item.quantity,
    sku: item.sku,
    valueRp: toSafeNumber(item.priceRp, "priceRp"),
    weightGrams: toSafeNumber(item.weightGrams, "weightGrams"),
    widthCm: toSafeNumber(item.widthCm, "widthCm"),
  };
}

function toRateOption(
  rate: BiteshipRate,
): RetailShippingRateOption & { providerPayload: Readonly<Record<string, unknown>> } {
  return {
    courierCode: rate.courierCode,
    courierName: rate.courierName,
    ...(rate.etaText === undefined ? {} : { etaText: rate.etaText }),
    optionId: createHash("sha256")
      .update(`${rate.courierCode}\u0000${rate.serviceCode}`, "utf8")
      .digest("base64url"),
    priceRp: rate.priceRp,
    providerPayload: rate.providerPayload,
    serviceCode: rate.serviceCode,
    serviceName: rate.serviceName,
  };
}

function decimalValue(value: { toString(): string } | null): string | null {
  return value === null ? null : value.toString();
}

function requireNonNegativeMoney(value: Decimal): Decimal {
  if (!value.isFinite() || value.isNegative() || !value.isInteger()) {
    throw appError("CONFLICT", {
      message: "Data harga produk belum siap untuk pengiriman.",
    });
  }

  return value;
}

function requireCatalogText(value: string, field: string): string {
  const normalized = value.trim();

  if (normalized.length === 0 || normalized.length > 160) {
    throw appError("CONFLICT", {
      details: { shipping: field },
      message: "Data produk belum siap untuk pengiriman.",
    });
  }

  return normalized;
}

function requirePositivePhysicalValue(
  value: Decimal | null,
  field: string,
): Decimal {
  if (value === null || !value.isFinite() || value.lessThanOrEqualTo(0)) {
    throw appError("CONFLICT", {
      details: { shipping: field },
      message: "Data ukuran produk belum siap untuk pengiriman.",
    });
  }

  return value;
}

function toSafeNumber(value: Decimal, field: string): number {
  if (value.greaterThan(Number.MAX_SAFE_INTEGER)) {
    throw appError("CONFLICT", {
      details: { shipping: field },
      message: "Data ukuran produk berada di luar batas aman.",
    });
  }

  const numeric = value.toNumber();

  if (!Number.isFinite(numeric)) {
    throw appError("CONFLICT", {
      details: { shipping: field },
      message: "Data ukuran produk tidak valid.",
    });
  }

  return numeric;
}
