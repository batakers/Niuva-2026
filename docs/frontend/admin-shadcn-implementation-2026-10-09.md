# Implementasi seluruh Admin dengan shadcn/ui — 9 Oktober 2026

Status: **diimplementasikan dan diverifikasi secara lokal**. Penerimaan visual Owner masih **belum ditinjau**.

Permintaan Owner adalah merombak UI seluruh Admin dengan dasar dashboard shadcn sambil mempertahankan identitas Niuva. Implementasi memakai konfigurasi shadcn `base-nova` yang sudah ada, dengan komposisi [dashboard shadcn](https://ui.shadcn.com/view/new-york-v4/dashboard-01) yang disesuaikan untuk operasi Niuva. Cakupan source meliputi 43 berkas page Admin melalui shell, komponen bersama, dan presenter halaman. Angka 43 adalah inventaris route source, bukan klaim bahwa setiap state di seluruh route sudah diterima secara visual.

## Hasil

| Area | Implementasi |
| --- | --- |
| Shell dan navigasi | Sidebar putih berkelompok, header, pencarian global, tombol ikon, Avatar, menu akun, dan navigasi compact melalui Sheet. Preference lipat sidebar tetap menggunakan penyimpanan lokal yang sudah ada. |
| Overview dan laporan | Card perhatian, ringkasan bisnis, aktivitas, trafik, kontrol periode, serta grafik Chart/Recharts dengan tabel data native. |
| Operasional | Orders, Custom Print, B2B, detail record, proposal, review/estimate/quote, dan penagihan memakai Card, Button, Badge, Table, breadcrumb, serta kontrol formulir bersama. |
| Pengelolaan | Products & Stock, riwayat stok, Customers, Portfolio, media, serta Informasi Situs memakai fondasi kontrol dan panel yang sama. |
| Keuangan | Invoice, pembayaran, pengeluaran, evidence upload, serta pengaturan penagihan mengikuti fondasi shadcn yang sama. |
| Owner dan pendukung | Pengaturan, tarif Custom Print, Admin & Akses, privasi, akun, aktivitas, pencarian, login, serta keamanan memakai komponen bersama sesuai permission existing. |

Space Grotesk, aset logo resmi, warna primary/semantic, radius 8px/12px, target kontrol minimal 44px, dan fokus terlihat tetap berasal dari foundation Niuva. Lebar halaman khusus tetap dapat memakai batasnya sendiri di dalam kanvas Admin.

`Card` menerima elemen semantik melalui `as`, sehingga region dan list item tidak kehilangan struktur HTML. `NativeInput` memakai kelas visual Input yang sama dan mempertahankan perilaku formulir native, termasuk input sebelum hydration dan nilai default untuk reset. `NativeSelect`, Textarea, checkbox, serta input hidden mempertahankan semantik native. Input Base UI pada pemanggil publik tetap memakai gaya dan implementasi existing.

Sheet menyediakan focus trap, Escape, serta pengembalian fokus; fallback disclosure tetap dapat dipakai tanpa JavaScript dan mempertahankan keadaan terbukanya ketika hydration selesai. Sheet baru tidak menambah gerakan dekoratif. Empat interaksi motion Admin yang sudah ada tetap memakai kontrak existing.

Nilai rupiah tetap ditampilkan dari string kanonik/BigInt. Konversi Number di grafik hanya dipakai untuk posisi visual. Tabel native menyediakan rincian kanonik. Data kosong dan sumber unavailable tetap ditampilkan secara jujur.

## Dependency dan attribution

Satu dependency langsung baru: `recharts@3.8.0`, untuk grafik shadcn yang interaktif dan responsif. Paket ini memakai lisensi MIT dan tidak memerlukan biaya berlangganan. Lockfile mencatat dependency transitifnya; pemeliharaan dan pembaruan dependency tetap diperlukan.

Kode komponen shadcn diadaptasi ke token dan kontrak Niuva. [Notice lisensi upstream](../licenses/shadcn-ui.txt) disertakan; sumber lisensi adalah [shadcn/ui MIT](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md).

## Verifikasi final

| Pemeriksaan | Hasil |
| --- | --- |
| `corepack pnpm lint` | Lulus |
| `corepack pnpm typecheck` | Lulus |
| `corepack pnpm test --maxWorkers=4` | 123 file, 1.406 pengujian lulus, coverage tetap aktif |
| `corepack pnpm db:validate` | Schema valid |
| `corepack pnpm test:e2e:admin-auth` | 22 skenario lulus dalam putaran penuh |
| `corepack pnpm test:e2e` | 111 skenario lulus, 5 skip sesuai konfigurasi existing |
| `corepack pnpm build` | Lulus; kompilasi, TypeScript, dan 91 halaman statis selesai |
| `git diff --check` | Lulus; hanya pemberitahuan normalisasi LF/CRLF pada beberapa file Windows |
| `corepack pnpm audit --prod --json` | Enam advisory pada Next.js existing; tidak ada advisory Recharts yang dilaporkan |

E2E Admin membuktikan login/MFA, batas Owner/Admin, navigasi akun/aktivitas/pencarian, notifikasi dan focus/reduced motion, BUY, DEVELOP, MAKE, invoice/PDF, pembayaran, pengeluaran, editor/stock history, informasi situs, privasi dengan dan tanpa JavaScript, laporan desktop/mobile, serta penerapan tarif pada database development-test yang memenuhi guard existing.

Pengujian baru menjaga semantik Card, navigasi mobile dan focus return, keadaan disclosure saat hydration, serta event/default-reset formulir native. Referensi hash skeleton diperbarui mengikuti perubahan yang diminta; larangan automatic `admin/loading.tsx` tetap diperiksa. Helper browser memakai actor fixture terisolasi agar pengulangan auth tidak berbagi bucket yang tidak semestinya.

Pemeriksaan manual dilakukan pada route aktual Overview, daftar Orders, Products/editor produk, dan Pengaturan, dengan ukuran desktop serta 390/320px pada surface relevan. Konfirmasi final Overview memiliki satu main, sidebar putih, tanpa overflow horizontal; Sheet terbuka, ditutup dengan Escape, dan fokus kembali ke Menu Admin. Viewport browser dikembalikan ke ukuran default.

### Perbaikan tinggi kartu Overview

Tindak lanjut Owner menyetujui penyelarasan Ringkasan bisnis dan Aktivitas terbaru saat keduanya berdampingan. Grid memakai stretch mulai breakpoint `xl`; kedua Card mengisi tinggi baris, dan footer Ringkasan bisnis memakai margin otomatis di desktop. Pada ukuran di bawah `xl`, tinggi kartu tetap mengikuti isi masing-masing.

Route aktual `/admin` diperiksa pada 320, 390, 1279, 1280, dan 1612px. Kedua kartu memiliki selisih tepi atas/bawah nol pada susunan dua kolom, termasuk saat tabel data dibuka dengan keyboard. Pada mobile, kartu tetap tersusun vertikal tanpa overflow horizontal. Footer berada di bagian bawah; kartu tidak menambah animasi. Lint, typecheck, dua pengujian komponen Overview, build produksi, dan diff check lulus setelah perbaikan.

## Runtime pengujian

Database test lama memiliki PostgreSQL `58P01` (berkas relation hilang). Data lama tidak direset. Tiga database baru berisi fixture terisolasi digunakan:

- `niuva_test_admin_shadcn_20261009` untuk diagnosis dan replay awal.
- `niuva_dev_test_admin_shadcn_20261009` untuk seluruh Admin, termasuk guard tarif yang mensyaratkan marker development.
- `niuva_test_public_shadcn_20261009` untuk regresi publik.

Semua memakai loopback 55432, dengan 25 migration existing diterapkan melalui script test repository. Tidak ada file migration existing yang diubah. Admin E2E memakai 3107; publik memakai 3199. Putaran final browser dijalankan terpisah setelah putaran bersamaan mengalami batas waktu. Assertion dan timeout tidak dilonggarkan. Engine test yang dinyalakan untuk verifikasi sudah dihentikan; data test dipertahankan. Server Niuva Owner pada 127.0.0.1:3000 tetap tersedia.

## Batas bukti dan risiko tersisa

- Penerimaan visual Owner belum direkam. Browser emulation tidak menjadi bukti perangkat fisik atau screen reader.
- Bukti ini lokal/loopback; ia tidak mengaktifkan provider atau membuktikan staging/production readiness.
- Audit menemukan 1 low, 4 moderate, dan 1 high pada Next.js 16.3.6, versi yang sama dengan baseline. Salah satunya [Image Optimization SSRF](https://github.com/advisories/GHSA-cjq9-62q9-8jv4). Pembaruan Next berada di luar perombakan UI ini.
- Warning konfigurasi existing mengenai APP_URL HTTP pada tier production masih muncul saat build; konfigurasi environment tidak diubah.
- Recharts menambah kode dan dependency untuk grafik. Pemantauan dependency dan review visual lanjutan tetap diperlukan.

## Tangkapan layar dan rollback

Hasil aktual tersedia pada [Admin lokal](http://127.0.0.1:3000/admin). Tangkapan layar final disimpan di folder visualisasi chat:

- `admin-shadcn-overview-desktop.jpg`
- `admin-shadcn-overview-mobile.jpg`
- `admin-overview-aligned-desktop.jpg`

Owner telah mengizinkan commit, push, dan pembukaan PR untuk allowlist implementasi ini. Pengiriman GitHub tidak mengaktifkan deployment atau provider. Rollback harus dibatasi pada allowlist file implementasi dan package/lockfile di bawah, setelah instruksi rollback; jangan memakai reset atau pembersihan untracked secara menyeluruh. File draft/duplikat `(1)` dan `.superpowers/` yang sudah ada tetap dipertahankan.

## Allowlist file implementasi

- `DESIGN.md`
- `docs/licenses/shadcn-ui.txt`
- `package.json`
- `pnpm-lock.yaml`
- `src/app/admin/account/page.tsx`
- `src/app/admin/action-queue-view.tsx`
- `src/app/admin/activity/page.tsx`
- `src/app/admin/admin-action-form.tsx`
- `src/app/admin/admin-list-controls.tsx`
- `src/app/admin/admin-loading.tsx`
- `src/app/admin/admin-media-editor.tsx`
- `src/app/admin/admin-page-header.tsx`
- `src/app/admin/admin-work-list.tsx`
- `src/app/admin/admins/deactivate-button.tsx`
- `src/app/admin/admins/new/invitation-form.tsx`
- `src/app/admin/admins/new/page.tsx`
- `src/app/admin/admins/page.tsx`
- `src/app/admin/content/site-information/site-information-form.tsx`
- `src/app/admin/custom-print/[id]/page.tsx`
- `src/app/admin/custom-print/[id]/review/review-workspace.tsx`
- `src/app/admin/custom-print/page.tsx`
- `src/app/admin/customers/[id]/page.tsx`
- `src/app/admin/customers/page.tsx`
- `src/app/admin/finance/expenses/[id]/page.tsx`
- `src/app/admin/finance/expenses/new/page.tsx`
- `src/app/admin/finance/expenses/page.tsx`
- `src/app/admin/finance/invoices/[id]/page.tsx`
- `src/app/admin/finance/invoices/new/page.tsx`
- `src/app/admin/finance/invoices/page.tsx`
- `src/app/admin/finance/payments/[id]/page.tsx`
- `src/app/admin/finance/payments/page.tsx`
- `src/app/admin/finance/settings/page.tsx`
- `src/app/admin/inquiries/[id]/b2b-quote-panel.tsx`
- `src/app/admin/inquiries/[id]/billing/page.tsx`
- `src/app/admin/inquiries/[id]/page.tsx`
- `src/app/admin/inquiries/[id]/proposal/page.tsx`
- `src/app/admin/inquiries/page.tsx`
- `src/app/admin/orders/[id]/page.tsx`
- `src/app/admin/orders/page.tsx`
- `src/app/admin/overview-view.tsx`
- `src/app/admin/portfolio/[id]/page.tsx`
- `src/app/admin/portfolio/page.tsx`
- `src/app/admin/privacy/[id]/page.tsx`
- `src/app/admin/privacy/page.tsx`
- `src/app/admin/privacy/policy/page.tsx`
- `src/app/admin/products/[id]/page.tsx`
- `src/app/admin/products/[id]/stock-adjustment-panel.tsx`
- `src/app/admin/products/[id]/stock/[variantId]/page.tsx`
- `src/app/admin/products/page.tsx`
- `src/app/admin/reports/report-view.tsx`
- `src/app/admin/search/page.tsx`
- `src/app/admin/settings/custom-print-rates/page.tsx`
- `src/app/admin/settings/custom-print-rates/tariff-form.tsx`
- `src/app/admin/settings/page.tsx`
- `src/app/admin/sign-in/[[...sign-in]]/page.tsx`
- `src/components/niuva/admin-account-menu.tsx`
- `src/components/niuva/admin-auth-form.tsx`
- `src/components/niuva/admin-global-search.tsx`
- `src/components/niuva/admin-notification-center.tsx`
- `src/components/niuva/admin-notification-toast.tsx`
- `src/components/niuva/admin-security-form.tsx`
- `src/components/niuva/admin-session-actions.tsx`
- `src/components/niuva/admin-shell.tsx`
- `src/components/niuva/admin-sidebar.tsx`
- `src/components/niuva/admin-trend-chart.tsx`
- `src/components/niuva/finance-action-form.tsx`
- `src/components/niuva/finance-list-controls.tsx`
- `src/components/niuva/financial-evidence-upload.tsx`
- `src/components/niuva/privacy-form.tsx`
- `src/components/ui/avatar.tsx`
- `src/components/ui/breadcrumb.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/chart.tsx`
- `src/components/ui/field.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/native-select.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/textarea.tsx`
- `tests/e2e-admin-auth/admin-operations.spec.ts`
- `tests/e2e-admin-auth/helpers/session.ts`
- `tests/unit/admin-mobile-hydration.test.tsx`
- `tests/unit/admin-mobile-navigation.test.tsx`
- `tests/unit/admin-sidebar.test.tsx`
- `tests/unit/card-semantics.test.tsx`
- `tests/unit/input-form-events.test.tsx`
- `tests/unit/system-pages-coverage.test.ts`
- `docs/frontend/admin-shadcn-implementation-2026-10-09.md`
