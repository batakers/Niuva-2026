import { createOpaqueToken, hashOpaqueToken, normalizeCustomerEmail, safeCustomerReturnTo } from "./core";
import { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH, registrationSchema, loginSchema, emailSchema, passwordSchema, tokenSchema } from "./password";
import { CustomerEmailRepository } from "./email-repository";
import { createCustomerAuthMailer, type CustomerAuthMailer } from "./email-mailer";
import { getCustomerAuthLegalDocuments, type CustomerAuthLegalDocuments } from "./legal";
import { appError } from "@/modules/shared/errors";
import { AGE_DECLARATION_VERSION } from "./age-declaration";
import { assertInternalEmail, getInternalAuthConfig, internalExpiry, capInternalExpiry, assertInternalAccountActive, INTERNAL_TERMS_VERSION } from "./internal-testing";

export class CustomerEmailService {
  constructor(
    readonly repository = new CustomerEmailRepository(),
    readonly mailer: CustomerAuthMailer | null = createCustomerAuthMailer(),
    readonly legal: CustomerAuthLegalDocuments | null = getCustomerAuthLegalDocuments(),
    readonly clock: () => Date = () => new Date(),
  ) {}
  async throttle(action: "login" | "register" | "resend" | "forgot-password" | "reset-password" | "verify", email: string, ip: string) {
    const login = action === "login";
    const windowMs = login || action === "verify" ? 900000 : 3600000;
    const now = this.clock();
    await this.repository.limit(`ip:${action}:${hashOpaqueToken(ip)}`, login ? 30 : 20, windowMs, now);
    await this.repository.limit(`email:${action}:${hashOpaqueToken(email)}`, login ? 5 : action === "verify" ? 10 : 3, windowMs, now);
  }
  async register(raw: unknown, ip: string) {
    if (!this.legal || !this.mailer) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
    const input = registrationSchema.parse(raw);
    const normalizedEmail = normalizeCustomerEmail(input.email);
    const now = this.clock();
    const internal = getInternalAuthConfig();
    if (internal || this.legal.terms.version === INTERNAL_TERMS_VERSION) assertInternalEmail(normalizedEmail, "password", internal);
    await this.throttle("register", normalizedEmail, ip);
    const passwordHash = await hashPassword(input.password);
    // Never mutate credentials of an existing account through registration.
    if (await this.repository.findCredential(normalizedEmail)) return { handle: null, sent: false };
    const handle = createOpaqueToken();
    const pending = await this.repository.createPending({ handleHash: hashOpaqueToken(handle), email: input.email, normalizedEmail, displayName: input.name, passwordHash,
      termsVersion: this.legal.terms.version, privacyVersion: this.legal.privacy.version, consentAt: now,
      ageDeclarationVersion: AGE_DECLARATION_VERSION, ageDeclaredAt: now,
      expiresAt: new Date(now.getTime() + 86400000), internalTestExpiresAt: internal ? internalExpiry(now) : null });
    try {
      await this.send("verify", pending.email, safeCustomerReturnTo(input.returnTo), { pendingId: pending.id });
      return { handle, sent: true };
    } catch { return { handle, sent: false }; }
  }
  async send(purpose: "verify" | "reset", to: string, returnTo: string, owner: { pendingId?: string; customerId?: string }) {
    if (!this.mailer) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
    const token = createOpaqueToken();
    const now = this.clock();
    const deadline = await this.repository.deliveryDeadline(owner, now);
    const record = await this.repository.issueToken({ tokenHash: hashOpaqueToken(token), purpose, ...owner, returnTo: safeCustomerReturnTo(returnTo), expiresAt: capInternalExpiry(new Date(now.getTime() + (purpose === "verify" ? 86400000 : 1800000)), deadline) }, now);
    try { await this.mailer.send({ to, token, purpose, returnTo, idempotencyKey: `customer-${purpose}:${record.id}` }); }
    catch { await this.repository.markDeliveryFailed(record.id, owner.pendingId); throw appError("PROVIDER_UNAVAILABLE"); }
    if (owner.pendingId) await this.repository.confirmDelivery(owner.pendingId);
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
    const pending = await this.repository.findPending(tokenSchema.parse(handle), this.clock());
    if (!pending) throw appError("VALIDATION_ERROR");
    if (pending.internalTestExpiresAt) assertInternalEmail(pending.email, "password");
    await this.throttle("resend", pending.normalizedEmail, ip);
    await this.send("verify", pending.email, returnTo, { pendingId: pending.id });
  }
  async verify(token: string, ip: string) {
    tokenSchema.parse(token);
    await this.throttle("verify", hashOpaqueToken(token), ip);
    return this.repository.consumeVerification(token, this.clock());
  }
  async forgot(emailInput: unknown, returnTo: string, ip: string) {
    if (!this.mailer) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
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
