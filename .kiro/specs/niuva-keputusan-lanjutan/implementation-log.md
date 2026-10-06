# SDD ledger — plan: .kiro/specs/niuva-keputusan-lanjutan/tasks.md

Tanggal mulai: 6 Oktober 2026. Owner menginstruksikan implementasi spec melalui Superpowers. Branch: `codex/niuva-keputusan-lanjutan`, base `ae43fb93c8642741d166e23c621937ae283e8f0d`.

Pre-flight: Task 1 (usia), Task 2 (CAD), Task 3 (sitemap) tidak berbagi interface bisnis. Task 4 memakai harness E2E yang juga memverifikasi Task 1; perubahan diagnostic harus mempertahankan kontrak assertions. Task 5 memverifikasi semua irisan dan mencatat bukti.

Ruling: eksekusi dan pembukuan memakai agent utama serta patch native; tidak menjalankan script skill yang commit/delete atau menambahkan agent, karena instruksi repo/plan menahan tindakan tersebut sampai instruksi eksplisit. Review akhir dilakukan sebagai pass terpisah oleh agent utama; batasnya adalah tidak ada penilaian independen.

## Task 1 — complete

Mulai dari test server schema untuk deklarasi wajib. Kode produk belum diubah pada awal RED.

RED: `corepack pnpm exec vitest run tests/unit/customer-age-declaration.test.ts tests/unit/customer-email-auth.test.ts` menghasilkan 7 gagal/6 lulus. Ketujuh input deklarasi kosong/tidak eksplisit diterima schema lama (assertion `true` versus `false`), bukan kegagalan konfigurasi/import.

GREEN schema: 13/13. RED berikutnya: UI 2 gagal/5 lulus (kontrol usia belum tersedia); integrasi email 5 gagal/16 lulus (bukti null, verifikasi legacy diterima, pembuatan Google langsung diterima); internal Google 1 gagal karena bukti null; route internal 3 gagal karena POST tanpa deklarasi masih 200. Setelah implementasi, unit UI/schema 20/20 serta 4 file integrasi auth/privacy 44/44 lulus. Migrasi baru aditif diterapkan hanya ke database test loopback.

Ruling fixture: test Google yang membuat akun kini menyediakan proof internal valid; test login ordinary memakai akun yang disiapkan di DB. Global setup E2E menyediakan identitas mock sebagai akun lama dalam database test yang sudah dijaga guard loopback. Assertions login/privasi dipertahankan; jalur pembuatan ordinary baru mempunyai test penolakan tersendiri, tanpa bypass production.

GREEN akhir mencakup gate capability (155 kasus pada run terarah), email/internal route dan seluruh regresi auth/privacy PostgreSQL. Hanya kontrol `PUB-AGE` teknis ditutup; policy, tier/mode/grant dan public signup tetap ditolak. Versi/waktu dibuat server, tidak dibackfill ke consent lama. RK-02/RK-03 tetap `BELUM_TERTUTUP` dalam register Owner.

Ruling browser: `/register` aktual diuji desktop/mobile, keyboard/focus/error dan reduced motion. Form internal aktif mempunyai component/POST/service/PG coverage; browser halaman aktif belum diverifikasi. Guard Development `niuva_dev` tidak dilonggarkan untuk menerima DB E2E `niuva_test`. Step browser plan diperjelas untuk mencatat batas ini, bukan mengklaim penerimaan visual.

## Task 2 — complete

RED service: 3/3 kasus baru gagal karena isi palsu/ukuran aktual berbeda masih diterima dan inspector belum dipanggil. Implementasi menambahkan prefix maksimal 64 KiB + byte count + SHA-256 pada satu GetObject. Batas 100 MiB, cleanup pending lama, dan alur foto tetap. Fixture STL lama berisi tiga byte diganti isi berformat STL tanpa mengurangi assertions. Typecheck mengungkap adapter test yang perlu interface baru, serta alias import transitif dari next.config; import helper diganti relatif.

