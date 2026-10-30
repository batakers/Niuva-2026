# Redesign frontend — audit, sitemap dan user flow (T45), 31 Oktober 2026

**Status:** dasar kerja T46–T50. Owner memutuskan redesign frontend global
(design system, sitemap, user flow, seluruh halaman) pada 31 Oktober 2026 dan
menjawab Q19–Q22 di [TASKS.md](../../TASKS.md). Dokumen ini bukan kontrak visual:
[DESIGN.md](../../DESIGN.md) dan panduan area tetap authority sampai ditulis ulang
dari dunia yang sudah dibangun (T47 untuk DESIGN.md dan Company, T48–T50 untuk
area lain).

Yang tidak berubah: kemampuan v1 di [PRODUCT.md](../../PRODUCT.md), logo dan warna
logo, shadcn/ui `base-nova` sebagai dasar komponen (di-restyle lewat token),
URL, API, data, auth, harga, pembayaran dan akses file privat.

## Bukti dan batasnya

- **Capture:** 24 route publik dan Customer pada 1440 dan 390 px, dari dev server
  lokal pada `main@4cf9a6e` dengan reduced motion. Capture disimpan di luar
  repository.
- **Diaudit dari source:** Postgres lokal mati saat audit. Karena itu Shop dengan
  data asli, checkout, Akun, workspace MAKE, halaman quote/order dan seluruh
  Admin diaudit dari source. Admin menampilkan HTML fallback dari `src/proxy.ts`.
- **Belum ada penerimaan:** belum ada review visual Owner, perangkat fisik, AT
  atau staging.

## Audit tampilan sekarang

### Penyebab tampilan generik

1. **Satu template seksi untuk semua isi.** Polanya: eyebrow, H2 besar di kiri,
   paragraf abu di kanan, lalu grid. Beranda memakainya enam kali, dan Layanan,
   detail layanan, Proyek serta Custom Print mengulanginya. DEVELOP, MAKE dan BUY
   terasa sama.
2. **Eyebrow di setiap seksi.** Contohnya "Pilih titik mulai", "Bukti proyek
   terpilih", "Kecocokan dan input", "Dossier file" dan "Batas yang dibuat jelas".
3. **Palet bawaan.** Palet slate bawaan Tailwind dengan satu steel-blue dan pola
   sandwich navy. Brand blue `#6390BB` hampir hanya ada di logo, dan tidak ada
   material dari dunia Niuva.
4. **Tipe datar.** Space Grotesk dipakai untuk semua hal, termasuk `font-mono`.
   H2 hampir setinggi H1. Fraunces hanya muncul di halaman login.
5. **Semua isi di dalam card.**
   - Layanan memakai grid 2×2 dengan nomor "Layanan 1/4" dan pill tag.
   - "Selected Works" berisi 11 card teks.
   - Status ditampilkan sebagai kotak berwarna.
6. **CTA tanpa hierarki.**
   - Hampir semua tombol berupa outline kecil, dan "Hubungi Kami" muncul 5–8
     kali per halaman.
   - Label aksi header berganti per route: Hubungi Kami, Pilih titik mulai,
     Lihat Produk atau Pilih Varian. Di Cart, aksi itu hilang.
7. **Copy menjelaskan sistem, bukan situasi pelanggan.** Ada sekitar 40 string
   seperti "Authority ledger", "Subtotal browser", "Projection server terotorisasi
   token", "kunci idempotensi" dan "Area ID Biteship". "Pengiriman simulasi" dan
   "Pada alur nyata…" juga tampil di mode live.
8. **Bahasa campur.**
   - Customer: Projects, Shop, Cart, Featured case studies, Selected Works,
     Review quote, Total snapshot.
   - Admin: Overview, Orders, Published/Draft; enum seperti "Ready To Ship" juga
     tampil.
9. **Media.**
   - Foto proyek nyata dikecilkan di kotak putih dengan rasio acak.
   - Layanan tidak bergambar.
   - Hero Custom Print memakai render abstrak ungu berlabel "Bukan hasil
     produksi Niuva".
