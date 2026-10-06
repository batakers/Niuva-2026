# Design — niuva-keputusan-lanjutan

Status: **rancangan yang diimplementasikan pada 6 Oktober 2026**. Bukti kode/gate serta adaptasi prosedur ada di [implementation-report.md](implementation-report.md) dan [implementation-log.md](implementation-log.md). Baca [requirements.md](requirements.md), [tasks.md](tasks.md), dan [evidence.md](evidence.md) bersama dokumen ini.

Empat irisan dikerjakan dan diuji secara mandiri. Pilihan teknis mengikuti jalur existing; tidak membangun ulang auth, upload, katalog, atau harness.

## 1. Kontrol usia pada pembuatan akun

### Alur dan data

Email: checkbox terpisah → `registrationSchema` → `CustomerEmailService.register()` → pending registration berisi bukti server → `consumeVerification()` memeriksa dan menyalin bukti pada transaksi pembuatan akun/consent.

Google internal: checkbox terpisah → `InternalGoogleConsentService.accept()` memvalidasi input → proof terikat allowlist email → callback dengan PKCE/state → repository memeriksa versi, waktu, expiry, identitas dan penggunaan proof → konsumsi proof serta akun/consent secara atomik.

Ordinary Customer: runtime saat ini tidak mempunyai dokumen consent publik yang berlaku. Pertahankan denial pembuatan akun baru, termasuk callback Google tanpa proof. Slice ini tidak menyediakan route consent Google publik atau activation grant. Login akun existing melewati branch signup tanpa menuntut deklarasi ulang.

Tambahkan pasangan field nullable **`ageDeclarationVersion: String?`** dan **`ageDeclaredAt: DateTime?`** pada `CustomerPendingRegistration`, `CustomerInternalGoogleConsent`, dan `CustomerConsent`. Map database: `age_declaration_version`, `age_declared_at`; waktu menggunakan `@db.Timestamptz(6)` mengikuti record existing. Hanya migrasi baru aditif; tanpa backfill/default. Field mengikuti lifecycle/retensi record induknya, tidak menciptakan masa simpan baru.

Versi teknis: **`AGE-18-SELF-DECLARATION-2026-10-05-v1`**. Identifier ini membedakan teks deklarasi teknis; bukan versi dokumen legal resmi. Waktu memakai server clock yang dapat di-inject dalam test. Pending/proof tanpa kedua field yang valid tidak membuat akun; login akun existing tetap memakai contract saat ini.

### Interface yang direncanakan

Buat `src/modules/customer-auth/age-declaration.ts` sebagai helper murni tanpa akses DB/provider:

```ts
export const AGE_DECLARATION_VERSION = "AGE-18-SELF-DECLARATION-2026-10-05-v1";
export const AGE_DECLARATION_LABEL = "Saya menyatakan bahwa saya berusia 18 tahun atau lebih.";
export const ageDeclarationSchema: z.ZodLiteral<"on">;
export type RecordedAgeDeclaration = Readonly<{
  ageDeclarationVersion: string | null;
  ageDeclaredAt: Date | null;
}>;
export function assertRecordedAgeDeclaration(
  declaration: RecordedAgeDeclaration,
  now: Date,
): void;
export function getAgeGateStatus(): Readonly<{
  closed: boolean;
  minimumAge: 18;
  method: "SELF_DECLARATION";
  version: typeof AGE_DECLARATION_VERSION;
}>;
```

Validasi record menerima hanya versi yang berlaku dan tanggal valid yang tidak berada di masa depan. Expiry dan keterikatan identitas tetap diperiksa oleh alur pending/proof existing. Helper tidak menyatakan umur faktual terverifikasi.

`registrationSchema` menambahkan `ageDeclaration: ageDeclarationSchema`. Route email membawa raw input ke service seperti sekarang. Untuk consent Google internal, ubah `accept(raw: unknown, now?: Date): Promise<string>` supaya direct service call juga tervalidasi; route mengurus origin, bounded body, response dan cookie.

`CustomerAuthRepository.upsertGoogleCustomer()` memeriksa bukti pada **branch pembuatan akun** dalam transaksi existing. Proof internal existing menjadi sumber deklarasi. `allowCreate = true` atau identitas Google yang valid saja tidak cukup bagi branch ordinary yang belum mempunyai proof server. Jangan memindahkan aturan kelayakan akun ke callback route atau memercayai age flag di query.

`DEFAULT_POLICY_GATE_READER` tetap menolak `PUB-POLICY` dan gate lain yang belum ditutup. Integrasi `PUB-AGE` memakai helper baru setelah seluruh kontrol akun baru teruji. Jangan mengubah `CAPABILITY_MATRIX`, menambahkan live mode, atau mengisi grant. Test harus menunjukkan bahwa menutup kontrol usia tidak mengaktifkan signup; production denial dapat mendahului pemeriksaan age sesuai precedence resolver.

