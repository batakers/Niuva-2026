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
| Katalog/foto/stok | `SEEDED_LOOPBACK_DRAFTS_OWNER_GATES_OPEN` | Dataset Shop Owner sudah diproses: 8 produk, 34 varian, 50 media JPG, 4 kategori ke loopback. Semua produk masih draft; SKU merchandising, publish decision, dan relasi media-varian masih gate Owner/kontrak. Dimensi paket hanya menjadi gate jika shipping provider-calculated diaktifkan. Lihat [`catalog-source-audit.md`](../backend/catalog-source-audit.md). |
| Clerk smoke + visual authenticated | `LOCAL_OWNER_PROFILE_AND_DESKTOP_MOBILE_VISUAL_ACCEPTED` | Exact identity Owner yang diberikan terhubung ke `AdminProfile` aktif ber-role Owner di database loopback. Fresh live-admin desktop acceptance pada 1280px dan mobile acceptance pada 390x844 mencakup list/detail/editor routes tanpa horizontal overflow dan tanpa write action. Pada mobile, Orders/Inquiries memakai kartu berlabel dan Products tidak lagi memaksa lebar halaman. Keyboard focus nav, label kontrol detail, empty/error state, dan console browser diperiksa. |
| R2 smoke nyata | `PASSED_NON_PRODUCTION_SMOKE` | Owner-configured development R2 passed intent `201`, exact-origin CORS preflight `204`, direct PUT `200`, confirm `200`, dan custom request `201`; lifecycle `PENDING → UPLOADED → VERIFIED`. Fixture object dan row sintetis sudah dibersihkan; bucket private tetap non-public. |
| Pengiriman ulang tautan lama | `READY_SERVER_SIDE_PENDING_MANUAL_SEND` | Reissue route-bound v1 meng-invalidasi token opaque lama; pengiriman aktual menunggu daftar customer dan kanal yang disetujui Owner. Runbook ada di `docs/backend/token-reissue-handoff.md`. |
| Biteship/Midtrans | `DEFERRED_BY_USER` | Activation dan smoke tidak dilakukan pada goal ini, terlepas dari presence nama env; menunggu data perusahaan Owner. |

## Probe loopback terakhir

Database `niuva_dev` dimigrasikan tanpa pending migration, lalu dihentikan
kembali setelah probe. Isinya sudah memuat dataset Shop draft dan satu fixture
demo; ini tetap bukan launch dataset:

- `admin_profiles=1`, `active_admin_profiles=1`
- `products=9` (8 Shop draft + 1 local demo), `published_products=1`
- `product_variants=35` (34 Shop + 1 local demo), `active_variants=35`
- `product_media=50` untuk Shop; demo tetap tanpa media
- `portfolio_projects=17`, `published_portfolio_projects=17`, `portfolio_media=6`
- 11 project tersebut adalah Selected Works `card-only` yang sudah disetujui
  Owner untuk tampil sebagai ringkasan publik tanpa media. Media production
  tetap opsional dan tidak boleh dipetakan tanpa aset serta provenance yang
  disetujui per project.
- `pricing_rules=0`, `active_pricing_rules=0`

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

## Input Owner untuk handoff berikutnya

1. Konfirmasi format SKU merchandising dan keputusan publish untuk dataset Shop
   yang sudah di-seed dari `docs/source/Dataset Shop Niuva/`. Dimensi paket hanya
   diperlukan bila mode shipping otomatis/provider-calculated dipilih; mode
   manual/flat-rate tidak memblokir katalog.
   Enam placeholder Tokopedia tanpa harga/stok sengaja dibiarkan di luar seed;
   detail audit ada di [`catalog-source-audit.md`](../backend/catalog-source-audit.md)
   dan kontrak intake di [`shop-catalog-owner-intake.md`](../backend/shop-catalog-owner-intake.md).
2. Daftar customer dan kanal resmi untuk pengiriman tautan reissue.
3. Tidak ada input Owner tambahan untuk mobile acceptance; gate tersebut sudah
   lulus pada 390x844. R2 non-production smoke juga sudah lulus; gate berikutnya
   tetap pengiriman manual tautan reissue dan keputusan dataset/catalog yang
   masih terbuka.
