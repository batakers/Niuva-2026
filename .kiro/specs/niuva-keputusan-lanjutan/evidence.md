# Bukti awal — niuva-keputusan-lanjutan

Tanggal pemeriksaan: 5 Oktober 2026 menurut konteks waktu pengguna. Semua pemeriksaan di bawah read-only terhadap aplikasi/provider; mutasi lokal pada turn ini hanya branch baru dan empat dokumen spec. Tidak ada implementasi produk, migrasi, lint/test/build lokal baru atau perubahan acceptance.

Catatan lanjutan 6 Oktober 2026: paragraf di atas adalah batas bukti saat persiapan. Owner kemudian menginstruksikan implementasi. Hasil implementasi dan gate baru ada di [implementation-report.md](implementation-report.md), pembukuan di [implementation-log.md](implementation-log.md), dan diagnosis E2E di [e2e-investigation.md](e2e-investigation.md). Angka/temuan persiapan di bawah dipertahankan sebagai catatan bertanggal.

## 1. Git dan CI diperiksa langsung

| Pemeriksaan | Hasil |
| --- | --- |
| `git status --short --branch` sebelum persiapan | `main...origin/main`; working tree bersih |
| `git rev-parse HEAD` | `ae43fb93c8642741d166e23c621937ae283e8f0d` |
| GitHub API branch `main` | SHA yang sama dengan checkout |
| PR terbuka (`gh pr list --state open`) | 0 |
| [Quality untuk ae43fb9](https://github.com/batakers/Niuva-2026/actions/runs/37331063062) | `completed / success`, attempt **1**, job `Quality gates` success |
| [Quality ff58672](https://github.com/batakers/Niuva-2026/actions/runs/37286002533) | Status latest success; attempt 1 gagal pada `Browser E2E tests` |
| [Quality PR #41](https://github.com/batakers/Niuva-2026/actions/runs/37291522614) | Status latest success; attempt 1 gagal pada `Browser E2E tests`; head `c0b66040b2cbd561d6ea14b482d6e131d07bf7b2` |
| Branch untuk persiapan spec | `codex/niuva-keputusan-lanjutan`, dibuat dari ae43fb9 |

Status latest success dibaca dari GitHub saat turn ini. Itu bukti hasil run CI tersebut; tidak diklaim sebagai pelaksanaan ulang gate lokal, penerimaan visual, atau kesiapan production.

## 2. Kegagalan E2E yang dapat diverifikasi

Attempt 1 kedua run lama menunjukkan test `tests/e2e/product-route-proof.spec.ts:73` gagal pada tiga percobaan (awal + dua retry). Failure stack melewati `tests/e2e/helpers/readiness.ts:8`, `assertHomepageMedia()` pada baris 50, dan pemanggilan pada baris 102. Timeout test 30.000 ms terjadi ketika `locator.evaluate()` menunggu `HTMLImageElement.decode()`.

Log kedua run juga mengandung pesan server **`The destination stream closed early`**. Hubungan kausalnya dengan request gambar tertentu **belum terbukti**. Log tidak memberi media index, alt, currentSrc, status request, viewport gagal, atau pembagian waktu test yang cukup untuk menentukan penyebab.

Log menyebut path `test-results/...-retry1/trace.zip`, screenshot dan error-context. Akan tetapi API `/actions/runs/{id}/artifacts` untuk **37286002533 dan 37291522614 mengembalikan daftar kosong**. Trace tidak diunduh atau diinspeksi karena tidak tersedia. Workflow `.github/workflows/quality.yml` yang dibaca tidak mempunyai step upload artifact; file workflow tidak diubah.

`playwright.config.ts` menetapkan satu worker, retries CI 2, trace `on-first-retry`, dan CI webServer `next dev`. Test media tersebut melakukan beberapa navigasi/viewport sebelum decode. Maka timeout pada stack decode belum membuktikan optimizer lambat maupun ISR beranda bermasalah; deadline seluruh test dapat sudah terpakai oleh fase sebelumnya.

Status diagnosis: **penyebab belum terbukti**. Task 4 merinci reproduksi dan data yang dibutuhkan. Tidak ada rerun CI yang dipicu pada turn ini karena latest main sudah success.

## 3. Selisih penting terhadap handoff

1. **CI ae43fb9 sudah selesai dan lulus pada attempt 1.** Handoff masih menyebut hasilnya belum diketahui.
2. **`getAgeGateStatus()` belum ada dalam source/test.** Pencarian `rg` pada `src/` dan `tests/` tidak menemukan definisi/call. Nama itu muncul sebagai kontrak konseptual dalam dokumen. `resolver.ts` saat ini mempunyai `DEFAULT_POLICY_GATE_READER.getStatus()` yang selalu mengembalikan `{ closed: false }`; helper usia perlu dibuat, bukan dianggap existing.
3. **Denial signup tidak selalu `AGE_GATE_NOT_CLOSED`.** Policy gates hanya diwajibkan matrix pada staging/production; signup membutuhkan activation grant di semua tier, production modes tetap ditolak, dan resolver mempunyai precedence. Test baru harus mengikuti kode sebenarnya.
4. **Dokumen tanggal 5 Oktober sudah ada**, tetapi boundary/completion masih mendeskripsikan subset keputusan Tahap 12 dan state belum-commit sebelum merge. Keduanya belum menyelaraskan seluruh tambahan Owner di register #41. Tugas berikutnya memperbarui fakta relevan ketika ada hasil implementasi; tidak cukup mengganti tanggal.
5. **Terdapat 15 checkbox belum dicentang pada tasks lama**, termasuk indentasi subtask. Pencarian hanya `^- [ ]` akan menemukan tiga task induk dan melewatkan sisanya; verifikasi memakai whitespace-aware pattern. Status task lama tidak diubah pada turn ini.
6. **Dokumen Owner 3 Oktober masih memakai target semua usia**, sedangkan keputusan Owner 5 Oktober menetapkan 18+ self-declaration. Spec ini membawa keputusan terbaru yang disebut dalam handoff sambil menjaga rekonsiliasi dokumen sebelum aktivasi publik sebagai pekerjaan Owner terpisah.

## 4. Jalur sumber yang sudah diperiksa

- Usia/auth: `src/modules/customer-auth/{password-validation,email-service,email-repository,service,repository,internal-consent,internal-testing,legal}.ts`, komponen form/email/Google internal, route register dan OAuth, `src/modules/capabilities/{matrix,resolver,types}.ts`, tiga model consent/pending terkait di `prisma/schema.prisma`.
- `getCustomerAuthLegalDocuments()` memberikan policy internal atau fixture test terisolasi, dan mengembalikan null pada ordinary runtime normal. Spec tidak mengubahnya menjadi dokumen publik yang dianggap sah.
- Unggahan: `src/modules/files/{upload-service,repository,r2,download-service}.ts`. Confirmation saat ini memakai HEAD lalu checksum opsional dari interface storage; implementasi R2 mempunyai streaming checksum tetapi belum pemeriksa konten. Field extension sudah ada di schema, belum dipilih pada confirmation projection.
- Sitemap: `src/app/sitemap.ts`, `tests/unit/sitemap.test.ts`, `getLiveShopProducts()` pada `src/features/frontend-preview/server.ts`, `CatalogRepository` dan runtime visibility. Jalur baca katalog publik sudah ada; komentar sitemap bahwa belum ada jalur baca tersebut tertinggal.
- UI/authority: root `AGENTS.md`, `DESIGN.md`, addenda auth/internal/public PRD dan Tech Design, dokumen public readiness/runtime contract, register keputusan dan dua laporan spec lama. Tidak ditemukan child `AGENTS.md` applicable pada path folder spec baru.
- Panduan Next terpasang dibaca untuk sitemap, caching tanpa Cache Components, route handler dan Image; versi `next` 16.3.2 dan `prisma` 7.10.0 diperiksa dari manifest. Tidak ada dependency ditambahkan.

## 5. Perintah dan validasi turn persiapan

Pemeriksaan memakai `git status`, `git rev-parse`, `git log`, `git remote get-url`; `gh run list`, `gh run view --json`, `gh run view --attempt 1 --log-failed`, `gh pr list`, dan GitHub API untuk branch/artifact. Pembacaan repo memakai `rg` serta pemrosesan file terpilih melalui context-mode. Hanya ringkasan kegagalan teknis yang diambil dari log; secret/private payload tidak disalin ke spec.

Branch dibuat dengan `git switch -c codex/niuva-keputusan-lanjutan`. Empat dokumen baru ditulis melalui patch. Validasi dokumen selesai dengan hasil berikut:

- **12 rujukan Markdown lokal** diperiksa; tidak ada target yang hilang.
- **26 requirement ID** unik: AGE 9, FILE 7, MAP 5, E2E 5. Mapping ke task ditinjau seperti tabel di bawah.
- **5 task implementasi / 30 langkah**, seluruh checkbox implementasi masih belum dicentang; tidak ada klaim implementasi selesai.
- `git diff --check` tidak melaporkan masalah pada tracked diff; pemeriksaan terpisah pada empat file baru juga tidak menemukan trailing whitespace, placeholder yang belum diisi, atau karakter encoding rusak.
- `git status --porcelain=v1 --untracked-files=all` menunjukkan tepat empat file baru di folder spec ini. Tidak ada perubahan tracked, kode produk, protected path, schema atau dokumen Owner.
- Calon nama migrasi dalam design belum ada pada baseline; tidak ada migrasi yang dibuat atau dijalankan dalam turn ini.

| Requirement | Task pemilik | Bukti yang diminta saat implementasi |
| --- | --- | --- |
| AGE-01–07, AGE-09 | Task 1 | Schema/form, negative POST/service/proof, persistence, lifecycle, gate regression, browser route |
| AGE-08 | Task 1 dan 5 | Hasil kontrol dan catatan implementasi/register dengan keputusan Owner yang sudah ada |
| FILE-01–07 | Task 2 | Fixture format/ukuran/stream, inspector wajib, kedua caller, regresi private access/retensi |
| MAP-01–05 | Task 3 | Unit sitemap, jalur katalog nyata, fallback independen dan build tanpa DB |
| E2E-01–05 | Task 4 | Log/artifact availability, trace yang benar-benar dihasilkan, timeline dan kesimpulan yang dibatasi bukti |
| Batas dan laporan keseluruhan | Task 5 | Gate aktual, diff allowlist, cleanup serta penerimaan/production boundary |

Angka gate lokal 85/1190, 68/496, 19/105 dan E2E 109/5 skip pada handoff tetap **laporan historis**, bukan hasil ulang turn ini. Tidak perlu menjalankan aplikasi/database untuk memvalidasi perubahan empat dokumen ini.

## 6. Risiko dan batas yang tetap berlaku

- Self-declaration tidak membuktikan usia. Kontrol belum diimplementasikan/diuji; RK-02/RK-03 tetap belum tertutup pada persiapan ini.
- Pemeriksaan 3MF berupa header ZIP tidak membuktikan adanya model 3MF atau keamanan archive. Semua pemeriksa prefix tidak memvalidasi keseluruhan geometri atau malware.
- Format teks dengan header/comment di luar 64 KiB dapat ditolak oleh rancangan ringan; pengujian perlu memperlihatkan batasnya dengan jujur.
- Inspeksi memerlukan baca server atas objek sampai selesai untuk hash. Dampak latensi/R2 belum diukur pada provider nyata.
- Sitemap memakai cadence 300 detik, sehingga perubahan publikasi tidak langsung terlihat sebelum regenerasi.
- Trace CI lama tidak tersedia; diagnosis E2E belum menentukan root cause.
- Risiko outbox email, job terjadwal, refund, JavaScript checkout, halaman audit admin, dan rate limit per proses tetap mengikuti spec lama; tidak ditangani di slice ini.
- Visual **belum ditinjau**. Perangkat fisik, screen reader/AT, hosted Clerk, provider, staging dan production **tidak terverifikasi**. `PUB-RELEASE` tetap **`NOT_AUTHORIZED`**.

Rollback persiapan tidak membutuhkan perubahan runtime/database. Empat file baru dan branch belum di-commit; penghapusan atau pembuangan tetap mengikuti instruksi eksplisit Owner. Pada implementasi nanti, rollback kode dapat membiarkan kolom nullable aditif tetap ada; tidak membuat migration down yang destruktif.