### File pemilik

- Schema/migrasi baru: `prisma/schema.prisma`, `prisma/migrations/20261005230000_customer_age_declaration/migration.sql`. Nama tersebut adalah calon migrasi baru; pastikan tidak bentrok saat implementasi.
- Schema/helper/service: `src/modules/customer-auth/password-validation.ts`, helper baru di atas, `email-service.ts`, `internal-consent.ts`.
- Repository: `src/modules/customer-auth/email-repository.ts`, `src/modules/customer-auth/repository.ts`.
- UI: `src/components/niuva/customer-email-form.tsx`, `src/components/niuva/internal-google-consent-form.tsx`. Tambahkan kontrol/error dalam form existing; tidak membuat halaman preview.
- Boundary Google internal: `src/app/api/auth/internal/google-consent/route.ts`. Callback hanya disesuaikan bila interface proof existing membutuhkannya; tidak menerima pernyataan usia langsung.
- Gate: `src/modules/capabilities/resolver.ts`.

## 2. Inspeksi stream unggahan

`normalizePrivateFile()` tetap memeriksa nama/ekstensi/MIME/ukuran intent. `findForUploadConfirmation()` perlu ikut memilih `extension`, yang sudah ada di database. Tidak perlu perubahan schema berkas.

Tambahkan interface berikut pada `src/modules/files/r2.ts`:

```ts
export type ObjectContentInspection = Readonly<{
  prefix: Uint8Array;
  sha256: string;
  sizeBytes: number;
}>;
// Method required pada PrivateObjectStorage; implementasi CAD tidak boleh bypass.
inspectObject(key: string, maxBytes: number): Promise<ObjectContentInspection>;
```

R2 mengalirkan satu `GetObjectCommand` melalui SDK existing. Simpan paling banyak 65.536 byte prefix, hitung byte dan SHA-256 selama stream, hentikan bila batas terlampaui, dan tutup stream pada error. Jangan mengunduh lewat signed URL publik atau menampung seluruh berkas di memori. Method checksum existing tetap tersedia untuk caller lama; konfirmasi CAD tidak membuat GET kedua hanya untuk hash.

Buat `src/modules/files/content-inspection.ts`:

```ts
export type CadFileExtension = "stl" | "obj" | "3mf" | "step" | "stp";
export function isCadFileExtension(extension: string): extension is CadFileExtension;
export function assertCadContent(
  extension: CadFileExtension,
  inspection: ObjectContentInspection,
): void;
```

Helper memeriksa prefix terhadap ekstensi dan ukuran stream. `confirmUpload()` menjalankan authorization/token dan HEAD existing, kemudian inspector wajib untuk CAD, verifikasi ukuran/checksum, helper format, baru `markUploadedIfPending()`. Validasi gagal memakai `UPLOAD_REJECTED` dan `rejectAndDelete()` existing. Tidak mengubah download permission, TTL, retensi, atau alur review operator.

| Format existing | Identifikasi ringan yang direncanakan | Batas yang harus dijelaskan |
| --- | --- | --- |
| STL binary | Prefix minimal 84 byte; triangle count little-endian pada offset 80; ukuran stream tepat `84 + 50 * count` | Header tidak mempunyai magic tetap; awal `solid` tidak cukup untuk membedakan binary dari ASCII. Tidak memvalidasi setiap facet/geometri. |
| STL ASCII | Setelah BOM/whitespace, awal `solid` dan record `facet normal` numerik pada prefix | Teks `solid` saja ditolak; bukan pembuktian seluruh mesh lengkap/manifold. |
| OBJ | Prefix teks tanpa NUL, abaikan comment/blank line, kenali record vertex `v` dengan tiga koordinat numerik | Tidak memuat file MTL, mengikuti external path, atau membuktikan seluruh face. Comment sangat panjang sebelum vertex dapat gagal pada batas prefix. |
| STEP/STP | Setelah BOM/whitespace, marker pembuka `ISO-10303-21;` dan bagian `HEADER;` | Mengidentifikasi exchange file teks; tidak menilai entity CAD atau menambahkan dukungan STEP archive. |
| 3MF | Awal local ZIP file header `50 4B 03 04` | Hanya mengidentifikasi kontainer. ZIP lain yang diganti ekstensi dapat lolos; payload model, OPC relationship, ZIP64 dan keamanan archive tidak dibuktikan. |

