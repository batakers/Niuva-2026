# Featured case-study cover proof

Status: **CONFIRMED — Owner-approved public fallback assets, 2026-09-10**. Enam crop individual di folder ini boleh digunakan sebagai aset publik apabila file foto/render original belum tersedia. Integrasi route publik telah disetujui; deployment dan database production tetap merupakan operasi terpisah.

Proof ini menerjemahkan arah cover enam featured case study di `docs/content/niuva-content-curation-dossier.md` ke slot media 16:9. Output dinormalisasi ke 1600 × 900 px agar komposisinya dapat dibandingkan pada rasio yang sama.

## Batas penggunaan

- Sumber hanya berasal dari PDF yang telah diizinkan untuk kurasi portofolio publik.
- Transformasi terbatas pada ekstraksi, crop, resize, dan padding. Tidak ada generative fill, retouching, atau perubahan semantik pada karya.
- Resolusi 1600 × 900 adalah ukuran output proof, bukan jaminan resolusi asli. Beberapa sumber PDF beresolusi rendah dan mengalami upscale.
- Teks, label, logo, atau angka yang masih terlihat di dalam gambar merupakan bagian dari dokumentasi sumber. Elemen tersebut tidak otomatis menjadi klaim faktual website.
- Klaim performa, dampak bisnis, status produksi, spesifikasi teknis, dan kepemilikan IP tetap tidak boleh ditambahkan tanpa bukti pendukung.
- File foto/render asli tetap diprioritaskan bila tersedia. Enam crop individual ini adalah fallback production yang telah direview pada desktop dan viewport responsif.

## Contact sheet

`featured-cover-contact-sheet.png` menyandingkan seluruh kandidat dalam urutan editorial yang telah disetujui. Contact sheet hanya untuk review; jangan digunakan sebagai aset halaman.

## Manifest kandidat

### CS-01 — Smart Drop Box

- File: `cs-01-smart-drop-box.png`
- Sumber: `docs/source/brand/PRODUCT DESIGN SERVICES selection.pdf`, halaman PDF 13.
- Ekstraksi: crop `(795, 225, 1435, 680)` dari render halaman 1920 × 1080, lalu dipad ke 16:9.
- Peran visual: primary product visualization dengan beberapa pandangan komponen.
- Batas caption: gunakan “Smart Drop Box — P&G”; jangan menyatakan hasil implementasi atau dampak operasional.
- Alt text kandidat: “Visualisasi Smart Drop Box berwarna putih dan biru dengan beberapa pandangan komponen.”

### CS-02 — Konsep dan Desain Eksterior Motor EV

- File: `cs-02-motor-ev.png`
- Sumber: `docs/source/Company profile PT Niuva_compressed.pdf`, halaman PDF 10.
- Ekstraksi: crop `(240, 560, 845, 925)` dari render halaman 1920 × 1080, lalu dipad ke 16:9.
- Peran visual: visualisasi eksterior motor; foto kendaraan fisik pada halaman sumber tidak digunakan sebagai cover.
- Batas caption: gunakan “Konsep dan Desain Eksterior Motor EV — PT Pindad”; jangan menyatakan kendaraan telah diproduksi atau diluncurkan.
- Alt text kandidat: “Visualisasi samping konsep motor listrik berwarna hijau.”

### CS-05 — Bagit

- File: `cs-05-bagit.png`
- Sumber: `docs/source/brand/portofolio produk NIUVA.pdf`, halaman PDF 11, embedded image `xref 152`.
- Ekstraksi: gambar produk depan 358 × 560 px diekstrak tanpa crop, lalu dipad ke 16:9.
- Peran visual: product-focused image yang mempertahankan siluet tas secara utuh.
- Batas caption: gunakan “Bagit — Arei Smart Bag V2”; jangan menambahkan klaim performa RFID atau aplikasi.
- Alt text kandidat: “Tampilan depan tas ransel hijau Bagit Arei Smart Bag V2.”

### CS-03 — Simulator Keselamatan Berkendara

- File: `cs-03-simulator.png`
- Sumber: `docs/source/Company profile PT Niuva_compressed.pdf`, halaman PDF 12.
- Ekstraksi: crop `(85, 155, 465, 690)` dari render halaman 1920 × 1080, lalu dipad ke 16:9.
- Peran visual: complete simulator setup dalam konteks area kerja; bentuk portrait dipertahankan agar perangkat tidak terpotong.
- Batas caption: gunakan “Simulator Keselamatan Berkendara — Agate / PT DENSO”; deskripsikan sebagai dokumentasi setup/prototype, bukan bukti hasil keselamatan.
- Alt text kandidat: “Sepeda motor pada rangka penyangga di area kerja sebagai konteks perangkat simulator.”

### CS-06 — Savero

- File: `cs-06-savero.png`
- Sumber: `docs/source/brand/portofolio produk NIUVA.pdf`, halaman PDF 3.
- Ekstraksi: crop `(150, 140, 1750, 1040)` dari render halaman 1920 × 1080; rasio crop sudah 16:9.
- Peran visual: komposisi gabungan identitas dan beberapa konsep aksesori produk.
- Batas caption: gunakan “Savero — Identitas Visual dan Aksesori Produk”; jangan menyatakan status produksi massal.
- Alt text kandidat: “Komposisi visual beberapa konsep aksesori produk Savero berwarna hitam dan merah.”

### CS-04 — BeVenTU

- File: `cs-04-beventu.png`
- Sumber: `docs/source/brand/portofolio produk NIUVA.pdf`, halaman PDF 6.
- Ekstraksi: crop `(330, 420, 1055, 935)` dari render halaman 1920 × 1080, lalu dipad ke 16:9 dengan abu-abu netral dari bidang sumber.
- Peran visual: primary product visualization. Area spesifikasi, nomor IP, dan identitas halaman sengaja dikeluarkan dari crop.
- Batas caption: gunakan “BeVenTU — Konsep Sistem Ventilator Darurat”; jangan memuat klaim medis, spesifikasi, kesiapan klinis, atau kepemilikan IP.
- Alt text kandidat: “Visualisasi konsep perangkat BeVenTU berwarna putih dengan panel depan.”

## Gate berikutnya

Enam crop individual telah lolos asset gate dan dipasang sebagai salinan publik byte-identik di `public/media/portfolio/`. Seed konten hanya dapat berjalan terhadap database test loopback; media asli tetap diprioritaskan bila tersedia.
