# Kontrak object storage Niuva

**Keputusan:** 22 Oktober 2026, instruksi Owner untuk migrasi dari R2 ke
S3-compatible Object Storage. Provider final belum dipilih. Kontrak ini
memperbarui pemilihan provider pada Tech Design tanpa mengubah scope produk,
izin aktivasi, atau lifecycle binary yang sudah disetujui.

## Pemetaan backlog dan urutan

[TASKS.md](../../TASKS.md) tetap satu-satunya backlog aktif. Tidak ada ID baru.

| Urutan | Task existing | Perubahan/bukti dalam cakupan storage |
| --- | --- | --- |
| 1 | T03 — Kontrak hosted sandbox | Konfigurasi S3, startup/capability, region/addressing dan CSP konsisten; konfigurasi ambigu ditolak. Resource/grant/provider hosted tetap terblokir. |
| 2 | T18–T19 — Upload/editor media Admin | Adapter yang sama untuk quarantine privat dan publikasi ke bucket terpisah; intent/confirm, validasi gambar, ownership, renderer dan media statis dipertahankan. Bukti browser/provider hosted tetap diperlukan. |
| 3 | T08 — Retensi file Customer, bergantung T03 | Job PR #58 sudah ada di `main` dan tetap menjadi otoritas lifecycle. Port `deleteObject` mempertahankan AbortSignal dan failure; handler memakai adapter S3. Uji job/adapter lokal dicatat terpisah dari proof provider, role dan scheduler hosted. |
| 4 | T33–T34 — BUY/MAKE staging | Ulangi bukti terpadu setelah provider/resource, policy dan dependensi transaksi existing siap. |
| 5 | T38 — Backup/restore; T40 — Rilis | Verifikasi inventaris/copy objek dan recovery di bawah izin yang relevan. Tidak ada cutover, penghapusan sumber, deployment atau aktivasi pada implementasi lokal ini. |

Tahap 2 dan persiapan tahap 3 dapat diuji lokal setelah kontrak tahap 1 jelas,
sesuai ROADMAP. Status hosted yang terblokir tidak berubah menjadi DONE hanya
karena adapter dan fixture lokal lulus.

## Arsitektur dan batas data

`lib/env/server` memvalidasi input Zod; `lib/env/object-storage` menormalisasi
satu konfigurasi storage. Resolver capability dan guard non-production tetap
menjadi prasyarat. Service file/keuangan memakai adapter S3 melalui port
`PrivateObjectStorage`; service media publik mempertahankan `PublicMediaStorage`.
AWS SDK v3 yang sudah ada di manifest menangani protokol S3 dan SigV4 melalui
`modules/providers/s3`. Tidak ada dependency baru.

Tidak ada schema/migration baru, perubahan data historis, ID file, bucket scope,
storage key, ownership, route API, atau state bisnis. URL provider hanya dibuat
saat diperlukan; database tetap menyimpan key dan scope yang dikendalikan server.
Renderer media publik tetap memakai route aplikasi, bukan URL provider baru
yang dikirim browser sebagai sumber otoritatif.

## Konfigurasi server

Semua nama di bawah bersifat server-only, tanpa awalan `NEXT_PUBLIC_`.

| Variabel | Kontrak |
| --- | --- |
| `S3_ENDPOINT` | Wajib: origin HTTPS tanpa kredensial, path, query atau fragment. HTTP hanya diterima untuk `localhost`, `127.0.0.1`, atau `[::1]` pada fixture lokal; origin HTTP tidak ditambahkan ke CSP browser. |
| `S3_REGION` | Wajib dan eksplisit: signing region dari dokumentasi provider. `auto` boleh dipilih bila provider tersebut mendukungnya; bukan default lintas provider. |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Wajib; diteruskan eksplisit ke SDK. Tidak memakai kredensial default dari proses atau cloud account. |
| `S3_SESSION_TOKEN` | Opsional untuk kredensial sementara; berasal dari namespace/config yang sama. |
| `S3_PRIVATE_BUCKET`, `S3_PUBLIC_BUCKET` | Wajib dan berbeda; nama DNS 3–63 karakter. Bucket privat menampung file Customer, bukti finansial privat yang berizin, serta prefix quarantine Admin yang terpisah. Public media tidak boleh memakai key Customer. |
| `S3_FORCE_PATH_STYLE` | Opsional `true`/`false`; default `true` untuk endpoint kustom dengan satu origin. `false` mengizinkan virtual hosting sesuai SDK; bucket bertitik melalui HTTPS dan endpoint IP tetap memakai path. CSP mengikuti origin signed PUT bucket privat yang sebenarnya, tanpa wildcard. |
| `CUSTOM_FILE_MAX_BYTES` | Tetap `104857600` bila upload privat diaktifkan. Storage lengkap saja tidak membuka capability upload tanpa batas yang disetujui dan database. |

Semua variabel storage boleh kosong untuk mode tanpa storage. Satu field S3
terisi mengharuskan enam field wajib lengkap, termasuk jika yang diisi hanya
opsi boolean/session token. Partial config, endpoint tidak aman, bucket sama,
atau campuran field S3/R2 menghentikan startup; diagnostik hanya berisi nama
variabel/counter aman, tanpa nilai kredensial.