10. **Mobile hanya menumpuk seksi desktop.** Tinggi halaman: Beranda 8.382 px,
    Proyek 10.282 px, Layanan 4.718 px.
11. **State kosong tampil sebagai konten.** Contohnya "Projects terkait — belum
    tersedia" di detail layanan, serta alert error dan info yang bertumpuk di
    Cart.

### Inkonsistensi sistem

- **Delapan frame berbeda:**
  - `PublicShell`
  - `CustomerAuthPage` (dengan Google Sans dan Fraunces)
  - `InternalAuthLayout`
  - `SystemFrame`
  - `SystemStateView` tanpa frame
  - `AdminShell`
  - frame sign-in Admin
  - halaman tanpa shell (`/register/google`, `orders/[token]/not-found`)

  Selain itu, `src/lib/auth/admin-proxy-response.ts` menghasilkan HTML 503
  ber-font Arial.
- **Tipe ad-hoc.** H1 punya lima perlakuan, dan sekitar 39 judul seksi memakai
  `text-xl font-semibold` ad-hoc. `typography.ts` hanya diimpor 4 dari 62 file
  Admin, dan role `ui-data` tidak terpakai.
- **Form dan Card.**
  - Form punya tiga idiom: empat salinan `controlClass`, `Field`/`NativeSelect`,
    dan kontrol mentah.
  - Sekitar 9 CTA primer ditulis tangan, bukan memakai `NiuvaLink`.
  - Di Admin, 81 dari 99 `<Card>` membatalkan default lalu menambah border atau
    padding manual.
- **Status dan tabel.**
  - Status chip punya enam gaya atau lebih.
  - `formatStatus` disalin di 5 file dan `SummaryCard` di 4 file.
  - Header tabel punya empat gaya, sedangkan Finance dan Customers memakai `ul`.
- **Token.**
  - `--radius` dideklarasikan dua kali.
  - Token spacing section/card, `ease-emphasis` dan `sidebar-primary` tidak
    terpakai.
  - Motion tidak dipetakan ke `@theme`.
  - Font didefinisikan ulang di `public-shell.tsx`.

### Diperbaiki dalam redesign tanpa mengubah aturan

- Menerima quote di `/account/make/[id]` belum memakai konfirmasi seperti di
  `/quote/[token]`.
- Akun menampilkan Rupiah tanpa pemisah ribuan dan enum mentah.
- `/account/orders/[id]` belum memakai timeline seperti `/orders/[token]`.
- Teks checkout menyebut login hanya "dengan Google", padahal login email juga
  tersedia.

### Di luar scope redesign

- **Refund:** halaman refund mengirim `returnTo=/account/orders/{id}/refund`,
  yang tidak ada di allowlist `src/modules/customer-auth/core.ts`. Customer
  akhirnya mendarat di `/account`. Ini area auth, jadi perlu task sendiri.
- **Admin sign-in:** fallback "Login Admin belum tersedia" tidak tercapai karena
  proxy menjawab lebih dulu.
- **File yatim:** `action-queue-view.tsx`, `admin-work-list.tsx` dan
  `admin-loading.tsx`. Penghapusan butuh instruksi Owner.
- **Retensi pembukuan:** PRD menyebut 10 tahun, sementara PRODUCT.md masih
  menyebutnya terbuka.

## Sitemap

URL tidak berubah. Path dipakai oleh allowlist `returnTo`, validator link email,
CSP, header cache dan `sitemap.ts`. Yang berubah adalah label (Q20), hierarki
dan hubungan antarhalaman.

