# Definition of Done — Niuva v1.0

**Disetujui untuk implementasi:** 18 Oktober 2026. Scope dimiliki
[PRODUCT.md](../PRODUCT.md), dependensi oleh [ROADMAP.md](../ROADMAP.md), dan
pelaksanaan oleh [TASKS.md](../TASKS.md). Definisi ini tidak menyatakan v1 sudah
selesai atau memberi izin production.

## Task selesai

- Acceptance criteria task terpenuhi dengan bukti yang dapat ditelusuri.
- Pengujian yang relevan lulus; tes, batas keamanan, dan hook tidak dilemahkan.
  Dokumentasi/perubahan rendah dampak tidak memerlukan tes yang hanya menyalin
  implementasi. Jalankan gate aplikasi pada perubahan runtime sesuai dampaknya.
- Tidak ada regresi pada permission, uang/stock, snapshot/idempotency, file
  privat, atau lifecycle Customer; perubahan kritis memiliki regresi bermakna.
- Status task dan kontrak yang berubah diperbarui. Laporan memuat file/perintah,
  hasil, acceptance criteria, risiko, rollback bila relevan, dan batas bukti.
- Bukti mencantumkan tanggal, commit atau diff lokal, lingkungan, langkah,
  hasil dan temuan tersisa. Source, mock, CI, browser lokal, Owner visual,
  perangkat/AT, provider, staging dan production tidak saling menggantikan.

## Kandidat rilis v1.0 selesai

| ID | Syarat | Bukti wajib |
| --- | --- | --- |
| D01 | Scope terkunci | Kemampuan wajib PRODUCT terpenuhi; permintaan baru masuk versi berikutnya. |
| D02 | DEVELOP selesai pada batas website | Tujuan WhatsApp benar tanpa login/JavaScript; entry point B2B lama tetap dihentikan. |
| D03 | Tiga transaksi staging berhasil | Dua BUY dengan variasi varian/pengiriman dan satu MAKE sampai pemenuhan/pengiriman; record test dan hasil operator konsisten. |
| D04 | Customer publik lengkap | Google/email, consent resmi, deklarasi usia, verifikasi/reset/sesi, kepemilikan dan privacy hosted mengikuti kontrak. |
| D05 | Uang dan stok aman | Duplicate, amount mismatch, expiry, late settlement, timeout, refund dan manual exception diuji tanpa tindakan ganda atau exception tersembunyi. |
| D06 | Owner/Admin mandiri | Operasi utama serta pembuatan produk/varian/project dan media berhasil lewat Dashboard tanpa database/source. |
| D07 | Email/job andal | Pesan/job persisten, dedup/expiry/retry/overlap aman; scheduler, lag, alarm, last-success dan petugas terbukti. |
| D08 | Provider dan data siap | Resource staging terpisah, OAuth/inbox, payment/webhook/refund, shipping, private R2 dan public media, katalog/rule sesuai lingkungan. |
| D09 | Kualitas kandidat terbukti | lint, typecheck, unit/component, backend, schema, integration, E2E default dan Admin, serta build lulus pada kandidat yang sama; tidak ada blocker kritis. |
| D10 | UX pada route aktual | Viewport relevan, keyboard/fokus, label/error/recovery, zoom 200%, reduced motion; bukti visual, perangkat fisik dan AT memiliki cakupan masing-masing. |
| D11 | Operasi/recovery diterima | Policy disahkan, retensi ditetapkan, coverage dan SOP disimulasikan, restore memenuhi sasaran Owner tanpa memulihkan akses tertutup/mengulang uang atau email. |
| D12 | Bukti terpusat | Setiap gate wajib pada ledger readiness ditutup dengan pemilik, tanggal, lingkungan, hasil dan keputusan. |

Matriks browser sasaran: Chromium desktop, Chrome Android, Safari iOS untuk
alur utama. Uji compact 320/390px, tablet sekitar 768/1024px, dan desktop
1280/1440px sesuai risiko route. Emulasi tidak menggantikan perangkat fisik;
pemeriksaan assistive technology dicatat dengan alat/versi/tugas sebenarnya.
Penerimaan visual hanya berlaku pada surface dan versi yang ditinjau.

## Status rilis

- **Belum kandidat:** satu atau lebih D01–D12 belum mempunyai bukti yang cukup.
- **Kandidat siap rilis:** D01–D12 terpenuhi, menunggu instruksi aktivasi/rilis.
- **RELEASED v1.0:** instruksi production eksplisit diberikan, aktivasi sesuai
  izin, smoke production lulus, monitoring dan rollback diserahterimakan.

Merge atau build tidak memberikan izin deployment/provider. Menutup signup
baru saat rollback tidak boleh menghentikan pemenuhan pesanan, refund sah,
hak privasi atau retensi. Rollback tidak menghidupkan akun tertutup, mengganti
consent historis, menghapus ledger keuangan, atau mengulang side effect.

Nilai bisnis yang belum diputuskan tetap BLOCKED_INPUT; resource dan izin
eksternal tetap BLOCKED_EXTERNAL. Jangan mengisi angka retensi, SLA, pricing,
merchant coverage, atau sasaran recovery untuk membuat checklist tampak hijau.
