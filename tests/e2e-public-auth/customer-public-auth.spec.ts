import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { PrismaClient, type Customer } from "../../src/generated/prisma/client";
import { getSafeTestDatabaseUrl } from "../../src/lib/db/test-safety";
import { AGE_DECLARATION_VERSION } from "../../src/modules/customer-auth/age-declaration";
import { hashOpaqueToken } from "../../src/modules/customer-auth/core";
import { isolatedActorHeaders } from "../e2e/helpers/actor";
import { drainCustomerOutbox } from "../e2e/helpers/outbox";

const connectionString = getSafeTestDatabaseUrl({
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL ?? (process.env.CI ? "postgresql://niuva_test@127.0.0.1:5432/niuva_test?schema=public" : undefined),
});
if (!["127.0.0.1", "localhost"].includes(new URL(connectionString).hostname)) {
  throw new Error("Public auth browser fixtures require an isolated loopback test database.");
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 2 }) });
const password = "public browser fixture passphrase";
const fixtureEmails = new Set<string>();
let externalRequests: string[];
let requestActorHeaders: Record<string, string>;

function fixtureEmail() {
  const email = `public-browser-${randomUUID()}@example.test`;
  fixtureEmails.add(email);
  return email;
}

async function syntheticToken(email: string, purpose: "verify" | "reset") {
  await drainCustomerOutbox();
  const content = await readFile(join(process.cwd(), "test-results/customer-email-test-outbox.jsonl"), "utf8");
  const messages = content.trim().split("\n").map(line => JSON.parse(line) as {
    to: string; purpose: string; token: string; fixture: boolean;
  });
  const message = messages.filter(item => item.fixture && item.to === email && item.purpose === purpose).at(-1);
  expect(message, "the local synthetic outbox contains the requested proof").toBeDefined();
  return message!.token;
}

async function register(page: Page, email: string, javaScriptEnabled = true) {
  await page.goto("/register?returnTo=%2Faccount");
  if (javaScriptEnabled) await expect(page.locator('form[action="/api/auth/email/register"]')).toHaveAttribute("data-enhanced", "true");
  await page.getByLabel("Nama lengkap").fill("Public Browser Fixture");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Konfirmasi password", { exact: true }).fill(password);
  await page.getByRole("checkbox", { name: /Saya menyetujui/ }).check();
  await page.getByRole("checkbox", { name: /Saya menyatakan/ }).check();
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await expect(page).toHaveURL(/\/verify-email\?/);
}

async function verify(page: Page, email: string) {
  const token = await syntheticToken(email, "verify");
  await page.goto(`/verify-email?token=${token}`);
  await page.getByRole("button", { name: "Verifikasi email", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?/);
  return token;
}

async function login(page: Page, email: string, value = password) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(value);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
}

function post(context: BrowserContext, page: Page, action: string, form: Record<string, string>) {
  return context.request.post(`/api/auth/email/${action}`, {
    headers: { ...requestActorHeaders, Origin: new URL(page.url()).origin, Accept: "application/json" }, form,
  });
}

test.beforeEach(async ({ context, page }, testInfo) => {
  requestActorHeaders = isolatedActorHeaders(testInfo);
  await context.setExtraHTTPHeaders(requestActorHeaders);
  await page.emulateMedia({ reducedMotion: "reduce" });
  externalRequests = [];
  await context.route("**/*", async route => {
    const target = new URL(route.request().url());
    if (["http:", "https:"].includes(target.protocol) && !["localhost", "127.0.0.1"].includes(target.hostname)) {
      externalRequests.push(target.origin);
      await route.abort();
    } else await route.continue();
  });
  const verificationPage = await context.request.get("/verify-email", { headers: requestActorHeaders });
  expect(verificationPage.status(), "the token-free verification route is warm before signup navigation").toBe(200);
});

test.afterEach(async () => {
  const emails = [...fixtureEmails];
  await prisma.customerPendingRegistration.deleteMany({ where: { normalizedEmail: { in: emails } } });
  await prisma.customer.deleteMany({ where: { normalizedEmail: { in: emails } } });
  fixtureEmails.clear();
  expect(externalRequests, "public signup must stay inside the local synthetic harness").toEqual([]);
});

