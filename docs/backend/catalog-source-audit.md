# Audit sumber katalog dan media

Snapshot: **2026-09-17** · scope: loopback development saja.

Audit lanjutan dengan bukti database loopback per 2026-09-18 tersedia di
[`catalog-publish-readiness.md`](catalog-publish-readiness.md). Dokumen ini
tetap menjadi audit sumber dan kontrak data; dokumen lanjutan memisahkan gate
SKU, approval publish, dan pilihan relasi media-varian.

Dokumen ini mencatat apa yang benar-benar tersedia dari sumber Owner yang sudah
diberikan.
Berkas sumber diperlakukan sebagai evidence; angka, SKU, stok, dan hak publikasi
tidak diisi ulang dari asumsi.

## Temuan per sumber

| Sumber | Fakta yang dapat dipakai | Tidak tersedia untuk seed Shop |
| --- | --- | --- |
| `docs/source/Pricelist 3D Print Niuva.xlsx` (sheet `JASA CETAK`) | Tarif jasa cetak PLA/ABS bertingkat, tarif waktu mesin, filament customer/komunal, sewa, workstation, dan service. | Nama produk retail, SKU, varian, stok, berat/dimensi paket, foto produk, serta keputusan `quantitySemantics` untuk pricing rule runtime. |
| `docs/source/brand/portofolio produk NIUVA.pdf` (11 halaman) | Papan proyek/produk: Waste-based Product, Elips Tandem Penta Bike, brand accessories, Screen Printing Workstation, Smart Drop Box, BeVenTU, Portable Handwash Station, Sterilizer Tunnel 3/2 fase, Arei Smart Bag V1, dan Bagit Arei Smart Bag V2. | Harga jual, SKU, stok, varian retail, dimensi pengiriman, dan asset foto produk yang siap dipetakan ke `public/media/products/`. |
| `docs/source/brand/PRODUCT DESIGN SERVICES selection.pdf` (13 halaman) | Artefak layanan/proyek: PDS Telkom University, Savero, mock-up PT Pindad, Field Kitchen Truck/Bhimasena, leather bag, electric car, dan Smart Drop Box. | Data katalog retail dan metadata komersial produk. |
| `docs/source/Company profile PT Niuva_compressed.pdf` (15 halaman) | Positioning perusahaan, empat layanan, dan ringkasan proyek termasuk Motor Xeon, motor EV PT Pindad, Bicycle Arcade, dan Motorcycle Simulator. | SKU, price list retail, stok, mapping media produk retail, dan approval publikasi komersial. |
| `docs/source/Dataset Shop Niuva/` (CSV/JSON/XLSX + JPG) | 8 produk, 4 kategori, pilihan ukuran produk di detail/varian, harga/stok untuk 32 varian terverifikasi, 2 produk single-SKU, 55 JPG sumber valid, dan 74 baris mapping gambar. | Tidak ada kolom SKU merchant terpisah atau keputusan publish untuk Niuva. Dimensi paket pengiriman belum tersedia; 6 baris varian adalah placeholder tanpa harga/stok. |

## Yang sudah dipetakan dan di-seed

- Konten publik yang telah dikurasi dari sumber di atas di-upsert ke database
  `niuva_dev` melalui `db:seed:public-content:local` yang hanya menerima
  PostgreSQL loopback non-production dengan konfirmasi eksplisit.
- Hasil seed loopback terakhir: **4 layanan, 17 proyek, 6 media portfolio**.
- Enam cover portfolio memakai mapping yang sudah ada dan tervalidasi ke file
  `public/media/portfolio/*.png`. Mapping ini bukan klaim bahwa file tersebut
  adalah foto produk retail.
- Dataset Shop Owner sudah diproses oleh `scripts/prepare-shop-catalog.ts`.
  Manifest `docs/source/Dataset Shop Niuva/catalog-seed.json` lolos schema dan
  preflight media; seed loopback terakhir menghasilkan **4 kategori, 8 produk,
  34 varian, dan 50 media**. Keputusan Owner menetapkan 3 ready-made sebagai
  published dan 5 produk yang membutuhkan custom flow tetap draft.
- Owner menyetujui ID produk/varian sumber sebagai SKU internal v1. Enam placeholder Tokopedia tidak
  di-seed karena tidak mempunyai harga/stok terverifikasi.
- Foto varian dipetakan ke galeri produk karena `ProductMedia` saat ini tidak
  memiliki `variantId`; alt text mencatat nilai varian yang tersedia. Batas
  kontrak 12 media/produk membuat 50 mapping unik dipilih dari 55 file sumber.
- Importer `db:seed:catalog` tetap menolak media yang tidak memiliki file nyata
  di `public/`, sehingga tidak ada foto produk sintetis atau placeholder yang
  dipublikasikan.
- Acceptance publik server-backed pada 1280×900 dan 390×844 memverifikasi tiga
  produk ready-made, detail dan media nyata, tanpa overflow/browser error;
  lima produk custom draft tidak dapat diakses publik. Fixture checkout demo
  juga disembunyikan kecuali runtime demo loopback diaktifkan eksplisit.

## Gate yang masih terbuka

1. **SKU internal v1** dan **keputusan publish** sudah ditutup oleh Owner pada
   2026-09-18 melalui `catalog-publish-decisions.json`: 3 published/5 draft.
   Dimensi paket bukan blocker untuk seed katalog atau mode ongkir manual/
   flat-rate; dimensi menjadi wajib hanya jika provider-calculated diaktifkan.
2. **Relasi media varian** belum tersedia pada model katalog. Owner menyetujui
   galeri produk + alt text sebagai fallback MVP; binding khusus varian ditunda
   sampai ada bukti kebutuhan UX.
3. Workbook belum boleh mengaktifkan `CUSTOM_PRINT_V1` secara otomatis karena
   kebijakan runtime mewajibkan `quantitySemantics` (`PER_UNIT` atau
   `AGGREGATE`) dipilih secara eksplisit oleh Owner. Nilai yang berbeda antara
   baris spreadsheet dan keputusan Pricing v1 tetap ditangani oleh policy
   server, bukan ditebak oleh importer.
4. Aktivasi/smoke Biteship dan Midtrans sengaja tidak dilakukan sesuai batas
   goal Owner.

Dengan demikian, sumber sudah cukup untuk seed katalog retail loopback yang
terukur dan dapat diaudit, termasuk preview dengan packaging cost yang dianggap
sudah termasuk harga. Status ini belum menjadi klaim `catalog ready` untuk
checkout dengan ongkir otomatis karena provider dan pricing aktif tetap
merupakan gate terpisah. SKU/publish sudah diputuskan; variant-media binding
ditunda sebagai enhancement. Dimensi paket hanya berlaku pada gate shipping
provider-calculated.
