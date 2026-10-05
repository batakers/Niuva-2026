# Laporan Penyelesaian: niuva-audit-remediation

Diperbarui pada Tahap 12, 5 Oktober 2026 (task 28.1, Req 32.5). Laporan ini membedakan remediasi historis pada commit `c54b2d1` dari perubahan Tahap 12 yang belum di-commit.

**Status akhir Tahap 12:** task 26 sampai 30 selesai dan terverifikasi untuk scope yang disetujui; 1.10 dan 7.27 juga selesai. Tiga putaran stabilitas, database test baru, smoke build produksi lokal, seluruh gate checkpoint 30, serta cleanup lulus. Seluruh kegagalan diagnostik awal tetap dicatat di baseline. Item yang ditunda dan keputusan legal/bisnis yang masih terbuka tidak diklaim selesai.

**Pembaruan 2026-10-05–06:** keputusan Owner setelah merge ada di `register-keputusan.md`: RK-08/RK-12/RK-13/RK-27 TERTUTUP; RK-17 menunggu aset, RK-11 menunggu hosting, dan penutupan formal legal/bisnis lain tetap terpisah. Lanjutan kode yang diinstruksikan Owner ada di [laporan niuva-keputusan-lanjutan](../niuva-keputusan-lanjutan/implementation-report.md): deklarasi 18+ wajib dan bukti server, pemeriksaan ringan CAD, sitemap produk terbit, serta diagnosis E2E. Angka gate di laporan ini adalah riwayat Tahap 12; gate implementasi lanjutan tidak ditambahkan ke angka historis.

Semua bukti bersifat lokal, loopback, dan non-production. Penerimaan visual **belum ditinjau**, termasuk beranda, `/projects`, `/shop`, navigasi "Brief Proyek", dan badge cart. Physical-device, pembaca layar/assistive technology, provider, isolasi staging, hosted, dan production tidak terverifikasi. `PUB-RELEASE` tetap `NOT_AUTHORIZED`.

Sumber: `baseline-gate.md` bagian 10 sampai 15, `register-keputusan.md`, `production-readiness-boundary.md`, `render-strategy.md`, `coverage-gaps.md`, `tasks.md`, dan `requirements.md`.

## 1. Hasil gate dan bukti

| Gate / bukti | Hasil terukur Tahap 12 |
| --- | --- |
| `lint`, `typecheck`, `db:validate` checkpoint | PASS, lint 0 error / 0 warning; typecheck diulang setelah cleanup dan tetap PASS |
| Tiga putaran `test` | Ketiganya PASS, masing-masing 85 file / 1190 test |
| Tiga putaran `test:backend` | Ketiganya PASS, masing-masing 68 file / 496 test |
| Tiga putaran `test:integration` | Ketiganya PASS, masing-masing 19 file / 105 test, database test lama |
| Tiga putaran `test:e2e` penuh | Ketiganya 109 lulus / 5 skip / 0 gagal |
| Build checkpoint | PASS, 68 entri halaman; empat slug layanan SSG/ISR 300 detik pada build dan prerender manifest |
| Database baru dari kosong | 17 migrasi berhasil; integration 19 file / 105 test PASS setelah koreksi assertion yang disetujui user; kegagalan awal tercatat |
| E2E penuh database baru | Konfirmasi akhir 109 lulus / 5 skip / 0 gagal, exit suite/peluncur 0; port 3000 kosong. Semua kegagalan awal dicatat di baseline bagian 12 |
| Header/CSP `next build` + `next start` | PASS pada enam route; rincian pada baseline bagian 13 |
| Perilaku revalidasi kedua aksi portfolio | PASS pada cache produksi nyata dan HTTP, dua audit write lokal; batas otorisasi harness dijelaskan di bagian 4 |
| E2E production pada server `next start` | Pengulangan dan checkpoint akhir masing-masing 5/5 PASS, exit 0; timeout `page.goto("/")` pada percobaan pertama tetap dicatat, penyebab belum terbukti |
| Checkpoint 30 | Selesai: semua gate dijalankan kembali dan PASS; unit 85/1190, backend 68/496, integration 19/105, E2E penuh 109/5 skip/0 gagal; baseline bagian 15 |

Tiga putaran stabilitas memakai source/config/test yang sama; `public-pages.spec.ts:78` lulus pada ketiganya tanpa retry atau perubahan timeout. Setelah rangkaian tersebut, user memberi izin khusus mengganti assertion nama database test dengan nama dari `TEST_DATABASE_URL` yang sudah divalidasi setup. Pemeriksaan tabel dan trigger tetap sama. Perubahan ini dilaporkan terpisah dari rangkaian stabilitas awal.

