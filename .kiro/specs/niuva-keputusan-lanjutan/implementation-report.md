# Laporan implementasi — niuva-keputusan-lanjutan

Tanggal: **6 Oktober 2026**. Scope implementasi diinstruksikan Owner melalui Superpowers. Branch kerja: `codex/niuva-keputusan-lanjutan`, berasal dari `ae43fb93c8642741d166e23c621937ae283e8f0d`. Laporan ini merupakan snapshot penutupan fase implementasi, ketika seluruh perubahan masih lokal dan belum di-commit. Pada fase itu tidak ada push, PR, deployment, aktivasi provider atau penggunaan credential production. Pengiriman Git berikutnya dilakukan hanya atas instruksi Owner tersendiri.

## Hasil yang dapat ditinjau

Kontrol usia RK-02, inspeksi CAD RK-12, dan sitemap katalog RK-18 sudah diimplementasikan dan diverifikasi. Investigasi E2E sudah menghasilkan bukti lokal dan instrumentasi untuk kegagalan berikutnya; **akar penyebab timeout CI lama tetap belum terbukti**. Seluruh gate akhir yang dijalankan pada perubahan ini lulus.

Pendaftaran publik tetap ditolak. `PUB-AGE` menyatakan kontrol teknis sudah tersedia, sedangkan `PUB-POLICY`, matrix tier/mode, activation grant, dan `PUB-RELEASE = NOT_AUTHORIZED` tetap menahan aktivasi. Checkbox plan dan test hijau tidak menutup keputusan Owner. Status RK-02/RK-03/RK-18 tetap `BELUM_TERTUTUP` di register; RK-12 sudah `TERTUTUP` sebagai keputusan sebelum implementasi ini.

### RK-02 — pernyataan usia 18+

- Dua form pendaftaran existing mempunyai checkbox wajib, terpisah dari persetujuan kebijakan, awalnya tidak dicentang: **“Saya menyatakan bahwa saya berusia 18 tahun atau lebih.”** Error terhubung ke input dan fokus diarahkan ke checkbox ketika belum diisi. Login/reset tidak memperoleh checkbox pendaftaran.
- Schema server hanya menerima `ageDeclaration: "on"`. Input hilang, `off`, boolean atau nilai lain ditolak sebelum pembuatan pending registration/proof atau pengiriman email. POST langsung dan panggilan service tidak bisa mengandalkan validasi browser saja.
- Versi `AGE-18-SELF-DECLARATION-2026-10-05-v1` dan waktu deklarasi dibuat server, lalu diteruskan dari pending registration/proof internal ke consent. Field versi/waktu yang dipalsukan browser tidak digunakan.
- Pending email dan proof Google tanpa bukti, salah versi, waktu invalid atau waktu di masa depan ditolak pada konsumsi. Existing expiry, identity binding, replay protection, lifecycle lock, serta closure fence dipertahankan. Pembuatan akun Google ordinary baru tanpa proof internal tetap ditolak; login akun yang sudah ada tetap berhasil.
- Migrasi baru menambahkan **enam kolom nullable** pada `CustomerPendingRegistration`, `CustomerConsent` dan `CustomerInternalGoogleConsent`. Tidak ada default/backfill, perubahan migrasi lama, penghapusan atau rekonstruksi riwayat Customer. Migrasi diterapkan hanya pada database test loopback yang dijaga guard existing.

Pernyataan usia merupakan deklarasi pengguna, bukan verifikasi usia. Tidak ada pengumpulan tanggal lahir, identitas/KYC atau biometrik. Dokumen Owner yang lebih lama tidak diubah; penyelarasan dokumen publik dan keputusan legal tetap perlu sebelum aktivasi signup publik.

### RK-12 — inspeksi ringan CAD

- Konfirmasi upload memeriksa ekstensi existing dan byte server untuk `stl`, `obj`, `3mf`, `step`, `stp`. Binary STL diperiksa terhadap jumlah triangle dan ukuran objek; ASCII STL/OBJ/STEP diperiksa melalui prefix format, termasuk variasi BOM/whitespace dan notasi ilmiah yang diuji.
- R2 inspector menggunakan **satu GetObject** untuk menghitung SHA-256, jumlah byte sebenarnya, dan prefix maksimal **64 KiB**. Batas objek **100 MiB** tetap berlaku; objek tidak dikumpulkan seluruhnya dalam buffer. Stream putus atau melebihi batas ditolak dan pembacaan ditutup.
- Inspector hilang, ukuran aktual berbeda, checksum tidak sesuai, atau header tidak sesuai membuat konfirmasi ditolak sebelum `markUploadedIfPending()`. Pesan publik tetap generik; cleanup pending yang sudah ada dipertahankan.
- Jalur Customer dan append link terverifikasi mempunyai regression coverage. PNG/JPEG, R2 privat, signed access, serta kebijakan retensi **14/60/90 hari** tidak berubah. Tidak ada dependency atau provider baru.

