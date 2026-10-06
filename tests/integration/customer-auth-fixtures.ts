import type { PrismaClient } from "@/generated/prisma/client";
import { createOpaqueToken, hashOpaqueToken, type CustomerGoogleIdentity } from "@/modules/customer-auth/core";
import { AGE_DECLARATION_VERSION } from "@/modules/customer-auth/age-declaration";
import { INTERNAL_PRIVACY_VERSION, INTERNAL_TERMS_VERSION } from "@/modules/customer-auth/internal-testing";
import type { InternalGoogleRegistration } from "@/modules/customer-auth/repository";

// Fixture proof enters the same repository transaction as an internal consent.
export async function googleRegistrationProof(prisma: PrismaClient, identity: CustomerGoogleIdentity, now: Date): Promise<InternalGoogleRegistration> {
  const consentToken = createOpaqueToken();
  await prisma.customerInternalGoogleConsent.create({ data: {
    tokenHash: hashOpaqueToken(consentToken), normalizedEmail: identity.normalizedEmail,
    termsVersion: INTERNAL_TERMS_VERSION, privacyVersion: INTERNAL_PRIVACY_VERSION,
    acceptedAt: now, expiresAt: new Date(now.getTime() + 600000),
    ageDeclarationVersion: AGE_DECLARATION_VERSION, ageDeclaredAt: now,
  } });
  return { consentToken, config: { origin: "http://127.0.0.1:3000", googleEmail: identity.normalizedEmail, passwordEmail: "password-fixture@example.test" } };
}
