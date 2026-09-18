# Audit Catalog Publish Readiness

Snapshot: **2026-09-18** · scope: loopback development dan artefak dataset
Owner yang sudah ada di repository.

Dokumen ini memisahkan bukti teknis katalog dari keputusan Owner. Pada
2026-09-18 Owner menyetujui SKU sumber sebagai SKU internal v1, publikasi tiga
produk ready-made, penahanan lima produk yang masih memerlukan alur custom,
serta galeri produk sebagai fallback media varian MVP. Provider checkout tetap
tidak diaktifkan.

## Ringkasan keputusan

| Area | Status | Kesimpulan |
| --- | --- | --- |
| Manifest Shop | `OWNER_APPROVED_MIXED` | 8 produk, 4 kategori, 34 varian, dan 50 media JPG lolos schema/preflight; 3 ready-made published dan 5 custom-flow draft. |
| Database loopback | `PASS_LOOPBACK_SEEDED` | Keputusan 3 published/5 draft sudah di-seed. Fixture demo lokal dipisahkan dari dataset Shop dan disembunyikan dari katalog publik di luar runtime demo eksplisit. |
| Media production | `PASS` | 50/50 `storageKey` Shop menunjuk file nyata di `public/media/products/`; tidak ada object sintetis. |
| Harga, stok, berat | `PASS_SOURCE_MAPPED` | Semua 34 varian Shop memiliki harga Rupiah, stok nonnegatif, dan berat. Audit menemukan 0 varian Shop dengan stok nol dan 0 berat kosong. |
| SKU merchandising | `OWNER_APPROVED_SOURCE_ID_V1` | 34/34 SKU memakai ID numerik sumber sebagai SKU internal MVP. SKU tidak perlu ditampilkan kepada customer dan dapat dievaluasi ulang bila operasi gudang membutuhkan label/barcode. |
| Publish approval | `OWNER_APPROVED_3_PUBLISH_5_HOLD` | Tiga produk fixed dipublikasikan; lima produk yang membutuhkan referensi, chat, revisi, preorder, atau catatan fakultas tetap draft. |
| Variant-media binding | `OWNER_APPROVED_MVP_FALLBACK` | Semua produk, termasuk lima draft, tetap memiliki foto. Media berada di galeri produk dengan nilai varian pada `altText`; schema `variantId` ditunda sampai ada kebutuhan UX nyata. |
| Dimensi paket | `CONDITIONAL` | 34/34 varian belum memiliki `lengthCm`, `widthCm`, atau `heightCm`. Ini tidak memblokir preview, manual shipping, atau flat-rate karena packaging sudah termasuk harga; menjadi wajib bila provider-calculated shipping diaktifkan. |

## Bukti yang diperiksa

- `docs/source/Dataset Shop Niuva/catalog-publish-decisions.json`: approval
  lengkap untuk delapan source product ID; 3 `PUBLISH_READY_MADE`, 5
  `HOLD_CUSTOM_FLOW`, dan SKU policy `SOURCE_ID_V1`.
- `docs/source/Dataset Shop Niuva/catalog-seed.json`: `version: 1`, 4
  kategori, 8 produk, 34 varian, 50 media, 3 published dan 5 draft.
- `docs/source/Dataset Shop Niuva/variant-media-map.json`: 38 baris mapping
  varian; 32 berstatus `TERSEDIA` dan masuk seed, 6 placeholder tanpa harga/
  stok dikecualikan. Dua produk single-SKU tidak memiliki baris varian
  terpisah pada mapping ini.
- `docs/source/Dataset Shop Niuva/Niuva_Tokopedia_Products_Images.csv`: 74
  baris sumber gabungan (galeri produk dan media varian). Angka ini bukan
  jumlah media yang akhirnya dipilih ke seed.
- `docs/source/Dataset Shop Niuva/Niuva_Product_Images/`: 55 JPG sumber.
  Importer memilih 50 media sesuai batas maksimal 12 media per produk.
- `public/media/products/`: seluruh 50 key media yang tersimpan di database
  Shop ditemukan sebagai file nyata.
- Database PostgreSQL loopback `niuva_dev` pada port `55433` setelah seed:
  `products=9`, `product_variants=35`, `product_media=50`,
  `published_products=4`. Tiga published berasal dari dataset Shop dan satu
  adalah `local-demo-desk-organizer` yang bukan bagian dataset Owner. Boundary
  publik mengecualikan fixture tersebut kecuali `NIUVA_RUNTIME_MODE=demo`
  lolos guard loopback, sehingga `/shop` normal hanya memuat tiga produk Owner.
