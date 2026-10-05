# Register Dependency dan Peta Temuan ke Tahap

Spec: `niuva-audit-remediation`. Dokumen ini dibuat oleh task 1.4. Isinya hanya dokumen; tidak ada code, konfigurasi, atau migrasi yang diubah.

Rujukan: `requirements.md` (Req 1, 2), `design.md` (Urutan Implementasi dan Wave, Tabel Ketertelusuran), `tasks.md` (Overview dan daftar task).

## 0. Cara membaca dokumen ini

- **Tahap** mengikuti kolom "Top-level task" pada tabel Overview `tasks.md`: Tahap n dikerjakan di top-level task 2n+1 (Tahap 0 = task 1, Tahap 1 = task 3, ... Tahap 11 = task 23).
- **Aturan hitung "tepat sekali".** Setiap ID temuan (`A1` sampai `L2`, termasuk `H2-revised` dan `K3-revised`) muncul tepat sekali sebagai kunci baris pada tabel di bagian 2. Bagian lain hanya merujuk ID ketika memang perlu (pasangan dependency di bagian 1), dan tidak membuat baris pemetaan kedua. Pemeriksa otomatis (task 1.12) sebaiknya membaca baris tabel bagian 2 saja.
- **Daftar ID.** Bentuk tanpa akhiran "-revised" untuk kedua ID itu sudah digantikan oleh `H2-revised` dan `K3-revised`, jadi tidak dipetakan sendiri. `A3` dan `A4` dipakai di header Req 9, 13, 20, dan 23 walau Glossary hanya menyebut `A1` dan `A2`, jadi keduanya ikut dipetakan. Seri G dimulai dari nomor 2 menurut Glossary.
- **Batas bukti.** Teks audit asli tidak ada di repository. Deskripsi tiap temuan di bawah diturunkan dari kalimat `requirements.md`, `design.md`, dan `tasks.md`. Bila spec tidak menyebut sub-kriteria yang persis untuk sebuah ID, kolom "Penampung" menunjuk ke top-level task atau rentang task, bukan menebak satu sub-task.
- Perubahan uncommitted milik Owner (docs/legal, addendum PRD/TechDesign, dua file test) hanya dibaca, tidak diubah.

## 1. Register dependency (pasangan terarah)

Format: `X → Y` berarti X harus ditutup sebelum Y dijadwalkan. Jenis alasan: **V** = verifikasi (Y tidak dapat dibuktikan tanpa X), **R** = risiko (Y aman hanya bila X ada).

| # | Pasangan | Jenis | Alasan | Bukti di spec |
| --- | --- | --- | --- | --- |
| 1 | B5 → B2 | V | Perubahan kunci rate limit tidak dapat diverifikasi tanpa log kegagalan terkorelasi. Tanpa observability, penolakan yang salah atau terlalu longgar tidak terlihat. | Req 2.2, Req 8 mendahului Req 11; task 5.1 berprasyarat 3.5 |
| 2 | B5 → B3 | V | Eviksi kapasitas mengubah kapan permintaan ditolak. Dampaknya hanya terbaca bila kegagalan tercatat. | Req 2.2; task 5.4 |
| 3 | I1 → C1 | V | Celah test harus terukur sebelum jalur data publik produksi diubah. Tanpa ukuran, perubahan sumber data tidak punya pembanding. Bila `@vitest/coverage-v8` tidak disetujui, celah dicatat manual (task 1.11). | Req 2.3, Req 6 mendahului Req 15; task 9.1 dan 9.7 |
| 4 | F1 → A2 | R | Pendaftaran publik membutuhkan dokumen legal yang dapat diakses publik lebih dulu; penerimaan consent tanpa dokumen yang bisa dibaca tidak bermakna. | Req 2.4, Req 17 mendahului Req 18 (serial); task 11.9 dan 11.10 |
| 5 | PUB-AGE → pembukaan pendaftaran publik | R | Kelayakan usia per kelompok dan fitur belum dinilai. Capability signup ditolak resolver selama gate ini belum ditutup. | Req 2.5, 18.1, 18.7; task 11.5 (titik integrasi fail-closed) dan 11.16 (BLOCKED_ON_OWNER) |
| 6 | PUB-GUARDIAN → pembukaan pendaftaran publik | R | Metode dan assurance wali belum dipilih. Login Google atau email terverifikasi hanya bukti kontrol identitas, bukan bukti wali. | Req 2.5, 18.1, 18.8; task 11.16 |
| 7 | A1 → aktivasi provider | R | Guard `NODE_ENV` harus diganti Capability_Resolver sebelum ada provider yang boleh diaktifkan per tier. Aktivasi provider tetap butuh instruksi terpisah. | Req 2.6, Req 13 mendahului Req 15, 17, 18, 19, 20; task 7 |
| 8 | A1 → email delivery | R | Pengiriman email bergantung pada capability `emailDelivery` dari resolver, dan pada consent (Tahap 5). | Req 2.6, Req 19 berprasyarat 13 dan 17; task 13 |
| 9 | A1 → refund | R | Kirim refund hanya boleh berjalan di belakang capability `refund` yang fail-closed per tier dan mode provider. | Req 2.6, Req 22 dan 23 berprasyarat 13; task 17 |
| 10 | Scheduled_Job_Runner → D2, D3, D4 | V | Tiga temuan memakai satu jalur job: service identity, lock, idempotensi, checkpoint, dry-run. Ketiganya dikerjakan serial di atas runner yang sama, bukan tiga jalur terpisah. | Req 2.7, Req 21; task 15.1 sampai 15.3 lebih dulu, lalu 15.9 sampai 15.12; catatan tahap task 15 |
| 11 | H3 → H2-revised | R | Server Action menghapus kebutuhan Zod pada client component. Mengukur ulang dan memotong bundel sebelum konversi form membuat angka sebelum/sesudah tercemar. | Req 2.8, Req 25 mendahului Req 26; task 19.8 sampai 19.12 sebelum 19.13 sampai 19.24 |

