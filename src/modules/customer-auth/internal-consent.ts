import { getPrismaClient } from "@/lib/db/prisma";
import { createOpaqueToken, hashOpaqueToken } from "./core";
import { getInternalAuthConfig, INTERNAL_PRIVACY_VERSION, INTERNAL_TERMS_VERSION } from "./internal-testing";
import { appError } from "@/modules/shared/errors";
import type { PrismaClient } from "@/generated/prisma/client";
import { z } from "zod";
import { ageDeclarationSchema, AGE_DECLARATION_VERSION } from "./age-declaration";

export const internalGoogleConsentSchema = z.object({
  consent: z.literal("on"),
  ageDeclaration: ageDeclarationSchema,
  returnTo: z.string().max(2048).optional(),
});

export class InternalGoogleConsentRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}
  async issue(normalizedEmail: string, tokenHash: string, now: Date): Promise<void> {
    // Bound outstanding proofs to one destination and prevent repeated issuance
    // from bypassing the existing OAuth attempt window.
    await this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${normalizedEmail}))`;
      const count = await tx.customerInternalGoogleConsent.count({ where: { normalizedEmail, acceptedAt: { gt: new Date(now.getTime() - 900000) } } });
      if (count >= 10) throw appError("RATE_LIMITED");
      await tx.customerInternalGoogleConsent.create({ data: {
        tokenHash, normalizedEmail,
        termsVersion: INTERNAL_TERMS_VERSION, privacyVersion: INTERNAL_PRIVACY_VERSION,
        acceptedAt: now, expiresAt: new Date(now.getTime() + 600000),
        ageDeclarationVersion: AGE_DECLARATION_VERSION, ageDeclaredAt: now,
      } });
    });
  }
}

export class InternalGoogleConsentService {
  private readonly repository: InternalGoogleConsentRepository;
  constructor(prisma?: PrismaClient) { this.repository = new InternalGoogleConsentRepository(prisma); }
  async accept(raw: unknown, now = new Date()): Promise<string> {
    internalGoogleConsentSchema.parse(raw);
    const config = getInternalAuthConfig();
    if (!config) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
    const token = createOpaqueToken();
    await this.repository.issue(config.googleEmail, hashOpaqueToken(token), now);
    return token;
  }
}