GREEN helper/stream/service/upload integrasi tercakup dalam gate backend 547 dan integrasi 121 akhir. Kasus tambahan membuktikan append terverifikasi menjalani inspeksi serta foto memakai jalur existing. STL binary diawali `solid`, count/ukuran, teks dengan BOM/notasi ilmiah, chunk terpisah, stream gagal/oversize dan iterator ditutup diuji. 3MF tetap pemeriksaan header ZIP; tidak ada klaim full-format/antivirus. RED helper diubah menjadi RED perilaku service existing agar kegagalan bukan sekadar import belum ada.

## Task 3 — complete

RED sitemap: 3 gagal/4 lulus; URL produk absen dan adapter katalog belum dipanggil. Implementasi memakai jalur katalog publik yang sudah ada, dua fallback baca independen, encoding slug dan deduplikasi URL. `revalidate = 300` tetap literal, origin tetap wajib.

GREEN unit 7/7 dan test integrasi katalog nyata lulus. Build dengan DB loopback pada port tanpa listener lulus, 68/68 halaman statis dan sitemap 5 menit. Production visibility/demo exclusion serta produk published tanpa stok mengikuti adapter existing. Tidak ada `.env*` atau API request-time baru.

## Task 4 — complete (akar penyebab tetap terbuka)

Metadata/log dua attempt CI gagal dan API artifact diperiksa ulang; artifact kosong, trace CI gagal tidak tersedia. Attachment diagnosis publik ditambahkan tanpa mengubah readiness helper, assertions, timeout atau retry. Run terarah dengan trace 5/5 lulus; attachment benar-benar diinspeksi untuk enam decode di dua viewport. Interval helper 43–66 ms; semua gambar complete/berdimensi positif. Suite penuh 110 lulus/5 skip existing; pesan stream juga muncul pada suite yang lulus. Tidak ada bukti cukup untuk memilih perubahan cache/optimizer. Rincian: [e2e-investigation.md](e2e-investigation.md).

## Task 5 — complete

Gate akhir langsung: lint 0 error/0 warning; typecheck lulus; unit 86 file/1.203; backend 72/547; integrasi resmi 20/121; Prisma generate/validate lulus; E2E penuh 110 lulus/5 skip existing/0 gagal; runtime tier production lokal 5/5; build tanpa DB 68/68; `git diff --check` lulus. Coverage statements unit 37,63%, backend 33,07%, integrasi 34,68%; threshold tidak ditambahkan.

Run full pertama bersamaan mengalami timeout integrasi dan worker lstat UNKNOWN; exact gate lulus saat dijalankan terpisah, tanpa menaikkan timeout. Assertion urutan migrasi dikoreksi untuk predecessor/successor spesifik dan kontrak migrasi baru ditambahkan; assertions DDL/PII existing tetap. Mock sitemap diberi export katalog agar cocok dengan interface baru; assertions exclusion tidak dikurangi.

Review akhir adalah pass terpisah oleh agent utama, bukan review independen. Pemeriksaan diff mencakup sumber bisnis penting, nullable/additive migration, perubahan fixtures/assertions, public activation boundary, capture `/register` aktual dan area protected. Tidak ada perubahan manifest/lockfile, `.env*`, workflow, vercel, `docs/`, migrasi lama, `tsconfig.json`, readiness helper, matrix atau grant; tidak ada `any`, skip/retry/timeout baru. Visual Owner belum ditinjau dan provider/staging/fisik/AT/production tidak terverifikasi.

Resource cleanup: `corepack pnpm db:test:stop` exit 0, data dipertahankan; wrapper milik task PID 17228 dihentikan setelah command line-nya diverifikasi. Tidak ada listener 3000/3101/55432. Branch tetap `codex/niuva-keputusan-lanjutan`, HEAD `ae43fb9`, tanpa commit/push/PR. Status keputusan Owner tidak dinaikkan lewat checkbox. Laporan lengkap, command, risiko dan rollback: [implementation-report.md](implementation-report.md).
