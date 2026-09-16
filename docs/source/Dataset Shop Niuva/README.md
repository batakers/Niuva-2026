# Dataset Shop Niuva

Dataset lokal ini adalah sumber Owner untuk katalog retail Niuva yang diekspor
dari listing Shop Niuva. File CSV/JSON/XLSX dan folder gambar dipertahankan
sebagai evidence sumber; `catalog-seed.json` adalah manifest turunan yang sudah
divalidasi oleh `catalogSeedSchema`.

## Snapshot validasi

- 8 produk sumber dan 4 kategori.
- 38 baris varian: 32 varian `TERSEDIA` dengan harga/stok, 6 baris
  `PLACEHOLDER_TOKOPEDIA` tanpa harga/stok yang tidak dimasukkan ke seed.
- 2 produk single-SKU tidak memiliki baris varian; ID produk sumber dipakai
  sebagai SKU deterministik agar data tetap dapat diedit di admin.
- Berat sumber dalam kilogram dikonversi ke gram (50, 100, 150, atau 200 g).
- Dimensi paket tidak ada di dataset; field dimensi sengaja tidak ditebak.
- 55 file JPG sumber valid (700×700); 50 mapping unik dipilih sesuai batas
  maksimal 12 media per produk pada kontrak katalog.
- Semua produk pada manifest `isPublished: false` sampai Owner memberikan
  keputusan publish untuk Niuva, terpisah dari status listing sumber.

Media varian dipetakan sebagai media galeri produk karena model `ProductMedia`
saat ini berscope produk, bukan relasi varian. Sidecar
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

`catalog:prepare` hanya membaca dataset sumber, menulis manifest turunan,
dan menyalin mapping JPG ke `public/media/products/`. `db:seed:catalog`
menolak production dan database non-loopback; importer tidak menghapus data
lain dan tidak mengaktifkan Biteship atau Midtrans.
