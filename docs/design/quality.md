# Review kualitas dan validasi panduan Niuva

Prosedur pendukung [DESIGN.md](../../DESIGN.md). Dipakai sesuai scope: pemeriksaan dokumen untuk perubahan dokumentasi; pemeriksaan route untuk implementasi UI. Bukan tahap approval baru, styleguide terpisah, atau sertifikasi production readiness.

## Rubrik yang dapat diperiksa

Untuk setiap dimensi, catat **lolos / perlu revisi / belum teruji**, satu bukti, dan tindakan bila ada. Jangan mengubah keenam dimensi menjadi angka rata-rata yang menutupi kegagalan usability.

| Dimensi | Pertanyaan pemeriksaan | Bukti yang berguna |
| --- | --- | --- |
| Tugas dan bisnis | Dapatkah pengguna mengenali tugas, batas janji, dan tindakan berikutnya? | DEVELOP/MAKE/BUY jelas; CTA dan state mengikuti kontrak |
| Hierarki | Apakah elemen pertama yang terbaca memang informasi paling penting? | Crop viewport dengan judul, objek/status/nilai, dan tindakan |
| Komposisi | Apakah alignment, kedekatan, ukuran, dan whitespace menjelaskan hubungan? | Hubungan narasi–bukti, produk–pilihan, atau record–tindakan |
| Konten dan interaksi | Adakah klaim bersumber, label jelas, dan state yang akurat? | Data nyata/preview berlabel; error/loading/empty/unavailable/success |
| Identitas | Apakah kekhasan datang dari pekerjaan Niuva dan fondasi yang konsisten? | Media/caption/fakta Niuva; token dan tipe sesuai area |
| Usability dan aksesibilitas | Dapatkah tugas diselesaikan pada compact dan dengan keyboard? | Urutan baca/fokus, control, kontras, zoom, reduced motion |

Card dengan radius benar, warna konsisten, headline besar, atau animasi halus tidak menjadi bukti untuk dimensi lain. Kegagalan tugas, data menyesatkan, atau kontrol tak terjangkau harus diperbaiki; tidak ditutupi kualitas estetika.

## Pertanyaan anti-template

- Jika nama/logo Niuva dihapus, informasi spesifik pekerjaan apa yang masih tersisa?
- Apa alasan setiap wadah: satu record, satu keputusan, perbandingan, langkah, atau sekadar dekorasi?
- Apakah setiap seksi memakai headline–paragraf–grid card yang sama meski jenis kontennya berbeda?
- Apakah caption/metadata menjelaskan bukti, atau hanya menambahkan istilah engineering?
- Apakah whitespace, crop, atau motion membantu memahami sesuatu yang dapat disebutkan?
- Bila memakai pola familiar seperti centered hero, tiga kolom, bento, atau KPI, apakah konten/tugas membenarkannya?

Jawaban yang spesifik lebih berguna daripada “lebih premium”, “lebih modern”, atau “kurang AI”. Familiaritas yang membantu usability bukan cacat.

## Review implementasi pada route asli

Untuk pekerjaan UI berikutnya, periksa pemakaian komponen shadcn/ui lokal sesuai kontrak Components di [DESIGN.md](../../DESIGN.md), termasuk komposisi domain Niuva. Telusuri import ke lapis bersama, hindari primitive paralel, dan pertahankan native/no-JS behavior yang berlaku. Jika shared primitive berubah, periksa pemakai lintas area yang terdampak. Pemeriksaan ini tidak mewajibkan shell atau density yang sama dan tidak menyatakan migrasi selesai hanya karena panduannya disetujui.

1. Catat route, commit/working-tree state, sumber data, dan state yang sedang diperiksa. Jangan mengganti route yang sulit dirender dengan mock lalu mengklaim route tersebut sudah lulus.
2. Periksa desktop sekitar 1440px dan compact 390px, lalu 320/768/1024/1280px sesuai breakpoint/konten yang berisiko. Ambil capture sebelum/sesudah pada data yang sebanding; sertakan bagian bawah halaman dan state penting, bukan hero saja.
3. Uji keyboard, focus visibility/return, Escape, label/error association, heading/landmark, zoom 200%, nama/angka panjang, loading/empty/error/unavailable/success, dan reduced motion.
4. Periksa kontras pasangan aktual, termasuk opacity ring/teks, hover, dark surface, disabled, serta teks di atas media. Pasangan solid yang lolos lint tidak membuktikan semua state.
5. Periksa tujuan link/CTA, nilai canonical, native/no-JS flow yang berlaku, dan tidak ada overflow halaman. Table scroll terlokalisasi harus disengaja serta dapat digunakan.
6. Perbaiki defect yang ditemukan dalam scope, lalu konfirmasi hasil. Jalankan gate aplikasi yang diwajibkan untuk perubahan kode; screenshot tidak menggantikan test.
7. Tunjukkan route/capture aktual. Laporkan visual acceptance sebagai belum ditinjau sampai Owner menerimanya; jangan membuat approval berantai yang tidak diminta.

