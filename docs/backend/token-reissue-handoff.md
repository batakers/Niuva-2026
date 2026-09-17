# Handoff tautan customer lama

## Tujuan

Tautan quote dan order yang diterbitkan sebelum route-bound token v1 tidak
boleh dikirim ulang apa adanya. Admin harus menerbitkan tautan baru dari
detail record, lalu mengirimkannya secara manual melalui kanal yang sudah
disetujui Owner.

## Prosedur order atau quote

1. Buka detail record pada `/admin/orders/:id` atau
   `/admin/custom-print/:id` dengan sesi Clerk dan `AdminProfile` aktif.
2. Pilih **Terbitkan tautan baru** dan konfirmasi tindakan. Server mengganti
   hash token secara compare-and-swap, sehingga token lama langsung tidak
   berlaku; secret token tidak ditulis ke audit log.
3. Gunakan **Buka tautan baru** yang muncul pada hasil aksi untuk memeriksa
   tujuan dan format `v1.<entity-id>.<secret>`.
4. Kirim URL tersebut kepada customer melalui email/WhatsApp atau kanal lain
   yang sudah disetujui Owner. Jangan menyalin token ke log, issue, analytics,
   atau chat internal yang tidak diperlukan.
5. Uji URL lama bila tersedia. Hasil yang diharapkan adalah akses tidak valid
   atau `404`; jangan menerbitkan ulang berkali-kali kecuali URL baru hilang.

## Batasan dan bukti

- Reissue hanya tersedia untuk order/quote yang dapat ditemukan dan tetap
  melewati permission serta audit service server.
- Aplikasi tidak melakukan bulk reissue, pencarian customer, atau pengiriman
  otomatis. Daftar customer, kanal pengiriman, dan bukti delivery adalah input
  Owner yang terpisah.
- Jika URL baru hilang sebelum terkirim, terbitkan ulang sekali lagi dari
  detail yang sama; URL sebelumnya akan ikut tidak berlaku.
- Biteship, Midtrans, R2, dan provider messaging tidak diaktifkan oleh
  prosedur ini.

Status handoff saat ini: **reissue server-side siap; pengiriman aktual menunggu
daftar customer dan kanal yang disetujui Owner**.