Inspeksi ini hanya pemeriksaan lokal ringan. Untuk 3MF, tanda ZIP `PK 03 04` **tidak membuktikan isi arsip adalah model 3MF yang valid**; ZIP lain dapat lolos pemeriksaan header. Tidak ada ekstraksi arsip, parser model penuh, antivirus atau klaim berkas aman untuk langsung diproduksi. Review operator tetap diperlukan.

### RK-18 — sitemap produk terbit

- `/sitemap.xml` memakai `getLiveShopProducts()` yang sama dengan katalog publik. Publication/runtime visibility dipatuhi; produk draft dan fixture demo yang disembunyikan pada runtime production tidak masuk. Produk terbit tanpa stok tetap mengikuti visibility katalog existing.
- Slug di-encode dan URL dideduplikasi. Static/service/project entries serta exclusion existing dipertahankan.
- Baca katalog dan project mempunyai fallback independen. Sumber sehat tetap menghasilkan URL ketika sumber lain gagal. Origin invalid membuat sitemap kosong tanpa membaca kedua sumber.
- Literal `revalidate = 300` dipertahankan. Tidak ada API request-time baru, origin rekaan dalam aplikasi atau tanggal publikasi/`lastModified` rekaan. Build nyata dengan database tidak tersedia berhasil; build mencatat `/sitemap.xml` dengan interval **5 menit**.

### Investigasi E2E beranda

Metadata/log attempt gagal dua run CI dan artifact API diperiksa. API artifact mengembalikan daftar kosong, sehingga trace kegagalan CI lama tidak dapat diinspeksi. Stack `image.decode()` menunjukkan fase saat deadline keseluruhan tes habis, tetapi belum membuktikan satu gambar/decoder/ISR sebagai penyebab.

Tes terarah dengan trace lulus **5/5**. Attachment trace lokal benar-benar diperiksa: tiga gambar portfolio pada dua viewport sudah complete dan berdimensi positif; interval helper decode sekitar **43–66 ms**, termasuk scroll/assertions. Suite penuh pada source/config yang sama kemudian lulus **110 tes**. Pesan `The destination stream closed early` juga muncul pada run penuh yang lulus, sehingga pesan tersebut sendiri belum mengidentifikasi kegagalan.

`product-route-proof.spec.ts` kini membuat attachment diagnosis berisi fase/waktu relatif, viewport, alt/index, pathname media publik, complete/dimensi dan status response. Tidak merekam query, cookie, token, storage, private-media path atau isi berkas. Helper readiness, assertions, timeout dan retry tidak diubah. Tidak ada perubahan caching atau optimizer gambar berdasarkan dugaan. Rincian dan data yang diperlukan jika CI gagal lagi ada di [e2e-investigation.md](e2e-investigation.md).

## Hasil gate akhir yang dijalankan langsung

Angka berikut berasal dari run sesi implementasi ini, bukan salinan angka handoff. Gate unit/backend/integrasi dijalankan terpisah untuk menghindari perebutan resource mesin lokal. Exit akhir seluruh command di tabel adalah **0**.

| Command | Hasil akhir |
| --- | --- |
| `corepack pnpm db:generate` | Prisma client 7.10.0 berhasil digenerate |
| `corepack pnpm db:validate` | Schema valid |
| `corepack pnpm lint` | Lulus, 0 error / 0 warning |
| `corepack pnpm typecheck` | Lulus strict TypeScript dan typegen existing |
| `corepack pnpm test` | **86 file / 1.203 tes lulus** |
| `corepack pnpm test:backend` | **72 file / 547 tes lulus** |
| `corepack pnpm test:integration` | Harness resmi: **20 file / 121 tes lulus** |
| `corepack pnpm exec playwright test tests/e2e/product-route-proof.spec.ts tests/e2e/customer-email-auth.spec.ts --trace on` | **5/5 lulus**, 51,2 detik; trace/attachment lokal diperiksa |
| `corepack pnpm test:e2e` | **110 lulus, 5 skip existing, 0 gagal**, 3,0 menit |
| `corepack pnpm exec playwright test tests/e2e/public-content-production-path.spec.ts --trace on --output .local/e2e-production-results` | Dengan tier `production` dan port 3101 lokal: **5/5 lulus**, 18,5 detik |
| `corepack pnpm build` | Lulus dengan DB tidak tersedia; **68/68** halaman statis berhasil digenerate; sitemap 300 detik |
| `git diff --check` | Lulus tanpa masalah whitespace |
| `corepack pnpm db:test:stop` | Server test dihentikan, data lokal dipertahankan |

