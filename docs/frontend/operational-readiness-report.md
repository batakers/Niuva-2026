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
| Katalog/foto/stok | `READY_FOR_OWNER_INPUT` | `scripts/seed-catalog.ts` guarded untuk database loopback non-production dan menolak mapping foto yang tidak memiliki file di `public/`; dataset nyata belum tersedia. |
| Clerk smoke + visual authenticated | `BLOCKED_OWNER_INPUT` | Runtime `.env.local` tidak menyediakan identity `user_...`/`AdminProfile` mapping; tanpa itu `/admin` harus fail-closed dan visual authenticated belum sah. |
| R2 smoke nyata | `BLOCKED_OWNER_INPUT` | Runtime `.env.local` tidak menyediakan konfigurasi R2; belum ada binary non-production yang boleh diklaim terunggah. |
| Pengiriman ulang tautan lama | `READY_SERVER_SIDE_PENDING_MANUAL_SEND` | Reissue route-bound v1 meng-invalidasi token opaque lama; pengiriman aktual menunggu daftar customer dan kanal yang disetujui Owner. Runbook ada di `docs/backend/token-reissue-handoff.md`. |
| Biteship/Midtrans | `DEFERRED_BY_USER` | Activation dan smoke tidak dilakukan pada goal ini, terlepas dari presence nama env; menunggu data perusahaan Owner. |

## Probe loopback terakhir

Database `niuva_dev` dimigrasikan tanpa pending migration, lalu dihentikan
kembali setelah probe. Isinya masih demo/minimal, bukan launch dataset:

- `admin_profiles=1`, `active_admin_profiles=1`
- `products=1`, `published_products=1`, `product_variants=1`
- `product_media=0`
- `portfolio_projects=0`, `published_portfolio_projects=0`, `portfolio_media=0`
- `pricing_rules=0`, `active_pricing_rules=0`

## Gate teknis terakhir

Pada commit `75c71cc` seluruh code gate lulus: typecheck, lint dengan 0 error,
unit 73/73, backend 119/119, production build, dan CI-mode Playwright 57/57.
Commit dokumentasi berikutnya (`14101b1`) tidak mengubah code runtime.

PR tetap `OPEN · MERGEABLE · CLEAN`. Merge menunggu gate Owner di atas; status
tersebut bukan kegagalan test dan tidak boleh ditutup dengan data sintetis.

## Input Owner untuk handoff berikutnya

1. Exact Clerk development `user_...`, role/display name, dan konfirmasi
   provisioning `AdminProfile` loopback.
2. R2 non-production capability dan objek test yang boleh dibersihkan.
3. Dataset katalog nyata: produk, SKU/varian, harga, stok, foto, dan mapping
   media production.
4. Daftar customer dan kanal resmi untuk pengiriman tautan reissue.
5. Setelah input tersedia, jalankan ulang smoke Clerk, R2, seed, dan visual
   acceptance authenticated secara terpisah.