```text
Header publik: Layanan · Proyek · Custom 3D Print · Toko | Keranjang (n) · Akun/Masuk · [aksi area]
/                          Beranda: positioning DEVELOP + bukti proyek; pintu Custom 3D Print dan Toko terlihat di layar pertama (Q22)
├─ /services               Layanan: 4 layanan, bukti terkait, satu "Hubungi Kami"
│  └─ /services/[slug] ×4  Input → arah output → bukti proyek terkait (atau kosong yang jujur → /projects)
├─ /projects               Proyek: 6 cerita utama bermedia + indeks ringkas karya lain
│  └─ /projects/[slug]     Cerita proyek (card-only tetap tanpa detail)
├─ /custom-print           Custom 3D Print: dua titik mulai, proses review, batas harga/file, FAQ
│  └─ /custom-print/request?mode=model|reference   (login di awal, Q21)
├─ /shop                   Toko: katalog ready-made
│  └─ /shop/[slug]
├─ /cart                   Keranjang
└─ /checkout               (login; header diringkas: logo + kembali ke keranjang)

Akun Customer (login, noindex), satu hub tanpa route baru
/account                   Profil (read-only) · Custom Print · Pesanan · Tautkan pekerjaan lama · Privasi
├─ /account/make/[id]      Permintaan + quote: terima/tolak dengan konfirmasi, tambah model, ongkir kasar
├─ /account/orders/[id]    Pesanan: timeline, pembayaran, pengiriman, ajukan refund
│  └─ /refund
└─ /account/privacy (+ /confirm, /closed)

Auth, satu frame: /login · /register (+ /register/google) · /verify-email · /forgot-password · /reset-password
Tautan token (noindex, record belum diklaim): /orders/[token] · /quote/[token] · /custom-print/requests/[token]
   memakai template status yang sama dengan Akun; akses tidak berubah
Footer: Jelajahi · Bantuan (WhatsApp, email, alamat) · Legal (/terms, /privacy setelah terbit)
Redirect tetap: /project-brief → /services
Bukan sitemap: /preview/*, /demo/*, /internal-testing/*, /auth-test-policy
Sistem: 404 · error · fallback Admin dalam satu frame bermerek (fallback proxy tetap inline)

Admin (Better Auth + MFA), grup navigation-items.ts tetap
Operasional: Ringkasan · Pesanan · Custom Print | Kelola: Produk & Stok · Customer
Keuangan: Invoice · Pembayaran · Pengeluaran | Konten: Portfolio · Informasi Situs | Laporan
Owner: Pengaturan · Admin & Akses · Privasi Customer (/admin/queue dan /admin/pricing tetap redirect kompatibilitas)
```

| Perubahan | Sifat |
| --- | --- |
| Label navigasi Bahasa Indonesia, publik dan Admin | Copy; istilah dikonfirmasi Owner (Q20) |
| Aksi header tetap per area: Company "Hubungi Kami", Commerce Keranjang, checkout diringkas | Visual/IA; aturan CTA B2B tetap |
| Footer menjadi Jelajahi / Bantuan / Legal | Visual; legal dan support tetap mudah ditemukan |
| Indeks ringkas proyek card-only; bukti per layanan | Visual; tanpa klaim baru |
| Hub Akun dalam satu halaman | Visual; tanpa route baru sehingga allowlist auth tidak tersentuh |
| Satu template status untuk token dan Akun | Visual; routing dan akses tetap |
| Konfirmasi saat menerima quote di Akun; label status Indonesia dari satu peta; format Rupiah konsisten | Interaksi dan presentasi; aturan tetap |
| Login MAKE tetap di awal | Keputusan Owner Q21; kode auth tidak disentuh |
| DEVELOP memimpin layar pertama Beranda | Keputusan Owner Q22 |

## User flow

**DEVELOP (B2B)**

1. Beranda → Layanan atau Proyek → detail.
2. "Hubungi Kami" membuka WhatsApp di tab baru. Tombolnya outline, tanpa
   keterangan di bawah, dan tetap berfungsi tanpa JavaScript.
3. Tidak ada form atau login.
4. Setiap halaman punya satu CTA utama, ditambah satu di header.

**BUY**

