# Intake dataset Shop Owner

Status: **OWNER APPROVED — 3 PUBLISHED / 5 DRAFT DI LOOPBACK** · scope: loopback development

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
| Produk | `isPublished` | `true` hanya jika semua gate di bawah lulus | Approval per produk di `catalog-publish-decisions.json`; 3 ready-made published, 5 custom-flow draft |
| Varian | `name`, `sku` | SKU unik di seluruh dataset | Owner menyetujui ID produk/varian sumber sebagai SKU internal v1 |
| Varian | `priceRp` | integer Rupiah, bukan estimasi jasa cetak | 32 varian `TERSEDIA` dari `harga_varian`; single-SKU dari `harga_detail` |
| Varian | `stockOnHand` | integer nonnegatif | `stok_varian`/`stok_tersedia_public` pada ekspor |
| Varian | `weightGrams` | desimal nonnegatif | `berat` dikonversi dari kilogram ke gram |
| Varian | `lengthCm`, `widthCm`, `heightCm` | desimal nonnegatif bila mode shipping `PROVIDER_CALCULATED` diaktifkan | Belum ada pada sumber; boleh kosong untuk katalog loopback, ongkir manual, atau flat-rate |
| Media | `storageKey` | file nyata di `public/media/products/`; ekstensi png/jpg/jpeg/webp | 50 JPG asli yang lolos preflight |
| Media | `altText`, `sortOrder` | alt text tidak kosong; urutan unik per produk | Copy aksesibilitas dan urutan galeri |

Produk `isPublished: true` wajib memiliki minimal satu varian aktif dan satu
media. Dataset yang belum lengkap harus tetap berupa draft atau ditahan sampai
Owner melengkapi data; jangan mengisi nilai kosong dengan data contoh.

## Keputusan packaging dan shipping

Keputusan Owner pada 2026-09-17: biaya packaging dianggap sudah termasuk dalam
harga produk. Karena itu, dimensi paket tidak menjadi syarat untuk katalog
loopback, preview, atau ongkir manual/flat-rate. Dimensi paket hanya diwajibkan
ketika Niuva mengaktifkan perhitungan ongkir otomatis berbasis provider.

Nilai `Size` seperti `15 cm`, `12 cm`, dan `8 cm` adalah ukuran produk/varian
yang ditampilkan ke customer, bukan ukuran kardus atau paket pengiriman.

## Bentuk file

Keputusan Owner disimpan terpisah di `catalog-publish-decisions.json` agar
regenerasi manifest tidak memakai sakelar publish global. File approval harus
mencakup tepat delapan source product ID beserta nama yang cocok; generator
gagal bila ada produk hilang, tambahan, duplikat, atau salah nama.

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
- [x] SKU internal v1 dikonfirmasi Owner: gunakan ID produk/varian sumber.
- [x] Dimensi paket ditetapkan sebagai gate kondisional: tidak diperlukan untuk
      katalog/manual shipping, wajib saat provider-calculated shipping aktif.
- [x] Harga, stok awal, dan berat sumber sudah dipetakan; enam placeholder tanpa
      harga/stok dikecualikan.
- [x] Foto asli sudah ditempatkan di `public/media/products/` dan setiap mapping
      lolos preflight file.
- [x] Status publikasi diputuskan Owner: 3 ready-made published dan 5 produk
      yang membutuhkan custom flow tetap draft; semua delapan produk memiliki foto.
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

Catatan: Owner menyetujui galeri produk + alt text sebagai fallback MVP karena
relasi media varian belum ada di model `ProductMedia`. Jika kemudian diperlukan
penggantian foto berdasarkan pilihan varian, buat keputusan schema/UI terpisah
sebelum mengubah kontrak katalog.