Coverage V8 dipin 4.1.11, sama dengan Vitest. Masing-masing suite mengukur 360 file sumber termasuk file 0%, mengecualikan `src/generated/**`. Baseline statements/branches/functions/lines: unit **37.75/32.70/38.01/38.49%**, backend **32.66/23.86/31.82/34.53%**, integration **34.12/23.54/37.54/35.80%**. Usulan threshold dibulatkan ke bawah dan belum diberlakukan otomatis, sesuai task 1.10; lihat baseline bagian 10. Tidak ada coverage gabungan yang dihitung dari rata-rata suite.

Lima skip E2E penuh adalah spec production path dan tidak dihitung sebagai bukti produksi. Build/test hijau bukan penerimaan visual atau kesiapan lingkungan.

## 2. File yang berubah pada Tahap 12

Checkout mulai bersih pada branch `chore/niuva-audit-remediation`, HEAD `c54b2d1`. Commit Owner `230faa6` dan remediasi sebelumnya `c54b2d1` sudah ada sebelum sesi ini. Tidak ada commit, push, atau PR dalam sesi ini.

| Area | File dan tujuan |
| --- | --- |
| Dependency | `package.json`, `pnpm-lock.yaml`: satu dependency dev langsung `@vitest/coverage-v8@4.1.11` dan transitif paketnya |
| Coverage | `vitest.config.mts`, `vitest.backend.config.mts`, `vitest.integration.config.mts`: provider V8, laporan terpisah, generated dikecualikan; alias unit memakai entry `server-only` kosong resmi Next untuk transform coverage |
| Env contoh | `.env.example`: sembilan nama runtime baru kosong beserta komentar; tanpa nilai dari env privat |
| ISR layanan | `src/app/services/[slug]/page.tsx`: hapus `connection()`, literal `revalidate = 300`, pertahankan static params/fallback database/unknown slug 404 |
| Invalidasi portfolio | `src/app/admin/actions.ts`: kedua aksi portfolio menambah invalidasi pola `/services/[slug]` dengan tipe `page` |
| Header 404 | `src/app/api/frontend-preview/media/[id]/route.ts`: `X-Robots-Tag: noindex, nofollow` dan `Cache-Control: no-store` pada 404 |
| Test unit | `tests/unit/services-render-strategy.test.tsx` baru (9 test); `system-pages-coverage.test.ts` manifest 18 menjadi 17 sesuai ISR; `test-only-routes-fail-closed.test.tsx` assertion header 404 |
| Test integration (izin tambahan user) | `tests/integration/database.test.ts`: nama yang diharapkan berasal dari TEST_DATABASE_URL yang divalidasi setup, bukan literal `niuva_test`; pemeriksaan `orders` dan trigger immutable tetap persis sama |
| Spec | `register-keputusan.md`, `baseline-gate.md`, `coverage-gaps.md`, `render-strategy.md`, `production-readiness-boundary.md`, `completion-report.md`, `tasks.md`: keputusan, hasil nyata, batas bukti, status task, dan prosedur gate |

Daftar final: **20 file** (19 tracked berubah dan satu test unit baru), sesuai tabel area di atas. `tsconfig.json` identik dengan checkout awal setelah hanya dua include dist sementara dibersihkan; file itu tidak termasuk perubahan akhir. Dokumen Owner di `docs/` dan `docs/legal/`, dua test privasi Owner, workflow, `vercel.json`, dan migrasi lama identik dengan `c54b2d1`. File lama di c54b2d1 bukan perubahan uncommitted sesi ini; laporan lama tentang 113 file dirty dan dokumen Owner dirty sudah tidak berlaku.

## 3. Command dan lingkungan

Gate dijalankan lewat `corepack pnpm`: `lint`, `typecheck`, `test`, `test:backend`, `test:integration`, `test:e2e`, `db:validate`, dan `build`. Dependensi disetujui dipasang dengan `corepack pnpm add -D --save-exact @vitest/coverage-v8@4.1.11`. Tidak ada dependency baru lain.

Database test dikelola melalui `db:test:start` / `db:test:stop`. Untuk bukti database baru, migration dan Vitest dijalankan dengan binding database test baru yang sudah diverifikasi; wrapper integration biasa mengimpor database lama sehingga tidak dipakai untuk fresh proof. Tidak ada reset/drop database yang ada atau edit migrasi.

