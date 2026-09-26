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
  ): Promise<CustomerLoginResult> {
    const now = this.clock();
    const customer = await this.repository.upsertGoogleCustomer(identity, now);
    const sessionToken = this.randomToken();
    const expiresAt = new Date(
      now.getTime() + CUSTOMER_SESSION_MAX_AGE_SECONDS * 1_000,
    );

    await this.repository.createSession({
      customerId: customer.id,
      expiresAt,
      tokenHash: hashOpaqueToken(sessionToken),
    });

    return { customer, expiresAt, sessionToken };
  }
}
