import { createOpaqueToken, hashOpaqueToken, normalizeCustomerEmail, safeCustomerReturnTo } from "./core";
import { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH, registrationSchema, loginSchema, emailSchema, passwordSchema, tokenSchema } from "./password";
import { CustomerEmailRepository } from "./email-repository";
import { createCustomerAuthProofDelivery } from "../outbox/runtime";
import type { CustomerAuthProofDelivery } from "../outbox/producer";
import { assertCustomerPolicyAcceptance, assertPresentedPolicyVersions, getCustomerAuthLegalDocuments, type CustomerAuthLegalDocuments } from "./legal";
import { appError } from "@/modules/shared/errors";
import { AGE_DECLARATION_VERSION } from "./age-declaration";
import { assertInternalEmail, getInternalAuthConfig, internalExpiry, capInternalExpiry, assertInternalAccountActive, INTERNAL_TERMS_VERSION } from "./internal-testing";

export class CustomerEmailService {
  constructor(
    readonly repository = new CustomerEmailRepository(),
    readonly delivery: CustomerAuthProofDelivery | null = createCustomerAuthProofDelivery(repository),
    readonly legal: CustomerAuthLegalDocuments | null = getCustomerAuthLegalDocuments(),
    readonly clock: () => Date = () => new Date(),
  ) {}
  private currentLegal(): CustomerAuthLegalDocuments | null {
    return this.legal?.terms.version.startsWith("NIUVA-") || this.legal?.privacy.version.startsWith("NIUVA-")
      ? getCustomerAuthLegalDocuments() : this.legal;
  }
  async throttle(action: "login" | "register" | "resend" | "forgot-password" | "reset-password" | "verify", email: string, ip: string) {
    const login = action === "login";
    const windowMs = login || action === "verify" ? 900000 : 3600000;
    const now = this.clock();
    await this.repository.limit(`ip:${action}:${hashOpaqueToken(ip)}`, login ? 30 : 20, windowMs, now);
    await this.repository.limit(`email:${action}:${hashOpaqueToken(email)}`, login ? 5 : action === "verify" ? 10 : 3, windowMs, now);
  }
  async register(raw: unknown, ip: string): Promise<{ handle: string | null; sent: boolean; queued?: boolean }> {
    const legal = this.currentLegal();
    if (!legal || !this.delivery) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
    const input = registrationSchema.parse(raw);
    assertPresentedPolicyVersions(input, legal);
    const normalizedEmail = normalizeCustomerEmail(input.email);
    const now = this.clock();
    const internal = getInternalAuthConfig();
    if (internal || legal.terms.version === INTERNAL_TERMS_VERSION) assertInternalEmail(normalizedEmail, "password", internal);
    await this.throttle("register", normalizedEmail, ip);
    const passwordHash = await hashPassword(input.password);
    // Never mutate credentials of an existing account through registration.
    if (await this.repository.findCredential(normalizedEmail)) return { handle: null, sent: false };
    const handle = createOpaqueToken();
    const pending = await this.repository.createPending({ handleHash: hashOpaqueToken(handle), email: input.email, normalizedEmail, displayName: input.name, passwordHash,
      termsVersion: legal.terms.version, privacyVersion: legal.privacy.version, consentAt: now,
      ageDeclarationVersion: AGE_DECLARATION_VERSION, ageDeclaredAt: now,
      expiresAt: new Date(now.getTime() + 86400000), internalTestExpiresAt: internal ? internalExpiry(now) : null });
    try {
      const state = await this.send("verify", pending.email, safeCustomerReturnTo(input.returnTo), { pendingId: pending.id });
      return { handle, sent: state === "accepted", queued: state === "queued" };
    } catch { return { handle, sent: false }; }
  }
  async send(purpose: "verify" | "reset", to: string, returnTo: string, owner: { pendingId?: string; customerId?: string }) {
    if (!this.delivery) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
    const token = createOpaqueToken();
    if (purpose === "verify" && !owner.pendingId || purpose === "reset" && !owner.customerId || owner.pendingId && owner.customerId) throw appError("VALIDATION_ERROR");
    return this.delivery.issue({ to, token, purpose, returnTo: safeCustomerReturnTo(returnTo), owner: purpose === "verify" ? { pendingId: owner.pendingId! } : { customerId: owner.customerId! } });
  }
  async login(raw: unknown, ip: string) {
    const input = loginSchema.parse(raw);
    const email = normalizeCustomerEmail(input.email);
    await this.throttle("login", email, ip);
    const customer = await this.repository.findCredential(email);
    const valid = await verifyPassword(input.password, customer?.passwordCredential?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!valid || !customer?.passwordCredential || !customer.emailVerifiedAt) throw appError("UNAUTHORIZED", { message: "Email atau password belum cocok." });
    const now = this.clock();
    assertInternalAccountActive(customer.internalTestExpiresAt, now);
    const expiresAt = capInternalExpiry(new Date(now.getTime() + (input.remember === "on" ? 2592000 : 86400) * 1000), customer.internalTestExpiresAt);
    const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
    const token = createOpaqueToken();
    await this.repository.createPasswordSession({
      customerId: customer.id,
      expectedHash: customer.passwordCredential.passwordHash,
      tokenHash: hashOpaqueToken(token),
      expiresAt,
    }, now);
    return { token, remember: input.remember === "on", maxAge, returnTo: safeCustomerReturnTo(input.returnTo) };
  }
  async resend(handle: string, returnTo: string, ip: string) {
    const now = this.clock();
    const pending = await this.repository.findPending(tokenSchema.parse(handle), now);
    if (!pending) throw appError("VALIDATION_ERROR");
    assertCustomerPolicyAcceptance({ ...pending, acceptedAt: pending.consentAt }, now, Boolean(pending.internalTestExpiresAt), this.currentLegal());
    if (pending.internalTestExpiresAt) assertInternalEmail(pending.email, "password");
    await this.throttle("resend", pending.normalizedEmail, ip);
    if (pending.sentAt && now.getTime() - pending.sentAt.getTime() < 60_000) throw appError("RATE_LIMITED");
    return this.send("verify", pending.email, returnTo, { pendingId: pending.id });
  }
  async verify(token: string, ip: string) {
    tokenSchema.parse(token);
    await this.throttle("verify", hashOpaqueToken(token), ip);
    return this.repository.consumeVerification(token, this.clock(), this.legal);
  }
  async forgot(emailInput: unknown, returnTo: string, ip: string) {
    if (!this.delivery) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
    const email = normalizeCustomerEmail(emailSchema.parse(emailInput));
    await this.throttle("forgot-password", email, ip);
    const started = Date.now();
    const customer = await this.repository.findCredential(email);
    if (customer?.passwordCredential && customer.emailVerifiedAt && (!customer.internalTestExpiresAt || customer.internalTestExpiresAt > this.clock())) {
      try { await this.send("reset", customer.email, returnTo, { customerId: customer.id }); }
      catch { /* Keep account existence and provider outcome private. No success-delivery claim in UI. */ }
    }
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 1500 - (Date.now() - started))));
  }
  async reset(token: string, password: unknown, confirm: unknown, ip: string) {
    tokenSchema.parse(token);
    const value = passwordSchema.parse(password);
    if (value !== confirm) throw appError("VALIDATION_ERROR", { details: { confirmPassword: "Konfirmasi password belum cocok." } });
    const record = await this.repository.findToken(token, "reset", this.clock());
    await this.throttle("reset-password", record?.customer?.normalizedEmail ?? hashOpaqueToken(token), ip);
    if (!record) throw appError("VALIDATION_ERROR");
    return this.repository.consumeReset(token, await hashPassword(value), this.clock());
  }
}