Catatan pasangan 10: pasangan ini tidak membuat urutan antar D2, D3, dan D4 sendiri. Ketiganya serial karena berbagi lock yang sama, dan job yang menyentuh Customer mengambil `lockCustomerLifecycle(tx)` dengan urutan lock yang sama (catatan tahap task 15).

### 1.1 Dependency turunan antar tahap

Diturunkan dari tabel Overview `tasks.md` dan tabel wave di `design.md`. Tidak ada pasangan baru di luar yang diminta Req 2; tabel ini hanya menjelaskan urutan tahap.

| Tahap | Membutuhkan | Alasan |
| --- | --- | --- |
| 0 | tidak ada | Baseline harus tercatat sebelum perubahan berisiko. Pengecualian: task test (9.1 dan 9.2) hanya menambah file test baru dan boleh berjalan lebih awal. |
| 1 | Tahap 0 | Observability adalah prasyarat Tahap 2 dan 3. |
| 2 | Tahap 1 | Pasangan 1 dan 2. |
| 3 | Tahap 1 | Validasi env terpusat lebih dulu. Serial karena resolver adalah titik tunggal untuk Tahap 4 sampai 8. |
| 4 | Tahap 0 (ukuran test), Tahap 3 | Pasangan 3 dan sumber konten dipilih lewat capability. |
| 5 | Tahap 3 | Consent bergantung pada resolver. Serial Req 17 lalu Req 18. |
| 6 | Tahap 3, Tahap 5 | Pasangan 8. |
| 7 | Tahap 1, Tahap 3, Tahap 6 | Pasangan 10. Job dispatch outbox membutuhkan outbox. |
| 8 | Tahap 1, 2, 3, 7 | Pasangan 9. Otorisasi di service dan jalur job dipakai refund. |
| 9 | Tahap 3 (Req 25), Tahap 1 (Req 27) | Pasangan 11. Konversi form mendahului task bundel. |
| 10 | Tahap 0 (Req 7), Tahap 3 dan 9 (Req 29) | Sengaja terakhir supaya diff tetap terbaca. |
| 11 | lintas tahap | Di luar kendali code; `PUB-RELEASE` tetap `NOT_AUTHORIZED`. |

### 1.2 Aturan penjadwalan dan penahanan (Req 2.9, 2.10)

- Sebelum sebuah task dijadwalkan, periksa bahwa semua task di baris "Prasyarat"-nya sudah ditutup.
- Bila ada prasyarat yang belum ditutup, task dependen ditahan dan alasannya dicatat di laporan tahap. Penahanan tidak diselesaikan dengan memilih nilai default di code.
- Task `[BUTUH_INTEGRASI]` ditahan sampai task 1.2 mencatat hasil `test:integration` (lulus, gagal, atau `TIDAK_DIJALANKAN` beserta penyebab). Task `[BUTUH_E2E]` ditahan sampai task 1.3 mencatat hasil `test:e2e`. Status terkini ada di `baseline-gate.md`.
- Task `[APPROVAL_GATE]` dan `[BLOCKED_ON_OWNER]` tidak dieksekusi tanpa persetujuan tertulis atau keputusan Owner yang menyebut item itu.

## 2. Peta temuan ke tahap

Satu baris per ID temuan. Kolom "Tahap" bernilai `Tahap N` atau `DITUNDA`. Kolom "Task" adalah top-level task tahap tersebut. Kolom "Catatan" memuat penahanan (`APPROVAL_GATE`, `BLOCKED_ON_OWNER`) dan hubungan dengan authority 3 Oktober 2026. "Selaras" berarti tidak ditemukan pertentangan pada dokumen authority yang dibaca.

