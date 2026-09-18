# Laporan readiness operasional Niuva

Snapshot: **2026-09-18** · checkout `main` · implementation PR [#3](https://github.com/batakers/Niuva-2026/pull/3) merged as `2c845d8`; acceptance handoff PR [#5](https://github.com/batakers/Niuva-2026/pull/5) merged as `0f350ec`

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
| Portfolio Selected Works | `OWNER_APPROVED_CARD_ONLY` | 11 Selected Works tetap published sebagai kartu ringkasan tanpa media. Media mapping bersifat opsional dan hanya dilakukan jika aset, provenance, alt text, serta caption per project sudah disetujui Owner. Enam Featured Case Studies tetap mengikuti gate narasi dan minimal satu media. |
| Katalog/foto/stok | `OWNER_APPROVED_SEEDED_PUBLIC_ACCEPTED` | Dataset Shop berisi 8 produk, 34 varian, 50 media JPG, dan 4 kategori. Owner menyetujui source ID sebagai SKU internal v1, 3 produk ready-made published, 5 produk custom-flow tetap draft meski seluruhnya memiliki foto, dan galeri produk sebagai fallback media-varian MVP. Public Shop normal lulus acceptance 1280×900 dan 390×844; fixture lokal hanya terlihat pada runtime demo eksplisit. Dimensi paket hanya menjadi gate jika shipping provider-calculated diaktifkan. Lihat [`catalog-publish-readiness.md`](../backend/catalog-publish-readiness.md). |
| Clerk smoke + visual authenticated | `LOCAL_OWNER_PROFILE_AND_DESKTOP_MOBILE_VISUAL_ACCEPTED` | Exact identity Owner yang diberikan terhubung ke `AdminProfile` aktif ber-role Owner di database loopback. Fresh live-admin desktop acceptance pada 1280px dan mobile acceptance pada 390x844 mencakup list/detail/editor routes tanpa horizontal overflow dan tanpa write action. Pada mobile, Orders/Inquiries memakai kartu berlabel dan Products tidak lagi memaksa lebar halaman. Keyboard focus nav, label kontrol detail, empty/error state, dan console browser diperiksa. |
| R2 smoke nyata | `PASSED_NON_PRODUCTION_SMOKE` | Owner-configured development R2 passed intent `201`, exact-origin CORS preflight `204`, direct PUT `200`, confirm `200`, dan custom request `201`; lifecycle `PENDING → UPLOADED → VERIFIED`. Fixture object dan row sintetis sudah dibersihkan; bucket private tetap non-public. |
| Pengiriman ulang tautan lama | `READY_SERVER_SIDE_PENDING_MANUAL_SEND` | Reissue route-bound v1 meng-invalidasi token opaque lama; pengiriman aktual menunggu daftar customer dan kanal yang disetujui Owner. Runbook ada di `docs/backend/token-reissue-handoff.md`. |
| Biteship/Midtrans | `DEFERRED_BY_USER` | Activation dan smoke tidak dilakukan pada goal ini, terlepas dari presence nama env; menunggu data perusahaan Owner. |

## Probe loopback terakhir

Database `niuva_dev` dimigrasikan tanpa pending migration. Probe katalog
2026-09-18 sudah memuat keputusan Owner dan satu fixture demo; ini tetap
merupakan bukti loopback, bukan deployment production:

- `admin_profiles=1`, `active_admin_profiles=1`
- `products=9` (8 Shop + 1 local demo), `published_products=4`
  (3 Shop ready-made + 1 local demo); 5 Shop custom-flow tetap draft
- `product_variants=35` (34 Shop + 1 local demo), `active_variants=35`
- `product_media=50` untuk Shop; demo tetap tanpa media
- `portfolio_projects=17`, `published_portfolio_projects=17`, `portfolio_media=6`
- 11 project tersebut adalah Selected Works `card-only` yang sudah disetujui
  Owner untuk tampil sebagai ringkasan publik tanpa media. Media production
  tetap opsional dan tidak boleh dipetakan tanpa aset serta provenance yang
  disetujui per project.
- `pricing_rules=0`, `active_pricing_rules=0`

Walaupun fixture demo tetap published di database loopback bersama, boundary
katalog normal mengecualikan slug tersebut. Ia hanya terlihat ketika runtime
demo eksplisit lolos guard development/test + PostgreSQL loopback. Acceptance
publik normal memverifikasi tepat tiga produk Owner dan lima draft 404.

## Gate teknis terakhir

Pada handoff 2026-09-16, `corepack pnpm typecheck`, lint (0 error; warning
existing), unit **73/73**, backend **119/119**, `corepack pnpm build`,
`corepack pnpm db:validate`, `git diff --check`, dan CI-mode Playwright
(`CI=1 corepack pnpm test:e2e`, satu worker) **57/57** lulus. Seed konten lokal
diulang dua kali dan tetap menghasilkan 4 layanan, 17 proyek, dan 6 media tanpa
duplikasi. Seed Shop juga idempotent dan menghasilkan 8 produk, 34 varian,
serta 50 media pada setiap run. Ini adalah bukti teknis/loopback; R2 smoke
memiliki evidence provider development terpisah, sedangkan provider lain tetap
belum diaktifkan.

PR #3 sudah `MERGED` ke `main` pada commit `2c845d8`; dokumentasi acceptance
follow-up sudah `MERGED` melalui PR #5 pada commit `0f350ec`, dan checkout saat
ini berada di `main`. Merge code tidak menutup
gate Owner/provider di atas dan tidak berarti deployment atau provider live sudah
aktif.

Follow-up katalog 2026-09-18 lulus `catalog:prepare`, seed/query loopback
(3 Shop published, 5 Shop draft, 34 varian, 50 media, 0 SKU duplikat),
typecheck, schema validate, production build, unit 78/78, backend 120/120,
CI-mode Playwright 57/57, serta local-demo Playwright 1/1. Repository lint
lulus dengan 0 error dan 294 warning existing/local-skill-worktree; focused
ESLint pada seluruh file kode/test yang berubah lulus tanpa warning atau error.
Acceptance server-backed terpisah memeriksa katalog dan tiga detail pada
1280×900 serta 390×844, media nyata, zero overflow/browser error, dan lima
draft-route 404.

## Input Owner untuk handoff berikutnya

1. Tidak ada input Owner katalog tambahan untuk MVP: SKU internal v1, keputusan
   3 published/5 draft, dan fallback galeri produk sudah disetujui. Lima draft
   tetap memiliki foto tetapi membutuhkan intake custom yang belum tersedia.
   Enam placeholder Tokopedia tanpa harga/stok tetap dibiarkan di luar seed;
   detail ada di [`catalog-publish-readiness.md`](../backend/catalog-publish-readiness.md).
2. Daftar customer dan kanal resmi untuk pengiriman tautan reissue.
3. Tidak ada input Owner tambahan untuk mobile acceptance; gate tersebut sudah
   lulus pada 390x844. R2 non-production smoke juga sudah lulus; gate berikutnya
   tetap pengiriman manual tautan reissue serta provider/pricing yang deferred.