test.afterAll(async () => { await prisma.$disconnect(); });

for (const javaScriptEnabled of [true, false]) {
  test.describe(`T13 public email consent with JavaScript=${javaScriptEnabled}`, () => {
    test.use({ javaScriptEnabled, viewport: { width: javaScriptEnabled ? 1280 : 390, height: 900 } });

    test("verifies official consent through an explicit POST without granting a session or consuming GET links", async ({ page, context }) => {
      const email = fixtureEmail();
      const startedAt = new Date();
      await register(page, email, javaScriptEnabled);
      const pending = await prisma.customerPendingRegistration.findFirstOrThrow({ where: { normalizedEmail: email } });
      expect(pending.completedAt).toBeNull();
      expect(pending.consentAt.getTime()).toBeGreaterThanOrEqual(startedAt.getTime());
      expect(pending.ageDeclarationVersion).toBe(AGE_DECLARATION_VERSION);
      expect(pending.ageDeclaredAt).toEqual(pending.consentAt);
      expect(await prisma.customer.count({ where: { normalizedEmail: email } })).toBe(0);
      await page.goto("/account");
      await expect(page).toHaveURL(/\/login\?/);
      const token = await syntheticToken(email, "verify");
      await page.goto(`/verify-email?token=${token}`);
      await page.reload();
      if (javaScriptEnabled) await expect(page.locator('form[action="/api/auth/email/verify"]')).toHaveAttribute("data-enhanced", "true");
      await expect(page.getByRole("button", { name: "Verifikasi email", exact: true })).toBeVisible();
      expect((await prisma.customerEmailToken.findUniqueOrThrow({ where: { tokenHash: hashOpaqueToken(token) } })).consumedAt).toBeNull();
      expect(await prisma.customer.count({ where: { normalizedEmail: email } })).toBe(0);
      await page.getByRole("button", { name: "Verifikasi email", exact: true }).click();
      await expect(page).toHaveURL(/\/login\?/);
      expect((await context.cookies()).some(cookie => cookie.name === "niuva_customer_session")).toBe(false);
      const customer = await prisma.customer.findUniqueOrThrow({ where: { normalizedEmail: email }, include: { consents: true, sessions: true } });
      expect(customer.emailVerifiedAt).not.toBeNull();
      expect(customer.sessions).toEqual([]);
      expect(customer.consents).toHaveLength(1);
      const replay = await post(context, page, "verify", { token });
      expect(replay.status()).toBe(422);
      expect(await prisma.customerConsent.count({ where: { customerId: customer.id } })).toBe(1);
      expect(customer.consents[0]).toMatchObject({
        termsVersion: "NIUVA-TERMS-v1.0", privacyVersion: "NIUVA-PRIVACY-v1.0",
        acceptedAt: pending.consentAt, ageDeclarationVersion: AGE_DECLARATION_VERSION, ageDeclaredAt: pending.ageDeclaredAt,
      });
    });
  });
}

for (const viewport of [
  { name: "desktop", size: { width: 1280, height: 900 } },
  { name: "mobile", size: { width: 390, height: 844 } },
]) {
  for (const javaScriptEnabled of [true, false]) {
    test.describe(`Customer auth routes ${viewport.name}, JavaScript=${javaScriptEnabled}`, () => {
      test.use({ viewport: viewport.size, javaScriptEnabled });

      test("registration and login keep their controls visible and keyboard reachable", async ({ page }) => {
        await page.goto("/register");
        const skipLink = page.getByRole("link", { name: "Lewati ke konten utama" });
        await page.keyboard.press("Tab");
        await expect(skipLink).toBeFocused();
        await expect(skipLink).toBeVisible();
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await expect(page.getByLabel("Nama lengkap", { exact: true })).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

        await page.goto("/login");
        await page.keyboard.press("Tab");
        await expect(page.getByRole("link", { name: "Lewati ke konten utama" })).toBeFocused();
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      });
    });
  }
}

