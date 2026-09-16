# Intake dataset Shop Owner

Status: **TERSEDIA — SUDAH DI-SEED KE LOOPBACK** · scope: loopback development

Sumber yang dipakai ada di [`docs/source/Dataset Shop Niuva/`](../source/Dataset%20Shop%20Niuva/).
Manifest turunannya adalah `catalog-seed.json`; regenerasi dilakukan dengan
`corepack pnpm catalog:prepare`.

Dokumen ini adalah kontrak handoff untuk dataset retail Shop. Isi hanya dengan
data produk yang sudah disetujui Owner; jangan menyalin artefak portfolio ke
katalog retail tanpa keputusan publikasi dan mapping media yang jelas.

## Field wajib

| Level | Field | Aturan validasi | Bukti Owner |
| --- | --- | --- | --- |
| Dataset | `version` | harus `1` | `catalog-seed.json`, versi `1`, ekspor 2026-09-17 |
| Produk | `slug` | unik, lowercase, kebab-case | Diturunkan deterministik dari nama produk |
| Produk | `name`, `description` | tidak boleh kosong | Copy listing sumber, karakter replacement dibersihkan |
| Produk | `categorySlug` | harus cocok dengan kategori bila diisi | 4 kategori dari kolom `kategori` |
| Produk | `isPublished` | `true` hanya jika semua gate di bawah lulus | Semua `false` sampai Owner memutuskan publish |
| Varian | `name`, `sku` | SKU unik di seluruh dataset | ID produk/varian sumber dipakai sementara sebagai SKU deterministik |
| Varian | `priceRp` | integer Rupiah, bukan estimasi jasa cetak | 32 varian `TERSEDIA` dari `harga_varian`; single-SKU dari `harga_detail` |
| Varian | `stockOnHand` | integer nonnegatif | `stok_varian`/`stok_tersedia_public` pada ekspor |
| Varian | `weightGrams` | desimal nonnegatif | `berat` dikonversi dari kilogram ke gram |
| Varian | `lengthCm`, `widthCm`, `heightCm` | desimal nonnegatif bila tersedia/diwajibkan checkout | Belum ada pada sumber; sengaja kosong |
| Media | `storageKey` | file nyata di `public/media/products/`; ekstensi png/jpg/jpeg/webp | 50 JPG asli yang lolos preflight |
| Media | `altText`, `sortOrder` | alt text tidak kosong; urutan unik per produk | Copy aksesibilitas dan urutan galeri |

Produk `isPublished: true` wajib memiliki minimal satu varian aktif dan satu
media. Dataset yang belum lengkap harus tetap berupa draft atau ditahan sampai
Owner melengkapi data; jangan mengisi nilai kosong dengan data contoh.

## Bentuk file

Gunakan JSON `version: 1` yang mengikuti `catalogSeedSchema` di
`src/modules/catalog/seed.ts`:

```json
{
  "version": 1,
  "categories": [],
  "products": []
}
```

Skeleton di atas sengaja belum runnable karena `products` harus berisi data
Owner. Setiap `storageKey` harus menunjuk file yang sudah ada di bawah `public/`
sebelum seed dijalankan.

## Checklist sebelum seed

- [x] Product/varian adalah barang retail, bukan layanan cetak atau artefak
      portfolio.
- [ ] Format SKU merchandising dan dimensi paket sudah dikonfirmasi Owner.
- [x] Harga, stok awal, dan berat sumber sudah dipetakan; enam placeholder tanpa
      harga/stok dikecualikan.
- [x] Foto asli sudah ditempatkan di `public/media/products/` dan setiap mapping
      lolos preflight file.
- [ ] Status publikasi Niuva setiap produk sudah diputuskan.
- [x] Dataset disimpan di source control sebagai data produk publik yang diberikan
      Owner; tidak ada data customer atau secret.
- [ ] `quantitySemantics` custom print diputuskan terpisah; field itu bukan
      alasan untuk menebak pricing rule dari dataset Shop.

## Seed guarded

Importer yang tersedia adalah `db:seed:catalog`. Ia hanya menerima PostgreSQL
loopback non-production, membutuhkan konfirmasi eksplisit, menolak database
production, dan gagal sebelum transaksi jika file media tidak ditemukan. Lihat
[`catalog-seed.md`](./catalog-seed.md) untuk prosedur lengkap dan
[`catalog-source-audit.md`](./catalog-source-audit.md) untuk gap empat sumber
Owner yang sudah diaudit.

Catatan: relasi media varian belum ada di model `ProductMedia`, sehingga foto
varian dipetakan sebagai galeri produk dan nilai varian dicatat pada alt text.
Jika diperlukan penggantian foto berdasarkan pilihan varian, buat keputusan
schema/UI terpisah sebelum mengubah kontrak katalog.