1. Toko → filter atau cari → produk (galeri, varian, jumlah) → "Tambah ke
   keranjang". Konfirmasi tampil inline dan jumlah di header ikut berubah.
2. Keranjang (revalidasi server) → lanjut ke checkout. Customer yang belum login
   diarahkan ke Masuk/Daftar dengan `returnTo=/checkout`.
3. Checkout bertahap: kontak (read-only) → alamat → pengiriman (tarif) →
   ringkasan dalam alur → "Buat order dan lanjutkan pembayaran" → Midtrans.
4. Setelah pembayaran: status order "menunggu pembayaran" → "dibayar" →
   "dikemas" → "dikirim". Tampilannya sama di Akun dan di tautan token.

**MAKE dengan model**

1. Custom 3D Print → "Saya punya model 3D/CAD" → login dengan
   `returnTo=/custom-print/request`.
2. Workspace:
   - file STL/3MF/OBJ; STEP/STP hanya lampiran
   - konfigurasi awal
   - simulasi opsional berlabel "Estimasi awal, bukan harga final"
   - kontak dan pernyataan hak
3. "Ajukan untuk Review" → Akun › Custom Print dengan status "Perlu review" →
   operator melakukan review dan slicing di Admin → email "Quote tersedia".
4. Quote: Terima (dengan konfirmasi) atau Tolak → bayar → produksi/QC.
5. Paket final diukur ("Ongkir menyusul") → ongkir final mengikuti alur yang
   sudah ada → dikirim → selesai.

**MAKE dengan referensi**

Custom 3D Print → "Saya baru punya referensi" → login → kebutuhan dan foto
opsional → "Ajukan referensi untuk review" → status → model ditambahkan →
selanjutnya sama dengan jalur model.

**Akun**

1. Hub: profil → Custom Print → Pesanan → tautkan pekerjaan lama → Privasi.
2. Setiap detail mengikuti urutan: status dan langkah berikutnya → timeline →
   nilai → tindakan yang diizinkan.
3. Privasi: ekspor, koreksi dan tutup akun, masing-masing dengan konfirmasi
   email.

**Auth**

- Masuk dengan email/password atau Google.
- Daftar: deklarasi 18+ dan persetujuan policy terpisah → verifikasi email.
- Lupa password → reset.
- Allowlist staging dan batas internal-testing tidak berubah.

**Admin**

- **Ringkasan:** perhatian (Custom Print, Pesanan, Isu) → ringkasan bisnis →
  aktivitas.
- **Daftar:** judul dan aksi → filter → tabel → paginasi.
- **Detail:** identitas dan status → data terkait → aksi sesuai state.
- **Review Custom Print:** artefak → input slicer → estimasi/quote → kirim.
- **Tarif:** Ubah → Tinjau → Terapkan (khusus Owner).

## Fase

| Task | Isi | Catatan |
| --- | --- | --- |
| T46 | Fondasi design system | Tiga arah ditunjukkan di decision page lokal (Q19); arah terpilih diterapkan ke token, tipe, motion, primitive, shell publik/auth/sistem/Admin, status label, format Rupiah, timeline dan PageHeader |
| T47 | Company | DESIGN.md ditulis ulang dari dunia yang dibangun |
| T48 | Commerce dan MAKE | Kalimat MAKE yang dilindungi tetap |
| T49 | Customer dan auth | Hub Akun, detail, refund, privasi, enam halaman auth |
| T50 | Admin | Card, status, tabel dan label dikonsolidasikan; motion Admin yang disetujui tetap |

PR yang direncanakan:

1. Dokumen ini.
2. T46 dan T47.
3. T48 dan T49.
4. T50.

Setiap fase menjalankan lint, typecheck, test, E2E dan build satu per satu,
ditambah capture lokal 320–1440 px, keyboard/fokus, zoom 200%, reduced motion dan
kontras aktual. Visual tetap berstatus belum ditinjau sampai Owner menerimanya.
T36 dan T37 berjalan setelah T50.
