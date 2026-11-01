# Admin Dashboard — pedoman penerapan aktif

Baca setelah [DESIGN.md](../../DESIGN.md). Berlaku untuk seluruh Admin setelah gate auth/permission existing. **shadcn/ui base-nova yang sudah diterapkan dipertahankan sebagai bagian dari dasar komponen global Niuva**, sesuai keputusan Owner 11 Oktober 2026. Konfigurasinya ada di [components.json](../../components.json), primitive lokal di src/components/ui, dan identitas memakai fondasi Niuva. Company dan Commerce memakai lapis komponen yang sama dengan komposisi masing-masing; shell, sidebar, dan kepadatan dashboard di panduan ini khusus kebutuhan Admin.

## Shell dan navigasi saat ini

Gunakan [AdminShell](../../src/components/niuva/admin-shell.tsx), [AdminSidebar](../../src/components/niuva/admin-sidebar.tsx), dan [navigation-items.ts](../../src/modules/admin/navigation-items.ts). Jangan membuat shell kedua untuk halaman detail.

| Bagian | Baseline implementasi aktif |
| --- | --- |
| Outer shell | Memenuhi viewport tanpa margin luar dekoratif |
| Area kerja | Inner content max-w-admin 90rem; gutter 16/24/32px mengikuti compact/sm/lg |
| Sidebar desktop | Primitive lokal memakai lebar 16rem terbuka / 4rem rail; sumbernya src/components/ui/sidebar.tsx |
| Navigasi | Ringkasan, Pesanan, Custom Print, Produk & Stok, Customer, Keuangan (Invoice, Pembayaran, Pengeluaran), Konten, Laporan, dan grup Owner mengikuti grouping/permission source; label Indonesia sesuai sitemap T45 (Q20) |
| Navbar | Pencarian global, Situs publik, lonceng, dan menu akun; utilitas dapat reflow |
| Compact | Sheet navigasi setelah hydration; native disclosure sebelum hydration/no-JS |
| Identitas | Logo resmi lengkap/simbol sesuai keadaan sidebar; label, tooltip, aria-current, dan fokus tetap tersedia |

Preferensi collapse existing tetap dipertahankan. Jangan mengganti lebar 16rem kembali menjadi 13.25rem hanya karena kontrak Oktober awal masih ditemukan dalam history. Shell memenuhi viewport tidak berarti seluruh isi harus selalu melebar tanpa batas.

Penyembunyian menu bukan otorisasi. Role, MFA, AdminProfile, read/download/mutation, dan permission domain tetap mengikuti boundary server. Guideline tidak menambah akses atau mengubah sesi.

## Komposisi mengikuti pekerjaan

| Surface | Susunan informasi | Alasan |
| --- | --- | --- |
| Ringkasan | Pekerjaan perlu perhatian → isu bila ada → ringkasan bisnis/aktivitas → trafik yang tersedia | Menemukan pekerjaan sebelum membaca laporan |
| Daftar domain | Judul dan aksi → search/filter → hasil dan pagination | Membandingkan record dengan posisi kembali yang jelas |
| Detail record | Breadcrumb/back context → identitas/status → data terkait → tindakan sesuai state | Mencegah aksi pada record atau status yang salah |
| Workspace review MAKE | Artefak/file → input review → estimasi/quote → konsekuensi tindakan | Operator dapat memeriksa dasar keputusan |
| Form pengaturan | Kelompok label/help → perubahan → review/terapkan sesuai workflow existing | Pengguna nonteknis dapat memeriksa dampak |
| Laporan | Periode/definisi → angka ringkas → chart dengan data table/fallback | Angka dapat dijelaskan dan diperiksa |

Ringkasan sekarang memiliki **tiga** kartu perhatian: Custom Print, Pesanan, dan Isu. Ikon kartu netral; garis amber hanya pada kartu Isu ketika ada isu terbuka, dan kartu tidak membawa panah dekoratif. Kartu inquiry keempat tidak dipulihkan setelah keputusan B2B WhatsApp 11 Oktober. Jumlah ini menggambarkan source saat audit, bukan aturan bahwa semua dashboard harus memiliki tiga KPI. Kartu harus menunjuk pekerjaan atau keputusan yang nyata.

Bento existing pada Ringkasan boleh dipertahankan. Equal height pada wide hanya membantu alignment; mobile memakai tinggi alami. Jangan menyebarkan bento ke daftar order atau form panjang untuk memaksakan satu tampilan.

## Kepadatan, data, dan state

Gunakan tipe UI yang dapat dipindai; judul record tidak menjadi headline Company. Harga/jumlah memakai alignment dan tabular numerals; label menjelaskan definisi serta periode. Card header tidak boleh lebih menonjol dari pekerjaan di dalamnya.

Tabel dipakai untuk membandingkan record, bukan dipaksa menjadi kumpulan card besar. Pada compact, pilih kolom prioritas, detail yang dapat dibuka, atau area scroll tabel berlabel; jangan membuat seluruh halaman overflow atau menghilangkan konteks record. Kembalikan filter/page/range yang valid saat keluar dari detail sesuai return context existing.

