import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { isolatedActorHeaders } from "./helpers/actor";
test.beforeEach(async ({ context }, testInfo) => {
  await context.setExtraHTTPHeaders(isolatedActorHeaders(testInfo));
});
const password = "a long test passphrase for niuva";
async function mailToken(email: string, purpose: string) {
  const content = await readFile(join(process.cwd(), "test-results/customer-email-test-outbox.jsonl"), "utf8");
  const lines = content.trim().split("\n").map(line => JSON.parse(line) as { to: string; purpose: string; token: string; fixture: boolean });
  const mail = lines.filter(mail => mail.to === email && mail.purpose === purpose && mail.fixture).at(-1);
  expect(mail, "isolated mock email was recorded").toBeTruthy();
  return mail!.token;
}
async function register(page: Page, email: string) {
  await page.goto("/register?returnTo=%2Faccount");
  await page.getByLabel("Nama lengkap").fill("Customer Email Test");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Konfirmasi password", { exact: true }).fill(password);
  await page.getByRole("checkbox", { name: /Saya menyetujui/ }).check();
  await page.getByRole("checkbox", { name: /Saya menyatakan/ }).check();
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await expect(page).toHaveURL(/\/verify-email\?/);
  await expect(page.getByText(email, { exact: true })).toBeVisible();
}
async function login(page: Page, email: string, value = password) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(value);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
}
test("age declaration stays unchecked, focuses validation, and rejects direct POST across responsive widths", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/register");
    await expect(page.locator('form[action="/api/auth/email/register"]')).toHaveAttribute("data-enhanced", "true");
    const age = page.getByRole("checkbox", { name: "Saya menyatakan bahwa saya berusia 18 tahun atau lebih." });
    await expect(age).not.toBeChecked(); await expect(age).toHaveAttribute("required", "");
    await page.getByLabel("Nama lengkap").fill("Adult Fixture"); await page.getByLabel("Email", { exact: true }).fill("adult-e2e@example.test");
    await page.getByLabel("Password", { exact: true }).fill(password); await page.getByLabel("Konfirmasi password", { exact: true }).fill(password);
    await page.getByRole("checkbox", { name: /Saya menyetujui/ }).check();
    await page.getByRole("button", { name: "Buat akun", exact: true }).click();
    await expect(age).toBeFocused(); await expect(age).toHaveAttribute("aria-invalid", "true");
    await page.keyboard.press("Space"); await expect(age).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  const response = await page.request.post("/api/auth/email/register", { headers: { Origin: new URL(page.url()).origin, Accept: "application/json" }, form: { name: "Adult Fixture", email: "adult-e2e@example.test", password, confirmPassword: password, consent: "on", ageDeclaration: "false" } });
  expect(response.status()).toBe(422); expect(response.headers()["set-cookie"]).toBeUndefined();
  expect(await response.text()).not.toContain("adult-e2e@example.test");
});
test("email registration verifies through POST, login works, reset revokes the session", async ({ page }) => {
  const email = `customer-email-${Date.now()}@example.test`;
  await register(page, email);
  await expect(page.getByText("Email verifikasi dikirim ke")).toBeVisible();
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?/);
  const token = await mailToken(email, "verify");
  await page.goto(`/verify-email?token=${token}`);
  await expect(page.getByRole("button", { name: "Verifikasi email", exact: true })).toBeVisible();
  // GET and refresh do not consume the token (email scanner safety).
  await page.reload();
  await expect(page.getByRole("button", { name: "Verifikasi email", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Verifikasi email", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?/);
  await expect(page.getByText("Email sudah terverifikasi.")).toBeVisible();
  await login(page, email);
  const oldSession = (await page.context().cookies()).find(cookie => cookie.name === "niuva_customer_session")!;
  expect(oldSession.expires).toBe(-1);
  await page.goto("/forgot-password");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Kirim tautan pemulihan" }).click();
  await expect(page.getByText("Permintaan pemulihan diterima.")).toBeVisible();
  const reset = await mailToken(email, "reset");
  await page.goto(`/reset-password?token=${reset}`);
  const nextPassword = "a different long niuva test phrase";
  await page.getByLabel("Password baru", { exact: true }).fill(nextPassword);
  await page.getByLabel("Konfirmasi password", { exact: true }).fill(nextPassword);
  await page.getByRole("button", { name: "Simpan password baru" }).click();
  await expect(page.getByText("Password berhasil diperbarui.")).toBeVisible();
  await page.context().addCookies([oldSession]);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?/);
  await login(page, email, nextPassword);
  await page.goto(`/reset-password?token=${reset}`);
  await expect(page.getByText("Tautan pemulihan tidak dapat digunakan.")).toBeVisible();
});
test("email forms work without JavaScript", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, extraHTTPHeaders: isolatedActorHeaders(testInfo) });
  try {
    const page = await context.newPage();
    const email = `customer-nojs-${Date.now()}@example.test`;
    await register(page, email);
    await page.goto(`/verify-email?token=${await mailToken(email, "verify")}`);
    await page.getByRole("button", { name: "Verifikasi email", exact: true }).click();
    await expect(page).toHaveURL(/\/login\?/);
    await login(page, email);
    await expect(page.getByText(email, { exact: true })).toBeVisible();
  } finally { await context.close(); }
});
test("independent browser actors retain the email IP rate limit", async ({ page }, testInfo) => {
  await page.goto("/forgot-password");
  const origin = new URL(page.url()).origin;
  const nonce = Date.now();
  const submit = (index: number, actorHeaders = isolatedActorHeaders(testInfo)) => page.request.post(
    "/api/auth/email/forgot-password",
    { headers: { ...actorHeaders, Origin: origin, Accept: "application/json" }, form: { email: `actor-limit-${nonce}-${index}@example.test` } },
  );
  // Existing service policy: 20 requests per hour for one IP. Unknown emails
  // exercise the real counter without sending mail or creating accounts.
  const allowed = await Promise.all(Array.from({ length: 20 }, (_, index) => submit(index)));
  expect(allowed.map(response => response.status())).toEqual(Array<number>(20).fill(200));
  const blocked = await submit(20);
  expect(blocked.status()).toBe(429);
  const independent = await submit(20, isolatedActorHeaders(testInfo, "independent-customer"));
  expect(independent.status()).toBe(200);
});
test("inline validation focuses errors and password pending recovers", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("form")).toHaveAttribute("novalidate", "");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
  await expect(page.getByText("Masukkan alamat email yang valid.")).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("invalid");
  await page.getByLabel("Password", { exact: true }).focus();
  await expect(page.getByText("Masukkan alamat email yang valid.")).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("pending@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  let starts = 0;
  await page.route("**/api/auth/email/login", async route => { starts++; await new Promise(resolve => setTimeout(resolve, 1500)); await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Layanan belum tersedia.", fields: {} }) }); });
  const action = page.getByRole("button", { name: "Masuk", exact: true });
  await action.click();
  await expect(action).toBeDisabled();
  await expect(page.getByText("Memproses…")).toBeVisible();
  await expect(page.getByText("Layanan belum tersedia.")).toBeVisible();
  await expect(action).toBeEnabled();
  expect(starts).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await expect(action).toBeEnabled();
});
