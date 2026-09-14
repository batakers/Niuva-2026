# Setup development lokal dan onboarding sandbox

2026-09-06 — branch `codex/sandbox-local-setup`.

## Siap secara lokal

- PostgreSQL 18: cluster `.local/postgres-dev/data`, loopback port **55433**,
  database/user `niuva_dev`. Terpisah dari cluster integration di port 55432.
- `.env.local` yang diabaikan Git memuat DATABASE_URL development dan
  `APP_URL=http://127.0.0.1:3000`. Tidak ada API key yang dibuat/disalin.
- Ketiga migration existing berhasil diterapkan; migrate kedua melaporkan
  tidak ada migration tertunda. Tidak ada migration historis yang diubah.
- `.env.example` sekarang membiarkan CUSTOM_FILE_MAX_BYTES kosong sampai
  seluruh group R2 lengkap; nilai saat diaktifkan tetap 104857600.
- Server development berhasil startup. GET `/` mengembalikan 200 dan POST
  JSON kosong ke `/api/webhooks/midtrans` mengembalikan 422 (validasi payload).
  Ini hanya membuktikan endpoint lokal terjangkau, bukan callback Midtrans.

Cluster lokal memakai trust authentication di loopback mengikuti pendekatan
harness lokal yang ada. Semua proses lokal dapat mengaksesnya; gunakan hanya
data sintetis, jangan buka port PostgreSQL ke jaringan atau isi data produksi.

## Perintah operasional

Jalankan dari root repository:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-dev-db.ps1 start
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-dev-db.ps1 status
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-dev-db.ps1 migrate
corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000
```

Untuk berhenti, Ctrl+C pada terminal Next dan jalankan:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-dev-db.ps1 stop
```

Stop mempertahankan data. Helper memverifikasi identitas cluster sebelum
operasi pada server aktif. Migration selalu diarahkan ke target development
lokal yang tetap, bukan URL dari environment pemanggil.
Prisma CLI sendiri memuat `.env`, bukan `.env.local`; gunakan helper di atas
untuk migration development agar tidak salah target.

## Belum tersedia: akun dan jalur publik

User mengonfirmasi akun Biteship dan Midtrans **belum tersedia**.
Group kedua provider dibiarkan kosong secara utuh agar startup valid.
Belum ada key, origin area/kurir yang dikonfirmasi, tunnel/domain webhook,
konfigurasi dashboard, atau transaksi sandbox.

