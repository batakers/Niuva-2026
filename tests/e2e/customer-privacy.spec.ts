import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { isolatedActorHeaders } from "./helpers/actor";

test.beforeEach(async ({ context }, testInfo) => {
  await context.setExtraHTTPHeaders(isolatedActorHeaders(testInfo));
});

async function loginPrivacyFixture(page: Page) {
  const email = `privacy-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
  const password = "Niuva privacy isolated test phrase";
  await page.goto("/register?returnTo=%2Faccount%2Fprivacy");
  await page.getByLabel("Nama lengkap").fill("Customer Privacy Fixture");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Konfirmasi password", { exact: true }).fill(password);
  await page.getByRole("checkbox", { name: /Saya menyetujui/ }).check();
  await page.getByRole("checkbox", { name: /Saya menyatakan/ }).check();
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await expect(page).toHaveURL(/\/verify-email\?/);
  const rows = (await readFile(join(process.cwd(), "test-results/customer-email-test-outbox.jsonl"), "utf8")).trim().split("\n").map(line => JSON.parse(line) as { to: string; purpose: string; token: string; fixture: boolean });
  const token = rows.filter(row => row.fixture && row.to === email && row.purpose === "verify").at(-1)!.token;
  await page.goto(`/verify-email?token=${token}&returnTo=%2Faccount%2Fprivacy`);
  await page.getByRole("button", { name: "Verifikasi email", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?/);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/account\/privacy$/);
}

async function privacyToken(purpose: string) {
  const rows = (await readFile(join(process.cwd(), "test-results/customer-privacy-test-outbox.jsonl"), "utf8")).trim().split("\n").map(line => JSON.parse(line) as { purpose: string; token: string; fixture: boolean });
  const mail = rows.filter(row => row.fixture && row.purpose === purpose).at(-1);
  expect(mail).toBeTruthy(); return mail!.token;
}
async function expectInvalidPrivacyLink(page: Page) {
  // Next also mounts a route-announcer alert outside the application main.
  // Replay proof must address the application's refusal, even when it is live.
  const alert = page.getByRole("main").getByRole("alert");
  await expect(alert).toHaveCount(1);
  await expect(alert).toContainText("Tautan tidak berlaku");
}
async function requestExport(page: Page) {
  await page.getByRole("button", { name: "Minta tautan unduhan", exact: true }).click();
  await expect(page).toHaveURL(/status=sent/);
  const token = await privacyToken("EXPORT");
  await page.goto(`/account/privacy/confirm?action=EXPORT&token=${token}`);
  await page.reload();
  await expect(page.getByRole("button", { name: "Unduh JSON data saya" })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Unduh JSON data saya" }).click();
  const path = await (await download).path(); expect(path).toBeTruthy();
  const content = await readFile(path!, "utf8");
  expect(JSON.parse(content)).toMatchObject({ schemaVersion: "niuva.customer-data.v1" });
  for (const key of ["passwordHash", "tokenHash", "sessionHash", "storageKey", "providerResponseJson"]) expect(content).not.toContain(key);
  await page.reload(); await expectInvalidPrivacyLink(page);
}
test("privacy export, corrections, validation, safe replay and responsive Customer route", async ({ page }) => {
  await loginPrivacyFixture(page);
  await expect(page.getByLabel("Data yang salah", { exact: true }).locator("xpath=ancestor::form")).toHaveAttribute("data-enhanced", "true");
  await page.getByLabel("Data yang salah", { exact: true }).fill("Nama");
  await page.getByLabel("Koreksi yang diminta", { exact: true }).fill("Customer Fixture");
  await page.getByRole("button", { name: "Ajukan koreksi" }).click();
  await expect(page.getByLabel("Data yang salah", { exact: true })).toBeFocused();
  await expect(page.getByText("Jelaskan data yang dimaksud, sedikitnya 10 karakter.")).toBeVisible();
  await page.getByLabel("Data yang salah", { exact: true }).fill("Nama profil fixture tidak sesuai untuk pengujian.");
  await page.getByRole("button", { name: "Ajukan koreksi" }).click();
  await expect(page).toHaveURL(/status=received/);
  await expect(page.getByText(/PRV-/).first()).toBeVisible();
  await page.getByLabel("Data yang ingin Anda peroleh", { exact: true }).fill("Minta komunikasi fixture yang belum masuk ekspor otomatis.");
  await page.getByRole("button", { name: "Minta data tambahan", exact: true }).click();
  await expect(page).toHaveURL(/status=received/);
  await expect(page.getByText("Minta komunikasi fixture yang belum masuk ekspor otomatis.", { exact: true }).last()).toBeVisible();
  await requestExport(page);
  await page.goto("/account/privacy");
  await mkdir(join(process.cwd(), "test-results/privacy-captures"), { recursive: true });
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole("button", { name: "Minta tautan unduhan" })).toBeVisible();
    await page.screenshot({ path: `test-results/privacy-captures/customer-${width}.png`, fullPage: true });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/account/privacy"); await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /Lewati/ })).toBeFocused();
});
test("privacy forms and export work without JavaScript on 127.0.0.1", async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, acceptDownloads: true, extraHTTPHeaders: isolatedActorHeaders(testInfo) });
  try {
    const page = await context.newPage(); await loginPrivacyFixture(page);
    const loopback = new URL(baseURL!); loopback.hostname = "127.0.0.1";
    // Test-only session cookie on the second loopback host. The Google mock's
    // configured callback remains localhost, as in the other auth tests.
    await context.addCookies((await context.cookies()).filter(cookie => cookie.name === "niuva_customer_session").map(cookie => ({ ...cookie, domain: "127.0.0.1" })));
    await page.goto(`${loopback.origin}/account/privacy`);
    await expect(page).toHaveURL(/\/account\/privacy$/);
    await page.getByLabel("Data yang ingin Anda peroleh", { exact: true }).fill("Salinan komunikasi untuk fixture formulir tanpa JavaScript.");
    await page.getByRole("button", { name: "Minta data tambahan", exact: true }).click();
    await expect(page).toHaveURL(/status=received/);
    // Keep relative navigation on the same hostname to preserve session binding.
    await page.getByRole("button", { name: "Minta tautan unduhan" }).click();
    await expect(page).toHaveURL(/status=sent/);
    await page.goto(`${loopback.origin}/account/privacy/confirm?action=EXPORT&token=${await privacyToken("EXPORT")}`);
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Unduh JSON data saya" }).click();
    expect((await downloading).suggestedFilename()).toContain("niuva-customer-data");
  } finally { await context.close(); }
});
test("pending restores after navigation and Owner privacy never becomes public", async ({ page }) => {
  await loginPrivacyFixture(page);
  await expect(page.locator('form[action="/api/account/privacy/confirmation-email"]').filter({ has: page.getByRole("button", { name: "Minta tautan unduhan", exact: true }) })).toHaveAttribute("data-enhanced", "true");
  let submits = 0;
  await page.route("**/api/account/privacy/confirmation-email", async route => { submits++; await new Promise(resolve => setTimeout(resolve, 300)); await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Email konfirmasi gagal dikirim.", fields: {} }) }); });
  const action = page.getByRole("button", { name: "Minta tautan unduhan" });
  await action.click(); await expect(action).toBeDisabled();
  await expect(page.getByText("Email konfirmasi gagal dikirim.")).toBeVisible(); await expect(action).toBeEnabled(); expect(submits).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await expect(action).toBeEnabled();
  await page.goto("/admin/privacy"); await expect(page.getByRole("button", { name: "Simpan penanganan" })).toHaveCount(0);
  await page.goto("/admin/privacy/policy"); await expect(page.getByText("DRAFT-TERMS", { exact: false })).toHaveCount(0);
});
test("permanent closure consumes proof, clears access and cannot replay on disposable test account", async ({ page }) => {
  await loginPrivacyFixture(page);
  await page.getByRole("button", { name: "Minta konfirmasi penutupan" }).click();
  await expect(page).toHaveURL(/status=sent/);
  const token = await privacyToken("CLOSE");
  await page.goto(`/account/privacy/confirm?action=CLOSE&token=${token}`);
  await page.reload(); await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Tutup akun secara permanen" }).click();
  await expect(page).toHaveURL(/\/account\/privacy\/closed$/);
  await page.goto("/account"); await expect(page).toHaveURL(/\/login\?/);
  await page.goto(`/account/privacy/confirm?action=CLOSE&token=${token}`);
  await expectInvalidPrivacyLink(page);
});
