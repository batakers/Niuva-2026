# Audit Catalog Publish Readiness

Snapshot: **2026-09-18** · scope: loopback development dan artefak dataset
Owner yang sudah ada di repository.

Dokumen ini memisahkan bukti teknis katalog dari keputusan Owner yang belum
ditetapkan. Audit tidak mengubah data loopback, tidak mempublikasikan produk,
dan tidak mengaktifkan provider checkout.

## Ringkasan keputusan

| Area | Status | Kesimpulan |
| --- | --- | --- |
| Manifest Shop | `PASS_LOOPBACK_DRAFT` | 8 produk, 4 kategori, 34 varian, dan 50 media JPG lolos schema/preflight. Semua `isPublished: false`. |
| Database loopback | `PASS_LOOPBACK_DRAFT` | 8 produk Shop draft, 34 varian Shop, dan 50 media tersimpan. Satu produk/varian demo lokal yang published dipisahkan dari dataset Shop. |
| Media production | `PASS` | 50/50 `storageKey` Shop menunjuk file nyata di `public/media/products/`; tidak ada object sintetis. |
| Harga, stok, berat | `PASS_SOURCE_MAPPED` | Semua 34 varian Shop memiliki harga Rupiah, stok nonnegatif, dan berat. Audit menemukan 0 varian Shop dengan stok nol dan 0 berat kosong. |
| SKU merchandising | `OPEN_OWNER_DECISION` | 34/34 SKU saat ini berupa ID numerik sumber. Nilai ini menjaga identitas seed loopback, tetapi belum merupakan format SKU merchant yang disetujui Owner. |
| Publish approval | `OPEN_OWNER_DECISION` | Tidak ada produk Shop yang dipublikasikan. Checkbox publish di admin hanya memeriksa media dan varian aktif; persetujuan Owner belum direpresentasikan sebagai gate data terpisah. |
| Variant-media binding | `MVP_FALLBACK_ONLY` | Foto varian disimpan sebagai galeri produk dan nilai varian dicatat di `altText`. `ProductMedia` belum memiliki `variantId`, sehingga UI belum dapat mengganti foto secara deterministik setelah pilihan varian. |
| Dimensi paket | `CONDITIONAL` | 34/34 varian belum memiliki `lengthCm`, `widthCm`, atau `heightCm`. Ini tidak memblokir preview, manual shipping, atau flat-rate karena packaging sudah termasuk harga; menjadi wajib bila provider-calculated shipping diaktifkan. |

## Bukti yang diperiksa

- `docs/source/Dataset Shop Niuva/catalog-seed.json`: `version: 1`, 4
  kategori, 8 produk, 34 varian, 50 media, seluruh produk draft.
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
- Database PostgreSQL loopback `niuva_dev` pada port `55433`:
  `products=9`, `product_variants=35`, `product_media=50`,
  `published_products=1`. Satu produk published adalah `local-demo-desk-organizer`
  dan bukan bagian dataset Shop Owner.
- `prisma/schema.prisma`: model `ProductMedia` hanya memiliki `productId`;
  `variantId` yang ada di schema adalah relasi `OrderItem`, bukan relasi media.
- `src/modules/catalog/service.ts` dan `src/modules/catalog/repository.ts`:
  publish guard saat ini memvalidasi minimal satu media dan satu varian aktif,
  lalu mencatat audit action. Ia belum dapat memvalidasi approval Owner atau
  format SKU merchandising.

## Matrix gap dan tindakan aman

### 1. SKU merchandising

Jangan mengganti ID sumber secara otomatis. Owner perlu memilih kontrak SKU
yang stabil (misalnya prefix produk + kode varian), lalu mengirimkan mapping
`source variant id → merchant SKU`. Setelah mapping disetujui, perubahan SKU
harus dilakukan melalui editor/admin action dan diverifikasi unik di seluruh
dataset sebelum checkout diaktifkan.

### 2. Publish approval

Pertahankan delapan produk Shop sebagai draft. Sebelum publish, Owner perlu
memberi keputusan per produk (publish/tahan) dan mengonfirmasi SKU serta media
yang terlihat customer. Guard teknis yang ada cukup untuk mencegah produk tanpa
media/varian aktif, tetapi belum menjadi bukti approval; jangan menekan
checkbox publish hanya karena guard teknis lulus.

### 3. Variant-media binding

Untuk MVP yang sekarang, gunakan galeri produk dengan `altText` varian sebagai
fallback yang sudah dapat diaudit. Jangan menambahkan `variantId` atau menebak
foto default tanpa keputusan UX/schema. Jika pengalaman customer memang harus
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

## Rekomendasi urutan handoff

1. Owner mengonfirmasi format SKU dan mapping seluruh 34 varian.
2. Owner memberi keputusan publish per delapan produk; produk tetap draft
   sampai keputusan itu tercatat.
3. Owner memilih apakah galeri produk + `altText` cukup untuk MVP atau
   variant-media binding perlu menjadi slice schema/UI berikutnya.
4. Setelah tiga keputusan di atas, lakukan seed ulang loopback, review admin
   terautentikasi, dan visual acceptance sebelum membahas provider checkout.

Status goal ini: **audit teknis selesai; publish readiness masih tertahan oleh
keputusan Owner SKU, publikasi, dan pilihan UX/schema media varian**.