1. Daftar/verifikasi akun Midtrans, pilih environment Sandbox, lalu ambil
   pasangan server/client key Sandbox. Simpan langsung di `.env.local` pada
   MIDTRANS_SERVER_KEY dan NEXT_PUBLIC_MIDTRANS_CLIENT_KEY, lalu isi
   MIDTRANS_IS_PRODUCTION=false bersamaan. Jangan kirim key lewat chat.
   [Panduan dashboard resmi](https://docs.midtrans.com/docs/dashboard-basics).
2. Buat akun Biteship dan Test API Key melalui dashboard. Simpan pada
   BITESHIP_API_KEY (adapter mensyaratkan prefix biteship_test.), lengkapi
   BITESHIP_ORIGIN_AREA_ID dan BITESHIP_COURIERS dengan pilihan yang valid.
   [Panduan testing resmi](https://help.biteship.com/hc/en-us/articles/39554706133913-How-to-Use-Sandbox-or-Testing-Mode-in-Biteship).
3. Tentukan endpoint HTTPS development publik yang meneruskan POST ke
   `http://127.0.0.1:3000/api/webhooks/midtrans`. URL lokal tidak dapat dipakai
   langsung oleh Midtrans. Publikasikan hanya route webhook yang dibutuhkan;
   jangan mengekspos seluruh Next dev server atau PostgreSQL.
4. Daftarkan URL publik tersebut sebagai Payment Notification URL pada
   dashboard Midtrans Sandbox. Ini integrasi Snap klasik yang digunakan
   source saat ini. [Panduan webhook resmi](https://docs.midtrans.com/docs/https-notification-webhooks).
5. Restart development server setelah konfigurasi lengkap, validasi capability,
   lalu uji transaksi dengan fixture catalog/stock/alamat sintetis. Pastikan
   notifikasi mencapai order yang benar, duplicate tetap idempotent, dan late
   settlement tidak mengonsumsi stock yang telah dilepas.

APP_URL lokal tetap cocok bila browser mengakses loopback dan hanya webhook
dipublikasikan. Jika seluruh aplikasi kelak memakai origin development publik,
APP_URL/origin policy perlu disesuaikan dengan origin tersebut.
Preview production build masih ditolak guard provider; dukungan staging belum
diimplementasikan. Tidak ada guard yang dilemahkan oleh setup ini.

## Handoff

Verifikasi tambahan: target DATABASE_URL development dan TEST_DATABASE_URL
dibandingkan tanpa menampilkan nilai koneksi dan terbukti berbeda. Query
read-only pada development menunjukkan 3 migration selesai dan 0 order.
Webhook lokal mengembalikan `422 VALIDATION_ERROR` untuk JSON kosong dan
`503 PROVIDER_UNAVAILABLE` untuk payload berbentuk valid tanpa konfigurasi
Midtrans; keduanya mempunyai correlation header. Tidak ada transaksi provider
yang dibuat. Test keselamatan database lulus 4/4; test env/provider/HTTP
lulus 21/21 pada pemeriksaan setup sebelumnya.

Persiapan database/runtime lokal selesai. Verifikasi provider dan webhook
publik menunggu pembuatan akun serta pemilihan jalur HTTPS development.
Tidak ada transaksi, email, atau konfigurasi dashboard yang dijalankan.
Laporan [audit sebelumnya](sandbox-readiness.md) adalah snapshot sebelum setup
ini; status DATABASE_URL dan APP_URL pada laporan tersebut telah berubah.

## Persiapan Clerk non-production

Status: **READY_FOR_OWNER_SETUP**. Boundary source dan database test sudah
tercover; live tenant smoke tetap membutuhkan setup owner yang terpisah.

Prasyarat dan urutan smoke:

1. Buat atau pilih satu Clerk Development instance. Gunakan pasangan
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` dan `CLERK_SECRET_KEY` dari instance yang
   sama; jangan gunakan key production.
2. Buat satu user test dan catat exact Clerk user ID (`user_...`). Nilai ini
   tidak perlu dikirim melalui chat atau dimasukkan ke repository.
3. Set kedua key hanya pada environment lokal/non-production yang disepakati,
   bersama `DATABASE_URL` development. Jangan mengubah `.env.local` melalui
   source control dan jangan mencetak nilai key.
4. Owner memprovisikan satu `AdminProfile` aktif untuk exact Clerk user ID
   melalui prosedur terjaga, dengan role yang disetujui. Aplikasi tidak membuat
   profile secara otomatis. Untuk database development loopback, prosedur
   repeatable tersedia melalui perintah berikut; seluruh nilai identity/role
   harus diisi Owner secara eksplisit dan tidak boleh menyertakan secret Clerk:

   ```powershell
   $env:ADMIN_PROFILE_CLERK_USER_ID = "user_<exact-development-id>"
   $env:ADMIN_PROFILE_ROLE = "OWNER"
   $env:ADMIN_PROFILE_DISPLAY_NAME = "Owner Smoke"
   $env:ADMIN_PROFILE_CONFIRMATION = "I_UNDERSTAND_NON_PRODUCTION"
   corepack pnpm db:provision:admin
   ```

   Jika profil sudah ada tetapi nonaktif/berbeda role, tambahkan
   `$env:ADMIN_PROFILE_ALLOW_UPDATE = "YES"` hanya untuk perubahan Owner yang
   disengaja. Script menolak host database non-loopback, database tanpa marker
   development, dan konfirmasi yang tidak tepat.
5. Jalankan server development, login dengan user test, lalu buka `/admin`.
   Verifikasi role berasal dari `AdminProfile`, Action Queue dapat dibaca, dan
   user tanpa profile aktif tetap ditolak.
6. Setelah smoke, hapus/nonaktifkan profile test dan cabut atau rotasi key
   sesuai prosedur instance.

Automated Playwright tetap menjalankan web server dengan kedua Clerk key kosong
dan memverifikasi respons `AUTH_UNAVAILABLE` 503. Itu adalah guard test, bukan
pengganti login pada tenant nyata. Jangan menjalankan live smoke terhadap
database integration `niuva_test`; gunakan database development yang terpisah.

## Persiapan R2 private non-production

Status: **READY_FOR_OWNER_SETUP**. Runtime sudah memiliki intent → signed PUT →
HEAD/confirm → ownership verification, tetapi capability R2 belum tersedia pada
environment lokal.

1. Buat resource development terpisah dengan satu bucket customer privat dan
   satu bucket media publik yang tidak dipakai untuk file customer. Jangan
   mengaktifkan public access pada bucket customer.
2. Buat R2 API token dengan izin minimum **Object Read & Write** yang dibatasi
   ke bucket customer. Adapter membutuhkan PUT, HEAD, dan DELETE; izin admin
   akun atau bucket lain tidak diperlukan. Cloudflare menjelaskan scope token
   dan endpoint S3 pada [R2 authentication docs](https://developers.cloudflare.com/r2/api/tokens/).
3. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
   `R2_PRIVATE_BUCKET`, `R2_PUBLIC_BUCKET`, dan
   `R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com` hanya pada
   environment development lokal. Tambahkan
   `CUSTOM_FILE_MAX_BYTES=104857600` setelah keenam field R2 lengkap; validasi
   startup memang menolak group parsial.
4. Pada bucket customer, tambahkan CORS dengan origin yang sama persis dengan
   `APP_URL` (misalnya `http://127.0.0.1:3000`), method `PUT`, dan header
   `Content-Type`. Jangan gunakan wildcard origin. Presigned URL tetap bearer
   token sementara dan tidak boleh masuk log, screenshot, atau audit payload.
   Lihat [R2 CORS guidance](https://developers.cloudflare.com/r2/buckets/cors/)
   dan [presigned URL guidance](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).
5. Restart server development, buka `/custom-print/request`, pilih fixture
   sintetis kecil dengan ekstensi/MIME yang cocok, lalu amati urutan intent →
   PUT langsung → confirm. Verifikasi hanya metadata non-secret: row berubah
   `PENDING → UPLOADED`, request berikutnya mengubah ownership file menjadi
   `VERIFIED`, dan tidak ada public URL yang diberikan.
6. Setelah smoke, hapus object fixture, cabut/rotasi token bila diperlukan, dan
   kosongkan group R2 sebelum mengubah runtime kembali ke preview. Legal dan
   accounting retention tetap keputusan terpisah.