Catat browser/viewport dan apa yang belum diperiksa. Browser emulation, pemeriksaan source, dan screenshot tidak membuktikan perangkat fisik, assistive technology, provider, atau produksi.

## Validasi dokumen dengan Google design.md

CLI 0.4.0 telah diperiksa kompatibel dengan Node lokal dan Windows. Gunakan alias tanpa suffix .md:

```powershell
npx --yes --package '@google/design.md@0.4.0' designmd lint DESIGN.md
git diff --check
```

Perintah npx memakai paket publik di cache tool, tanpa menambahkan dependency/lockfile proyek atau biaya langganan. Eksekusi pertama membutuhkan jaringan dan tetap menjalankan kode paket eksternal; versi dipin agar perubahan validator tidak terjadi diam-diam. Tidak perlu memasang seluruh skill atau exporter.

Baca `summary.errors`, `summary.warnings`, serta tiap finding; exit code 0 dapat tetap memiliki warning. Target: tidak ada error atau warning yang belum dijelaskan. Pemeriksaan Google mencakup struktur, referensi, urutan seksi, dan pasangan warna yang dideklarasikan; tidak membaca seluruh CSS/React atau menilai originalitas. Jangan menambahkan token/komponen palsu hanya agar warning hilang. Jangan menimpa globals.css lewat export otomatis.

Parser lokal Impeccable dapat membaca front matter dan delapan seksi canonical. Namun `assessCoverage` memakai heuristik prose yang tidak mengekstrak seluruh tabel/kalimat Bahasa Indonesia; nilai count nol bukan bukti token/komponen tidak ada. Baca front matter dan source langsung; jangan memakai skor tersebut untuk mengarang fondasi pengganti.

Untuk membandingkan versi, gunakan `designmd diff <before> <after>` terhadap dua dokumen berformat valid. Bila baseline lama memiliki schema yang berbeda, catat keterbatasan perbandingan dan periksa perubahan semantik; penurunan warning bukan bukti identitas baru lebih baik.

## Pemeriksaan konsistensi dengan source

| Pemeriksaan | Cara menilai |
| --- | --- |
| Warna | Resolve alias CSS pada :root dan .dark; bandingkan setiap mapping front matter dengan konteksnya. Jangan menyamakan input border dengan divider. |
| Tipe | Bandingkan enam role compact, weight, tracking, dan line-height dengan typographySystemTokens; cocokkan seluruh langkah standard/wide dalam tabel dan pemuatan family di layout.tsx. |
| Bentuk/jarak | Cocokkan rounded sm/md/lg/full ke radius control/card/media/pill dan spacing section/content/card ke runtime. Nama token dokumentasi bukan otomatis utility Tailwind. |
| Komponen | Pastikan pasangan lint adalah subset representatif; dokumentasikan state yang belum ada pada varian tertentu. Periksa source untuk border, focus, dan behavior. |
| Cakupan shadcn/ui | Company, Commerce/Customer, dan Admin mengacu pada satu kontrak komponen global dan konfigurasi lokal existing. Pisahkan keputusan yang disetujui dari status migrasi/visual acceptance yang benar-benar terbukti; perubahan dokumen saja tidak membuktikan adopsi seluruh route. |
| Link/authority | Semua file link lokal resolve; panduan area punya jalur baca; proposal/arsip diberi status jelas; kontrak yang superseded tidak tersisa sebagai instruksi aktif. |
| Scope | Tinjau git diff/name-only; perubahan dokumen tidak boleh mengubah runtime, dependency, data, auth, atau kontrak API. |
| Skill | Jalankan quick_validate.py dari skill-creator pada skill lokal; periksa link serta permintaan realistis dari Company, Commerce, dan Admin secara manual. |

Pemeriksaan link/family/token harus membaca struktur sebenarnya, bukan hanya mencari kata yang diperkirakan ada. Tidak perlu menambahkan test yang mengunci wording atau jumlah heading.

## Format bukti penyelesaian

Catat file berubah, command/exit/summary, hasil pemeriksaan token/link/skill, batas review visual, serta hal yang sengaja masih berupa proposal. Untuk UI, tambahkan route/state/viewport dan gate aplikasi yang dijalankan. Catat rollback sesuai file yang berubah. Bukti teknis, review visual Owner, device/AT, provider, dan produksi dilaporkan terpisah.
