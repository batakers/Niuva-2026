# Migrasi Admin Clerk ke Better Auth — 6 Oktober 2026

Implementasi ini mengikuti persetujuan Owner untuk 10 akun pribadi, auth pada
hosting Indonesia, email/password, dan authenticator. Better Auth core berjalan
di proses Next.js NIUVA dan PostgreSQL NIUVA. Tidak ada koneksi ke layanan hosted
Better Auth dan tidak ada langganan auth SaaS wajib. Customer auth tetap memakai
model, session cookie, lifecycle privacy, dan gate registrasinya sendiri.

## Kontrak akses

- Registrasi Admin publik, social login Admin, trusted-device bypass, penghapusan
  akun, perubahan email, dan penonaktifan MFA melalui HTTP tidak diekspos.
- Password belum memberi akses bisnis. Identitas terprovision dapat menyiapkan
  authenticator; verifikasi TOTP pertama wajib sebelum Dashboard terbuka.
- Sesi memiliki `mfaVerified` server-only. Hook Better Auth membuat nilai tersebut
  benar hanya saat sesi dibuat oleh verifikasi TOTP/kode pemulihan yang berhasil.
  Pemeriksaan ini tetap terpisah dari `twoFactorEnabled` pada identitas.
- Proxy memeriksa sesi database, faktor kedua, dan profil aktif. Setiap resource,
  Server Action, dan service tetap memakai `requireAdmin()` serta permission NIUVA.
- Cookie Admin memakai prefix `niuva_admin`, HttpOnly, SameSite=Lax, Secure pada
  production; cookie Customer tidak digunakan. Sesi berumur paling lama 8 jam,
  tanpa cookie cache yang menunda revokasi profil.
- Password memakai hashing library Better Auth. TOTP secret dan kode pemulihan
  disimpan terenkripsi oleh plugin library. QR dibuat lokal, tanpa jasa QR eksternal.
- Kode pemulihan hanya sekali pakai. `/admin/security` mendukung perubahan
  password dan regenerasi kode setelah password dikonfirmasi dalam sesi dengan MFA.
  Kode lama dicabut. Perubahan password mencabut sesi sebelumnya dan meminta
  login dengan MFA kembali; reset password juga mencabut seluruh sesi serta
  mempertahankan enrollment MFA. Perubahan sesi membuka dokumen browser baru
  agar cache navigasi dari akun sebelumnya tidak terbawa.
- Rate limit disimpan di database; TOTP juga memiliki lockout akun setelah lima
  kegagalan. Konfigurasi/basis data yang tidak tersedia gagal tertutup.
- Header CSP Admin berasal dari proxy NIUVA dengan nonce. Header CSP statis tidak
  ditumpuk pada route Admin. Tidak ada SDK atau resource browser Clerk.

## Data dan cutover

Migration baru `20261006150000_admin_better_auth` menambah tabel identitas,
credential, session, verification, two-factor, dan rate limit. `auth_user_id`
ditambahkan pada `admin_profiles`; kolom Clerk lama menjadi nullable tetapi tidak
dihapus. Tidak ada data akun yang dibuat oleh migration dan tidak ada migration
lama yang diedit.

ID `AdminProfile` dan relasi quote, review, pricing, stok, serta audit bisnis tetap
menjadi authority NIUVA. Migrasi akun lama harus menyebut `ADMIN_PROFILE_ID` secara
eksplisit. Identitas Customer/email serupa tidak otomatis menjadi Admin. Password
atau MFA Clerk tidak diekspor maupun disalin; Admin membuat kredensial baru dan
melakukan enrollment baru. Sesi Clerk tidak berlaku pada engine baru.

`scripts/provision-admin-profile.ts` kini memprovision credential Better Auth
menggunakan hashing library, dengan email, nama, dan role eksplisit. Untuk profil
lama ia menghubungkan identitas baru pada ID yang sama. Mapping profil dikunci
dalam transaksi agar dua provisioning tidak dapat mengklaim profil yang sama.
Role/aktivasi/nama yang berbeda membutuhkan `ADMIN_PROFILE_ALLOW_UPDATE=YES`;
password akun yang sudah terprovision tidak ditimpa oleh pengulangan perintah.

Script tersebut **dibatasi pada development loopback**. Ia membaca environment
proses yang diberikan operator dan tidak memuat/mengubah `.env.local`. Dibutuhkan:

| Variable | Makna |
| --- | --- |
| `DATABASE_URL` | PostgreSQL loopback dengan nama bertanda dev/development |
| `ADMIN_AUTH_EMAIL` | Email identitas Admin yang dipilih Owner |
| `ADMIN_AUTH_PASSWORD` | Password awal, 12–128 karakter; jangan masukkan ke chat/history shell |
| `ADMIN_PROFILE_DISPLAY_NAME` | Nama sesuai identitas yang dipilih Owner |
| `ADMIN_PROFILE_ROLE` | `OWNER` atau `ADMIN`, tanpa default |
| `ADMIN_PROFILE_CONFIRMATION` | `I_UNDERSTAND_NON_PRODUCTION` |
| `ADMIN_PROFILE_ID` | ID lama untuk migrasi; kosong hanya untuk akun baru |
| `ADMIN_PROFILE_ALLOW_UPDATE` | `YES` hanya untuk perubahan profil yang disengaja |

