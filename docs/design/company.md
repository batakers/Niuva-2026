# Company Website — pedoman penerapan aktif

Baca setelah [DESIGN.md](../../DESIGN.md). Berlaku untuk homepage, layanan, projects, dan case study. Tujuannya membantu calon klien memahami pekerjaan yang bisa dibahas bersama Niuva. Identitas tetap partner pengembangan produk dengan kapabilitas manufaktur; 3D printing adalah salah satu kemampuan, bukan seluruh cerita.

## Komponen shadcn/ui pada Company

Company mengikuti kontrak shadcn/ui global di [DESIGN.md](../../DESIGN.md), memakai komponen lokal yang sama dengan Commerce dan Admin. Keputusan ini sudah disetujui; pembaruan panduan tidak menjalankan migrasi route Company.

- CTA memakai Button/link aksi bersama. Separator, Badge, Card, dan komponen disclosure/overlay dipilih sesuai isi dan perilaku yang diperlukan, dengan tema Niuva.
- Service/project evidence dan bagian naratif tetap komposisi khusus Niuva dari komponen bersama, HTML semantik, serta media bersumber. Heading, ordered list, atau definition list tidak harus menjadi Card.
- Header/footer dan ritme editorial mengikuti tujuan Company. Penggunaan shadcn/ui tidak mewajibkan sidebar, tabel operasional, atau shell dashboard pada halaman naratif.
- Pertahankan link navigasi, semantik CTA WhatsApp, active state, keyboard/fokus, dan fallback disclosure existing saat penerapan kelak dikerjakan.

## Isi menentukan komposisi

Mulai dari pertanyaan pengunjung, bukti yang tersedia, lalu tindakan. Pilih bentuk yang menjelaskan hubungan itu; jangan mulai dari jumlah card atau susunan hero bawaan.

| Kebutuhan konten | Bentuk yang sesuai | Hubungan pada layar lebar / compact |
| --- | --- | --- |
| Menjelaskan kemampuan melalui satu artefak nyata | Judul dan uraian singkat berhadapan dengan artefak besar serta caption | Narasi 5 kolom / artefak 7 kolom bila isi mendukung; compact menjadi judul → artefak → uraian/tindakan |
| Pengunjung memilih DEVELOP, MAKE, atau BUY | Tiga pintu masuk dengan tujuan yang jelas | Ukuran boleh berbeda menurut penekanan halaman; compact mempertahankan label dan tujuan tiap jalur |
| Menjelaskan beberapa layanan tanpa gambar yang bermakna | Daftar editorial, divider, dan uraian input/output | Nama di kolom pendek, penjelasan di kolom panjang; compact satu layanan utuh sebelum berikutnya |
| Membuktikan satu project | Gambar dominan dengan kebutuhan, proses, dan output bersumber | Caption menempel pada bukti; hindari memisahkan gambar dari penjelasannya melalui seksi hiasan |
| Menjelaskan urutan pekerjaan | Ordered list atau diagram langkah yang dapat dibaca | Panjang langkah mengikuti penjelasan; compact tetap urutan yang sama, bukan carousel wajib |
| Membandingkan kemampuan atau batas | Tabel/definition list dengan label konkret | Header dan hubungan pasangan terjaga; beri scroll berlabel bila tabel benar-benar membutuhkan lebar |

Angka pembagian kolom di sini adalah contoh lokal, bukan layout wajib atau token fondasi baru. Hero centered sah untuk satu pernyataan singkat dengan satu fokus yang jelas. Hero split juga dapat menjadi generik bila hanya menaruh paragraf umum di kiri dan dekorasi di kanan.

Pada halaman yang panjang, ubah bentuk seksi ketika jenis informasinya berubah. Satu artefak utama dapat diikuti daftar layanan dan satu urutan proses. Jangan mengganti semua seksi menjadi grid yang sama; jangan pula menciptakan variasi setiap seksi tanpa hubungan dengan kontennya.

## Hierarki dan ritme editorial

