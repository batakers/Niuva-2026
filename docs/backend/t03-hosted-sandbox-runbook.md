# T03 — hosted sandbox sementara

Tanggal: 22 Oktober 2026. Status: **PARTIAL — database hosted siap;
deployment aplikasi BLOCKED_CARD_VERIFICATION**. T03 tetap BLOCKED_EXTERNAL.
Backlog dan keputusan selesai tetap di [TASKS](../../TASKS.md). Runbook ini
menyiapkan eksekusi, bukan bukti hosted atau izin aktivasi provider.

Kelanjutan lokal 27 Oktober 2026 berada pada bagian
[preflight yang dapat dijalankan ulang](#preflight-kelanjutan-27-oktober-2026).
Draft, source SHA dan provisioning 22 Oktober di bawah adalah catatan historis.
Jangan mengulang pembuatan database atau memakai command draft lama untuk
source baru.

## Resource dan batas yang dipilih 22 Oktober (historis)

Owner memilih layanan gratis untuk staging sementara; hosting akhir akan
menggunakan provider Indonesia yang belum dipilih. Pilihan awal memakai Next.js
sebagai Node.js web service dan PostgreSQL biasa; tidak mengaktifkan adapter
Netlify, Cloudflare Workers, Neon Auth, atau runtime khusus hosting.

| Komponen | Draft / pengamatan saat ini | Batas bukti |
| --- | --- | --- |
| Sumber deployment | GitHub `batakers/Niuva-2026`, `main`, SHA `48eacd4efb50c50b62c1fa12145b3392902ed6fa`; `git ls-remote` cocok pada pemeriksaan ini | Periksa lagi sebelum deployment; jangan mengirim diff lokal yang belum committed |
| Aplikasi | Render `niuva-staging-free`, Node, Singapore, Free 0.1 CPU / 512 MB, Auto-Deploy **Off**, health check `/`; satu submit dicoba | Ditahan dialog Add Card sebelum service/build dibuat; form dibatalkan, dashboard mengonfirmasi belum ada service. Tidak ada origin aplikasi publik |
| Database | Neon project `NIUVA`, Free, Singapore, PostgreSQL 18; Owner menetapkannya khusus staging. Database baru `niuva_staging`, 38 migration, satu role runtime dan marker staging telah diverifikasi | Branch default tetap berlabel `production`; resource ini khusus staging sesuai izin Owner. Tidak memakai database default untuk aplikasi atau mengimpor data Customer |
| Database existing | `niuva_test` lokal serta database Customer/`niuva_dev` dipertahankan | Tidak disalin ke staging; tidak reset/drop |
| Provider | Seluruh group Biteship/Midtrans/Google/Resend/R2/Admin mail tidak diisi pada tahap ini | Request provider transaksi 0; grants dan policy publik tetap tertutup |

Render Free dapat tidur setelah 15 menit idle, mempunyai batas pemakaian dan
filesystem sementara. Jangan menjadikannya bukti scheduler, availability
production, atau penyimpanan berkas Customer. Neon Free juga mempunyai kuota;
pilihan Free bukan izin upgrade, pembayaran, atau penambahan kartu. Hentikan
jika UI memerlukan layanan berbayar. Periksa batas pemakaian/billing sebelum
men-submit resource; jangan menjanjikan tagihan nol jika akun mengizinkan
overage. Resource yang tidak cukup untuk build/runtime menjadi blocker,
bukan alasan mengganti paket otomatis.

## Draft konfigurasi aplikasi 22 Oktober (historis)

Variabel non-secret pada form:

```text
NODE_VERSION=24.22.1
NODE_ENV=production
NIUVA_DEPLOYMENT_TIER=staging
NIUVA_PROVIDER_MODE=sandbox
NIUVA_ANALYTICS_ENABLED=false
PORT=10000
```

Node 24.22.1 mengikuti versi Render yang didokumentasikan saat pemeriksaan.
Baseline lokal memakai Node 24.14.0, pnpm 11.22.0; engine Next 16.3.6 dan
Prisma 7.10.0 menerima Node 24. Perbedaan patch/runtime Linux tetap memerlukan
build hosted. `NODE_ENV` runtime Render adalah `production`; jangan memakai
`NODE_ENV=staging` atau `next dev` untuk melonggarkan guard.

Build Command pada draft:

```sh
test "$RENDER_GIT_COMMIT" = "48eacd4efb50c50b62c1fa12145b3392902ed6fa" && export APP_URL="$RENDER_EXTERNAL_URL" && corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm build
```

Start Command pada draft:

```sh
export APP_URL="$RENDER_EXTERNAL_URL" && node -e 'eval(Buffer.from(process.env.T03_BOOTSTRAP_B64,"base64").toString("utf8"))' && exec corepack pnpm start --hostname 0.0.0.0 --port "$PORT"
```

`T03_BOOTSTRAP_B64` menampung helper operasional sementara tanpa credential,
dibaca oleh Start Command saja. Helper memanggil repository/resolver/origin/
cookie canonical, memeriksa database/role dan menolak mismatch sebelum callback;
hasilnya hanya boolean/counter aman. Ia tidak mengubah source aplikasi, membuka
endpoint, menerbitkan sesi atau memberikan activation grant. Uji dari proses
lokal ke Neon lulus; **helper belum berjalan pada Render** karena build tidak
pernah dimulai. Nilai/form sementara ini tidak menjadi konfigurasi service
yang persisten setelah pembatalan.

`RENDER_EXTERNAL_URL` adalah metadata platform yang didokumentasikan untuk
build dan runtime, bukan input Host/forwarded header dari request. Catat dan
verifikasi HTTPS origin aktual setelah provisioning; belum ada domain yang
ditebak atau dianggap tersedia. Build dan runtime memakai origin yang sama.
Periksa trusted origin, redirect dan CSP terhadap nilai aktual tersebut.

`DATABASE_URL` runtime baru dan `NIUVA_DATABASE_BINDING_ID` sudah diverifikasi
dan sempat dimasukkan ke form Render berizin, lalu draft dibatalkan ketika
gate kartu muncul. Credential runtime terbatas tetap tersimpan privat di luar
Git untuk kelanjutan Owner; salinan lokal credential admin/migration sementara
telah dihapus dari konfigurasi kerja. URL berisi
credential hanya disimpan melalui sarana privat/environment manager; tidak
masuk chat, command output, dokumen, Git atau screenshot. Pisahkan credential
migration/owner dari role runtime. Jangan mengunggah `.env.local`, session
state, `.local/`, log privat, atau artifact `.next-sandbox-*`.

Group provider harus seluruhnya absent, termasuk `MIDTRANS_IS_PRODUCTION`.
Mengisi flag itu sendirian menghasilkan group Midtrans parsial menurut parser
existing. Saat provider kelak diizinkan, pasang satu group sandbox lengkap
dengan flag false melalui izin lain; itu tidak termasuk deployment T03 ini.

## Rencana yang disetujui 22 Oktober (historis; sudah dicoba)

Urutan ini merekam izin awal. Resource Neon yang berhasil dibuat dipertahankan;
kelanjutan tidak membuat database/role/marker pengganti.

1. Pastikan project Neon yang dipilih khusus staging. Buat database kosong
   `niuva_staging` dan role runtime terbatas pada resource tersebut; jangan
   clone database/branch berisi data existing. Jangan menganggap label default
   `production` sebagai izin mengakses resource production.
2. Tinjau 38 migration baseline yang sudah ada dan jalankan `prisma migrate
   deploy` hanya pada database staging baru dengan credential migration
   privat. Tidak ada edit migration historis, reset/drop, import data Customer
   atau seed katalog bisnis. Periksa riwayat migration setelah penerapan.
3. Provision satu marker `deployment_database_bindings` dengan tier `staging`
   dan UUID server baru yang sama dengan `NIUVA_DATABASE_BINDING_ID`. Marker
   tidak dibuat atau diperbaiki otomatis ketika aplikasi boot.
4. Role runtime bukan owner/superuser dan tidak mewarisi role administratif.
   Pada marker, hanya `SELECT` dan `UPDATE(id)` untuk `FOR SHARE`; jangan
   memberi perubahan identity/tier, INSERT, DELETE, TRUNCATE atau UPDATE tabel
   penuh. Tinjau grant tabel aplikasi yang benar-benar dibutuhkan secara
   terpisah. Uji bahwa credential runtime dan migration tidak tertukar.
5. Masukkan hanya URL runtime baru serta binding ID pada draft Render.
   Verifikasi plan Free, pemakaian/spend policy, source SHA dan Auto-Deploy
   Off lagi. Satu submit service memulai build dan membuka HTTPS publik;
   lakukan hanya sesudah izin deployment khusus diberikan.
6. Catat URL HTTPS, SHA, hasil build/start serta konfigurasi efektif yang aman.
   Jika SHA, origin, TLS, resource atau privilege tidak cocok, hentikan gate
   terkait. Tidak ada upgrade, retry transaksi provider, atau fallback ke DB
   lokal/production.

## Bukti penerimaan hosted yang harus dikumpulkan

| Pemeriksaan | Bukti minimum dan batas klaim |
| --- | --- |
| Identitas resource | Migration up to date, runtime role terbatas, marker tier/UUID cocok; repository canonical menjalankan probe terbatas dengan connection runtime. Missing/mismatch menolak callback sebelum write; marker tidak dimutasi untuk negative test |
| Konteks runtime | Bedakan probe dari laptop ke DB hosted dengan pemeriksaan proses aplikasi hosted. Hasil adapter saja tidak membuktikan wiring, environment atau capability aplikasi hosted |
| Origin | Origin HTTPS aktual tunggal; build/runtime konsisten; foreign/null origin dan manipulasi forwarded host ditolak pada boundary relevan. Uji native/JS POST tanpa membuat akun atau transaksi |
| Cookie | Periksa atribut cookie yang benar-benar diterbitkan pada flow sintetis berizin: Secure, HttpOnly, SameSite, path, expiry. Cookie injection manual atau helper unit bukan bukti penerbitan hosted; bila flow masih tertutup, catat pending |
| CSP | Periksa response aktual `/`, `/checkout`, `/account` dan Admin unavailable; satu writer sesuai route, nonce berubah antarrequest bila route memakai nonce, connect/form/frame sources sesuai capability. Redirect saja tidak membuktikan CSP halaman target |
| Capability | Staging/grants default tetap fail closed; public signup, provider, email/storage/jobs yang belum diizinkan tetap ditolak. Marker match tidak memberikan activation grant atau menutup policy gate |
| Production | Source dan tes menolak production/live; jangan mengubah atau men-deploy resource production demi negative test |

Semua provider transaksi tetap 0 pada rangkaian ini. Tidak membuka tunnel,
mengubah Notification URL, menjalankan scheduler, membuat shipment/refund,
atau mengulangi BUY. Bukti provider BUY lokal 22 Oktober tetap pada cakupan
lokal. T03 tidak menjadi DONE hanya karena homepage berhasil diakses; setiap
AC yang belum terbukti dicatat sebagai blocker yang spesifik.

## Verifikasi lokal tahap persiapan

- Unit: 7 file / 244 tes lulus untuk origin, binding, capability, CSP dan
  request origin Admin; Vitest dengan coverage dimatikan untuk run terarah.
- Backend: 9 file / 75 tes lulus untuk deployment, origin, binding service,
  capability Biteship/Midtrans/webhook dan CSP storage; seluruh HTTP provider
  pada suite tersebut menggunakan mock, tidak mengirim request provider.
- Tidak menjalankan ulang full suite/build/E2E atau integration pada database
  yang menyimpan bukti BUY. Tes ini tidak menutup bukti hosted.

## Hasil eksekusi 22 Oktober 2026

Owner memberi izin spesifik untuk database kosong/role/marker, 38 migration
dan satu deployment Render Free, dengan instruksi berhenti jika memerlukan
kartu/biaya atau build gagal. Hasil aktual:

- Satu database kosong baru, satu role runtime baru dan satu marker tier
  staging dibuat. Satu `prisma migrate deploy` berhasil; 38 migration finished,
  migration source identik dengan baseline. Koneksi memakai TLS dengan
  verifikasi sertifikat; tidak menonaktifkan verifikasi.
- Role runtime bukan owner/superuser, tanpa CREATEDB/CREATEROLE/REPLICATION/
  BYPASSRLS/INHERIT dan tanpa membership administratif. `SELECT` + `UPDATE(id)`
  pada marker memungkinkan `FOR SHARE`; hak ubah identity/tier, INSERT,
  DELETE dan TRUNCATE tidak diberikan. Credential migration tidak dipasang
  ke Render.
- Probe canonical dari **proses lokal ke resource Neon hosted** lulus:
  matching binding/role, mismatch ditolak sebelum callback, 15 capability
  staging tetap tertutup serta production/live ditolak. Database staging
  mempunyai Customer 0 dan order 0. Ini bukti resource hosted; belum bukti
  wiring proses aplikasi hosted atau penerbitan cookie/session.
- Satu klik submit Render menampilkan Add Card dengan otorisasi sementara
  US$1. Tidak memasukkan kartu, menekan Add Card, melakukan otorisasi, upgrade
  atau mencoba submit kedua. Dialog dan draft dibatalkan. Dashboard Overview
  menyatakan belum ada service; service 0, build 0, deployment aplikasi 0.
- Tidak ada origin HTTPS aplikasi, HTTP smoke hosted, callback, cookie atau
  CSP aplikasi hosted yang dapat diperiksa. Helper cookie hanya diuji sebagai
  helper; jangan mencatat penerbitan sesi hosted sebagai lulus.
- Database Neon dipertahankan. Draft privat ditutup, password dialog Neon
  disembunyikan, salinan admin/migration sementara dibersihkan; runtime URL
  baru tetap privat. `.env.local`, data/DB lama dan worktree lain tidak diubah.
  Biteship/Midtrans/Maps/email/R2/shipment/refund/tunnel/Notification URL serta
  production API dan transaksi uang nyata: 0 pada tahap ini.

**Blocker:** kebutuhan kartu pada akun Render yang diuji bertentangan dengan
batas eksekusi yang disetujui. Jangan mengartikan US$1 authorization sebagai
izin memakai dana/kartu, sekalipun UI menyebutnya sementara. Jangan membuat
database ulang atau mengganti platform/deploy secara otomatis. Alternatif
yang layak disiapkan berikutnya adalah Netlify Free dengan Neon yang sudah
ada, setelah target/izin disesuaikan. Dokumentasi Netlify menyebut Free dengan
batas keras 300 credits/bulan serta dukungan Next.js 16; kesiapan akun dan
aplikasi ini pada adapter Netlify tetap belum diuji.

## Preflight kelanjutan 27 Oktober 2026

Source dasar kelanjutan adalah hasil PR #68,
`a3d995a904f6fde7e7e248e8a9c8421de734d521`, dengan 39 folder migration.
Perintah baru berada pada patch lokal T03; gunakan pada hosted hanya setelah
patch dikirim melalui review/CI dan source deployment ditetapkan secara eksplisit.

```sh
corepack pnpm staging:preflight
```

Perintah memakai Jiti existing dengan resolver tsconfig seperti runner job.
Ia membaca environment proses saja, tanpa memuat file environment otomatis.
Sediakan melalui environment manager privat:

- `NODE_ENV=production`, `NIUVA_DEPLOYMENT_TIER=staging`,
  `NIUVA_PROVIDER_MODE=sandbox` dan canonical `APP_URL` HTTPS aplikasi.
- `DATABASE_URL` role runtime terbatas dan `NIUVA_DATABASE_BINDING_ID` dari
  resource staging existing; keduanya tidak ditulis di dokumen/log/chat.
- Semua group provider/Admin/mail/storage dan `CRON_SECRET` absent, termasuk
  `MIDTRANS_IS_PRODUCTION` bila bernilai false. Analytics dan fixture/mock
  auth tidak diaktifkan.

Preflight memeriksa origin dan allowlist Server Actions canonical, policy helper
cookie Secure/HttpOnly/SameSite, serta 15 capability default yang harus ditolak.
Repository canonical mengambil marker dengan `FOR SHARE`; probe mismatch
menggunakan UUID lain tanpa mengubah marker dan harus menolak callback.
Query selanjutnya hanya membaca hak role/marker, riwayat migration dan jumlah
Customer/order. Identitas login (`session_user`) harus sama dengan role efektif
(`current_user`), sehingga credential owner yang memakai `SET ROLE` tetap ditolak.
Role owner, membership/flag administratif atau grant marker
selain SELECT dan UPDATE(id) membuat preflight gagal.

Hasil berupa satu JSON boolean/counter tanpa URL, nama role, UUID binding,
credential atau error database mentah. Kegagalan memakai exit code 1.
Tidak ada provisioning, DDL, seed, backfill, perubahan grant, sesi Customer
atau request provider di dalam command ini.

Batas bukti yang harus dipertahankan:

- `migrationsCurrent` membandingkan nama migration yang selesai dan status
  failure/rollback dengan folder source; bukan pemeriksaan drift schema atau
  checksum SQL. Source migration tetap harus direview sebelum deployment.
- `databaseTls` mengamati TLS connection dari PostgreSQL; konfigurasi trust
  sertifikat client tetap diperiksa terpisah. Fixture loopback tanpa TLS ditolak.
- Policy helper cookie dan origin bukan bukti response/cookie yang diterbitkan
  aplikasi hosted. HTTP/CSP, JS/native POST, callback dan proses Functions/Node
  aktual tetap mengikuti tabel penerimaan hosted di atas.
- Catatan Neon 38 migration tetap bertanggal 22 Oktober. Bila resource existing
  masih pada 38, command harus gagal `MIGRATIONS_NOT_CURRENT`; jangan
  menerapkan migration otomatis. Migration tambahan
  `20261025120000_customer_public_consent` hanya menambah kolom nullable
  `customer_consents.method`, tabel proof Google dan index; tidak backfill
  consent historis. Penerapan hosted memerlukan pemeriksaan resource dan izin
  migration yang spesifik.

Owner pada 27 Oktober menyetujui pengiriman patch T03 lewat PR sampai review/CI/
merge, lalu **satu deployment staging Netlify Free + Neon existing** melalui
OpenNext. Izin migration tambahan hanya berlaku bila Neon masih pada 38, setelah
identitas resource, backup dan Customer/order kosong diverifikasi. Tetap tanpa
kartu/upgrade, production atau aktivasi provider transaksi; berhenti bila build
gagal atau gate pembayaran muncul. Izin ini bukan hasil penerimaan hosted.

Dashboard tim Niuva pada pemeriksaan 27 Oktober menunjukkan plan Free,
300/300 credits tersedia dan tidak ada kartu tersimpan. Pemeriksaan dokumentasi:
[Free credit-based](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
memiliki batas keras 300 credits/bulan tanpa auto recharge;
[Next.js di Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
memakai adapter OpenNext dan Functions untuk route/SSR/Server Actions.
Ini berbeda dari proses `next start` Render. Origin harus sama pada build dan
Functions; preview/auto deploy serta resource Database/Blobs otomatis tidak
diaktifkan sebagai efek samping. Adapter aplikasi ini, build dan deployment
belum diuji; keadaan Neon terbaru tetap harus diperiksa sebelum penggunaan.

## Pemulihan dan perpindahan hosting akhir

Sebelum perubahan hosted, catat konfigurasi non-secret dan targetnya.
Pemulihan menutup deployment/capability staging melalui aksi platform yang
disetujui; pertahankan database serta bukti, tanpa drop otomatis. Auto-Deploy
Off mencegah push mendatang menjadi deployment implisit. Tidak ada resource
production yang menjadi sasaran rollback.

Hosting Indonesia nanti harus mendukung versi Node yang memenuhi engine,
PostgreSQL dengan TLS/role terpisah, reverse proxy HTTPS, environment manager,
build/start Next.js, dan prosedur backup/rollback. Pindahkan konfigurasi origin
dan resource secara eksplisit serta ulangi bukti hosted. Pemilihan domain,
provider, paket production, scheduler dan aktivasi provider tetap terpisah.

Referensi resmi yang diperiksa:
[Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting),
[Render Next.js](https://render.com/docs/deploy-nextjs-app),
[Render Node version](https://render.com/docs/node-version),
[Render metadata environment](https://render.com/docs/environment-variables),
[Render Free](https://render.com/docs/free),
[Neon plans](https://neon.com/docs/introduction/plans),
[Neon role terbatas melalui SQL](https://neon.com/docs/manage/roles),
[Netlify Free](https://www.netlify.com/pricing/),
dan [Netlify Next.js 16](https://www.netlify.com/changelog/next-js-16-deploy-on-netlify/).
Kontrak internal: [hosted/origin](../legal/customer-public-runtime-contract.md#hosted-origin-dan-capability),
[binding database](../superpowers/specs/2026-10-13-batch-2-database-binding-design.md),
dan [job/role](batch-2-operations.md).
