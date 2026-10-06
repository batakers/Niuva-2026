# Requirements — niuva-keputusan-lanjutan

Tanggal spec: 5 Oktober 2026. Implementasi diinstruksikan Owner pada 6 Oktober 2026; hasil dan batas verifikasi ada di [implementation-report.md](implementation-report.md).

Owner memilih **Spec kode kecil** setelah handoff `niuva-audit-remediation`, kemudian menginstruksikan pelaksanaannya melalui Superpowers. Scope meliputi requirements, rancangan, kode, tests, investigasi, dan laporan. Instruksi ini tidak dianggap instruksi commit, push, rilis, atau aktivasi signup.

Tujuan: menerapkan keputusan RK-02, RK-12, dan RK-18 pada alur yang ada, serta menyelidiki kegagalan E2E gambar berdasarkan bukti. Metode 18+ berasal dari keputusan Owner 2026-10-05; agent tidak memilih metode atau nilai bisnis baru.

| Dokumen | Isi |
| --- | --- |
| [design.md](design.md) | Alur, batas tanggung jawab, interface, dan perubahan yang direncanakan |
| [tasks.md](tasks.md) | Task yang bisa dijalankan dan diverifikasi satu per satu |
| [evidence.md](evidence.md) | Git/CI yang diperiksa langsung, selisih handoff, dan batas diagnosis |

## 1. Otoritas dan batas

- Ikuti [AGENTS.md](../../../AGENTS.md), [DESIGN.md](../../../DESIGN.md), PRD/Tech Design beserta addenda, dan [register keputusan](../niuva-audit-remediation/register-keputusan.md).
- Instruksi Owner 5 Oktober tentang **18+ dengan pernyataan usia** menjadi arah slice ini. PRD/Tech Design dan dokumen legal 3 Oktober masih menyebut semua usia; rekonsiliasi dokumen Owner diperlukan sebelum aktivasi publik, dan tidak dilakukan melalui edit diam-diam di spec ini.
- Pertahankan allowlist internal Development, fixture test terisolasi, Customer biasa, dan Clerk Owner/Admin sebagai batas yang berbeda. Login akun yang sudah ada tetap mengikuti kontraknya.
- `PUB-POLICY`, activation grant signup, mode/tier provider, dan `PUB-RELEASE = NOT_AUTHORIZED` tetap menjadi batas terpisah dari kontrol usia.
- Tidak mengubah `.env*`, `.github/workflows/`, `vercel.json`, dependency, migrasi yang sudah ada, atau dokumen Owner di `docs/`. Tidak menghapus file/tabel/data atas inisiatif agent.
- Business rule berada di service; repository menangani database; route hanya menangani request/response. Semua input server tervalidasi Zod; TypeScript strict tanpa `any`.
- Perubahan schema yang direncanakan hanya aditif dan nullable untuk bukti pernyataan usia. Tidak ada default yang menyatakan akun lama sudah menyetujui.
- Implementasi berikutnya perlu instruksi implementasi untuk spec ini. Setelah instruksi tersebut diberikan, tidak diperlukan approval berulang untuk setiap file atau lapisan dalam scope yang sama.

## 2. RK-02 — pernyataan usia 18+

**AGE-01.** Pendaftaran Customer yang tersedia dalam konteks internal/test menampilkan checkbox terpisah, awalnya tidak dicentang, dengan teks **“Saya menyatakan bahwa saya berusia 18 tahun atau lebih.”** Persetujuan policy tetap terpisah. Tidak meminta tanggal lahir, identitas resmi, biometrik, atau vendor verifikasi.

**AGE-02.** Input form `ageDeclaration` harus tepat string `"on"`. Nilai hilang, `"off"`, `"false"`, boolean, atau bentuk lain ditolak oleh schema/service sebelum record pendaftaran, proof OAuth, email, atau sesi baru dibuat. Validasi native browser tidak menggantikan validasi server.

**AGE-03.** Server menetapkan versi pernyataan dan waktu deklarasi; nilai tersebut tidak diambil dari hidden field atau parameter callback. Bukti minimum disimpan bersama pending registration/proof Google, lalu bersama consent akun baru dalam transaksi yang sudah ada.