Kriteria merupakan **rancangan pemeriksa ringan Niuva**, bukan klaim seluruh format divalidasi. Referensi teknis: [STL binary, Library of Congress](https://www.loc.gov/preservation/digital/formats/fdd/fdd000505.shtml), [OBJ, Library of Congress](https://wwws.loc.gov/preservation/digital/formats/fdd/fdd000507.shtml), [STEP Part 21, STEP Tools](https://www.steptools.com/docs/roselib/read_write.html), dan [3MF Core, bagian Package](https://github.com/3MFConsortium/spec_core/blob/master/3MF%20Core%20Specification.md). Pemeriksaan OPC/payload atau antivirus yang lebih kuat memerlukan scope lanjutan; tidak ditambahkan diam-diam pada RK-12.

PNG/JPEG mengikuti jalur existing dan regresinya tetap diuji. Semua storage test double yang memenuhi `PrivateObjectStorage` harus menyediakan inspector yang jujur; inspector hilang saat runtime CAD harus menolak, bukan jatuh kembali ke HEAD/hash saja.

## 3. Sitemap katalog

Tetap gunakan `src/app/sitemap.ts`. Import `getLiveShopProducts` bersama `getProjectPreview`. Sesudah origin valid, kedua pembacaan boleh berjalan paralel dengan catch independen. Bangun static/service entries terlebih dahulu; tambah project detail-ready dan produk hasil katalog. Encode slug dan cegah URL duplikat dengan key URL yang sama tanpa mengubah urutan static entries.

Adapter katalog existing adalah batas published/runtime visibility; sitemap tidak menambahkan filter stok atau mengambil `CatalogRepository` langsung. Jangan memakai jalur `getShopPreview` yang dapat memasukkan scenario fixture. Build tanpa DB dan origin invalid harus tetap mengikuti fallback existing.

Pertahankan literal ISR 300 detik. Tidak ada `cookies()`, `headers()`, `connection()`, timestamp dibuat-buat, atau dependency baru. Hapus komentar lama bahwa jalur katalog publik belum ada ketika implementasi selesai. Invalidasi langsung melalui aksi admin tidak termasuk slice ini; published/unpublished berubah pada regenerasi berikutnya.

Panduan Next **16.3.2 yang terpasang** sudah dibaca untuk rancangan: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md`, `01-app/02-guides/caching-without-cache-components.md`, `01-app/01-getting-started/15-route-handlers.md`, dan `01-app/03-api-reference/02-components/image.md`. Baca ulang bagian relevan ketika implementasi jika dependency/check-out berubah.

## 4. Investigasi E2E

Baseline menunjukkan satu test berisi beberapa viewport/navigasi dan dua pemeriksaan media. Batas 30 detik berlaku bagi **seluruh test**, sehingga stack di decode belum membuktikan decode sendiri menghabiskan 30 detik. Kemungkinan biaya akumulasi test, optimizer request, media origin dan decode harus dipisahkan oleh timeline.

Trace gagal tidak tersedia sebagai GitHub artifact; workflow saat ini tidak mempunyai step upload artifact. Reproduksi lokal dapat menyalakan trace dengan CLI tanpa mengedit workflow, misalnya:

```powershell
corepack pnpm exec playwright test tests/e2e/product-route-proof.spec.ts --grep "named responsive and semantic proof" --trace on --workers=1
```

Gunakan port/harness/database test existing. Diagnosis tambahan dapat dibuat pada helper/test dengan attachment JSON berisi data media publik yang dibatasi: fase, elapsedMs, viewport, index, alt, pathname currentSrc, complete, dimensi dan status HTTP. Jangan serialize browser storage, headers/cookie, atau query URL. Pertahankan assertion count 3, positive dimensions, nonempty alt, route semantics, dan keyboard.

Korelasikan `The destination stream closed early` dengan request/timeline tertentu sebelum menyebutnya penyebab. Bandingkan test terarah dan rangkaian penuh. Jika pengaruh ISR dicurigai, pembandingan server produksi lokal adalah eksperimen terpisah setelah build, tidak disimpulkan dari server dev CI.

Deliverable task investigasi tetap berguna ketika reproduksi lulus: bukti yang diperiksa, ketersediaan artifact, hipotesis, dan data yang masih diperlukan. Perbaikan test/runtime bergantung pada hasil diagnosis; jangan menetapkan eager loading, unoptimized image, split test, retry, atau timeout sebagai solusi sebelum bukti.

## 5. Penutupan dan rollback

Saat implementasi selesai, catat hasil aktual per slice dan perbarui register/boundary/completion di **folder spec lama** jika dibutuhkan untuk menyelaraskan fakta. Jangan mengubah dokumen Owner di `docs/` melalui task ini atau menganggap penerimaan visual/staging/provider otomatis selesai.

Rollback kode memakai perubahan terarah pada slice yang bermasalah setelah instruksi Owner. Bila migrasi aditif sudah diterapkan, aplikasi lama dapat mengabaikan kolom nullable; tidak perlu DROP atau mengedit migrasi lama. Jangan mengklaim restore database/provider sudah teruji. Rancangan spec sendiri tidak membutuhkan rollback aplikasi karena belum mengubah runtime.
