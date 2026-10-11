# B2B melalui WhatsApp

Owner menyetujui arah produk dan CTA dalam percakapan 11 Oktober 2026,
kemudian meminta penghapusan fitur B2B dari pengalaman aktif website.

## Hasil yang disepakati

- Website menjelaskan layanan, kapabilitas, proses kerja, dan portofolio Niuva.
- CTA B2B bernama **Hubungi Kami**, menggunakan outline standar Niuva.
  Tidak ada keterangan tambahan di bawah tombol.
- CTA langsung membuka WhatsApp tanpa login atau Project Brief. Nomor mengikuti
  Informasi Situs; pesan boleh membawa nama layanan yang sedang dilihat.
- Pembahasan kebutuhan, negosiasi, finalisasi, dan pencatatannya merupakan
  urusan admin WhatsApp dengan calon klien. Website tidak mengelola proses itu.
- Project Brief, proposal B2B Customer, pengelolaan inquiry/proposal/tagihan B2B
  Admin, serta penunjuk B2B di antrean, pencarian, dan laporan dilepas dari
  pengalaman aktif. MAKE dan BUY tetap menggunakan alurnya masing-masing.

## Batas teknis

- Lepas form dan halaman operasional B2B serta ekspor Server Action terkait.
- `/project-brief` menjadi pengalihan sementara ke halaman layanan yang valid,
  atau `/services` bila konteks layanan tidak dikenal.
- Endpoint pengiriman brief dan keputusan proposal lama mengembalikan 410
  tanpa autentikasi, penulisan database, upload, atau pengiriman notifikasi.
- Klaim pekerjaan melalui akun hanya melayani Custom Print.
- B2B tidak menghasilkan pekerjaan aktif, tujuan notifikasi, metrik operasional,
  atau pintu penyiapan invoice baru. Riwayat invoice yang sudah ada tetap aman.
- Schema, migration, data B2B historis, audit, private-file access, serta
  lifecycle/retention privasi historis dipertahankan. Penghapusan data bukan
  bagian permintaan ini.
- Tidak ada dependency, provider, kredensial, deployment, commit, atau push baru.
- Perubahan dibuat dalam worktree terpisah agar pekerjaan lokal tetap utuh.

## Verifikasi

Uji kontak dengan nomor Informasi Situs, route lama, endpoint 410, akun MAKE,
navigasi Admin, antrean, tujuan notifikasi, dan penyiapan invoice. Jalankan lint,
typecheck, unit/backend/integration yang relevan, production build, serta browser
desktop/mobile dan tanpa JavaScript. Penerimaan visual implementasi belum
dicatat; bukti lokal tidak menyatakan kesiapan provider atau produksi.