**AGE-04.** Pendaftaran email diverifikasi hanya jika pending record mempunyai bukti usia versi yang berlaku. Pending record lama tanpa bukti tidak dapat menyelesaikan pembuatan akun; Customer mendapat jalur memulai pendaftaran kembali. Akun yang sudah terbentuk tidak diberi bukti palsu atau dipaksa mendaftar ulang oleh perubahan ini.

**AGE-05.** Akun Google baru memerlukan proof usia server yang belum kedaluwarsa, belum dipakai, dan terikat pada identitas/proof pendaftaran yang diperiksa repository. Checkbox, query string, atau cookie deklarasi yang dibuat sendiri tidak cukup. Alur internal memakai proof consent internal yang sudah ada; ordinary Google signup tetap tidak tersedia pada runtime normal. Direct callback dan direct service call tanpa proof tidak membuat akun baru.

**AGE-06.** Pertahankan PKCE/state, konsumsi proof secara atomik, lifecycle serialization, closure fence, closed-business marker, dan larangan mengambil kembali riwayat yang telah dilepas hanya karena email sama. Login Google akun yang sudah ada tidak diperlakukan sebagai signup baru.

**AGE-07.** `getAgeGateStatus()` belum ada dalam source baseline dan perlu dibuat. Integrasi dengan pembaca gate hanya boleh menyatakan kontrol usia selesai setelah AGE-01–06 teruji. Pembaca gate lain, matriks capability, dan activation grant tidak dilonggarkan. `decide("signup")` tetap menolak pada konfigurasi runtime yang ada; alasan penolakan mengikuti urutan resolver, bukan diasumsikan selalu `AGE_GATE_NOT_CLOSED`.

**AGE-08.** Bukti implementasi dan hasil pengujian ditambahkan ke spec/register tanpa meminta ulang pilihan metode yang sudah diberikan Owner. Status RK-02/RK-03 mengikuti syarat penutupan register; penulisan spec ini sendiri tidak menutupnya. Pernyataan usia tetap **self-declaration**, tanpa klaim usia terverifikasi.

**AGE-09.** Form memakai token/typography existing. Label, error dekat field, fokus keyboard, submit ganda, desktop/mobile, dan reduced motion diperiksa pada route sebenarnya. Penerimaan visual tetap **belum ditinjau** sampai Owner menerima.

## 3. RK-12 — pemeriksaan lokal ringan berkas CAD/3D

**FILE-01.** Pemeriksaan berlaku pada ekstensi existing `stl`, `obj`, `3mf`, `step`, `stp`. Jangan menambah tipe baru atau memperlakukan PNG/JPEG referensi sebagai berkas CAD. Pertahankan pasangan ekstensi/MIME existing dan batas binary **100 MiB** dari `CUSTOM_FILE_MAX_BYTES`.

**FILE-02.** Konfirmasi membaca byte objek dari storage privat di server. SHA-256, ukuran aktual, dan prefix untuk identifikasi dihitung dari satu pembacaan stream. Jangan mempercayai metadata browser atau memperlakukan SHA-256 sebagai pemeriksaan format.

**FILE-03.** Prefix maksimal **64 KiB** adalah batas buffer pemeriksaan teknis, bukan perubahan batas upload. Total stream tetap dibatasi 100 MiB. Format yang belum dapat dikenali dari prefix ditolak dengan alasan generik; keterbatasan ini dicatat dan diuji.

**FILE-04.** Pemeriksa mengikuti kriteria ringan di `design.md`: STL ASCII/binary, marker STEP/STP, struktur baris OBJ, dan header kontainer ZIP 3MF. Pemeriksaan 3MF ini tidak membuktikan payload model di dalam ZIP. Tidak ada ekstraksi archive, parser geometri penuh, eksekusi berkas, pemanggilan slicer, atau pemindaian malware.

**FILE-05.** Ekstensi benar dengan header/struktur awal yang tidak cocok menurut kriteria FILE-04, ukuran aktual berbeda, stream terputus, inspector tidak tersedia, atau checksum tidak valid tidak boleh mencapai `UPLOADED`. Gunakan penolakan dan cleanup unggahan pending yang sudah ada; jangan memperluasnya menjadi penghapusan berkas existing atau perubahan retensi.

