# Audit sumber katalog dan media

Snapshot: **2026-09-17** · scope: loopback development saja.

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
| `docs/source/Dataset Shop Niuva/` (CSV/JSON/XLSX + JPG) | 8 produk, 4 kategori, harga/stok untuk 32 varian terverifikasi, 2 produk single-SKU, 55 JPG sumber valid, dan 74 baris mapping gambar. | Tidak ada kolom SKU merchant terpisah, dimensi paket, atau keputusan publish untuk Niuva; 6 baris varian adalah placeholder tanpa harga/stok. |

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
  34 varian, dan 50 media**. Semua produk ditahan sebagai draft
  (`isPublished: false`) sampai keputusan publish diberikan.
- ID produk/varian sumber dipakai sebagai SKU deterministik hanya untuk
  menjaga identitas data di database lokal; ini bukan klaim bahwa Owner sudah
  menetapkan format SKU merchandising. Enam placeholder Tokopedia tidak
  di-seed karena tidak mempunyai harga/stok terverifikasi.
- Foto varian dipetakan ke galeri produk karena `ProductMedia` saat ini tidak
  memiliki `variantId`; alt text mencatat nilai varian yang tersedia. Batas
  kontrak 12 media/produk membuat 50 mapping unik dipilih dari 55 file sumber.
- Importer `db:seed:catalog` tetap menolak media yang tidak memiliki file nyata
  di `public/`, sehingga tidak ada foto produk sintetis atau placeholder yang
  dipublikasikan.

## Gate yang masih terbuka

1. **SKU merchandising dan dimensi paket** masih perlu dikonfirmasi Owner.
   Seed lokal menggunakan ID sumber sebagai SKU deterministik dan membiarkan
   dimensi kosong; checkout/shipping production tidak boleh menganggapnya
   lengkap sampai data paket diberikan.
2. **Keputusan publish Niuva** masih terbuka. Delapan produk sudah berada di
   database loopback sebagai draft dengan harga, stok, berat, dan media nyata.
3. **Relasi media varian** belum tersedia pada model katalog; bila UI harus
   mengganti foto berdasarkan varian, perlu keputusan/schema terpisah.
4. Workbook belum boleh mengaktifkan `CUSTOM_PRINT_V1` secara otomatis karena
   kebijakan runtime mewajibkan `quantitySemantics` (`PER_UNIT` atau
   `AGGREGATE`) dipilih secara eksplisit oleh Owner. Nilai yang berbeda antara
   baris spreadsheet dan keputusan Pricing v1 tetap ditangani oleh policy
   server, bukan ditebak oleh importer.
5. Aktivasi/smoke Biteship dan Midtrans sengaja tidak dilakukan sesuai batas
   goal Owner.

Dengan demikian, sumber sudah cukup untuk seed katalog retail loopback yang
terukur dan dapat diaudit. Status ini belum menjadi klaim `catalog ready` atau
checkout retail production-ready karena SKU merchandising, dimensi paket,
keputusan publish, provider, dan bukti visual/Owner tetap merupakan gate
terpisah.
