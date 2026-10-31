# Project documentation proof

Status: **CONFIRMED — Owner-approved public assets, 2026-11-01** ("Setujui yang disarankan"). Dari 62 gambar yang ditinjau, 42 bertanda *disarankan* disetujui beserta keterangannya. Gambar bertanda *opsional* (17) dan *tidak disarankan* (3) tidak dipakai. File yang sama ada di `public/media/portfolio/` dan tampil sebagai galeri "Dokumentasi proyek" di halaman detail. Deployment dan database production tetap operasi terpisah.

## Batas penggunaan

- Sumber hanya PDF yang sudah diizinkan untuk kurasi portofolio publik (`SRC-PORT-001`, `SRC-PDS-001`, `SRC-COMPANY-001`, `SRC-COMPANY-002`).
- Transformasi terbatas pada ekstraksi gambar tertanam dan komposisi mask di atas putih, lalu disimpan ulang sebagai PNG lossless. Tidak ada resize, crop, generative fill, retouching, atau perubahan semantik.
- Ukuran di manifest adalah piksel file. Halaman detail tidak menggambar file lebih lebar dari ukuran itu.
- Gambar yang sama dengan cover proyek tidak diulang di galeri.
- Teks, label, atau logo yang terlihat di dalam gambar adalah bagian dokumentasi sumber dan tidak otomatis menjadi klaim website.
- Tidak dipakai: lembar spesifikasi BeVenTU (angka teknis tanpa bukti), foto anak yang dapat dikenali di bilik sterilisasi, dan instalasi bertema Netflix Stranger Things. Motor EV Pindad (CS-02) dan Mock-up Militer (SW-06) hanya punya gambar opsional, jadi tanpa galeri. Elips Tandem Bike tidak punya dokumentasi tambahan; satu-satunya gambar lain memuat tulisan "MITCH design 2003" yang atribusinya menunggu Owner.

## Manifest

Kolom *Tinjauan* adalah nomor gambar pada lembar tinjauan 1 November 2026.

