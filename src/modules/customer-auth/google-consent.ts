import { z } from "zod";
import type { CustomerGoogleConsent, PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { appError } from "../shared/errors";
import { AGE_DECLARATION_VERSION, ageDeclarationSchema } from "./age-declaration";
import { createOpaqueToken, hashOpaqueToken, isCustomerOAuthStateFresh, safeCustomerReturnTo } from "./core";
import { assertCustomerPolicyAcceptance, assertPresentedPolicyVersions, getPublicCustomerAuthLegalDocuments } from "./legal";
import { tokenSchema } from "./password-validation";

export const GOOGLE_CONSENT_COOKIE = "niuva_google_consent";
export const GOOGLE_CONSENT_MAX_AGE_SECONDS = 600;
export const googleConsentSchema = z.object({
  consent: z.literal("on"), ageDeclaration: ageDeclarationSchema,
  termsVersion: z.string().max(100), privacyVersion: z.string().max(100),
  returnTo: z.string().max(2048).optional(),
});
export type PublicGoogleRegistration = Readonly<{ consentToken: string; state: string; returnTo: string }>;
export interface GoogleConsentRepositoryPort {
  issue(data: Omit<CustomerGoogleConsent, "oauthStateHash" | "consumedAt">): Promise<void>;
  bind(tokenHash: string, state: string, returnTo: string, now: Date): Promise<void>;
}

export function assertPublicGoogleConsent(proof: CustomerGoogleConsent | null, now: Date, registration?: PublicGoogleRegistration): asserts proof is CustomerGoogleConsent {
  if (!proof || proof.consumedAt || proof.expiresAt <= now) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
  assertCustomerPolicyAcceptance(proof, now, false, getPublicCustomerAuthLegalDocuments());
  if (registration && (!isCustomerOAuthStateFresh(registration.state, now.getTime())
    || proof.oauthStateHash !== hashOpaqueToken(registration.state)
    || proof.returnTo !== safeCustomerReturnTo(registration.returnTo))) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
}

export class GoogleConsentRepository implements GoogleConsentRepositoryPort {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}
  async issue(data: Omit<CustomerGoogleConsent, "oauthStateHash" | "consumedAt">): Promise<void> {
    await this.prisma.customerGoogleConsent.create({ data });
  }
  async bind(tokenHash: string, state: string, returnTo: string, now: Date): Promise<void> {
    await this.prisma.$transaction(async tx => {
      const proof = await tx.customerGoogleConsent.findUnique({ where: { tokenHash } });
      assertPublicGoogleConsent(proof, now);
      if (!isCustomerOAuthStateFresh(state, now.getTime()) || proof.returnTo !== safeCustomerReturnTo(returnTo)) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
      const bound = await tx.customerGoogleConsent.updateMany({
        where: { tokenHash, oauthStateHash: null, consumedAt: null, expiresAt: { gt: now } },
        data: { oauthStateHash: hashOpaqueToken(state) },
      });
      if (bound.count !== 1) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
    });
  }
}

export class GoogleConsentService {
  constructor(readonly repository: GoogleConsentRepositoryPort = new GoogleConsentRepository()) {}
  async accept(raw: unknown, now = new Date()): Promise<string> {
    const input = googleConsentSchema.parse(raw);
    const legal = getPublicCustomerAuthLegalDocuments();
    if (!legal) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
    assertPresentedPolicyVersions(input, legal);
    const token = createOpaqueToken();
    await this.repository.issue({ tokenHash: hashOpaqueToken(token), returnTo: safeCustomerReturnTo(input.returnTo),
      termsVersion: legal.terms.version, privacyVersion: legal.privacy.version, acceptedAt: now,
      ageDeclarationVersion: AGE_DECLARATION_VERSION, ageDeclaredAt: now,
      expiresAt: new Date(now.getTime() + GOOGLE_CONSENT_MAX_AGE_SECONDS * 1000) });
    return token;
  }
  async bind(token: string, state: string, returnTo: string, now = new Date()): Promise<void> {
    tokenSchema.parse(token);
    if (!getPublicCustomerAuthLegalDocuments()) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
    await this.repository.bind(hashOpaqueToken(token), state, returnTo, now);
  }
}