Kompatibilitas transisi menerima keenam field lama `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_PRIVATE_BUCKET`,
`R2_PUBLIC_BUCKET` jika seluruh `S3_*` kosong. Konfigurasi lama diterjemahkan
ke region `auto` dan path style agar origin signed PUT sama dengan origin CSP.
Entry point lama `modules/files/r2` meneruskan ke adapter generik untuk caller
lama; service runtime aktif memakai `modules/files/s3`. Tidak ada account ID
Cloudflare pada kontrak S3 baru. Jangan mengisi satu namespace memakai field
yang hilang dari namespace lainnya.

Konfigurasi tidak memberikan aktivasi. Penolakan `NODE_ENV=production`, mode
live/production, resource tidak terpasang, serta staging tanpa grant existing
tetap dipertahankan. Pemilihan provider tidak mengubah matriks/grant tersebut.

## Invariant keamanan yang dipertahankan

- File Customer tetap privat, dengan key acak server, token upload terikat
  hash/owner, dan permission download melalui service/repository yang sama.
  Caller upload memakai masa berlaku 10 menit; download privat memakai 5 menit
  dan adapter menolak download di atas 15 menit.
- Konfirmasi memeriksa metadata aktual, batas 100 MiB, format CAD yang diizinkan,
  satu inspeksi stream terbatas, ukuran dan SHA-256. Batas referensi/foto serta
  bukti finansial mengikuti policy existing; bukti finansial tidak dijadikan
  file Customer yang boleh dihapus oleh retensi biasa.
- Public media tetap JPEG/PNG/WebP maksimal 10 MiB, maksimal 12/gallery,
  signed quarantine PUT 10 menit dengan deklarasi Content-Length. Server
  memverifikasi gambar sebelum menulis snapshot ke bucket publik dengan
  `If-None-Match: *`; penolakan dibersihkan dari quarantine.
- SDK memakai `requestChecksumCalculation: WHEN_REQUIRED`. Signed browser PUT
  tidak memuat checksum otomatis untuk body kosong sebelum file tersedia.
  Pemeriksaan konten, ukuran dan SHA-256 aplikasi saat konfirmasi tetap berlaku;
  opsi checksum SDK tidak menggantikan pemeriksaan tersebut. Content-Type
  diikat eksplisit ke signature PUT; upload media juga mengikat Content-Length.
  Publikasi snapshot server memakai Content-MD5 untuk pemeriksaan integritas
  transport ketika checksum CRC32 opsional SDK tidak dipaksakan ke provider.
- `deleteObject` menunggu respons storage, meneruskan AbortSignal ke SDK,
  serta meneruskan error kepada caller.
  Tidak ada penandaan DELETED, retry bisnis atau deadline baru di adapter.
  Lifecycle 14/60/90, hold, bukti finansial, DELETE_PENDING/lease dan finalisasi
  tetap milik implementasi T08 dari PR #58. Deadline dua detik milik job tetap
  dipertahankan; timeout/pasca-I/O yang belum terkonfirmasi tetap pending dan
  diulang dengan key yang sama. Factory storage tetap dibangun hanya pada
  execute yang sah; dry-run/inspect tidak memerlukan koneksi storage.

## Gate provider, pemindahan data dan rollback

T03 memerlukan provider sandbox yang dipilih, endpoint/region/addressing,
bucket/credential terisolasi, TLS, akses privat dan proteksi data at rest,
least-privilege prefix, binding dan izin resource. Smoke provider harus
membuktikan SigV4 signed PUT/GET, Content-Type/Length, HEAD, streaming bounded,
error dan DELETE, serta Content-MD5/conditional publish `If-None-Match` pada media publik.
Fixture lokal tidak membuktikan implementasi provider. Atur CORS pada origin
aplikasi yang disetujui dan header PUT yang diperlukan; jangan membuka wildcard
CSP atau memberi anonymous read pada bucket privat. Bucket media dapat tetap
privat pada provider karena renderer aplikasi membaca melalui adapter server.

Sebelum mengganti konfigurasi target, inventaris seluruh key privat/publik dan
quarantine; salin lalu cocokkan bytes, metadata dan checksum dengan record DB.
Key dan bucket scope tetap sama. Uji file existing dan file baru, hak akses,
URL expiry, publish serta failure path pada target. Jangan menganggap ETag
sebagai SHA-256 konten. Perpindahan harus menangani upload/konfirmasi yang
masih berjalan dan URL yang masih berlaku; konfigurasi saja tidak memindahkan
objek, dan pergantian endpoint terlalu awal akan memutus download existing.

T08/T38 juga memerlukan keputusan/proof untuk versioning, object lock, hold,
penghapusan aktual, backup dan recovery. Lifecycle otomatis provider tidak
boleh melewati hold, retensi yang disetujui, atau proteksi bukti finansial.
Tujuan recovery Owner dan izin pemindahan/penghapusan eksternal tetap terbuka.

Rollback adapter S3 tidak membutuhkan rollback schema dan harus tetap
mempertahankan guard retensi T08 yang sudah ada di `main`. Sebelum cutover yang kelak
diizinkan, pertahankan objek sumber dan catat konfigurasi sumber secara aman;
rollback konfigurasi harus memakai satu namespace lengkap serta menangani
objek baru/URL aktif agar data target tidak tertinggal. Jangan menghapus sumber
atau menjalankan cutover/rollback resource tanpa instruksi eksplisit.

Rujukan SDK: [konfigurasi client v3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-client-constructors.html),
[checksum S3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-checksums.html),
[Content-MD5 dan conditional PUT](https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html),
[path dan virtual hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html).
Bukti eksekusi dan blocker bertanggal dicatat di TASKS.md.
