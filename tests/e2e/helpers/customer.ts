import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, type BrowserContext, type Page } from "@playwright/test";

const statePath = join(process.cwd(), "test-results", "customer-auth-state.json");

export async function loginCustomer(page: Page): Promise<void> {
  try {
    const saved = JSON.parse(await readFile(statePath, "utf8")) as {
      cookies: Parameters<BrowserContext["addCookies"]>[0];
    };
    await page.context().addCookies(saved.cookies);
    await page.goto("/account");
    if (await page.getByRole("heading", { level: 1, name: "Pekerjaan dan order Anda." }).isVisible()) return;
  } catch {
    // The first test creates the local mock Customer session.
  }
  await page.goto("/register?returnTo=/account");
  await page.getByRole("link", { name: "Lanjutkan dengan Google" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { level: 1, name: "Pekerjaan dan order Anda." })).toBeVisible();
  await mkdir(join(process.cwd(), "test-results"), { recursive: true });
  await page.context().storageState({ path: statePath });
}
