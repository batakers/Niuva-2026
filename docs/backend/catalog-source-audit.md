# Audit sumber katalog dan media

Snapshot: **2026-09-16** · scope: loopback development saja.

Dokumen ini mencatat apa yang benar-benar tersedia dari empat berkas Owner.
Berkas sumber diperlakukan sebagai evidence; angka, SKU, stok, dan hak publikasi
tidak diisi ulang dari asumsi.

## Temuan per sumber

| Sumber | Fakta yang dapat dipakai | Tidak tersedia untuk seed Shop |
| --- | --- | --- |
| `docs/source/Pricelist 3D Print Niuva.xlsx` (sheet `JASA CETAK`) | Tarif jasa cetak PLA/ABS bertingkat, tarif waktu mesin, filament customer/komunal, sewa, workstation, dan service. | Nama produk retail, SKU, varian, stok, berat/dimensi paket, foto produk, serta keputusan `quantitySemantics` untuk pricing rule runtime. |
| `docs/source/brand/portofolio produk NIUVA.pdf` (11 halaman) | Papan proyek/produk: Waste-based Product, Elips Tandem Penta Bike, brand accessories, Screen Printing Workstation, Smart Drop Box, BeVenTU, Portable Handwash Station, Sterilizer Tunnel 3/2 fase, Arei Smart Bag V1, dan Bagit Arei Smart Bag V2. | Harga jual, SKU, stok, varian retail, dimensi pengiriman, dan asset foto produk yang siap dipetakan ke `public/media/products/`. |
| `docs/source/brand/PRODUCT DESIGN SERVICES selection.pdf` (13 halaman) | Artefak layanan/proyek: PDS Telkom University, Savero, mock-up PT Pindad, Field Kitchen Truck/Bhimasena, leather bag, electric car, dan Smart Drop Box. | Data katalog retail dan metadata komersial produk. |
| `docs/source/Company profile PT Niuva_compressed.pdf` (15 halaman) | Positioning perusahaan, empat layanan, dan ringkasan proyek termasuk Motor Xeon, motor EV PT Pindad, Bicycle Arcade, dan Motorcycle Simulator. | SKU, price list retail, stok, mapping media produk retail, dan approval publikasi komersial. |

## Yang sudah dipetakan dan di-seed

- Konten publik yang telah dikurasi dari sumber di atas di-upsert ke database
  `niuva_dev` melalui `db:seed:public-content:local` yang hanya menerima
  PostgreSQL loopback non-production dengan konfirmasi eksplisit.
- Hasil seed loopback terakhir: **4 layanan, 17 proyek, 6 media portfolio**.
- Enam cover portfolio memakai mapping yang sudah ada dan tervalidasi ke file
  `public/media/portfolio/*.png`. Mapping ini bukan klaim bahwa file tersebut
  adalah foto produk retail.
- Importer `db:seed:catalog` tetap menolak media yang tidak memiliki file nyata
  di `public/`, sehingga tidak ada foto produk sintetis atau placeholder yang
  dipublikasikan.

## Gate yang masih terbuka

1. Katalog Shop belum boleh di-seed dari empat berkas ini saja. Owner perlu
   mengirim dataset produk retail dengan nama, deskripsi, SKU/varian, harga,
   stok awal, berat/dimensi, status publikasi, dan mapping file foto.
2. Workbook belum boleh mengaktifkan `CUSTOM_PRINT_V1` secara otomatis karena
   kebijakan runtime mewajibkan `quantitySemantics` (`PER_UNIT` atau
   `AGGREGATE`) dipilih secara eksplisit oleh Owner. Nilai yang berbeda antara
   baris spreadsheet dan keputusan Pricing v1 tetap ditangani oleh policy
   server, bukan ditebak oleh importer.
3. Asset foto produk retail asli belum ada di `public/media/products/`.
4. Aktivasi/smoke Biteship dan Midtrans sengaja tidak dilakukan sesuai batas
   goal Owner.

Dengan demikian, sumber sudah cukup untuk memperkaya portfolio development dan
menghasilkan audit yang dapat ditindaklanjuti, tetapi belum cukup untuk klaim
`catalog ready` atau checkout retail production-ready.