Smoke produksi memakai `corepack pnpm build`, `corepack pnpm exec next start -H localhost -p 3101`, lalu `corepack pnpm exec playwright test tests/e2e/public-content-production-path.spec.ts` pada server yang sudah siap. Memakai `NIUVA_DEPLOYMENT_TIER=production` pada mesin lokal bukan deployment production. Preload sementara mengisolasi loader env untuk smoke production agar tidak mengisi key provider dari env privat. Nilai env privat tidak dibaca langsung, dicetak, atau disalin ke repo.

Cara andal latar belakang, polling, pembungkus PostgreSQL, batas waktu proses, PID ownership, dan pembersihan ada di baseline bagian 14. Log sintetis lokal disimpan di `%TEMP%/niuva-stage12-20261005-01a10ad2`; coverage ignored ada di `.local/coverage`.

## 4. Acceptance criteria dan batas pembuktian

- Req 6.2 dan 6.3: coverage diukur pada semua suite, generated dikecualikan, baseline dan threshold di bawah baseline dicatat; tidak ada threshold 80% atau pengecualian modul tambahan untuk menaikkan angka.
- Req 14.2 dan 14.3: izin `.env.example` eksplisit dan hanya nama/placeholder non-rahasia.
- Req 16.1, 16.2, 16.8, dan 5.3: strategi layanan dibuktikan build nyata; fallback database dan unknown slug diuji; pola invalidasi baru diuji pada kedua aksi.
- Req 28.13 dan 16.7: respons 404 media tetap fail-closed, tidak di-cache, dan membawa noindex/nofollow.
- Req 29.7 dan 32.1: tiga rangkaian penuh, semua kegagalan fresh/smoke, dan bukti lingkungan lokal dicatat terpisah; tidak menghapus kegagalan awal karena pengulangan.
- Req 32.2 sampai 32.5: visual, physical-device, AT, provider/staging, otorisasi rilis, dan laporan dibedakan secara eksplisit.
- Req 30: hanya keputusan Owner eksplisit yang ditutup. RK legal/bisnis lain tidak diberi default.

Smoke cache memuat body aksi admin yang sebenarnya dari `src/app/admin/actions.ts` dan menjalankan PortfolioService, repository Prisma, audit, serta cache/revalidation Next yang sebenarnya. Identitas Owner disuntikkan melalui constructor dependency injection hanya dalam harness sementara. Dua HTTP route dibuktikan tetap stale setelah write database langsung, lalu berubah setelah masing-masing aksi; dua audit write terjadi. Ini bukan bukti sesi Clerk atau pemanggilan Server Action melalui browser yang terautentikasi.

## 5. Status per tahap

Remediasi Tahap 0 sampai 4, 9, 10, 11 dan checkpoint 25 pada c54b2d1 adalah riwayat yang tetap dirujuk melalui task masing-masing. Pengurangan scope "Pilihan 1 (Ringkas)" tetap berlaku; Tahap 5 sampai 8 dan pekerjaan lain yang dikeluarkan tidak dikembalikan ke scope.

| Item Tahap 12 | Status / batas |
| --- | --- |
| 26.1 / 26.2 | Selesai: keputusan dan deferral hanya dicatat dalam register |
| 1.10 / 7.27 | Disetujui dan selesai |
| 26.3 / 26.4 | Selesai: ISR layanan, invalidasi, 404 media, test, dan build |
| 27.1 | Selesai: tiga putaran PASS lengkap; cleanup akhir terverifikasi |
| 27.2 / 27.3 | Selesai: migration fresh, integration/E2E, header/CSP, cache nyata, dan cleanup terverifikasi; kegagalan awal tetap tercatat |
| 28 | Selesai: laporan, batas kesiapan, baseline, prosedur gate, dan kebersihan repo konsisten |
| 29 | Property 16 sudah ada dan lulus di suite; daftar optional di bawah |
| 30 | Selesai: seluruh gate checkpoint PASS, typecheck ulang setelah cleanup PASS, proses/port/dist bersih |

Optional yang tetap unchecked: **1.12/P28, 1.13/P29, 3.2/P13, 3.4/P14, 5.2/P3, 5.5/P4, 5.24/P18, 7.15/P17**. Property 16 sudah ada pada `tests/unit/properties/audit-p16-proxy-surface.test.ts`; pemetaan design dan test memvalidasi Req 13.9 sampai 13.12, sehingga rujukan 13.11/13.12 pada task 29.1 sah. Tidak perlu menulis test duplikat.

## 6. Keputusan dan pekerjaan yang ditunda

