# Validasi policy dan pusat privasi Customer

2 Oktober 2026 · branch `codex/customer-auth-email-policy` · Development lokal/test.
Tidak ada commit/push/deployment atau aktivasi pendaftaran publik pada tahap ini.

## Hasil otomatis

| Gate | Hasil |
|---|---|
| Unit/component | 34 file, 159 pengujian lulus. |
| Backend | 38 file, 190 pengujian lulus; Owner permission/preview, Origin/Host, HTTP/native forms dan security. |
| PostgreSQL integration | 15 file, 82 pengujian lulus di `niuva_test`, termasuk 10 pengujian privacy lifecycle. |
| E2E Customer/checkout/auth/privacy/security headers | 29 pengujian lulus, 1 worker, server test port 3100. |
| TypeScript strict | Lulus. |
| ESLint | 0 error, 147 warning existing (vendored design scripts dan shipping unused variable). |
| Prisma validation | Schema valid; migrasi baru diterapkan ke Development dan test, migrasi lama tetap. |
| Production build | Lulus; route privacy Customer/Owner/API masuk build. Draf legal tercakup file tracing preview Owner. |
| Git diff check / secrets | Tidak ada whitespace error. Env, outbox, helper lokal, build dan capture tetap ignored. |

Commands memakai entrypoint Node langsung karena shim `.bin` lokal untuk Prisma/Next tidak tersedia. `corepack pnpm` launcher E2E awal gagal pada tooling, bukan test aplikasi. Helper `.local/privacy-e2e-server.mjs` (ignored) memuat env test tanpa mencetaknya; mock hanya di database test loopback. Database test awal tidak berjalan setelah gangguan Windows; setelah start, seluruh integrasi diulang dan lulus. Test berat memakai worker terbatas dan dijalankan bergiliran.

```powershell
node node_modules/vitest/vitest.mjs run --maxWorkers=2
node node_modules/vitest/vitest.mjs run --config vitest.backend.config.mts --maxWorkers=2
$env:DOTENV_CONFIG_PATH='.env.test.local'
node --import dotenv/config node_modules/vitest/vitest.mjs run --config vitest.integration.config.mts --maxWorkers=1
$env:NIUVA_E2E_PORT='3100'
node node_modules/@playwright/test/cli.js test tests/e2e/customer-privacy.spec.ts tests/e2e/customer-auth.spec.ts tests/e2e/customer-email-auth.spec.ts tests/e2e/checkout.spec.ts tests/e2e/account-work.spec.ts tests/e2e/security-headers.spec.ts --workers=1
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js .
$env:DOTENV_CONFIG_PATH='.env.local'
node --import dotenv/config node_modules/prisma/build/index.js validate
$env:NIUVA_NEXT_DIST_DIR='.next-reference-e2e'
node node_modules/next/dist/bin/next build
```

Environment variables di atas dipasang pada proses gate masing-masing, bukan perubahan `.env.local`.

## Kriteria yang diperiksa

- Ekspor proyeksi data sendiri tanpa password/hash/token/storage key/URL privat/data Customer lain.
- Proof terikat akun/sesi/tujuan, expired tepat 15 menit, delivered wajib, GET refresh tidak consume, POST sekali pakai, kegagalan provider tidak memberi izin.
- Closure Google/password, semua sesi/token dicabut, data pesanan/brief tetap ada, pending/reset/session issue bersaing diserialisasi, intent OAuth lama ditolak, akun baru tidak memperoleh order lama, cleanup idempoten.
- Origin asing/hilang, Host tidak cocok, forwarded headers, ukuran body, izin Owner, validation/focus/native 303, persistent rate limit lintas service instance.
- Koreksi eksplisit nama profil oleh Owner; request/data tambahan tetap berdeadline awal 72 jam; penanganan setelah closure memakai kontak tersimpan; resolved tidak diulang.
- Batas 7/30 hari, dry-run, penahanan/review yang terdokumentasi, transient token/session expired, akun aktif tidak terhapus.
- Browser Customer pada 320/390/768/1024/1280/1440, tidak ada overflow, keyboard/skip link, reduced motion, pending/pageshow; form native tanpa JS di 127.0.0.1; file JSON terunduh; fixture penutupan tidak memulihkan sesi.
- Native POST sebelumnya gagal karena no-referrer menghasilkan Origin:null. Same-origin referrer policy memperbaiki form tanpa menerima origin null/asing dan tanpa referrer lintas situs; regression sudah lulus.

## Scheduler Development

`Niuva-Customer-Privacy-Cleanup` terdaftar daily 03.15 WIB + logon current user,
StartWhenAvailable=true, RestartCount=3, RestartInterval=PT1H. Eksekusi manual
LastTaskResult=0. Dry-run menghasilkan seluruh kandidat nol pada snapshot lokal.
Task `Niuva-Internal-Auth-Cleanup` 03.00 tetap tersedia dan dry-run berhasil.
Simulasi koneksi port tidak tersedia (tanpa mematikan database nyata) keluar 1,
log kategori DATABASE_OR_JOB_FAILED. NODE_ENV=production ditolak
ENVIRONMENT_REJECTED. Tidak ada isi kasus/credential di log job.

## Provider nyata dan penerimaan manual

- Mock email end-to-end lulus pada test. Pengiriman konfirmasi privasi melalui Resend nyata, penerimaan inbox serta penggunaan link dalam sesi nyata **belum diverifikasi pada tahap ini**.
- Akun nyata tidak ditutup/dihapus sebagai bagian pengujian. Seluruh pengujian penghapusan menggunakan fixture database test.
- Browser tool menolak memilih tab sesi lokal dengan browser security policy. Akses Owner nyata, capture route Owner dengan Clerk dan review visual Owner **belum dilakukan**; akses Owner tetap diuji dengan server-rendering/permission tests, tanpa bypass runtime.
- Capture route Customer nyata pada server test tersimpan di `test-results/privacy-captures/customer-{width}.png`. Ini fixture loopback, bukan screenshot Customer production atau persetujuan visual.
- Draf legal masih membutuhkan tinjauan/persetujuan. Usia, transaksi wajib, refund/retur, backup/provider produksi dan monitoring retensi tetap prasyarat publikasi.