Jalankan `corepack pnpm db:provision:admin` setelah migration development yang
direview. Akun baru belum diverifikasi email dan belum MFA; login pertama mengirim
verifikasi lewat SMTP, kemudian pengguna menyiapkan authenticator. Tidak ada akun
contoh Owner yang dibuat otomatis untuk development biasa.

## Konfigurasi runtime dan email

`BETTER_AUTH_URL` adalah origin aplikasi yang tepat; production harus HTTPS.
`BETTER_AUTH_SECRET` wajib sekurangnya 32 karakter, dibuat acak dan disimpan sebagai
secret hosting. Ia juga diperlukan untuk mendekripsi faktor kedua. **Jangan
merotasi secret sembarangan**: perubahan key membutuhkan prosedur migrasi key/MFA
yang direview. Backup database dan key harus dapat dipulihkan bersama.

Email verifikasi/reset Admin memakai SMTP lokal melalui Nodemailer, dengan
`ADMIN_SMTP_HOST`, `ADMIN_SMTP_PORT`, `ADMIN_SMTP_USER`, `ADMIN_SMTP_PASSWORD`, dan
`ADMIN_EMAIL_FROM`. Hanya TLS 465 atau STARTTLS 587 yang didukung; tidak ada fallback
Resend dan tidak ada penonaktifan validasi sertifikat. Config SMTP belum lengkap
membuat pemulihan tidak tersedia. Identitas terverifikasi fixture di test bukan
bypass bagi akun nyata. SPF/DKIM dan uji inbox masih merupakan aktivasi provider
tersendiri ketika hosting/email lokal dipilih.

## Verifikasi dan batas penerimaan

- Unit/backend menguji gate, form, API versus navigasi, CSP, dan role existing.
- Integrasi PostgreSQL memakai engine Better Auth nyata untuk setup TOTP,
  login ulang, recovery code sekali pakai, reset/revokasi, profil nonaktif,
  registrasi tertutup, origin asing, serta pemisahan Customer/Admin.
- `corepack pnpm test:e2e:admin-auth` menjalankan Next dan Chromium pada port 3107
  dengan database **test loopback**, identitas fixture unik, dan secret khusus
  test. Provider/email eksternal dimatikan. Trace/screenshot pada fase enrollment
  dimatikan supaya secret/kode pemulihan tidak tersimpan sebagai artefak browser.
- `corepack pnpm test:e2e` tetap memeriksa public/Customer dan Admin yang belum
  dikonfigurasi. Suite tersebut dan suite Admin positif tidak boleh dijalankan
  bersamaan karena memakai database test yang sama.
- Suite Admin positif adalah perintah tambahan; workflow existing menjalankan
  integrasi engine dan E2E existing. Tidak ada perubahan deployment/workflow.

UI autentikasi baru belum mendapat penerimaan visual Owner atau pengujian perangkat
fisik/assistive technology. Pengujian lokal tidak membuktikan deliverability SMTP,
kecocokan hosting final, ataupun kesiapan production.

Pemeriksaan `pnpm audit --prod` pada 6 Oktober 2026 masih menandai advisori pada
versi dependency baseline: Next.js 16.3.2, Sharp 0.35.3, Undici 8.10.0,
fast-uri 3.1.7, dan source-map-js 1.2.1. Tidak ada temuan untuk Better Auth,
Nodemailer, atau react-qr-code dalam hasil tersebut. Sebagian path audit melewati
peer test opsional Better Auth; jumlah temuan registry bukan bukti bahwa semua
jalur dapat dieksploitasi di runtime. Patch Next yang ada hanya memperbaiki stream
image optimizer dan tidak menutup advisori keamanan tersebut. Review pembaruan
dependency baseline sebelum deployment sebagai pekerjaan terpisah; migrasi auth
ini tidak mengubah versi framework atau patch yang sudah ada.

## Aktivasi dan rollback

Belum ada deployment, penggunaan credential production, DNS, pengiriman email
nyata, atau provisioning 10 akun nyata dalam pekerjaan ini. Setelah hosting dan
SMTP final tersedia, Owner menetapkan email/nama/role serta mapping ID lama.
Provisioning pada hosted/production perlu prosedur operator yang direview dan
persetujuan eksplisit; script development tidak boleh dipaksa melewati guard.
Kehilangan authenticator dan seluruh kode pemulihan juga memerlukan verifikasi
identitas serta recovery operator yang disetujui Owner; tidak ada bypass HTTP.

Untuk rollback sebelum aktivasi, kembalikan perubahan aplikasi pada Git tanpa
mereset database. Tabel tambahan boleh dibiarkan. Kolom Clerk dan seluruh ID
profil lama tetap tersedia. Sesudah cutover, rollback engine memerlukan review
terhadap akun baru, sesi, dan key; jangan drop tabel auth atau memulihkan backup
lama yang dapat menghilangkan transaksi bisnis. Langkah Git/deploy/DB production
tetap membutuhkan instruksi eksplisit tersendiri.

Referensi engine: [Next.js integration](https://www.better-auth.com/docs/integrations/next),
[Prisma adapter](https://www.better-auth.com/docs/adapters/prisma),
[two-factor plugin](https://www.better-auth.com/docs/plugins/2fa).
