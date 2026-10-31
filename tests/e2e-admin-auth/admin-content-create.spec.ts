import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "../../src/generated/prisma/client";
import { getSafeTestDatabaseUrl } from "../../src/lib/db/test-safety";
import { createAdminBrowserSession } from "./helpers/session";

let prisma: PrismaClient;
test.use({ actionTimeout: 15_000 });
test.beforeAll(() => { prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL }), max: 2 }) }); });
test.afterAll(async () => { await prisma.$disconnect(); });

for (const role of ["OWNER", "ADMIN"] as const) test(`${role} creates product, opening variant and portfolio drafts from Dashboard`, async ({ page }) => {
  const profile = await createAdminBrowserSession(page, prisma, role), suffix = randomUUID();
  const category = await prisma.category.create({ data: { name: `Kategori fixture ${suffix}`, slug: `browser-category-${suffix}` } });
  await page.goto("/admin/products");
  await page.getByRole("link", { name: "Tambah produk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tambah produk", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: /^Nama produk/ }).fill("Produk browser fixture");
  await page.getByRole("textbox", { name: /^Tautan produk/ }).fill(`browser-product-${suffix}`);
  await page.getByLabel("Kategori", { exact: true }).selectOption({ label: category.name });
  await page.getByRole("textbox", { name: /^Deskripsi produk/ }).fill("Fixture untuk membuktikan pembuatan draft melalui Dashboard.");
  await page.getByRole("button", { name: "Simpan draft produk", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft produk tersimpan");
  const product = await prisma.product.findUniqueOrThrow({ where: { slug: `browser-product-${suffix}` } });
  expect(product.isPublished).toBe(false);
  expect(product.categoryId).toBe(category.id);
  await page.goto(`/admin/products/${product.id}`);
  const variant = page.getByRole("heading", { name: "Tambah varian", exact: true }).locator("..");
  await variant.getByLabel("Nama varian", { exact: true }).fill("Merah fixture");
  await variant.getByLabel("SKU", { exact: true }).fill(`BROWSER-${suffix}`);
  await variant.getByLabel("Harga (Rp)", { exact: true }).fill("45000");
  await variant.getByLabel("Stok awal (unit)", { exact: true }).fill("4");
  await variant.getByLabel("Berat (g)", { exact: true }).fill("100");
  await variant.getByLabel("Panjang paket (cm)", { exact: true }).fill("10");
  await variant.getByLabel("Lebar paket (cm)", { exact: true }).fill("8");
  await variant.getByLabel("Tinggi paket (cm)", { exact: true }).fill("3");
  await variant.getByRole("button", { name: "Simpan varian baru", exact: true }).click();
  await expect(variant.getByRole("status")).toContainText("Varian dan stok awal tersimpan");
  const saved = await prisma.productVariant.findUniqueOrThrow({ where: { sku: `BROWSER-${suffix}` } });
  expect(saved.stockOnHand).toBe(4);
  expect(await prisma.stockMovement.findFirst({ where: { variantId: saved.id } })).toMatchObject({ kind: "OPENING_BALANCE", adminId: profile.id, balanceAfter: 4 });
  await page.goto("/admin/portfolio");
  await page.getByRole("link", { name: "Tambah project", exact: true }).click();
  await page.getByRole("textbox", { name: /^Judul project/ }).fill("Project browser fixture");
  await page.getByRole("textbox", { name: /^Tautan project/ }).fill(`browser-project-${suffix}`);
  await page.getByRole("combobox", { name: /^Layanan/ }).selectOption({ label: "Desain & Rekayasa" });
  await page.getByRole("textbox", { name: /^Ringkasan project/ }).fill("Ringkasan fixture, belum merupakan bukti publikasi.");
  await page.getByRole("button", { name: "Simpan draft project", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft project tersimpan");
  const project = await prisma.portfolioProject.findUniqueOrThrow({ where: { slug: `browser-project-${suffix}` } });
  expect(project).toMatchObject({ isPublished: false, isFeatured: false });
  await page.goto(`/admin/portfolio/${project.id}`);
  await expect(page.getByLabel("Unggah foto", { exact: true })).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.goto(`/shop/${product.slug}`);
  await expect(page.getByRole("heading", { name: "Produk browser fixture", exact: true })).toHaveCount(0);
  await page.goto(`/projects/${project.slug}`);
  await expect(page.getByRole("heading", { name: "Project browser fixture", exact: true })).toHaveCount(0);
});

test("anonymous visitors cannot reach Dashboard draft forms", async ({ page }) => {
  for (const path of ["/admin/products/new", "/admin/portfolio/new"]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: /Simpan draft/ })).toHaveCount(0);
  }
});
