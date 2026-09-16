# Intake dataset Shop Owner

Status: **TEMPLATE — BELUM SIAP DI-SEED** · scope: loopback development

Dokumen ini adalah kontrak handoff untuk dataset retail Shop. Isi hanya dengan
data produk yang sudah disetujui Owner; jangan menyalin artefak portfolio ke
katalog retail tanpa keputusan publikasi dan mapping media yang jelas.

## Field wajib

| Level | Field | Aturan validasi | Bukti Owner |
| --- | --- | --- | --- |
| Dataset | `version` | harus `1` | Versi dataset dan tanggal ekspor |
| Produk | `slug` | unik, lowercase, kebab-case | Nama produk yang disetujui |
| Produk | `name`, `description` | tidak boleh kosong | Copy retail final |
| Produk | `categorySlug` | harus cocok dengan kategori bila diisi | Kategori retail |
| Produk | `isPublished` | `true` hanya jika semua gate di bawah lulus | Keputusan publish |
| Varian | `name`, `sku` | SKU unik di seluruh dataset | SKU/varian dari Owner |
| Varian | `priceRp` | integer Rupiah, bukan estimasi jasa cetak | Harga retail final |
| Varian | `stockOnHand` | integer nonnegatif | Stok fisik dan tanggal hitung |
| Varian | `weightGrams` | desimal nonnegatif | Berat paket/produk yang dipakai checkout |
| Varian | `lengthCm`, `widthCm`, `heightCm` | desimal nonnegatif bila tersedia/diwajibkan checkout | Dimensi paket |
| Media | `storageKey` | file nyata di `public/media/products/`; ekstensi png/jpg/jpeg/webp | Foto asli dan izin pakai |
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

- [ ] Product/varian adalah barang retail, bukan layanan cetak atau artefak
      portfolio.
- [ ] SKU, harga, stok awal, berat, dan dimensi sudah disetujui Owner.
- [ ] Foto asli sudah ditempatkan di `public/media/products/` dan setiap mapping
      lolos preflight file.
- [ ] Status publikasi setiap produk sudah diputuskan.
- [ ] Dataset disimpan di luar source control atau pada lokasi yang Owner setujui;
      jangan commit data customer atau secret.
- [ ] `quantitySemantics` custom print diputuskan terpisah; field itu bukan
      alasan untuk menebak pricing rule dari dataset Shop.

## Seed guarded

Importer yang tersedia adalah `db:seed:catalog`. Ia hanya menerima PostgreSQL
loopback non-production, membutuhkan konfirmasi eksplisit, menolak database
production, dan gagal sebelum transaksi jika file media tidak ditemukan. Lihat
[`catalog-seed.md`](./catalog-seed.md) untuk prosedur lengkap dan
[`catalog-source-audit.md`](./catalog-source-audit.md) untuk gap empat sumber
Owner yang sudah diaudit.

Dataset ini belum disediakan oleh empat berkas Owner yang saat ini ada di repo;
template ini tidak mengubah status tersebut.
