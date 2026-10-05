import Decimal from "decimal.js";
import { z } from "zod";

import { validateStartupEnvironment } from "@/lib/env/server";
import {
  requireAllowed,
  type CapabilityContext,
} from "@/modules/capabilities/resolver";
import { assertNonProductionProvider } from "@/modules/providers/non-production";
import { appError, isAppError } from "@/modules/shared/errors";

const BITESHIP_RATES_ENDPOINT = "https://api.biteship.com/v1/rates/couriers";
const PROVIDER_RESPONSE_MAX_BYTES = 64 * 1_024;
const PROVIDER_TIMEOUT_MS = 5_000;

const providerCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);
const providerNameSchema = z.string().trim().min(1).max(160);
const safeProviderPrice = z
  .number()
  .finite()
  .nonnegative()
  .refine(Number.isSafeInteger);

const biteshipRatesResponseSchema = z
  .object({
    pricing: z
      .array(
        z.object({
          courier_code: providerCodeSchema,
          courier_name: providerNameSchema,
          courier_service_code: providerCodeSchema,
          courier_service_name: providerNameSchema,
          currency: z.literal("IDR"),
          duration: z.string().trim().min(1).max(64).optional(),
          price: safeProviderPrice,
        }),
      )
      .max(100),
    success: z.literal(true),
  })
  .passthrough();

export type BiteshipPackageItem = Readonly<{
  heightCm: number;
  lengthCm: number;
  name: string;
  quantity: number;
  sku: string;
  valueRp: number;
  weightGrams: number;
  widthCm: number;
}>;

export type BiteshipRateRequest = Readonly<{
  destination: Readonly<{
    areaId?: string;
    countryCode: "ID";
    postalCode: string;
  }>;
  items: readonly BiteshipPackageItem[];
}>;

export type BiteshipRate = Readonly<{
  courierCode: string;
  courierName: string;
  etaText?: string;
  priceRp: Decimal;
  provider?: string;
  providerPayload: Readonly<Record<string, unknown>>;
  serviceCode: string;
  serviceName: string;
}>;

export interface BiteshipRateProvider {
  getRates(input: BiteshipRateRequest): Promise<readonly BiteshipRate[]>;
}

export type BiteshipRateGatewayConfig = Readonly<{
  apiKey: string;
  /**
   * Caller-owned capability inputs (never read from process.env implicitly).
   * NODE_ENV, NIUVA_DEPLOYMENT_TIER, NIUVA_PROVIDER_MODE and DATABASE_URL are
   * taken from here when present.
   */
  capabilityEnv?: Readonly<Record<string, string | undefined>>;
  couriers: readonly string[];
  /** Set false to declare the database resource unbound (default: bound). */
  databaseBound?: boolean;
  endpoint?: string;
  fetch?: typeof fetch;
  gates?: CapabilityContext["gates"];
  hasActivationGrant?: CapabilityContext["hasActivationGrant"];
  nodeEnv?: "development" | "production" | "test";
  originAreaId: string;
  timeoutMs?: number;
}>;

export class BiteshipRateGateway implements BiteshipRateProvider {
  private readonly endpoint: string;
  private readonly fetchImplementation: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly config: BiteshipRateGatewayConfig) {
    this.endpoint = config.endpoint ?? BITESHIP_RATES_ENDPOINT;
    this.fetchImplementation = config.fetch ?? fetch;
    this.timeoutMs = config.timeoutMs ?? PROVIDER_TIMEOUT_MS;

    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1) {
      throw new RangeError("Timeout Biteship harus berupa integer positif.");
    }
  }

  async getRates(input: BiteshipRateRequest): Promise<readonly BiteshipRate[]> {
    assertBiteshipTestConfiguration(this.config);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;

    try {
      response = await this.fetchImplementation(this.endpoint, {
        body: JSON.stringify(createBiteshipRequestBody(this.config, input)),
        headers: {
          Authorization: this.config.apiKey,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: controller.signal,
      });
    } catch {
      throw appError("SHIPPING_PROVIDER_UNAVAILABLE");
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw appError("SHIPPING_PROVIDER_UNAVAILABLE");
    }

    const body = await readBoundedProviderJson(response);
    const parsed = biteshipRatesResponseSchema.safeParse(body);

    if (!parsed.success || parsed.data.pricing.length === 0) {
      throw appError("SHIPPING_PROVIDER_UNAVAILABLE", {
        message: "Tidak ada opsi pengiriman yang tersedia untuk alamat ini.",
      });
    }

    return normalizeRates(parsed.data.pricing);
  }
}

export function createBiteshipRateGatewayFromEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
): BiteshipRateProvider {
  const environment = validateStartupEnvironment(source);

  if (
    environment.BITESHIP_API_KEY === undefined ||
    environment.BITESHIP_COURIERS === undefined ||
    environment.BITESHIP_ORIGIN_AREA_ID === undefined
  ) {
    throw appError("PROVIDER_UNAVAILABLE", {
      message: "Biteship belum dikonfigurasi.",
    });
  }

  const couriers = parseCourierAllowlist(environment.BITESHIP_COURIERS);

  const gatewayConfig: BiteshipRateGatewayConfig = {
    apiKey: environment.BITESHIP_API_KEY,
    capabilityEnv: pickCapabilityEnv(source),
    couriers,
    nodeEnv: environment.NODE_ENV,
    originAreaId: environment.BITESHIP_ORIGIN_AREA_ID,
  };
  const gateway = new BiteshipRateGateway(gatewayConfig);

  assertBiteshipTestConfiguration(gatewayConfig);

  return gateway;
}

const CALLER_CAPABILITY_KEYS = [
  "DATABASE_URL",
  "NIUVA_DEPLOYMENT_TIER",
  "NIUVA_PROVIDER_MODE",
  "NODE_ENV",
] as const;

function pickCapabilityEnv(
  source: Readonly<Record<string, string | undefined>>,
): Readonly<Record<string, string | undefined>> {
  return Object.fromEntries(
    CALLER_CAPABILITY_KEYS.map((key) => [key, source[key]]),
  );
}

// Non-secret marker for an input the gateway does not own: it never uses the
// database. It only keeps the resolver resource group evaluable; a caller can
// still declare the database unbound.
const GATEWAY_SCOPE_DATABASE_URL = "postgresql://gateway-scope.invalid/none";

/** Builds the resolver context from the caller-provided gateway configuration. */
export function buildBiteshipCapabilityContext(
  config: BiteshipRateGatewayConfig,
): CapabilityContext {
  const caller = config.capabilityEnv ?? {};
  const apiKey = config.apiKey.trim();
  const originAreaId = config.originAreaId.trim();
  const couriers = config.couriers.join(",").trim();
  const env: Record<string, string | undefined> = {
    BITESHIP_API_KEY: apiKey.length > 0 ? apiKey : undefined,
    BITESHIP_COURIERS: couriers.length > 0 ? couriers : undefined,
    BITESHIP_ORIGIN_AREA_ID: originAreaId.length > 0 ? originAreaId : undefined,
    DATABASE_URL:
      caller.DATABASE_URL ??
      (config.databaseBound === false ? undefined : GATEWAY_SCOPE_DATABASE_URL),
    NIUVA_DEPLOYMENT_TIER: caller.NIUVA_DEPLOYMENT_TIER,
    NIUVA_PROVIDER_MODE: caller.NIUVA_PROVIDER_MODE,
    NODE_ENV: config.nodeEnv ?? caller.NODE_ENV,
  };

  return {
    env,
    ...(config.gates === undefined ? {} : { gates: config.gates }),
    ...(config.hasActivationGrant === undefined
      ? {}
      : { hasActivationGrant: config.hasActivationGrant }),
  };
}

function assertBiteshipTestConfiguration(
  config: Pick<
    BiteshipRateGatewayConfig,
    | "apiKey"
    | "capabilityEnv"
    | "couriers"
    | "databaseBound"
    | "gates"
    | "hasActivationGrant"
    | "nodeEnv"
    | "originAreaId"
  >,
): void {
  // Legacy guard first, exactly as before: the resolver can only tighten it.
  assertNonProductionProvider({
    isLiveProvider: config.apiKey.startsWith("biteship_live."),
    nodeEnv:
      config.nodeEnv === "production" ||
      config.capabilityEnv?.NODE_ENV === "production"
        ? "production"
        : config.nodeEnv,
    provider: "Biteship",
  });
  requireAllowed("shipping", buildBiteshipCapabilityContext(config));

  if (!config.apiKey.startsWith("biteship_test.")) {
    throw appError("PROVIDER_UNAVAILABLE", {
      message: "Biteship hanya menerima testing key pada tahap ini.",
    });
  }

  if (
    config.originAreaId.trim().length === 0 ||
    config.couriers.length === 0 ||
    config.couriers.some((courier) => !/^[a-z0-9_-]{2,32}$/.test(courier))
  ) {
    throw appError("PROVIDER_UNAVAILABLE", {
      message: "Konfigurasi Biteship tidak lengkap.",
    });
  }
}

