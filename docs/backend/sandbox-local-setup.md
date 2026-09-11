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