**FILE-06.** Pesan Customer tidak membocorkan storage key, byte isi, token, hash, bucket, atau error SDK. Contoh copy: **“Berkas belum dapat diterima. Periksa format dan ukuran, lalu unggah kembali.”** Detail teknis tidak ditambahkan ke response publik.

**FILE-07.** Jalur Customer dan append lewat tautan private memakai pemeriksaan yang sama. R2 tetap privat, URL akses berumur pendek, retensi **14/60/90 hari**, authorization, serta review operator atas harga/geometri tetap mengikuti kontrak existing.

## 4. RK-18 — detail produk dalam sitemap

**MAP-01.** `sitemap()` membaca produk lewat `getLiveShopProducts()`, yang sudah memakai `CatalogRepository.findPublishedProducts()` dan `isCatalogProductVisibleForRuntime()`. Tidak memakai scenario fixture, daftar slug hard-coded, atau jalur database baru yang melewati filter Shop.

**MAP-02.** Hasilnya menambahkan URL `/shop/${encodeURIComponent(product.slug)}` pada canonical origin yang tervalidasi. Jangan membuat origin, gambar, tanggal `lastModified`, harga, stok, atau data publikasi yang tidak ada di sumber.

**MAP-03.** Kegagalan katalog tidak menghilangkan URL statis atau project yang berhasil dibaca; kegagalan project tidak menghilangkan produk yang berhasil dibaca. Tanpa origin valid, hasil tetap `[]` dan tidak membaca kedua sumber.

**MAP-04.** Pertahankan `export const revalidate = 300`, static routes, services, filter project `card-only`, dan semua exclusion existing. Tidak menambah request-time API. Perubahan publikasi tercermin pada regenerasi berikutnya; slice ini tidak menjanjikan invalidasi langsung.

**MAP-05.** Produk unpublished dan fixture demo yang tidak visible pada runtime production tidak masuk lewat jalur baca nyata. Produk published yang stoknya habis tetap mengikuti visibilitas katalog existing; sitemap tidak menciptakan aturan stok baru. Build harus tetap dapat selesai tanpa database.

## 5. E2E — diagnosis media beranda

**E2E-01.** Mulai dari log attempt gagal kedua run yang dicatat di `evidence.md`. Ketersediaan trace harus diperiksa; referensi path `trace.zip` dalam log tidak berarti artifact tersedia untuk diunduh.

**E2E-02.** Reproduksi terarah pada `product-route-proof.spec.ts` memakai harness existing. Catat viewport, indeks/alt media, pathname `currentSrc`, status request gambar, `complete`, dimensi, dan waktu relatif. Jangan menangkap cookie, query token, credentials, private Customer media, atau payload autentikasi.

**E2E-03.** Bedakan waktu untuk login/navigasi/layout/fonts, permintaan optimizer, media origin, dan decode. Uji hipotesis satu variabel pada satu waktu. CI E2E memakai **Next dev**, sehingga pengaruh ISR harus dibuktikan terpisah pada `next build` + `next start`.

**E2E-04.** Jangan menaikkan timeout, menambah retry, menghapus assertion media/dimensi/alt, melewati test, atau menonaktifkan optimisasi gambar secara umum sebagai jalan pintas. Perubahan korektif baru ditentukan setelah bukti menunjuk penyebab.

**E2E-05.** Deliverable investigasi adalah laporan bukti dan rekomendasi. Jika gagal belum dapat direproduksi dan trace tidak tersedia, tulis **penyebab belum terbukti**. Run lulus atau rerun hijau tidak menutup diagnosis dengan sendirinya. Perubahan workflow untuk upload artifact memerlukan scope tersendiri.

## 6. Selesai dan di luar scope

Spec selesai ketika setiap requirement mempunyai rancangan, task, pengujian yang disebutkan, dan batas bukti. Implementasi selesai hanya setelah gate yang berlaku dijalankan dan hasil aktual dicatat; bukan setelah task ditulis.

Tidak mencakup aset RK-17, public signup activation, consent policy resmi, kanal/refund, email outbox, scheduler, SDK observability, shared rate-limit store, cache ongkir, threshold coverage, provider acceptance, staging, atau production release.