- Pilih satu ide utama untuk headline; gunakan copy/fakta approved dari source. Besar huruf tidak menggantikan ketepatan pesan.
- Pakai display untuk positioning singkat. Judul seksi menjelaskan isi, bukan mengulangi slogan. Uraian panjang tetap pada measure body yang terbaca.
- Jangan menaruh label kecil di atas judul. Kategori, tahap, atau konteks masuk ke judul atau kalimat pertama. Tautan kembali ("Semua layanan", "Semua proyek") adalah navigasi, bukan label.
- Selaraskan baseline judul, caption, dan divider agar hubungan antarelemen terlihat. Whitespace yang lebih luas memisahkan topik; jarak yang lebih kecil menandai satu kelompok.
- Bidang Niuva Blue hanya untuk hero Beranda, hero detail layanan, dan panel penutup; seksi lain tetap di dasar terang atau permukaan putih.

## Komposisi route Company (T47, 31 Oktober 2026)

Dibangun di atas Foundation v2; Beranda diterima Owner 31 Okt 2026, route lain menunggu tinjauan.

- **Beranda:** bidang biru dengan maskot dan kartu fakta → kartu pintu → pemilih titik mulai → adegan proses → daftar layanan → daftar judul proyek → panel penutup.
- **Layanan:** judul display dan satu aksi "Hubungi Kami" berhadapan dengan daftar besar empat layanan (tautan ke seksinya); tiap layanan satu baris editorial: nama dan tag di kolom pendek, framing bertinta penuh, cakupan, serta "Yang bisa Anda bawa"/"Arah pembahasan" di kolom panjang, lalu "Lihat detail <layanan>"; lima jenis produk Profil 2026 ("Yang bisa kami buat"), dengan Produk Cetak 3D menuju Custom 3D Print; ditutup panel biru.
- **Detail layanan:** bidang biru dengan pose maskot per layanan (Riset & Pengembangan: ide; Desain & Rekayasa: laptop; Prototipe & Manufaktur Digital: kunci inggris; Konsultansi & Workshop: menunjuk) dan satu kartu fakta "Dibahas lewat WhatsApp"; input → output sebagai dua permukaan berurutan; tiga langkah awal dalam ordered list; kartu proyek terkait atau kosong yang jujur; panel penutup.
- **Proyek:** judul dan kalimat pendukung bertumpuk, filter, lalu satu galeri "Semua proyek" berurutan editorial: setiap proyek tampil dengan cover yang disetujui dan membuka halaman detailnya sendiri (Owner, 1 Nov 2026); proyek tanpa cerita lengkap menampilkan ringkasan, cover, dan dokumentasi yang disetujui; panel penutup.
- **Detail proyek:** judul dipecah menjadi nama karya dan klien/keterangan tanpa em dash, ringkasan bertinta penuh, foto bukti besar, cerita dalam baris editorial, panel penutup.
- **Panel penutup** (`ClosingPanel`) sama di setiap route Company: judul, aksi WhatsApp `onBrand`, dan maskot kemenangan.
- **Legal** (`/terms`, `/privacy`): halaman baca yang tenang tanpa bidang biru. Mulai `lg` daftar isi menempel di samping teks; di bawah `lg` ia menjadi disclosure di bawah judul. Versi dan tanggal ada di satu kartu fakta, teks bertinta penuh, tabel bergulir di dalam kartunya, dan dokumen ditutup kartu "Baca juga" ke dokumen pasangannya. Teks resmi tidak diubah; anchor bagian dibuat dari judul tanpa nomornya.
- **404 dan error publik:** bidang biru dengan geometri detail layanan; maskot ide (tanda tanya dan bohlam) untuk halaman atau proyek yang tidak ada, maskot kunci inggris untuk error. Satu aksi `onBrand` dan satu tautan putih bergaris bawah. Global error tetap teks polos karena stylesheet bisa ikut gagal.

## Bukti dan media

Gunakan media dan publication state yang sudah disetujui. Source konten aktif ada di [company-content.ts](../../src/features/public/company-content.ts), pembaca portfolio, dan route produk. Foto/diagram harus menjelaskan objek, konteks penggunaan, proses, atau hasil yang benar-benar diketahui.

