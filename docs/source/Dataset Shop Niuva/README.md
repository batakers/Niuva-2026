# Dataset Shop Niuva

Dataset lokal ini adalah sumber Owner untuk katalog retail Niuva yang diekspor
dari listing Shop Niuva. File CSV/JSON/XLSX, detail produk, dan folder gambar
dipertahankan sebagai evidence sumber; `catalog-seed.json` adalah manifest
turunan yang sudah divalidasi oleh `catalogSeedSchema`.

## Snapshot validasi

- 8 produk sumber dan 4 kategori.
- 38 baris varian: 32 varian `TERSEDIA` dengan harga/stok, 6 baris
  `PLACEHOLDER_TOKOPEDIA` tanpa harga/stok yang tidak dimasukkan ke seed.
- Detail produk tersedia untuk seluruh 8 produk dalam 31 bagian terstruktur;
  `Size` seperti `15 cm`, `12 cm`, dan `8 cm` adalah ukuran produk/varian.
- 2 produk single-SKU tidak memiliki baris varian; ID produk sumber dipakai
  sebagai SKU deterministik agar data tetap dapat diedit di admin.
- Berat sumber dalam kilogram dikonversi ke gram (50, 100, 150, atau 200 g).
- Biaya packaging dianggap termasuk dalam harga produk. Sumber tidak memuat
  dimensi paket, sedangkan ongkir Biteship mewajibkannya.
  `catalog-package-estimates.json` memuat perkiraan per SKU atas instruksi
  Owner 2026-10-28 (kelas 8/12/15 cm dari ukuran produk); Owner dapat
  mengubahnya per varian di Admin.
- 55 file JPG sumber valid (700×700); 50 mapping unik dipilih sesuai batas
  maksimal 12 media per produk pada kontrak katalog.
- `catalog-publish-decisions.json` mencatat keputusan Owner 2026-10-28:
  kedelapan produk `isPublished: true` (sebelumnya 2026-09-18: 3 publish,
  5 draft). Listing custom figure dijual di Shop; Custom Print/MAKE hanya
  untuk desain dari customer. ID sumber tetap dipakai sebagai SKU internal v1.
- Impor ke DB staging: `corepack pnpm staging:import-catalog` (Owner, binding
  staging terverifikasi, idempoten, tanpa provider).

Media varian tetap menjadi media galeri produk. Sejak 2026-11-01 setiap varian
seed membawa `photoStorageKey`, sehingga seed mengisi `ProductVariant.mediaId`
(32 varian; dua produk single-SKU tanpa foto varian). Sidecar
`variant-media-map.json` menyimpan 38 mapping sumber (32 yang ikut seed dan 6
placeholder) sehingga relasi varian→foto tetap dapat diaudit. Alt text tetap
mencatat nilai varian ketika tersedia; tidak ada foto yang dibuat atau diunduh
ulang dari web.

## Regenerasi dan seed loopback

Jalankan dari root repository:

```powershell
corepack pnpm catalog:prepare
$env:CATALOG_SEED_FILE = (Resolve-Path -LiteralPath "docs/source/Dataset Shop Niuva/catalog-seed.json").Path
$env:CATALOG_SEED_CONFIRMATION = "I_UNDERSTAND_NON_PRODUCTION"
corepack pnpm db:seed:catalog
```

`catalog:prepare` hanya membaca dataset sumber dan approval Owner, menulis
manifest turunan, serta menyalin mapping JPG ke `public/media/products/`.
Generator gagal bila approval tidak cocok tepat dengan delapan produk sumber.
`db:seed:catalog`
menolak production dan database non-loopback; importer tidak menghapus data
lain dan tidak mengaktifkan Biteship atau Midtrans.