Coverage statements akhir: unit **37,63%**, backend **33,07%**, integrasi **34,68%**. Belum ada threshold baru; angka ini baseline, bukan klaim seluruh jalur bisnis telah tercakup.

Build tanpa DB memakai binding proses sementara ke port loopback **55439**, yang diverifikasi tidak mempunyai listener, dengan nama database test dan tanpa password/credential production. Origin HTTPS `.test` dipakai hanya dalam proses build. Tidak ada pembacaan oleh agent atau perubahan `.env*`. Public runtime E2E memakai harness **Next dev** existing dengan tier production; hasil itu bukan pengujian `next start` terhadap cache ISR atau acceptance deployment.

Output background disimpan di `$env:TEMP` dengan nama `niuva-keputusan-{build,e2e-target,e2e-full,e2e-production,integration}.out.log` dan file stderr pasangan. Trace terarah awal sudah diperiksa sebelum suite penuh mengganti isi direktori hasil default. Trace tersebut merupakan bukti run historis yang diinspeksi, bukan link artifact persisten yang dijanjikan masih tersedia. Capture `/register` dari suite penuh tersedia pada `test-results/customer-auth-register-{390,1440}.png`; trace runtime production disimpan terpisah pada `.local/e2e-production-results`.

### Kegagalan antara dan tindak lanjut

- RED usia awal: **7 gagal / 6 lulus** karena schema menerima deklarasi kosong/tidak eksplisit. RED form: **2 gagal / 5 lulus** karena checkbox belum ada. RED integrasi email: **5 gagal / 16 lulus**; bukti belum tersimpan, pending legacy dan pembuatan Google langsung masih diterima. RED internal proof: satu kegagalan bukti null; RED route: tiga kasus POST tanpa deklarasi masih diterima. Semua dilanjutkan ke GREEN setelah implementasi.
- RED CAD dilakukan pada perilaku service existing: tiga kasus isi/ukuran palsu diterima dan inspector belum dipanggil. Test helper format/stream lalu ditambahkan; tidak memakai import helper yang belum ada sebagai bukti RED.
- RED sitemap: **3 gagal / 4 lulus** karena adapter katalog belum dibaca dan URL produk belum masuk.
- Run full pertama secara bersamaan mengalami timeout integrasi 5 detik dan error worker `lstat UNKNOWN` pada dependency yang masih ada. Gate yang sama lulus saat dijalankan terpisah; timeout/test expectation tidak dinaikkan atau dilemahkan. Catatan ini tidak membuktikan akar penyebab error worker, tetapi kegagalannya tidak tereproduksi pada run akhir terpisah.
- Test urutan migrasi lama mengasumsikan `failure_events` selalu migrasi terakhir. Assertion diperbarui menjadi predecessor yang tepat dan sekaligus mengharuskan migrasi usia sebagai successor; assertions DDL/PII lama tetap. Test kontrak migrasi usia memeriksa tiga tabel/enam penambahan nullable tanpa operasi destruktif/default/backfill.
- Mock sitemap pada test penolakan route diberi export katalog kosong agar cocok dengan interface baru; seluruh exclusion assertions tetap. Fixture tiga byte yang mengaku STL diganti byte STL yang valid; checksum/token/ownership assertions dipertahankan. Assertion satu checkbox pada form diperluas menjadi policy dan usia yang masing-masing wajib.

## Penerimaan dan batas bukti