| ID | Tahap | Task | Penampung | Req | Catatan |
| --- | --- | --- | --- | --- | --- |
| A1 | Tahap 3 | 7 | 7.2 sampai 7.13 | 13, 14 | `NODE_ENV` dipakai sebagai izin provider; diganti Capability_Resolver. 7.13 (hapus guard lama) adalah `APPROVAL_GATE`. Selaras: authority meminta tier dan mode provider eksplisit, dan build bukan izin capability. |
| A2 | Tahap 5 | 11 | 11.5, 11.12, 11.13, 11.16 | 17, 18 | Signup publik tetap ditolak resolver. **Tegangan dengan authority**, lihat bagian 4. Sisi delivery email dikerjakan di Tahap 6 (task 13) atas `PUB-EMAIL`; ID ini tidak dihitung dua kali. 11.16 `BLOCKED_ON_OWNER`. |
| A3 | Tahap 7 | 15 | 15.8 | 20 | Hak privasi memakai resolver, bukan deteksi database internal testing. Selaras dengan kontrak runtime (privacy hosted). |
| A4 | Tahap 1 | 3 | 3.17 | 9 | Endpoint Midtrans menjadi konfigurasi; default tetap sandbox. ID juga tercantum di header Req 13 dan 23, yang memakai hasilnya. Penempatan mengikuti header Req 9 karena hanya kriteria 9.5 yang konkret. Guard provider tidak diubah di task ini. |
| B1 | Tahap 3 | 7 | task 7 (Req 13) | 13 | Spec hanya menyebut ID di header Req 13 (pemeriksaan origin, 13.9 sampai 13.12). Sub-task persis tidak disebut; lihat 7.16 sampai 7.19 sebagai kandidat. |
| B2 | Tahap 2 | 5 | 5.1, 5.6 dan rute publik | 11 | Satu bucket per origin; diganti kunci per pelaku. Prasyarat: pasangan 1. |
| B3 | Tahap 2 | 5 | 5.3, 5.4 | 11 | Kapasitas penuh menolak semua pelaku baru; diganti eviksi. Prasyarat: pasangan 2. Keterbatasan per-proses dicatat di bagian 5. |
| B4 | Tahap 2 | 5 | 5.17 | 12 | Presigned upload harus mewajibkan Customer. Invariant token akses dan customer boundary dijaga. |
| B5 | Tahap 1 | 3 | 3.1, 3.3, 3.5 | 8 | Observability dengan correlation id. Prasyarat untuk pasangan 1 dan 2. |
| B6 | Tahap 2 | 5 | task 5 (Req 12) | 12 | Spec hanya menyebut ID di header Req 12 (otorisasi di service, termasuk Server Action di luar matcher proxy). Sub-task persis tidak disebut; lihat 5.21 sampai 5.23 sebagai kandidat. |
| B7 | Tahap 2 | 5 | 5.14 | 11 | `derive()` menyamakan server sibuk dengan "terlalu sering"; dipisah kode kesibukan sumber daya. Menambah `ERROR_CODES`, maka pemetaan lama diperbarui bersamaan. |
| B8 | Tahap 9 | 19 | task 19 (Req 26) | 26 | Spec hanya menyebut ID di header Req 26 (payload JS per route). Sub-task persis tidak disebut; lihat 19.20 sampai 19.23 sebagai kandidat. |
| B9 | Tahap 10 | 21 | 21.21 | 28 | Urutan field lima model di `prisma/schema.prisma` tanpa migrasi. Migrasi lama tidak diubah. |
| C1 | Tahap 4 | 9 | 9.1, 9.2, 9.6, 9.7, 9.10 | 15 | Jalur data publik produksi diuji dan dipilih lewat capability. Prasyarat: pasangan 3 dan pasangan 7. Penerimaan visual dilaporkan "belum ditinjau". |
| C2 | Tahap 2 | 5 | 5.19, 5.20 | 12 | `ActionQueueService` dan `AdminOperationsService` memeriksa izin per operasi. Matriks `permissions.ts` tidak diubah. |
| C3 | Tahap 10 | 21 | 21.10, 21.11 | 28 | Pemecahan modul besar, satu berkas per task tanpa perubahan perilaku. |
| C4 | Tahap 10 | 21 | 21.35 | 7, 28 | Format ulang berkas terkompresi. `APPROVAL_GATE` (paket formatter dan commit terpisah). Tanpa persetujuan, perbaikan dibatasi pada berkas yang memang diubah task lain (Req 7.5). |
| C5 | Tahap 10 | 21 | task 21 (Req 28) | 28 | Spec hanya menyebut ID di header Req 28. Sub-task persis tidak disebut; lihat 21.12 dan 21.15 sebagai kandidat. |
| C6 | Tahap 0 | 1 | guardrail `tasks.md` | 4 | Penamaan migrasi lama (`20260927_customer_preview_snapshot`, `20260927_stock_movement_ledger`) tidak diubah. Tidak ada tugas perubahan; dicatat sebagai larangan edit migrasi yang berlaku di semua tahap. |
| D1 | Tahap 4 | 9 | 9.12 | 15, 4, 30 | Hapus atau bangun model `Service`. `APPROVAL_GATE`; sampai ada keputusan tertulis user, `publicServices` dan assertion integrasi tidak berubah. Tercatat juga di Register_Keputusan (task 1.5 dan 23.1). |
| D2 | Tahap 7 | 15 | 15.10 sampai 15.12 | 21 | Satu dari tiga job berbagi satu jalur (pasangan 10). Pemetaan D2, D3, D4 ke job masing-masing tidak ditetapkan spec; job: retensi berkas, `releaseExpired()`, rekonsiliasi order. Dry-run wajib sebelum execute; execute hanya terhadap database test lokal. |
| D3 | Tahap 7 | 15 | 15.10 sampai 15.12 | 21 | Lihat D2. |
| D4 | Tahap 7 | 15 | 15.10 sampai 15.12 | 21 | Lihat D2. |
| D5 | Tahap 8 | 17 | 17.27, 17.28, 17.31, 17.32 | 24 | Jalur baca `AuditLog`, index aktor dan waktu. Retensi `BLOCKED_ON_OWNER` (17.32); penghapusan otomatis ditahan. |
| D6 | Tahap 10 | 21 | 21.2 sampai 21.5 | 28 | Satu parser dan pretty printer `Nama \| nominal`. |
| E1 | Tahap 8 | 17 | 17.1 sampai 17.24 | 22, 23 | Refund penuh, persetujuan Owner, pengiriman idempoten. **Tegangan dengan authority**, lihat bagian 4. Capability `refund` tetap fail-closed. 17.24 `BLOCKED_ON_OWNER`. |
| E2 | Tahap 8 | 17 | 17.25 sampai 17.30 | 24 | Aktif dan nonaktif akses admin lewat aplikasi dengan `AuditLog`. |
| E3 | Tahap 2 | 5 | task 5 (Req 12) | 12 | Spec hanya menyebut ID di header Req 12. Sub-task persis tidak disebut; kandidat 5.18 (`sha256`) dan 5.25. Pemeriksaan isi berkas unduhan operator hanya dicatat (5.25, keputusan dengan pemilik Owner dan engineering); tidak ada implementasi, dan `APPROVAL_GATE` bila butuh layanan eksternal. |
| F1 | Tahap 5 | 11 | 11.9, 11.10 | 17 | Route legal publik dan tautan footer. **Tegangan dengan authority**, lihat bagian 4. Prasyarat untuk A2 (pasangan 4). |
| F2 | Tahap 4 | 9 | 9.19 sampai 9.24 | 16 | Spec hanya menyebut F2 dan F3 bersama di header Req 16 (sitemap, robots, metadata, navigasi). Pembagian F2 dan F3 ke sub-task tidak ditetapkan spec. |
| F3 | Tahap 4 | 9 | 9.19 sampai 9.24 | 16 | Lihat F2. |
| F4 | Tahap 10 | 21 | 21.37 | 4, 28 | Hapus direktori AUiS kosong. `APPROVAL_GATE` untuk path yang disebut. Tanpa persetujuan, direktori tetap. |
| F5 | Tahap 10 | 21 | task 21 (Req 28) | 28 | Spec hanya menyebut ID di header Req 28. Kandidat: 21.24 (lima route khusus test tetap fail-closed dan `noindex`). |
| G2 | Tahap 9 | 19 | 19.25 sampai 19.30 | 27 | Spec menyebut G2, G3, G4 bersama di Req 27; sub-task persis tidak ditetapkan. Kandidat untuk G2: keputusan `loading.tsx` per page. Hash `src/app/admin/loading.tsx` tidak berubah. |
| G3 | Tahap 1 | 3 | 3.6 sampai 3.9 | 8, 27 | Loader admin membedakan `FailureKind` dan copy per kategori. Dikerjakan di Tahap 1; Req 27.4 memakai hasilnya di Tahap 9. Invariant system pages dijaga. |
| G4 | Tahap 9 | 19 | 19.31 sampai 19.33 | 27 | Kandidat: error boundary ber-scope untuk `/checkout` dan `/account`. Mekanisme menjaga `PublicShell` diputuskan di 19.31. |
| H1 | Tahap 4 | 9 | 9.13 sampai 9.18 | 16 | Strategi render per route. Gate: `test:integration` dan `test:e2e`; klasifikasi route dibandingkan dengan hasil `build`. |
| H2-revised | Tahap 9 | 19 | 19.13 sampai 19.24 | 25, 26 | Pengurangan payload JS. Prasyarat: pasangan 11. Perangkat ukur tambahan (bundle analyzer atau Web Vitals) adalah `APPROVAL_GATE` (19.37). |
| H3 | Tahap 9 | 19 | 19.5 sampai 19.12 | 25 | Funnel publik tanpa JavaScript. Login Customer sebelum checkout tetap berlaku (`AGENTS.md`); cart sisi server di luar lingkup dan dicatat di 19.2. Revalidasi server atas harga, stok, dan ongkir dipertahankan. Checkout dikonversi terakhir. |
| H4 | Tahap 10 | 21 | 21.23 | 28, 30 | Cache rate ongkir. `BLOCKED_ON_OWNER`; task hanya mencatat keputusan `BELUM_TERTUTUP`. Belum ada implementasi cache, dan task tidak membuatnya. Tidak memilih TTL atau desain. |
| H5 | Tahap 9 | 19 | task 19 (Req 26) | 26 | Spec hanya menyebut ID di header Req 26. Sub-task persis tidak ditetapkan; lihat 19.20 sampai 19.23. |
| I1 | Tahap 0 | 1 | 1.10, 1.11 | 4, 6 | Coverage. 1.10 `APPROVAL_GATE` untuk `@vitest/coverage-v8`; tanpa persetujuan, celah dicatat manual di 1.11 dan threshold otomatis ditahan. |
| I2 | Tahap 4 | 9 | 9.1, 9.2 | 15, 29 | Fungsi `listPublishedPortfolioProjects` dan `findPublishedPortfolioProjectBySlug` diuji. 9.1 boleh berjalan lebih awal (hanya menambah file test). |
| I3 | Tahap 10 | 21 | 21.25, 21.29 | 29 | E2E terhadap production build, lintas browser. `[BUTUH_E2E]`; bila tidak bisa jalan, dicatat `TIDAK_DIJALANKAN`. `.github/workflows/` tidak disentuh. |
| I4 | Tahap 10 | 21 | 21.36 | 4, 29 | Pemeriksaan aksesibilitas runtime dengan `@axe-core/playwright`. `APPROVAL_GATE`; tanpa persetujuan, aksesibilitas tetap diperiksa manual. Hasil otomatis bukan penerimaan assistive technology. |
| I5 | Tahap 10 | 21 | 21.30 sampai 21.33 | 29, 3 | Skrip lintas platform pengganti `powershell.exe`. Perubahan `package.json` adalah `APPROVAL_GATE` (21.33). Terkait baseline (Req 3) tetapi perbaikannya di Tahap 10. |
| I6 | Tahap 1 | 3 | 3.20 (verifikasi di 1.9) | 10 | Catatan replay integration pada dokumen readiness ditandai historis bila terbukti usang. Verifikasi dilakukan di 1.9 (Tahap 0), pembaruan dokumen di 3.20. Migrasi tidak diubah. |
| J1 | Tahap 10 | 21 | 21.6, 21.38 | 28, 4 | Dead code `option-chip.tsx`. Penghapusan di 21.38 adalah `APPROVAL_GATE`. |
| J2 | Tahap 10 | 21 | 21.6, 21.38 | 28, 4 | Dead code `action-queue-item.tsx`; markup baris antrean disatukan. Penghapusan di 21.38 adalah `APPROVAL_GATE`. |
| J7 | Tahap 10 | 21 | 21.2 | 28 | Parser `Nama \| nominal` dipakai dua action admin. |
| J9 | Tahap 1 | 3 | 3.1 | 8 | Logger dan classifier. |
| K1 | Tahap 1 | 3 | 3.15 | 9 | Env runtime terdaftar di schema env server. `.env.example` tidak disentuh tanpa persetujuan; nama env baru masuk `env-register.md`. |
| K2 | Tahap 1 | 3 | 3.16 | 9 | Schema env internal auth disatukan tanpa mengubah allowlist, dokumen pengujian 30 hari, atau perilaku. Spec hanya menyebut ID di header Req 9 (kandidat 3.16). |
| K3-revised | Tahap 0 | 1 | 1.6 | 7 | Ignore `.agents/**` di konfigurasi lint supaya 146 warning tooling tidak menutupi 2 warning product code. Tidak menambah ignore untuk `src/generated/**`. |
| K4 | Tahap 10 | 21 | 21.35 | 4, 7 | Formatter. `APPROVAL_GATE`; penambahan paket menyebut nama, tujuan, dampak maintenance, dampak keamanan. |
| L1 | Tahap 1 | 3 | 3.19 | 10 | `MEMORY.md` diperbarui, tiap klaim diverifikasi terhadap repo. |
| L2 | Tahap 1 | 3 | 3.20 | 10 | Spec hanya menyebut ID di header Req 10 dan di Glossary; kandidat 3.20 (pemisahan evidence aktif dan historis). |