| ID | Tinjauan | File | Sumber | Ukuran (px) | Keterangan dan alt text |
| --- | --- | --- | --- | --- | --- |
| CS-01 | #1 | `cs-01-smart-drop-box-dok-01.png` | SRC-PORT-001 p.5, embedded image `xref 93` | 1040 × 780 | Dokumentasi presentasi Smart Drop Box kepada pemangku kepentingan. |
| CS-01 | #3 | `cs-01-smart-drop-box-dok-02.png` | SRC-PDS-001 p.13, embedded image `xref 314` | 1268 × 448 | Gambar teknik Smart Drop Box dari beberapa pandangan. |
| CS-01 | #4 | `cs-01-smart-drop-box-dok-03.png` | SRC-PDS-001 p.13, embedded image `xref 315` | 599 × 736 | Sketsa eksplorasi bentuk Smart Drop Box. |
| CS-03 | #2 | `cs-03-simulator-dok-01.png` | SRC-COMPANY-001 p.12, embedded image `xref 215` | 401 × 572 | Rangkaian elektronik di dalam rangka simulator selama pengembangan. |
| CS-03 | #3 | `cs-03-simulator-dok-02.png` | SRC-COMPANY-002 p.13, embedded image `xref 457` | 576 × 967 | Setup simulator berkendara dengan sepeda motor dan layar monitor. |
| CS-04 | #1 | `cs-04-beventu-dok-01.png` | SRC-PORT-001 p.6, embedded image `xref 97` | 1119 × 467 | Render tampak depan BeVenTU dengan panel kontrol. |
| CS-04 | #4 | `cs-04-beventu-dok-02.png` | SRC-PORT-001 p.6, embedded image `xref 102` | 809 × 446 | Render alternatif bentuk BeVenTU dalam beberapa varian. |
| CS-05 | #1 | `cs-05-bagit-dok-01.png` | SRC-PORT-001 p.10, embedded image `xref 136` | 556 × 291 | Sketsa konsep Arei Smart Bag V1 dengan sensor dan layar LCD. |
| CS-05 | #2 | `cs-05-bagit-dok-02.png` | SRC-PORT-001 p.10, embedded image `xref 138` | 486 × 642 | Sketsa teknis ransel Arei Smart Bag V1. |
| CS-05 | #3 | `cs-05-bagit-dok-03.png` | SRC-PORT-001 p.10, embedded image `xref 140` | 548 × 274 | Purwarupa V1 dengan kompartemen elektronik. |
| CS-05 | #5 | `cs-05-bagit-dok-04.png` | SRC-PORT-001 p.10, embedded image `xref 144` | 640 × 1045 | Purwarupa ransel Arei Smart Bag V1. |
| CS-05 | #6 | `cs-05-bagit-dok-05.png` | SRC-PORT-001 p.11, embedded image `xref 151` | 918 × 638 | Letak tag RFID, pembaca RFID, dan powerbank pada Bagit V2. |
| CS-05 | #7 | `cs-05-bagit-dok-06.png` | SRC-PORT-001 p.11, embedded image `xref 153` | 1008 × 641 | Panduan penggunaan Bagit V2 dengan aplikasi ponsel. |
| CS-05 | #9 | `cs-05-bagit-dok-07.png` | SRC-PORT-001 p.11, embedded image `xref 155` | 501 × 563 | Bagit V2 dipakai di jalur pendakian. |
| CS-06 | #2 | `cs-06-savero-dok-01.png` | SRC-PORT-001 p.3, embedded image `xref 59` | 640 × 423 | Render front lid ransel Savero. |
| CS-06 | #3 | `cs-06-savero-dok-02.png` | SRC-PORT-001 p.3, embedded image `xref 60` | 478 × 388 | Render penarik ritsleting Savero. |
| CS-06 | #4 | `cs-06-savero-dok-03.png` | SRC-PORT-001 p.3, embedded image `xref 61` | 640 × 322 | Render penarik ritsleting dengan aksen merah. |
| CS-06 | #5 | `cs-06-savero-dok-04.png` | SRC-PORT-001 p.3, embedded image `xref 62` | 810 × 548 | Render emblem logo Savero. |
| CS-06 | #6 | `cs-06-savero-dok-05.png` | SRC-PORT-001 p.3, embedded image `xref 63` | 897 × 282 | Render pelat nama Savero Spirit of Style. |
| CS-06 | #7 | `cs-06-savero-dok-06.png` | SRC-PDS-001 p.3, embedded image `xref 256` | 734 × 1095 | Label dan kemasan identitas Polo Savero. |
| CS-06 | #12 | `cs-06-savero-dok-07.png` | SRC-PDS-001 p.4, embedded image `xref 263` | 1025 × 1007 | Gambar teknik tag logo Savero. |
| CS-06 | #13 | `cs-06-savero-dok-08.png` | SRC-PDS-001 p.4, embedded image `xref 264` | 1025 × 917 | Rangkaian aksesori brand Savero. |
| CS-06 | #16 | `cs-06-savero-dok-09.png` | SRC-PDS-001 p.5, embedded image `xref 270` | 734 × 485 | Gambar teknik front lid skala 1:1. |
| CS-06 | #17 | `cs-06-savero-dok-10.png` | SRC-PDS-001 p.5, embedded image `xref 271` | 594 × 982 | Gambar teknik back system skala 1:1. |
| SW-01 | #1 | `sw-01-waste-based-product-dok-01.png` | SRC-PORT-001 p.1, embedded image `xref 28` | 337 × 450 | Render konsep wadah dan rak. |
| SW-03 | #1 | `sw-03-screen-printing-workstation-dok-01.png` | SRC-PORT-001 p.4, embedded image `xref 72` | 640 × 480 | Render modul meja kerja sablon dengan rak pengering. |
| SW-03 | #2 | `sw-03-screen-printing-workstation-dok-02.png` | SRC-PORT-001 p.4, embedded image `xref 76` | 485 × 333 | Render tata letak area kerja sablon. |
| SW-04 | #1 | `sw-04-portable-handwash-station-dok-01.png` | SRC-PORT-001 p.7, embedded image `xref 115` | 758 × 740 | Unit fisik stasiun cuci tangan dengan tangki dan rangka bening. |
| SW-04 | #2 | `sw-04-portable-handwash-station-dok-02.png` | SRC-PORT-001 p.7, embedded image `xref 117` | 259 × 394 | Rangkaian elektronik di dalam unit. |
| SW-05 | #1 | `sw-05-konsep-sterilizer-tunnel-dok-01.png` | SRC-PORT-001 p.8, embedded image `xref 122` | 1009 × 324 | Render interior terowongan sterilisasi tiga fase. |
| SW-05 | #2 | `sw-05-konsep-sterilizer-tunnel-dok-02.png` | SRC-PORT-001 p.8, embedded image `xref 124` | 1009 × 492 | Render jalur di dalam terowongan. |
| SW-05 | #3 | `sw-05-konsep-sterilizer-tunnel-dok-03.png` | SRC-PORT-001 p.9, embedded image `xref 127` | 1025 × 1078 | Render bilik sterilisasi dua fase. |
| SW-05 | #4 | `sw-05-konsep-sterilizer-tunnel-dok-04.png` | SRC-PORT-001 p.9, embedded image `xref 129` | 1560 × 526 | Bilik sterilisasi di area terbuka. |
| SW-07 | #2 | `sw-07-field-kitchen-truck-bhimasena-dok-01.png` | SRC-PDS-001 p.9, embedded image `xref 296` | 1040 × 585 | Model truk dapur lapangan di meja pameran. |
| SW-08 | #1 | `sw-08-pengembangan-tas-kulit-yogyakarta-dok-01.png` | SRC-PDS-001 p.10, embedded image `xref 299` | 1040 × 585 | Stan pameran produk kulit bersama Disperindag D.I. Yogyakarta. |
| SW-08 | #2 | `sw-08-pengembangan-tas-kulit-yogyakarta-dok-02.png` | SRC-PDS-001 p.11, embedded image `xref 303` | 585 × 602 | Tas kulit berwarna cokelat tua. |
| SW-09 | #1 | `sw-09-konsep-mobil-listrik-telkom-university-dok-01.png` | SRC-PDS-001 p.12, embedded image `xref 306` | 892 × 585 | Perakitan rangka dan bodi mobil listrik di bengkel. |
| SW-09 | #2 | `sw-09-konsep-mobil-listrik-telkom-university-dok-02.png` | SRC-PDS-001 p.12, embedded image `xref 307` | 1040 × 441 | Panel bodi kayu dipasang pada rangka. |
| SW-09 | #3 | `sw-09-konsep-mobil-listrik-telkom-university-dok-03.png` | SRC-PDS-001 p.12, embedded image `xref 308` | 1041 × 648 | Tim merakit bodi kendaraan. |
| SW-09 | #4 | `sw-09-konsep-mobil-listrik-telkom-university-dok-04.png` | SRC-PDS-001 p.12, embedded image `xref 309` | 745 × 585 | Bentuk bodi kendaraan selama perakitan. |
| SW-10 | #1 | `sw-10-redesain-motor-xeon-konversi-listrik-dok-01.png` | SRC-COMPANY-001 p.9, embedded image `xref 179` | 554 × 413 | Ruang baterai motor untuk konversi listrik. |
| SW-11 | #1 | `sw-11-bicycle-arcade-agate-dok-01.png` | SRC-COMPANY-001 p.11, embedded image `xref 195` | 385 × 546 | Perangkat sepeda arcade di area kerja. |