Caption menjawab apa yang terlihat dan mengapa relevan. Material, ukuran, toleransi, nama klien, durasi, atau hasil kuantitatif hanya ditampilkan jika bersumber. Jangan memakai crosshair, garis ukur, code snippet, atau label teknis sebagai ornamen engineering.

Cover proyek yang dipotong dari PDF beresolusi rendah (360–1.270 px), jadi halaman detail membatasinya 50rem di dalam bingkai putih dan semua gambar portofolio memakai kualitas 90; ganti dengan render atau foto asli ≥2.000 px bila Owner menyediakannya. Galeri "Dokumentasi proyek" di halaman detail menyusun gambar yang disetujui dalam dua kolom masonry pada proporsi aslinya, dengan keterangan di bawah tiap gambar, dan tidak pernah menggambar file lebih lebar dari pikselnya. Objek produk/CAD yang perlu diperiksa utuh memakai contain; dokumentasi proses boleh cover dengan crop terkendali. Pilih rasio per artefak. Jangan membuat semua media menjadi gambar stock, screenshot palsu, atau render yang seolah proyek Niuva. Bila bukti tidak tersedia, pilih uraian yang jujur atau state kosong; jangan mengarang case study atau mengembangkan record card-only menjadi cerita lengkap.

## Navigasi dan tindakan

Public navigation mempertahankan **Layanan → Proyek → Custom 3D Print → Toko** (label Q20, 31 Okt 2026); Keranjang dan Akun adalah utilitas. Header terang yang sticky, active underline, dan disclosure compact mengikuti [PublicShell](../../src/components/niuva/public-shell.tsx) serta [PublicNavigation](../../src/components/niuva/public-navigation.tsx), bukan salinan header referensi eksternal. Disclosure digunakan sebelum link berdesakan, termasuk tablet; tidak menyembunyikan menu lewat horizontal scroll.

| Jalur | Tindakan yang benar |
| --- | --- |
| DEVELOP / kebutuhan B2B | **Hubungi Kami** memakai kontak WhatsApp existing tanpa login/form; tombol outline dan tanpa keterangan tambahan di bawah tombol |
| MAKE / model, file, atau referensi custom | Menuju alur Custom Print; tidak disamakan dengan pembelian ready-made |
| BUY / produk siap jadi | Menuju Shop dan detail produk untuk memeriksa varian, harga, serta stok |

CTA mengikuti tugas route. Homepage boleh membantu memilih titik mulai; halaman layanan boleh memusatkan pembahasan B2B. Jangan mengaktifkan kembali Project Brief, proposal akun, atau inquiry Admin untuk membuat cerita halaman terasa lengkap. Footer tetap menyediakan support, legal, dan utilitas yang bisa ditemukan.

## Contoh keputusan pada konten Niuva

Untuk **Design & Prototyping**, judul layanan, input yang bisa dibawa, dan arah pembahasan sudah ada. Jika project terkait memiliki bukti publik yang cukup, tampilkan satu artefak besar dengan caption lalu jelaskan proses. Jika tidak, gunakan daftar input/output dan langkah pembahasan yang ada. Empat card identik dengan ikon “ide”, “desain”, “cetak”, “selesai” tidak menambahkan bukti.

Pada homepage, section bukti project boleh memiliki bentuk berbeda dari pintu masuk tiga journey. Card untuk ketiga journey tetap masuk akal karena tiap pilihan membuka tugas berbeda. Capability yang hanya menjelaskan scope dapat lebih jelas sebagai daftar editorial.

## Pemeriksaan area

Gunakan [quality review](quality.md). Pada compact, pengunjung tetap dapat menyebut kemampuan Niuva, menemukan bukti yang relevan, dan memilih DEVELOP/MAKE/BUY tanpa menebak. Periksa crop media, baris headline, pembacaan caption, menu keyboard, CTA WhatsApp, dan tujuan link sebenarnya. Screenshot yang indah tanpa alur tersebut belum memenuhi tujuan halaman.