### 2.1 Ringkasan jumlah per tahap

Jumlah ID per tahap (57 ID). Tahap 6 dan Tahap 11 tidak punya ID A sampai L sendiri.

| Tahap | Jumlah | Keterangan |
| --- | --- | --- |
| 0 | 3 | Fondasi, baseline, lint |
| 1 | 9 | Observability, env, dokumen status |
| 2 | 7 | Rate limit, otorisasi |
| 3 | 2 | Capability dan origin |
| 4 | 6 | Jalur data, render, discoverability |
| 5 | 2 | Policy, consent, titik integrasi usia dan wali |
| 6 | 0 | Email outbox: memenuhi `PUB-EMAIL` dan bagian delivery dari ID yang dihitung di Tahap 5 |
| 7 | 4 | Privacy hosted, tiga job |
| 8 | 3 | Refund, akses admin, audit |
| 9 | 6 | Form tanpa JS, bundel, loading dan error ber-scope |
| 10 | 15 | Struktur, kebersihan, verifikasi |
| 11 | 0 | Gate di luar kendali code (`PUB-*`) |

### 2.2 Referensi gate `PUB-*` (bukan bagian hitungan A sampai L)

| Gate | Tahap pelaksana code | Catatan |
| --- | --- | --- |
| PUB-BIZ | Tahap 11 | Keputusan Owner, dicatat di Register_Keputusan. |
| PUB-AGE | Tahap 5 (titik integrasi), Tahap 11 (register) | Metode tidak dipilih oleh code. |
| PUB-GUARDIAN | Tahap 5 (titik integrasi), Tahap 11 (register) | Metode tidak dipilih oleh code. |
| PUB-POLICY | Tahap 5 | Dokumen resmi dan tanggal berlaku menunggu Owner dan legal. |
| PUB-DATA | Tahap 11 | Keputusan legal dan privasi. |
| PUB-PROVIDER | Tahap 11 | Bukti lingkungan; tidak digantikan CI. |
| PUB-RECORDS | Tahap 11 (register), Tahap 8 (retensi audit ditahan) | Retensi legal dan akuntansi per kategori. |
| PUB-BACKUP | Tahap 11 | Bukti pemulihan di luar CI. |
| PUB-SERVICE | Tahap 11 | Kalender kerja WIB belum disahkan; SLA hari kerja ditahan. |
| PUB-REFUND | Tahap 8 | Kasus, persetujuan, nominal. |
| PUB-REFUND-PROVIDER | Tahap 8 (adapter), Tahap 11 (register) | Cakupan metode pembayaran menunggu data provider terverifikasi. |
| PUB-REFUND-RECON | Tahap 8 | Rekonsiliasi dan hasil tak pasti. |
| PUB-HOSTED | Tahap 3 | Guard tier dan capability. |
| PUB-EMAIL | Tahap 6 | Outbox durable. |
| PUB-JOBS | Tahap 7 (job), Tahap 11 (SLA) | Jadwal hosted adalah `APPROVAL_GATE` (15.18). |
| PUB-INCIDENT | Tahap 7 | Kanal hak yang belum otomatis dicatat dengan pemilik dan tenggat (15.17). |
| PUB-STAGING | Tahap 11 | Bukti staging terpisah. |
| PUB-RELEASE | Tahap 11 | `NOT_AUTHORIZED`. |

