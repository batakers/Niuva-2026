# Undangan Admin dari Dashboard — 7 Oktober 2026

Owner menyetujui halaman Tambah Admin dan undangan email dengan password yang
dibuat penerima sendiri. Implementasi memperluas pengelolaan akun pribadi Better
Auth pada `docs/backend/admin-auth-migration.md`.

- Route `/admin/admins/new`, navigasi desktop/mobile, Server Action, dan service
  membutuhkan Owner aktif serta permission `ADMIN_PROFILE_MANAGE`. Semua request
  Owner tetap melewati sesi Better Auth dengan MFA yang sudah diverifikasi.
- Input nama dan email membuat undangan, bukan identitas langsung. Peran hasil
  aktivasi selalu `ADMIN`; pembuatan Owner tetap melalui operasi CLI tepercaya.
- SMTP Admin yang sama dengan email verifikasi/pemulihan mengirim undangan.
  Konfigurasi tidak lengkap menonaktifkan form; tidak ada simulasi sukses.
- Token acak 256 bit berlaku 30 menit, sekali pakai. Hanya SHA-256 token disimpan
  di PostgreSQL. Token email berada pada fragment URL, tidak dikirim dalam URL
  request HTTP, lalu dihapus dari history setelah dibaca oleh form.
- Penerima membuat password 8–15 karakter. Kepemilikan tautan email memverifikasi
  alamat email. Aktivasi membuat user/credential/profil secara atomik tanpa sesi
  login. Penerima kemudian login dan menjalankan enrollment TOTP yang sudah ada;
  Dashboard tetap menolak password tanpa MFA.
- Penguncian transaksi per email menyerialisasi pembuatan dan penerimaan.
  Undangan aktif menolak duplikasi; undangan kedaluwarsa atau gagal kirim dapat
  dikirim ulang melalui form yang sama. Token lama tidak berlaku setelah rotasi.
  Identitas existing tidak diubah atau diambil alih, termasuk variasi huruf email.
- Aktivasi memeriksa kembali status dan masa berlaku undangan serta profil
  pengundang yang masih Owner aktif. Profil pengundang dikunci saat transaksi agar
  perubahan akses tidak berlomba dengan aktivasi.
- Endpoint publik terbatas `POST /api/admin/auth/accept-invitation` memvalidasi
  origin, JSON maksimal 4 KiB, input Zod, dan throttle 5 percobaan/menit per actor
  dalam proses. Tidak membuka `/sign-up/email` atau registrasi Admin publik.
- `admin_invitations` mencatat pengundang, status `PENDING/SENT/FAILED/ACCEPTED`,
  waktu kedaluwarsa dan aktivasi. Kegagalan SMTP membatalkan token, mempertahankan
  status gagal, dan memperbolehkan retry. Penghapusan/retensi catatan belum
  diimplementasikan; tidak ada cleanup yang menghapus akun atau undangan lama.

Migrasi baru bersifat menambah tabel, enum, index, dan foreign key. Terapkan hanya
ke database development/test untuk validasi lokal. Deployment staging/production
dan aktivasi SMTP membutuhkan instruksi tersendiri. Rollback kode tidak menghapus
tabel maupun akun yang sudah diaktifkan; jangan reset atau menurunkan migrasi
secara destruktif.

Validasi pengiriman email nyata, konfigurasi SMTP, akun Owner nyata, review visual
Owner, perangkat fisik/assistive technology, dan production masih merupakan bukti
terpisah dari unit/integration/E2E lokal dengan fixture sintetis.

Pada 7 Oktober 2026, satu Owner development berhasil memverifikasi email melalui
Gmail SMTP TLS, mengaktifkan authenticator, dan mengakses Dashboard pada loopback.
Pengiriman undangan kepada Admin tambahan belum dibuktikan dengan email nyata.
Fixture undangan membuktikan aktivasi, kewajiban MFA, serta penolakan Admin biasa
untuk mengelola akun. Review visual Owner untuk halaman Tambah Admin, perangkat
fisik/AT, hosting, dan production tetap belum ditutup oleh bukti lokal ini.
