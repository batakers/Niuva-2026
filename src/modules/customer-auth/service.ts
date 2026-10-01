import { getCustomerAuthLegalDocuments } from "./legal";
import { capInternalExpiry, getInternalAuthConfig, assertInternalAccountActive } from "./internal-testing";
import {
  CUSTOMER_SESSION_MAX_AGE_SECONDS,
  createOpaqueToken,
  hashOpaqueToken,
  type CustomerGoogleIdentity,
} from "./core";
import {
  CustomerAuthRepository,
  type CustomerAuthRepositoryPort,
  type CustomerProfile,
} from "./repository";

export type CustomerLoginResult = Readonly<{
  customer: CustomerProfile;
  expiresAt: Date;
  sessionToken: string;
}>;

export type CustomerAuthServiceDependencies = Readonly<{
  now?: () => Date;
  randomToken?: () => string;
  repository?: CustomerAuthRepositoryPort;
}>;

export class CustomerAuthService {
  private readonly clock: () => Date;
  private readonly randomToken: () => string;
  private readonly repository: CustomerAuthRepositoryPort;

  constructor(dependencies: CustomerAuthServiceDependencies = {}) {
    this.clock = dependencies.now ?? (() => new Date());
    this.randomToken = dependencies.randomToken ?? createOpaqueToken;
    this.repository = dependencies.repository ?? new CustomerAuthRepository();
  }

  async completeGoogleLogin(
    identity: CustomerGoogleIdentity,
    consentToken?: string,
  ): Promise<CustomerLoginResult> {
    const now = this.clock();
    const internal = getInternalAuthConfig();
    const customer = await this.repository.upsertGoogleCustomer(identity, now, getCustomerAuthLegalDocuments() !== null, internal ? { config: internal, consentToken } : undefined);
    assertInternalAccountActive(customer.internalTestExpiresAt, now);
    const sessionToken = this.randomToken();
    const expiresAt = capInternalExpiry(new Date(
      now.getTime() + CUSTOMER_SESSION_MAX_AGE_SECONDS * 1_000,
    ), customer.internalTestExpiresAt);

    await this.repository.createSession({
      customerId: customer.id,
      expiresAt,
      tokenHash: hashOpaqueToken(sessionToken),
    });

    return { customer, expiresAt, sessionToken };
  }
}