## 3. Status `DITUNDA`

**Tidak ada ID yang berstatus `DITUNDA` penuh.** Semua ID pada bagian 2 dapat ditempatkan pada satu tahap (Req 1.6 tidak terpicu). Sebagian pekerjaan di dalam tahap itu tetap tertahan oleh keputusan atau persetujuan. Penahanan ini tidak mengubah pemetaan tahap, tetapi syarat pengaktifannya dicatat di sini supaya tidak hilang.

| Bagian yang tertahan | Task | Alasan | Syarat pengaktifan |
| --- | --- | --- | --- |
| Hapus atau bangun model `Service` | 9.12 | Keputusan user belum ada (T5) | Keputusan tertulis: tepat satu dari membangun jalur baca atau menghentikan model. Sampai itu, `publicServices` dan assertion `tests/integration/portfolio-public-content.test.ts:35` tidak berubah. |
| Metode verifikasi usia dan assurance wali | 11.16 | Keputusan Owner dan legal belum ada (T2) | Asesmen per kelompok dan fitur tercatat, metode disetujui. Sampai itu `getAgeGateStatus()` tetap `DECISION_PENDING` dan signup publik ditolak. |
| Dokumen legal resmi dan tanggal berlaku | 11.16 | Persetujuan Owner dan legal belum ada | Versi, tanggal berlaku, dan persetujuan final tercatat; publikasi tetap butuh instruksi terpisah. |
| Ruang lingkup refund final dan cakupan metode pembayaran | 17.24 | Data provider belum terverifikasi (T8) | Daftar metode dan kemampuan API terverifikasi. Enum tidak diisi dengan dugaan. |
| Retensi `AuditLog` dan `FailureEvent` | 17.32 | Dasar retensi belum disahkan (T4) | Dasar retensi disahkan; penghapusan otomatis ditahan sampai itu. |
| Cache rate ongkir | 21.23 | Keputusan Owner belum ada | Keputusan tertulis. Cache tidak boleh melonggarkan revalidasi server dan tidak boleh melayani tarif kedaluwarsa. |
| Strategi CSP akhir untuk seluruh situs | 7.25 | Menukar performa dan keamanan (T6) | Keputusan Owner dan engineering atas nonce, `experimental.sri`, atau cakupan terbatas. |
| Pemeriksaan isi berkas unduhan operator | 5.25 | Bisa butuh layanan eksternal (T10) | Keputusan Owner dan engineering; `APPROVAL_GATE` bila butuh layanan eksternal. |
| Penjadwalan cron hosted | 15.18 | Mengubah `vercel.json` | Persetujuan user tertulis. |
| Kalender kerja WIB | 23.6 | Belum disahkan Owner (T9) | Kalender, hari libur, dan petugas pengganti disahkan. Sampai itu SLA hari kerja ditampilkan "belum ditetapkan". |
| Penambahan dependency (coverage, formatter, axe, SDK pemantauan, bundle analyzer) | 1.10, 21.35, 21.36, 3.14, 19.37 | Approval gate dependency | Persetujuan tertulis yang menyebut paket, tujuan, dampak maintenance, dampak keamanan, dan biaya bila relevan. |
| Penghapusan file atau direktori | 21.37, 21.38 | Approval gate penghapusan | Persetujuan tertulis per path. |
| Perubahan `.env.example`, `package.json` script, `vercel.json` | 7.27, 21.33, 15.18 | Approval gate | Persetujuan tertulis per berkas. |