| Kriteria | Bukti dan status |
| --- | --- |
| Deklarasi usia wajib di browser dan server | Unit/schema/component, route backend, integrasi PostgreSQL dan E2E `/register` lulus |
| Bukti minimum persisted tanpa bypass akun baru | Versi/waktu server, legacy/mismatch/future rejection dan proof binding diuji pada service/repository; lifecycle/closure regression lulus |
| Kontrol usia tidak membuka signup publik | Default policy gate dan seluruh tier/mode/grant regression lulus; matrix/grant tidak diubah |
| Byte CAD palsu/ukuran/stream ditolak | Helper, stream dan konfirmasi service serta jalur upload integrasi lulus; inspector diwajibkan sebelum mark |
| Hanya katalog terbit yang muncul di sitemap | Unit 7/7 dan integrasi katalog nyata lulus; kegagalan sumber independen/origin invalid diuji |
| Build tidak membutuhkan DB tersedia | Build nyata exit 0 pada loopback tanpa DB; sitemap 300 detik terlihat di output build |
| Diagnosis E2E mempertahankan pembuktian existing | Semua assertions lama tetap; targeted 5/5 dan full 110 lulus; diagnosis terbatas media publik |
| Browser `/register` | Desktop 1440 dan mobile 390, keyboard/focus/error serta reduced motion diuji; capture aktual diperiksa agent |
| Form Google internal aktif | Component/route/service/PG diuji; **browser halaman aktif belum diverifikasi** pada konfigurasi Development yang sah |
| Visual Owner | **Belum ditinjau**; pemeriksaan agent/capture bukan penerimaan Owner |
| Perangkat fisik / pembaca layar | **Belum terverifikasi** |
| Provider / hosted Clerk / staging / production | **Belum terverifikasi**; hanya lokal/loopback/non-production |

Internal Google development guard memang tidak menganggap database `niuva_test` sebagai konfigurasi internal `niuva_dev` yang sah. Guard tidak dilonggarkan untuk membuat capture halaman aktif. Langkah browser pada plan disesuaikan dengan bukti yang tersedia: `/register` aktual, komponen kedua form dan batas server internal; kekurangan bukti halaman internal aktif dicatat di sini. Tidak ada penerimaan visual/production yang diberikan lewat penyesuaian ini.

Review akhir dilakukan sebagai pass terpisah oleh **agent utama**, bukan reviewer independen. Diff sumber penting, perubahan assertions/fixtures, area terlindungi, migrasi baru, hasil browser dan gate diperiksa. Tidak ada penambahan `any`, skip/retry/timeout, dependency, perubahan helper readiness, matrix atau grant. Tidak ada isu implementasi diskret tersisa yang ditemukan pada pass tersebut; batas verifikasi di tabel tetap berlaku.

