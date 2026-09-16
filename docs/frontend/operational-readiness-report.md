# Laporan readiness operasional Niuva

Snapshot: **2026-09-16** · branch `codex/frontend-ui-ux-hardening` · PR [#3](https://github.com/batakers/Niuva-2026/pull/3)

Laporan ini memisahkan bukti implementasi kode dari gate Owner, provider, dan
acceptance visual. Tidak ada nilai secret, token, atau data customer yang
dicatat di sini.

## Ringkasan per requirement

| Area | Status | Bukti atau batas |
| --- | --- | --- |
| Detail/editor admin | `IMPLEMENTED` | `/admin/orders/[id]`, `/admin/custom-print/[id]`, `/admin/products/[id]`, `/admin/portfolio/[id]` membaca projection server dan memakai Clerk + `AdminProfile`. |
| Aksi admin write | `IMPLEMENTED_WITH_BOUNDARIES` | Transition order/inquiry, review slicer, quote draft/send, stok, mapping media, portfolio edit/publish guard, dan token reissue melewati Server Action, permission, service, serta audit. Fulfillment yang membutuhkan rate/shipment/payment provider tetap ditahan. |
| B2B Inquiries | `IMPLEMENTED_LIVE_READ` | List/detail membaca database; transition status tersedia dari detail inquiry. |
| Pricing Rules | `IMPLEMENTED_LIVE_READ` | List/pagination dan active-rule lookup membaca database; aktivasi tidak diekspos. |
| Katalog/foto/stok | `PORTFOLIO_SEEDED_RETAIL_CATALOG_BLOCKED` | Konten portfolio Owner sudah di-seed ke loopback (4 layanan, 17 proyek, 6 media). Katalog Shop tetap menunggu SKU/varian, harga retail, stok, dimensi, dan foto produk yang belum ada. Importer guarded tetap menolak mapping media yang tidak memiliki file di `public/`. Lihat [`catalog-source-audit.md`](../backend/catalog-source-audit.md). |
| Clerk smoke + visual authenticated | `LOCAL_OWNER_PROFILE_READY` | Exact identity Owner yang diberikan sudah terhubung ke `AdminProfile` aktif ber-role Owner di database loopback. Smoke authenticated sebelumnya lulus; acceptance visual production tetap terpisah dari gate teknis. |
| R2 smoke nyata | `BLOCKED_OWNER_INPUT` | Runtime `.env.local` tidak menyediakan konfigurasi R2; belum ada binary non-production yang boleh diklaim terunggah. |
| Pengiriman ulang tautan lama | `READY_SERVER_SIDE_PENDING_MANUAL_SEND` | Reissue route-bound v1 meng-invalidasi token opaque lama; pengiriman aktual menunggu daftar customer dan kanal yang disetujui Owner. Runbook ada di `docs/backend/token-reissue-handoff.md`. |
| Biteship/Midtrans | `DEFERRED_BY_USER` | Activation dan smoke tidak dilakukan pada goal ini, terlepas dari presence nama env; menunggu data perusahaan Owner. |

## Probe loopback terakhir

Database `niuva_dev` dimigrasikan tanpa pending migration, lalu dihentikan
kembali setelah probe. Isinya masih demo/minimal, bukan launch dataset:

- `admin_profiles=1`, `active_admin_profiles=1`
- `products=1`, `published_products=1`, `product_variants=1`
- `product_media=0`
- `portfolio_projects=17`, `published_portfolio_projects=17`, `portfolio_media=6`
- `pricing_rules=0`, `active_pricing_rules=0`

## Gate teknis terakhir

Pada handoff 2026-09-16, `corepack pnpm typecheck`, lint (0 error; warning
existing), unit **73/73**, backend **119/119**, `corepack pnpm build`,
`corepack pnpm db:validate`, `git diff --check`, dan CI-mode Playwright
(`CI=1 corepack pnpm test:e2e`, satu worker) **57/57** lulus. Seed konten lokal
diulang dua kali dan tetap menghasilkan 4 layanan, 17 proyek, dan 6 media tanpa
duplikasi. Ini adalah bukti teknis/loopback; bukan bukti R2 atau provider live.

PR tetap `OPEN · MERGEABLE · CLEAN`. Merge menunggu gate Owner di atas; status
tersebut bukan kegagalan test dan tidak boleh ditutup dengan data sintetis.

## Input Owner untuk handoff berikutnya

1. R2 non-production capability dan objek test yang boleh dibersihkan.
2. Dataset katalog Shop nyata: produk, SKU/varian, harga retail, stok, berat/
   dimensi, foto, dan mapping media production. Empat sumber yang diberikan
   sudah diaudit; ringkasannya ada di [`catalog-source-audit.md`](../backend/catalog-source-audit.md).
3. Daftar customer dan kanal resmi untuk pengiriman tautan reissue.
4. Acceptance visual Owner untuk perubahan UI berikutnya tetap dijalankan
   sebagai gate terpisah dari build/test.