- `prisma/schema.prisma`: model `ProductMedia` hanya memiliki `productId`;
  `variantId` yang ada di schema adalah relasi `OrderItem`, bukan relasi media.
- `src/modules/catalog/service.ts` dan `src/modules/catalog/repository.ts`:
  publish guard saat ini memvalidasi minimal satu media dan satu varian aktif,
  lalu mencatat audit action. Ia belum dapat memvalidasi approval Owner atau
  format SKU merchandising.

## Matrix gap dan tindakan aman

### 1. SKU merchandising

Keputusan Owner: gunakan source product/variant ID sebagai SKU internal v1.
Generator memvalidasi keunikan seluruh 34 SKU. Perubahan ke format label/barcode
baru hanya diperlukan bila kebutuhan operasional itu benar-benar muncul.

### 2. Publish approval

Produk published: Kicau Mania, Keychain Gedung Telkom University, dan Keychain
Animal Telkom University. Lima produk lain tetap draft karena checkout belum
menangkap kebutuhan custom seperti referensi foto, revisi, preorder, chat, atau
catatan fakultas. Seluruh produk draft tetap memiliki media; statusnya tidak
disebabkan kekurangan foto.

### 3. Variant-media binding

Untuk MVP yang sekarang, Owner menyetujui galeri produk dengan `altText` varian
sebagai fallback. Jangan menambahkan `variantId` atau menebak foto default
tanpa bukti kebutuhan UX. Jika pengalaman customer memang harus
mengganti foto per pilihan varian, buat perubahan terpisah yang mencakup:

1. keputusan apakah satu media boleh terikat ke banyak varian;
2. migrasi nullable `ProductMedia.variantId` dan constraint/index;
3. kontrak seed/importer dan editor admin;
4. acceptance visual untuk desktop/mobile serta fallback saat varian tidak
   memiliki foto.

### 4. Dimensi paket dan provider

Tidak perlu mengisi ukuran kardus perkiraan pada dataset saat ini. Ukuran
`15 cm`, `12 cm`, atau `8 cm` adalah ukuran produk/varian, bukan ukuran paket.
Pertahankan field paket kosong sampai Owner memiliki data operasional atau
Niuva benar-benar memilih provider-calculated shipping. Biteship dan Midtrans
tetap di luar scope sesuai keputusan Owner.

## Handoff berikutnya

Acceptance publik server-backed 2026-09-18 lulus pada desktop 1280×900 dan
mobile 390×844: tiga kartu dan tiga detail produk Owner tampil dengan media
nyata, tidak ada horizontal overflow atau browser error, lima slug draft
mengembalikan 404, serta fixture demo tidak terlihat di runtime normal. Judul
dan deskripsi kartu dibatasi agar copy listing penuh tidak merusak hierarchy;
copy lengkap tetap tersedia pada detail produk.

Gate teknis follow-up juga lulus: `catalog:prepare` menghasilkan 8 produk/34
varian/50 media secara idempotent; query loopback mengembalikan 3 Shop
published, 5 Shop draft, 34 varian, 50 media, dan 0 SKU duplikat; typecheck,
schema validate, production build, unit 78/78, backend 120/120, CI-mode
Playwright 57/57, local-demo Playwright 1/1, focused ESLint tanpa warning/error,
serta repository lint tanpa error semuanya lulus.

1. Fresh authenticated visual acceptance untuk angka 3 published/5 draft pada
   admin sudah diulang pasca-seed pada 1280x900 dan 390x844 dengan sesi Clerk
   Owner. List admin serta detail order/product/portfolio/inquiry yang memiliki
   data ter-render tanpa horizontal overflow; tidak ada write action atau error
   aplikasi non-extension.
2. Lima produk custom tetap draft, tetapi jalur intake sekarang tersedia melalui
   [`custom-product-intake.md`](./custom-product-intake.md). Produk hanya boleh
   diproses melalui review operator dan quote; jangan ubah menjadi checkout
   langsung tanpa keputusan Owner/provider terpisah.
3. Evaluasi variant-media binding hanya bila acceptance/customer evidence
   menunjukkan galeri produk tidak cukup.

Status: **keputusan Owner tercatat, sudah di-seed, dan katalog publik normal
lulus acceptance desktop/mobile; provider checkout tetap deferred**.