CI `Quality` untuk baseline `ae43fb9` dikonfirmasi success pada [run 37331063062](https://github.com/batakers/Niuva-2026/actions/runs/37331063062). Pada penutupan fase implementasi, perubahan lokal ini **belum mempunyai run CI sendiri**, karena belum di-push.

## Area perubahan

Daftar lengkap path dicatat di inventaris di bawah. Perubahan terbagi menjadi helper usia/CAD, schema dan satu migrasi baru, service/repository/batas request, dua form existing, sitemap, fixtures/tests dan pembukuan spec. `.env*`, `.github/workflows/`, `vercel.json`, `docs/`, manifest/lockfile, `tsconfig.json`, migrasi lama serta root `AGENTS.md` tidak berubah.

## Risiko tersisa dan rollback

- Pernyataan usia tidak memverifikasi usia. Legal/policy, grant dan persetujuan release tetap perlu sebelum signup publik; keputusan bisnis yang belum ada tidak diisi default.
- Pemeriksaan prefix CAD tidak membuktikan model utuh/aman; 3MF hanya header ZIP. Provider R2 nyata belum diverifikasi. Operator tetap meninjau model dan penawaran final.
- Timeout CI lama belum dijelaskan. Attachment dari attempt gagal berikutnya diperlukan; workflow sekarang tidak mengunggah artifact. Perubahan workflow memerlukan instruksi infrastruktur tersendiri.
- Rate limit masih per proses. Durable email outbox, job terjadwal, refund, halaman audit admin, OG asset Owner dan pekerjaan infrastruktur yang ditunda tetap di luar scope. Checkout tetap membutuhkan JavaScript. Tidak ada risiko lama yang dinyatakan hilang karena gate hijau.
- Untuk membatalkan sebelum commit, tinjau dan pulihkan **hanya path dalam inventaris** atas instruksi Owner; jangan memakai reset/clean menyeluruh. Tidak ada penghapusan file atau data dilakukan dalam sesi ini.
- Enam kolom test DB sudah ada. Rollback aplikasi dapat meninggalkan kolom nullable itu; tidak perlu drop kolom atau mengubah migrasi yang sudah diterapkan. Deployment migrasi/aplikasi ke lingkungan lain tetap memerlukan review dan instruksi eksplisit.

Cleanup selesai: `db:test:stop` exit 0; wrapper database milik task dihentikan setelah identitas proses diverifikasi. Tidak ada listener pada **3000, 3101, 55432**. Data test dan output lokal dipertahankan; tidak ada temporary include `tsconfig.json` atau direktori `.next-*-tmp` baru yang perlu dipulihkan. HEAD tetap base `ae43fb9` pada branch kerja, tanpa commit.

## Inventaris path

Snapshot inventaris akhir implementasi dari `git status --porcelain=v1 -uall`: **56 path**, saat itu belum di-stage. `M` berarti modifikasi file existing; `baru` berarti file untracked task ini. Tidak ada path penghapusan.

- `.kiro/specs/niuva-audit-remediation/completion-report.md` — M.
- `.kiro/specs/niuva-audit-remediation/production-readiness-boundary.md` — M.
- `.kiro/specs/niuva-audit-remediation/register-keputusan.md` — M.
- `prisma/schema.prisma` — M.
- `src/app/api/auth/internal/google-consent/route.ts` — M.
- `src/app/sitemap.ts` — M.
- `src/components/niuva/customer-email-form.tsx` — M.
- `src/components/niuva/internal-google-consent-form.tsx` — M.
- `src/modules/capabilities/resolver.ts` — M.
- `src/modules/customer-auth/email-repository.ts` — M.
- `src/modules/customer-auth/email-service.ts` — M.
- `src/modules/customer-auth/internal-consent.ts` — M.
- `src/modules/customer-auth/password-validation.ts` — M.
- `src/modules/customer-auth/repository.ts` — M.
- `src/modules/files/r2.ts` — M.
- `src/modules/files/repository.ts` — M.
- `src/modules/files/upload-service.ts` — M.
- `tests/backend/customer-email-routes.test.ts` — M.
- `tests/backend/customer-internal-consent-route.test.ts` — M.
- `tests/backend/failure-event-migration.test.ts` — M.
- `tests/backend/phase3-providers.test.ts` — M.
- `tests/backend/private-file-access.test.ts` — M.
- `tests/backend/upload-sha256.test.ts` — M.
- `tests/e2e/customer-auth.spec.ts` — M.
- `tests/e2e/customer-email-auth.spec.ts` — M.
- `tests/e2e/customer-privacy.spec.ts` — M.
- `tests/e2e/global-setup.ts` — M.
- `tests/e2e/product-route-proof.spec.ts` — M.
- `tests/integration/customer-auth.test.ts` — M.
- `tests/integration/customer-email-auth.test.ts` — M.
- `tests/integration/customer-internal-auth.test.ts` — M.
- `tests/integration/customer-privacy.test.ts` — M.
- `tests/integration/private-upload-route.test.ts` — M.
- `tests/unit/capability-resolver.test.ts` — M.
- `tests/unit/customer-email-auth.test.ts` — M.
- `tests/unit/customer-email-form.test.tsx` — M.
- `tests/unit/internal-google-consent-form.test.tsx` — M.
- `tests/unit/sitemap.test.ts` — M.
- `tests/unit/test-only-routes-fail-closed.test.tsx` — M.
- `.kiro/specs/niuva-keputusan-lanjutan/design.md` — baru.
- `.kiro/specs/niuva-keputusan-lanjutan/e2e-investigation.md` — baru.
- `.kiro/specs/niuva-keputusan-lanjutan/evidence.md` — baru.
- `.kiro/specs/niuva-keputusan-lanjutan/implementation-log.md` — baru.
- `.kiro/specs/niuva-keputusan-lanjutan/implementation-report.md` — baru.
- `.kiro/specs/niuva-keputusan-lanjutan/requirements.md` — baru.
- `.kiro/specs/niuva-keputusan-lanjutan/tasks.md` — baru.
- `prisma/migrations/20261005230000_customer_age_declaration/migration.sql` — baru.
- `src/modules/customer-auth/age-declaration.ts` — baru.
- `src/modules/files/content-inspection.ts` — baru.
- `tests/backend/cad-content-inspection.test.ts` — baru.
- `tests/backend/cad-upload-confirmation.test.ts` — baru.
- `tests/backend/customer-age-migration.test.ts` — baru.
- `tests/backend/r2-content-inspection.test.ts` — baru.
- `tests/integration/customer-auth-fixtures.ts` — baru.
- `tests/integration/sitemap-catalog.test.ts` — baru.
- `tests/unit/customer-age-declaration.test.ts` — baru.