Nilai unknown/unavailable memakai penjelasan; bukan nol palsu. Empty state memberi langkah operasional yang relevan. Ringkasan keuangan, trafik, dan aktivitas tidak menciptakan laba, saldo rekening, unique visitor, attribution, atau data contoh. Grafik Recharts adalah presentasi; uang canonical tetap string/BigInt/Decimal sesuai service, dan tabel data native tetap tersedia.

## Status, kartu, dan tabel bersama (T50)

- Status tampil lewat `AdminStatusBadge` (`src/app/admin/admin-ui.tsx`) dengan label dan nada dari `src/modules/admin/status-labels.ts`: amber bila operator perlu bertindak, merah bila perlu perbaikan, hijau bila selesai, netral untuk sisanya. Jangan menampilkan enum mentah atau menulis ulang label per halaman.
- `Card` dipakai dengan default (putih, hairline, radius kartu); halaman hanya menambah padding atau tata letak. Hitungan di atas daftar memakai `AdminSummaryCard`.
- Header tabel memakai `adminTableHeaderClass`: kalimat biasa, pita `neutral-50`, tanpa huruf kapital berjarak.
- Copy memakai "pesanan", "Produk Toko", dan "Custom Print"; aksi status berbunyi "Ubah ke <label status>".

## Primitive dan interaksi

- Pakai Button, Field, Input, NativeInput, NativeSelect, Table, Card, Badge, Avatar, breadcrumb, Sheet, dan Chart lokal sesuai perilakunya.
- Perluasan primitive bersama mengikuti kontrak Components di DESIGN dan diperiksa pada pemakai lain yang terdampak. Jangan membuat fork primitive khusus Admin atau mengekspor komposisi dashboard sebagai template wajib untuk Company/Commerce.
- Card dapat mempertahankan section/article/aside/li melalui prop as. Jangan menghapus landmark atau heading demi styling.
- Form/filter GET native serta data yang diketik sebelum hydration tetap terpelihara. Reset native mengikuti default value yang benar.
- Navigasi link dan button mutasi tetap berbeda, termasuk ketika memakai prop render pada primitive Base UI.
- Fokus ring, label icon-only, touch target 44px, Escape, focus trap/return, dan reduced motion diperiksa pada hasil aktual.
- Inline status, bantuan, dan validation dekat field; angka atau bahasa teknis internal tidak menggantikan penjelasan bisnis.
- Field vertikal mengikuti jarak global 16px antara label dan kontrol; bantuan/error tetap dekat ke kontrol. Checkbox/radio tetap inline dengan jarak internal sesuai kontraknya.
- Tarif Custom Print mempertahankan Ubah → Tinjau → Terapkan khusus Owner dan snapshot/validasi existing. Perubahan visual tidak mengaktifkan tarif/provider atau menyelesaikan business TBD.

Pencatatan keuangan manual existing tidak dihapus hanya karena intake inquiry/proposal B2B sudah dihentikan. Audit/design task tidak mengubah business logic tersebut.

## Motion yang sudah disetujui

Arah ringan/cepat 8 Oktober berlaku hanya pada empat interaksi: pop-up perhatian baru, panel lonceng, isi menu akun, dan respons tombol ikon custom.

| Interaksi | Nilai dan perilaku |
| --- | --- |
| Toast | Masuk/keluar melalui translateY 8px dan opacity |
| Panel/menu | Scale .98 → 1 dan opacity; origin mengikuti pemicu |
| Durasi | duration-normal 220ms untuk panel/toast; duration-fast 150ms untuk keluar/menu |
| Press pointer/touch | Maksimal 1px, sekitar 100ms |
| Easing | ease-standard runtime |
| Exit / reduced motion | Elemen keluar tidak interaktif/tidak masuk navigasi aksesibilitas; keyboard/fokus dan reduced motion langsung |

Tidak ada animasi dekoratif pada Ringkasan, angka, grafik, pencarian shortcut, navigasi daftar, atau lebar sidebar. Penerimaan arah motion tidak sama dengan penerimaan visual implementasinya.

## Authority dan keputusan yang digantikan

[Spec 8 Oktober](../superpowers/specs/2026-10-08-admin-redesign-design.md), fondasi base-nova 9 Oktober, serta [keputusan B2B 11 Oktober](../superpowers/specs/2026-10-11-b2b-whatsapp-design.md) menjelaskan perubahan aktif. Catatan 1/7 Oktober tentang menu Action Queue/Pricing Rules utama, lebar sidebar lama, header utilitas lama, dan empat kartu sebelum retirement B2B adalah historis; jangan menggunakannya sebagai instruksi desain aktif.

Gunakan [quality review](quality.md). Bukti [verifikasi Admin terdahulu](../frontend/admin-redesign-verification-2026-10-08.md) tetap scoped pada pemeriksaan yang dicatat; dokumentasi baru tidak memberi Owner acceptance untuk seluruh Admin.