function createBiteshipRequestBody(
  config: Pick<BiteshipRateGatewayConfig, "couriers" | "originAreaId">,
  input: BiteshipRateRequest,
): Record<string, unknown> {
  const destination =
    input.destination.areaId === undefined
      ? { destination_postal_code: Number(input.destination.postalCode) }
      : { destination_area_id: input.destination.areaId };

  return {
    couriers: config.couriers.join(","),
    ...destination,
    items: input.items.map((item) => ({
      height: item.heightCm,
      length: item.lengthCm,
      name: item.name,
      quantity: item.quantity,
      sku: item.sku,
      value: item.valueRp,
      weight: item.weightGrams,
      width: item.widthCm,
    })),
    origin_area_id: config.originAreaId,
  };
}

function normalizeRates(
  pricing: z.infer<typeof biteshipRatesResponseSchema>["pricing"],
): readonly BiteshipRate[] {
  const rates = new Map<string, BiteshipRate>();

  for (const rate of pricing) {
    const key = `${rate.courier_code}\u0000${rate.courier_service_code}`;
    const normalized: BiteshipRate = {
      courierCode: rate.courier_code,
      courierName: rate.courier_name,
      ...(rate.duration === undefined ? {} : { etaText: rate.duration }),
      priceRp: new Decimal(rate.price),
      providerPayload: {
        courierCode: rate.courier_code,
        courierName: rate.courier_name,
        ...(rate.duration === undefined ? {} : { etaText: rate.duration }),
        priceRp: rate.price,
        serviceCode: rate.courier_service_code,
        serviceName: rate.courier_service_name,
      },
      serviceCode: rate.courier_service_code,
      serviceName: rate.courier_service_name,
    };
    const existing = rates.get(key);

    if (existing === undefined || normalized.priceRp.lessThan(existing.priceRp)) {
      rates.set(key, normalized);
    }
  }

  return [...rates.values()].sort((left, right) => {
    const priceComparison = left.priceRp.comparedTo(right.priceRp);

    if (priceComparison !== 0) {
      return priceComparison;
    }

    return `${left.courierCode}\u0000${left.serviceCode}`.localeCompare(
      `${right.courierCode}\u0000${right.serviceCode}`,
    );
  });
}

function parseCourierAllowlist(value: string): readonly string[] {
  const couriers = value
    .split(",")
    .map((courier) => courier.trim().toLowerCase())
    .filter((courier) => courier.length > 0);

  const uniqueCouriers = [...new Set(couriers)];

  if (uniqueCouriers.length === 0 || uniqueCouriers.length > 20) {
    throw appError("PROVIDER_UNAVAILABLE", {
      message: "Daftar courier Biteship tidak valid.",
    });
  }

  return uniqueCouriers;
}

async function readBoundedProviderJson(response: Response): Promise<unknown> {
  const declaredSize = response.headers.get("content-length");

  if (
    declaredSize !== null &&
    /^\d+$/.test(declaredSize) &&
    Number(declaredSize) > PROVIDER_RESPONSE_MAX_BYTES
  ) {
    throw appError("SHIPPING_PROVIDER_UNAVAILABLE");
  }

  if (response.body === null) {
    throw appError("SHIPPING_PROVIDER_UNAVAILABLE");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > PROVIDER_RESPONSE_MAX_BYTES) {
        await reader.cancel();
        throw appError("SHIPPING_PROVIDER_UNAVAILABLE");
      }

      chunks.push(value);
    }
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }

    throw appError("SHIPPING_PROVIDER_UNAVAILABLE");
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }

    throw appError("SHIPPING_PROVIDER_UNAVAILABLE");
  }
}
