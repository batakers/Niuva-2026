# Proposal fondasi — belum aktif

**Status: usulan, belum dipilih untuk runtime.** Pengguna pada 11 Oktober 2026 membuka evaluasi font/token baru dengan proposal terpisah sebelum perubahan runtime. Izin evaluasi ini tidak mengganti DS-DEC-019, warna logo, atau [DESIGN.md](../../DESIGN.md).

Persetujuan konsep panduan pada tanggal yang sama menetapkan shadcn/ui sebagai dasar komponen seluruh halaman; kontraknya dimiliki DESIGN dan berlaku pada semua kandidat di bawah. Persetujuan dokumen ini belum memilih kandidat font alternatif atau menjalankan migrasi komponen. Eksperimen yang kelak diminta memakai lapis shadcn/ui lokal dan mempertahankan komposisi tiap area.

## Penilaian arah

Minimalist Editorial × Precision Engineering layak diuji karena Niuva perlu menjelaskan pekerjaan dan memperlihatkan artefak yang dapat diperiksa. Arahnya menjadi lemah bila hanya diterjemahkan sebagai headline besar, serif tambahan, crosshair, dan grid dekoratif. Pada Commerce/Admin, precision terutama berarti hubungan data, status, dan tindakan yang jelas.

Rekomendasi saat ini adalah mempertahankan The Precision Workshop sebagai identitas bersama dan menguji komposisi Company lebih dahulu. Audit source belum menunjukkan bahwa mengganti family atau warna akan menyelesaikan pola halaman repetitif.

## Dua kandidat yang konkret

| Kandidat | Font dan nilai | Yang diuji | Dampak bila kelak dipilih |
| --- | --- | --- | --- |
| A — fondasi aktif, komposisi diperbaiki | Space Grotesk utama; Fraunces accent opsional; ukuran/weight/warna/radius v1 tetap | Apakah narasi, proporsi bukti, dan struktur konten sudah cukup membedakan Niuva | Perubahan hanya pada route pilot dan komponen yang diperlukan |
| B — alternatif sans untuk evaluasi | IBM Plex Sans menggantikan Space Grotesk pada role sans; Fraunces tetap accent; weight 400/500/600 dan seluruh ukuran/tracking v1 dipertahankan untuk perbandingan awal | Keterbacaan paragraf, angka/label, dan karakter engineering pada isi yang sama | Perubahan pemuatan font/fallback serta regresi wrap, lebar control, layout, dan performa di ketiga area |

[IBM Plex](https://github.com/IBM/plex) menyediakan sumber font resmi dengan lisensi OFL. Nama family ini adalah kandidat spesifik, bukan bukti otomatis bahwa tampilannya lebih original. Tidak ada font baru diunduh, dependency ditambahkan, atau runtime diubah dalam pekerjaan dokumentasi ini.

**Rekomendasi: A untuk eksperimen pertama.** Kandidat B disimpan agar opsi fondasi baru bisa diperiksa secara konkret bila Owner memilihnya; jangan memuat dua kandidat sekaligus sebagai aturan aktif. Jangan mengganti font bersamaan dengan warna, spacing, imagery, dan motion lalu menganggap hasilnya menjelaskan penyebab perbaikan.

Tidak ada usulan perubahan warna logo, core neutral, radius, atau minimum control saat ini: source belum memberi alasan tugas/aksesibilitas yang memerlukan penggantian tersebut. Bila pengujian menunjukkan masalah kontras atau keterbacaan, usulkan perubahan semantic role yang terukur beserta pasangan/state terdampak, bukan palet baru berdasarkan selera referensi.

## Eksperimen pertama yang direkomendasikan

**Route: homepage /**. Halaman ini sudah memiliki headline, artefak project, tiga journey, portfolio, kemampuan, proses, dan CTA. Ia dapat menguji storytelling serta ritme beberapa jenis informasi dengan data existing, tanpa bergantung pada transaksi atau sesi Admin.

Hipotesis pilot: mempertahankan tiga pintu masuk journey, memberi satu bukti proyek ruang utama, menyajikan capability yang hanya berisi uraian sebagai daftar editorial bila lebih jelas, dan menjaga proses sebagai urutan yang bisa dibaca. Komposisi final mengikuti isi yang tersedia di route; ini rekomendasi eksperimen, bukan redesign yang sudah diimplementasikan.

| Kriteria evaluasi | Bukti pembanding |
| --- | --- |
| Pengunjung mengenali Niuva sebagai partner pengembangan produk | Headline, scope layanan, dan bukti yang saling mendukung |
| DEVELOP/MAKE/BUY dapat dibedakan | Tujuan CTA dan batas alur tetap jelas pada desktop/compact |
| Bukti lebih mudah diperiksa | Objek/caption/konteks terlihat; tidak ada claim atau media baru tanpa sumber |
| Ritme tidak repetitif | Bentuk seksi berubah sesuai jenis isi; bukan sekadar mengganti warna card |
| Usability tetap terjaga | Keyboard/fokus, 320/390/1440px dan breakpoint berisiko, zoom, reduced motion, serta tujuan link |
| Tidak ada regresi operasional | Business logic/data/auth/API tetap sama dan gate yang relevan lulus |

Bandingkan sebelum/sesudah pada route asli dengan isi yang sebanding memakai [rubrik kualitas](quality.md). Kriteria tersebut membantu review; hasil eksperimen belum ada. Tidak ada redesign massal atau promosi fondasi baru sampai eksperimen dievaluasi dan perubahan lanjutan memang diminta.