| Item | Keputusan eksplisit / syarat membuka spec terpisah |
| --- | --- |
| RK-10 / 7.25 | Model hibrida dipertahankan: nonce untuk admin/API admin/checkout/account, CSP statis untuk publik ber-cache. 7.25 keputusan saja melalui 26.1; tidak memperluas nonce/SRI |
| RK-16 / RK-08 | ISR `/services/[slug]` 300 disetujui dan diterapkan; keputusan 2026-10-05 menutup RK-08: layanan tetap data kode, model/tabel Service tidak dihapus |
| RK-14 / 21.23 | Cache ongkir tidak diperlukan sekarang; buka spec sesudah provider aktif dan data kuota/latensi tersedia |
| 3.14 | Ditunda mendekati staging; butuh pilihan vendor/paket, biaya, retensi/data/redaksi PII dan persetujuan |
| 5.15 / RK-11 | Ditunda sampai hosting/topologi instance dipilih; butuh store/biaya/skema yang disetujui; rate limit masih per proses |
| 7.13 | Guard assertNonProductionProvider dipertahankan sampai ada bukti staging terisolasi dan izin penghapusan path |

Pada checkpoint Tahap 12, keputusan tambahan belum dicatat. Register 2026-10-05 kemudian menutup RK-08, RK-12, RK-13, RK-27 serta mencatat pilihan Owner pada entri lain. Kontrol deklarasi usia dan sitemap diterapkan lewat spec lanjutan 2026-10-06. Status formal RK-01/RK-02/RK-03/RK-05/RK-09/RK-18, dokumen legal resmi, retensi, SLA, provider/hosting, dan bukti PUB-* tetap mengikuti register dan belum menjadi izin aktivasi publik.

## 7. Lima risiko tersisa yang diterima

| Risiko | Dampak / rujukan |
| --- | --- |
| Email Customer tanpa jaminan kirim ulang | Tidak ada outbox durable; RK-24 |
| Belum ada job terjadwal | Retensi berkas, pelepasan stok, dan rekonsiliasi pembayaran tidak otomatis; RK-25 |
| Belum ada alur refund | Tidak ada pengajuan/persetujuan/pengiriman refund; RK-04, RK-07, RK-26 |
| Checkout membutuhkan JavaScript | Funnel tanpa JS belum dikerjakan; guest checkout tidak dipulihkan; RK-13 |
| Belum ada halaman audit admin | Tidak ada UI audit/pengelolaan akses admin; RK-27, RK-09 |

## 8. Rollback dan checkpoint penutupan

Tahap 12 tidak mengubah skema atau migrasi. Rollback bersifat per file dalam daftar bagian 2, setelah keputusan Owner; jangan mengembalikan commit Owner/historis atau menghapus file yang tidak termasuk perubahan sesi ini. Coverage adalah dependency dev dan bisa dibatalkan bersama tiga config serta lockfile; ISR/header/invalidasi dibatalkan bersama test terkait bila diputuskan. Tidak ada tindakan deployment atau provider yang perlu di-rollback.

Cleanup akhir selesai: semua server/proses milik peluncur dihentikan, `db:test:stop` exit 0 dikonfirmasi, dist `.local/stage12-next` dihapus setelah path absolut/parent dan reparse point diperiksa, dan hanya dua include dist itu dibersihkan dari tsconfig. Typecheck ulang PASS dan tsconfig identik dengan checkout awal. Tidak ada listener 3000/3101/3103/55432, proses node/postgres milik peluncur, atau `.next-*-tmp` di root. Data database test lokal baru dan laporan coverage dipertahankan tanpa reset/drop; direktori E2E/test-results yang sudah ada tidak dihapus sembarang. Race taskkill serta error stderr pada wrapper stop awal tetap tercatat pada baseline; konfirmasi cleanup tidak hanya berdasarkan exit code wrapper.

Task 26 sampai 30 dicentang hanya setelah bukti masing-masing terpenuhi; task 29 memverifikasi property yang sudah ada dan mendokumentasikan optional yang belum dikerjakan. Branch tetap **`chore/niuva-audit-remediation`**, HEAD **`c54b2d1`**; perubahan Tahap 12 **belum di-commit**. Tidak ada commit/push/PR, deployment, aktivasi provider, atau penggunaan credential production. Visual tetap **belum ditinjau**; `PUB-RELEASE` tetap **`NOT_AUTHORIZED`**. Catatan rollback per file di atas tidak mengeksekusi rollback atau mengubah keputusan Owner.