test("T13 direct signup rejects missing consent and a separate missing age declaration without issuing a session", async ({ page, context }) => {
  await page.goto("/register");
  for (const missing of ["consent", "ageDeclaration"]) {
    const email = fixtureEmail();
    const form: Record<string, string> = {
      name: "Public Browser Fixture", email, password, confirmPassword: password, consent: "on", ageDeclaration: "on",
      termsVersion: "NIUVA-TERMS-v1.0", privacyVersion: "NIUVA-PRIVACY-v1.0",
    };
    delete form[missing];
    const response = await post(context, page, "register", form);
    expect(response.status()).toBe(422);
    expect(await prisma.customerPendingRegistration.count({ where: { normalizedEmail: email } })).toBe(0);
    expect(await prisma.customer.count({ where: { normalizedEmail: email } })).toBe(0);
    expect(response.headers()["set-cookie"]).toBeUndefined();
  }
});

test("T13 resend enforces cooldown and makes only the replacement link usable", async ({ page, context }) => {
  const email = fixtureEmail();
  await register(page, email);
  const token = await syntheticToken(email, "verify");
  const pending = await prisma.customerPendingRegistration.findFirstOrThrow({ where: { normalizedEmail: email } });
  const cooldown = await post(context, page, "resend", { returnTo: "/account" });
  const cooldownBody: unknown = await cooldown.json();
  const diagnostic: { message?: string; fields?: Record<string, string> } = {};
  if (cooldownBody && typeof cooldownBody === "object") {
    if ("message" in cooldownBody && typeof cooldownBody.message === "string") diagnostic.message = cooldownBody.message;
    if ("fields" in cooldownBody && cooldownBody.fields && typeof cooldownBody.fields === "object" && !Array.isArray(cooldownBody.fields)) {
      diagnostic.fields = Object.fromEntries(Object.entries(cooldownBody.fields).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
    }
  }
  expect(cooldown.status(), JSON.stringify(diagnostic)).toBe(429);
  // Advance only the synthetic fixture's send timestamp; the real server cooldown remains intact.
  await prisma.customerPendingRegistration.update({ where: { id: pending.id }, data: { sentAt: new Date(Date.now() - 60_001) } });
  const resend = await post(context, page, "resend", { returnTo: "/account" });
  expect(resend.status()).toBe(200);
  const replacement = await syntheticToken(email, "verify");
  expect(replacement).not.toBe(token);
  const oldLink = await post(context, page, "verify", { token });
  expect(oldLink.status()).toBe(422);
  expect(await prisma.customer.count({ where: { normalizedEmail: email } })).toBe(0);
  const newLink = await post(context, page, "verify", { token: replacement });
  expect(newLink.status()).toBe(200);
  const customer = await prisma.customer.findUniqueOrThrow({ where: { normalizedEmail: email }, include: { consents: true, sessions: true } });
  expect(customer.sessions).toEqual([]);
  expect(customer.consents[0].acceptedAt).toEqual(pending.consentAt);
  expect(customer.consents[0].ageDeclaredAt).toEqual(pending.ageDeclaredAt);
});

test("T13 expired verification rejects both the page and direct POST without completing the pending signup", async ({ page, context }) => {
  const email = fixtureEmail();
  await register(page, email);
  const token = await syntheticToken(email, "verify");
  await prisma.customerEmailToken.update({ where: { tokenHash: hashOpaqueToken(token) }, data: { expiresAt: new Date(Date.now() - 1_000) } });
  await page.goto(`/verify-email?token=${token}`);
  await expect(page.getByRole("button", { name: "Verifikasi email", exact: true })).toHaveCount(0);
  const response = await post(context, page, "verify", { token });
  expect(response.status()).toBe(422);
  expect(await prisma.customer.count({ where: { normalizedEmail: email } })).toBe(0);
  expect((await prisma.customerPendingRegistration.findFirstOrThrow({ where: { normalizedEmail: email } })).completedAt).toBeNull();
});

test("T13 reset GET is read-only, reset POST revokes every browser session, and replay cannot change the password", async ({ page, context, browser }, testInfo) => {
  const email = fixtureEmail();
  await register(page, email);
  await verify(page, email);
  await login(page, email);
  const originalCookie = (await context.cookies()).find(cookie => cookie.name === "niuva_customer_session")!;
  expect(originalCookie).toBeDefined();
  const sibling = await browser.newContext({ baseURL: testInfo.project.use.baseURL, extraHTTPHeaders: isolatedActorHeaders(testInfo, "second-session") });
  try {
    const secondPage = await sibling.newPage();
    await login(secondPage, email);
    await page.goto("/forgot-password");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Kirim tautan pemulihan" }).click();
    await expect(page.getByText("Permintaan pemulihan diterima.")).toBeVisible();
    const token = await syntheticToken(email, "reset");
    const customer = await prisma.customer.findUniqueOrThrow({ where: { normalizedEmail: email } });
    await page.goto(`/reset-password?token=${token}`);
    await page.reload();
    expect((await prisma.customerEmailToken.findUniqueOrThrow({ where: { tokenHash: hashOpaqueToken(token) } })).consumedAt).toBeNull();
    expect(await prisma.customerSession.count({ where: { customerId: customer.id, revokedAt: null } })).toBe(2);
    const replacement = "new public browser fixture passphrase";
    await page.getByLabel("Password baru", { exact: true }).fill(replacement);
    await page.getByLabel("Konfirmasi password", { exact: true }).fill(replacement);
    await page.getByRole("button", { name: "Simpan password baru" }).click();
    await expect(page.getByText("Password berhasil diperbarui.")).toBeVisible();
    expect(await prisma.customerSession.count({ where: { customerId: customer.id, revokedAt: null } })).toBe(0);
    await context.addCookies([originalCookie]);
    for (const currentPage of [page, secondPage]) {
      await currentPage.goto("/account");
      await expect(currentPage).toHaveURL(/\/login\?/);
    }
    const replay = await post(context, page, "reset-password", { token, password, confirmPassword: password });
    expect(replay.status()).toBe(422);
    await login(page, email, replacement);
  } finally { await sibling.close(); }
});

const googleSubject = "local-demo-google-subject";
const googleEmail = "demo-customer@example.test";
const googleProofHashes = new Set<string>();
let originalGoogleCustomer: Customer | null;

async function googlePost(context: BrowserContext, page: Page, overrides: Record<string, string> = {}) {
  const response = await context.request.post("/api/auth/google/consent", {
    headers: { ...requestActorHeaders, Origin: new URL(page.url()).origin, Accept: "application/json" },
    form: { consent: "on", ageDeclaration: "on", termsVersion: "NIUVA-TERMS-v1.0", privacyVersion: "NIUVA-PRIVACY-v1.0", returnTo: "/account", ...overrides },
  });
  const cookie = (await context.cookies()).find(item => item.name === "niuva_google_consent");
  if (cookie) googleProofHashes.add(hashOpaqueToken(cookie.value));
  return response;
}

async function googleAttempt(context: BrowserContext, page: Page) {
  const response = await googlePost(context, page);
  expect(response.status()).toBe(200);
  const payload = await response.json() as { destination: string };
  expect(payload.destination).toBe("/api/auth/google/start?returnTo=%2Faccount");
  const cookie = (await context.cookies()).find(item => item.name === "niuva_google_consent");
  expect(cookie).toBeDefined();
  const start = await context.request.get(payload.destination, { maxRedirects: 0, headers: requestActorHeaders });
  expect(start.status()).toBe(307);
  const callback = new URL(start.headers().location, page.url());
  expect(callback.origin).toBe(new URL(page.url()).origin);
  expect(callback.pathname).toBe("/api/auth/google/callback");
  return { cookie: cookie!, callback };
}

test.describe("T12 public Google signup through the local OAuth provider fixture", () => {
  test.beforeEach(async ({ page }) => {
    originalGoogleCustomer = await prisma.customer.findUnique({ where: { googleSubject } });
    if (originalGoogleCustomer) {
      expect(originalGoogleCustomer.normalizedEmail).toBe(googleEmail);
      const customerId = originalGoogleCustomer.id;
      const business = await Promise.all([
        prisma.order.count({ where: { customerId } }),
        prisma.customPrintRequest.count({ where: { customerId } }),
        prisma.b2BInquiry.count({ where: { customerId } }),
      ]);
      expect(business, "only the isolated global-setup OAuth actor may be replaced").toEqual([0, 0, 0]);
      await prisma.customer.delete({ where: { id: customerId } });
    }
    await page.goto("/register/google?returnTo=%2Faccount");
  });

  test.afterEach(async () => {
    await prisma.customer.deleteMany({ where: { googleSubject, normalizedEmail: googleEmail } });
    await prisma.customerGoogleConsent.deleteMany({ where: { tokenHash: { in: [...googleProofHashes] } } });
    googleProofHashes.clear();
    await prisma.customer.create({ data: originalGoogleCustomer ?? { email: googleEmail, normalizedEmail: googleEmail, googleSubject, displayName: "Demo Customer", emailVerifiedAt: new Date() } });
  });

  for (const javaScriptEnabled of [true, false]) {
    test.describe(`Google consent JavaScript=${javaScriptEnabled}`, () => {
      test.use({ javaScriptEnabled, viewport: { width: javaScriptEnabled ? 1280 : 390, height: 900 } });

      test("requires separate explicit declarations and binds the official consent to the verified callback identity", async ({ page, context }) => {
        if (javaScriptEnabled) await expect(page.locator('form[action="/api/auth/google/consent"]')).toHaveAttribute("data-enhanced", "true");
        const captured: { cookie?: Awaited<ReturnType<BrowserContext["cookies"]>>[number]; unconsumed?: boolean; unbound?: boolean } = {};
        await page.route(/\/api\/auth\/google\/start\?/, async route => {
          captured.cookie = (await context.cookies()).find(item => item.name === "niuva_google_consent");
          if (captured.cookie) {
            const hash = hashOpaqueToken(captured.cookie.value);
            googleProofHashes.add(hash);
            const proof = await prisma.customerGoogleConsent.findUniqueOrThrow({ where: { tokenHash: hash } });
            captured.unconsumed = proof.consumedAt === null;
            captured.unbound = proof.oauthStateHash === null;
          }
          await route.continue();
        });
        const policy = page.getByRole("checkbox", { name: /Saya menyetujui/ });
        const age = page.getByRole("checkbox", { name: /Saya menyatakan/ });
        await expect(policy).not.toBeChecked();
        await expect(age).not.toBeChecked();
        await expect(page.locator('input[name="termsVersion"]')).toHaveValue("NIUVA-TERMS-v1.0");
        await expect(page.locator('input[name="privacyVersion"]')).toHaveValue("NIUVA-PRIVACY-v1.0");
        await policy.check();
        await age.focus();
        await page.keyboard.press("Space");
        await expect(age).toBeChecked();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.getByRole("button", { name: "Setuju dan lanjutkan ke Google", exact: true }).click();
        if (!javaScriptEnabled) {
          await expect(page).toHaveURL(/\/register\/google\?continue=1&/);
          await page.getByRole("link", { name: "Lanjutkan ke Google", exact: true }).click();
        }
        await expect(page).toHaveURL(/\/account$/);
        expect(captured.cookie).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/api/auth/google" });
        expect(captured.unconsumed).toBe(true);
        expect(captured.unbound).toBe(true);
        const customer = await prisma.customer.findUniqueOrThrow({ where: { googleSubject }, include: { consents: true, sessions: true } });
        const proof = await prisma.customerGoogleConsent.findUniqueOrThrow({ where: { tokenHash: hashOpaqueToken(captured.cookie!.value) } });
        expect(customer.normalizedEmail).toBe(googleEmail);
        expect(customer.consents).toHaveLength(1);
        expect(customer.sessions).toHaveLength(1);
        expect(customer.consents[0]).toMatchObject({ method: "google", termsVersion: "NIUVA-TERMS-v1.0", privacyVersion: "NIUVA-PRIVACY-v1.0", acceptedAt: proof.acceptedAt, ageDeclarationVersion: AGE_DECLARATION_VERSION, ageDeclaredAt: proof.ageDeclaredAt });
        expect(proof.consumedAt).not.toBeNull();
        expect(proof.oauthStateHash).not.toBeNull();
      });
    });
  }

  test("direct Google callback without consent cannot create an ordinary account", async ({ page, context }) => {
    await page.goto("/api/auth/google/start?returnTo=%2Faccount");
    await expect(page).toHaveURL(/\/register\/google\?.*error=registration_unavailable/);
    expect(await prisma.customer.count({ where: { googleSubject } })).toBe(0);
    expect((await context.cookies()).some(cookie => cookie.name === "niuva_customer_session")).toBe(false);
  });

  test("does not accept a callback from another browser session and rejects a consumed proof on existing-account replay", async ({ page, context, browser }, testInfo) => {
    const attempt = await googleAttempt(context, page);
    const oauthCookies = await context.cookies();
    const other = await browser.newContext({ baseURL: testInfo.project.use.baseURL, extraHTTPHeaders: isolatedActorHeaders(testInfo, "other-oauth-session") });
    try {
      const stolen = await other.request.get(attempt.callback.href, { maxRedirects: 0 });
      expect(new URL(stolen.headers().location).pathname).toBe("/login");
      expect(await prisma.customer.count({ where: { googleSubject } })).toBe(0);
      expect((await prisma.customerGoogleConsent.findUniqueOrThrow({ where: { tokenHash: hashOpaqueToken(attempt.cookie.value) } })).consumedAt).toBeNull();
      const completed = await context.request.get(attempt.callback.href, { maxRedirects: 0, headers: requestActorHeaders });
      expect(new URL(completed.headers().location).pathname).toBe("/account");
      const customer = await prisma.customer.findUniqueOrThrow({ where: { googleSubject } });
      expect(await prisma.customerSession.count({ where: { customerId: customer.id } })).toBe(1);
      await context.addCookies(oauthCookies);
      const replay = await context.request.get(attempt.callback.href, { maxRedirects: 0, headers: requestActorHeaders });
      expect(replay.headers()["set-cookie"] ?? "").not.toContain("niuva_customer_session=");
      expect(await prisma.customerSession.count({ where: { customerId: customer.id } })).toBe(1);
      expect(await prisma.customerConsent.count({ where: { customerId: customer.id } })).toBe(1);
    } finally { await other.close(); }
  });

  test("provider denial cannot consume consent or establish a session", async ({ page, context }) => {
    const attempt = await googleAttempt(context, page);
    attempt.callback.searchParams.delete("code");
    attempt.callback.searchParams.set("error", "access_denied");
    const denied = await context.request.get(attempt.callback.href, { maxRedirects: 0, headers: requestActorHeaders });
    expect(new URL(denied.headers().location).pathname).toBe("/login");
    expect(await prisma.customer.count({ where: { googleSubject } })).toBe(0);
    expect((await prisma.customerGoogleConsent.findUniqueOrThrow({ where: { tokenHash: hashOpaqueToken(attempt.cookie.value) } })).consumedAt).toBeNull();
    expect((await context.cookies()).some(cookie => cookie.name === "niuva_customer_session")).toBe(false);
  });

  for (const invalid of ["expiry", "policy-version"] as const) {
    test(`callback rejects changed ${invalid} after OAuth has already bound the proof`, async ({ page, context }) => {
      const attempt = await googleAttempt(context, page);
      await prisma.customerGoogleConsent.update({ where: { tokenHash: hashOpaqueToken(attempt.cookie.value) }, data: invalid === "expiry" ? { expiresAt: new Date(Date.now() - 1_000) } : { privacyVersion: "SYNTHETIC-PREVIOUS-PRIVACY" } });
      const rejected = await context.request.get(attempt.callback.href, { maxRedirects: 0, headers: requestActorHeaders });
      expect(new URL(rejected.headers().location).pathname).toBe("/register/google");
      expect(await prisma.customer.count({ where: { googleSubject } })).toBe(0);
      expect((await prisma.customerGoogleConsent.findUniqueOrThrow({ where: { tokenHash: hashOpaqueToken(attempt.cookie.value) } })).consumedAt).toBeNull();
      expect((await context.cookies()).some(cookie => cookie.name === "niuva_customer_session")).toBe(false);
    });
  }

  test("consent POST rejects non-explicit declarations and stale presented versions before issuing a proof", async ({ page, context }) => {
    const count = await prisma.customerGoogleConsent.count();
    for (const [field, value, status] of [["consent", "off", 422], ["ageDeclaration", "off", 422], ["privacyVersion", "SYNTHETIC-STALE", 503]] as const) {
      const rejected = await googlePost(context, page, { [field]: value });
      expect(rejected.status()).toBe(status);
      expect(await prisma.customerGoogleConsent.count()).toBe(count);
      expect((await context.cookies()).some(cookie => cookie.name === "niuva_google_consent")).toBe(false);
    }
  });
});