## 4. Temuan yang bertentangan dengan authority 3 Oktober 2026

Authority yang berlaku: `docs/PRD-Niuva-MVP.md` (addendum 3 Oktober 2026), `docs/TechDesign-Niuva-MVP.md` (addendum kontrak kesiapan Customer publik), `docs/legal/customer-public-launch-readiness.md`, `docs/legal/customer-public-runtime-contract.md`, `docs/legal/customer-service-refund-sop.md`, `docs/legal/customer-privacy-retention-sop.md`, `docs/legal/customer-public-policy-validation.md`, `docs/legal/customer-public-input-evidence.md`. Bila sebuah temuan berbeda arah, **authority yang berlaku** (Req 1.5).

Pemeriksaan ini dibatasi pada teks spec dan dua dokumen authority yang dibaca penuh (`customer-public-launch-readiness.md` dan `customer-public-runtime-contract.md`). Teks audit asli tidak ada di repository, jadi "tegangan" di bawah berarti: arah perbaikan yang paling langsung dari sebuah temuan akan melampaui apa yang diizinkan authority. Dokumen authority lain tidak dibaca ulang untuk register ini; bila task implementasi menemukan pertentangan baru, tambahkan baris di sini.

| Topik | Arah temuan (menurut spec) | Arah authority yang berlaku | Rujukan authority | Dampak pada rencana |
| --- | --- | --- | --- | --- |
| Pendaftaran publik dan usia (baris Tahap 5, task 11) | Membuka consent dan signup publik | Pendaftaran publik penuh (Google dan email/password) dengan target semua usia menggantikan pilot undangan dan pembatasan 18+ pada draf v2. Kelayakan per kelompok usia dan persetujuan wali adalah prasyarat aktivasi. Checkbox atau tanggal lahir saja tidak diasumsikan memadai. Login Google atau email terverifikasi bukan bukti usia, kapasitas transaksi, atau wali. | launch-readiness: "Keputusan dan batas bukti", "Penilaian akun anak"; runtime-contract: "Pendaftaran, policy dan wali" | Task 11 hanya memasang titik integrasi fail-closed. Tidak ada metode verifikasi yang dipilih di code. Signup tetap ditolak resolver sampai gate tertutup. |
| Dokumen legal publik (baris Tahap 5, task 11) | Menyediakan route legal dan tautan footer | Draf v3 belum berlaku dan bukan sumber consent publik. Dokumen resmi butuh identifier, versi immutable, tanggal berlaku, dan persetujuan Owner dan legal. Publikasi butuh instruksi eksplisit. | launch-readiness: "Isi paket dan authority", `PUB-POLICY`, `PUB-RELEASE`; runtime-contract: "Pendaftaran, policy dan wali" | Route dan tautan boleh dibangun. Consent publik ditolak selama dokumen resmi belum ada. Draf v3 ditolak sebagai sumber. Tidak ada publikasi. |
| Refund (baris Tahap 8, task 17) | Workflow pengajuan dan pengiriman refund | Refund penuh versi pertama; Owner menyetujui, aplikasi menjalankan dan memantau. Metode pembayaran tetap luas, dan metode tanpa dukungan API lewat pengecualian manual yang disetujui dan direkonsiliasi. Persetujuan bukan penyelesaian kasus. API accepted bukan hasil keuangan akhir. | launch-readiness: "Keputusan dan batas bukti", `PUB-REFUND*`; runtime-contract: "Kasus refund dan kewenangan", "Idempotensi dan hasil provider" | Task 17 mencakup refund penuh saja, dengan pengiriman di belakang capability `refund` yang fail-closed. Cakupan metode tidak diisi dengan dugaan. |
| Env tier dan capability (baris Tahap 3, task 7) | Mengganti pemeriksaan `NODE_ENV` | Selaras. Authority meminta tier (`local/test`, `staging`, `production`) dan mode provider (`mock`, `sandbox`, `live`) eksplisit, tetapi **nama env dan schema final tidak ditetapkan dokumen authority**. | runtime-contract: "Hosted, origin dan capability" | Nama final ditetapkan pada batch implementasi dan dicatat di `env-register.md` (Req 13.14). |
| Job dan cleanup (baris Tahap 7, task 15) | Job terjadwal bersama | Selaras. Cleanup dan hak tetap berjalan ketika signup ditutup; job lokal bukan bukti lag hosted; job berbahaya tidak menjadi endpoint publik tanpa autentikasi. | runtime-contract: "Outbox, job dan pemantauan" | Tidak ada perubahan arah. |
| Checkout tanpa JavaScript (baris Tahap 9, task 19) | Funnel publik berfungsi tanpa JS | Selaras dengan native POST dan progressive enhancement yang diminta authority. `AGENTS.md`: login Customer sebelum checkout tetap berlaku, guest checkout tidak dipulihkan. | runtime-contract: "Hosted, origin dan capability"; `AGENTS.md` (Gotchas) | Cart sisi server di luar lingkup; dicatat di 19.2. |

Tidak ditemukan pertentangan pada temuan lain yang dipetakan di bagian 2.

## 5. Risiko tersurat

Bagian ini diisi task 5.16 (keterbatasan rate limit per-proses). Bagian ini sudah diisi oleh task 5.16 (lihat 5.1).

Isi yang diharapkan dari 5.16 (Req 11.5): limiter per-proses tidak berlaku lintas instance, dan syarat penggantian ke store bersama. Penggantian store yang butuh dependency atau resource hosted adalah `APPROVAL_GATE` (Req 11.6) dan keputusan T3.

Daftar risiko tersurat ada di subbagian 5.1.

### 5.1 Keterbatasan rate limit per-proses (task 5.16, Req 11.5)

State limiter disimpan di memori proses, bukan di store bersama. Keterbatasan berikut dicatat sebagai risiko tersurat:

| Risiko | Sumber | Dampak | Syarat penutupan | Status |
| --- | --- | --- | --- | --- |
| State limiter per-proses tidak berlaku lintas instance. Pada serverless, tiap instance warm menghitung sendiri, sehingga kuota efektif pelaku dapat melebihi batas yang dikonfigurasi. | Limiter in-memory (`src/lib/security/rate-limit.ts`, kunci pelaku `src/lib/security/actor-key.ts`, guard `src/lib/http/public-mutation.ts`) | Batas percobaan tidak ditegakkan secara global; instance baru atau restart memulai hitungan dari nol. | Task 5.15 (`APPROVAL_GATE`, keputusan Owner + engineering T3): store bersama berupa resource hosted atau tabel PostgreSQL bersama. | TERCATAT |
| Permintaan tanpa header `x-real-ip` / `x-forwarded-for` berbagi satu bucket `unknown` per endpoint. | Penurunan kunci pelaku dari header IP | Pelaku tanpa header saling memengaruhi kuota; satu pelaku dapat menghabiskan bucket bagi yang lain pada endpoint yang sama. | Task 5.15, atau sumber identitas pelaku yang andal. | TERCATAT |
| Rotasi kunci yang cepat dapat mengeluarkan counter pelaku lain (eviksi LRU, dibatasi `maxKeys`). | Kebijakan kapasitas limiter (Req 11.4) | Counter pelaku yang sah dapat hilang sebelum jendelanya berakhir sehingga hitungannya reset lebih awal. | Task 5.15 (store bersama tanpa eviksi berbasis kapasitas). | TERCATAT |
| Throttle persistensi kegagalan webhook juga per-proses. | Throttle penulisan kegagalan webhook | Pembatasan tulis kegagalan tidak konsisten lintas instance. | Task 5.15 bila store bersama disetujui. | TERCATAT |

Syarat penggantian: store in-memory diganti hanya setelah task 5.15 disetujui tertulis (`APPROVAL_GATE`, Req 11.6) dengan keputusan Owner + engineering T3 atas pilihan resource hosted atau tabel PostgreSQL bersama. Tanpa persetujuan, store in-memory tetap dan risiko di atas berlaku.
