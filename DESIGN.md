---
version: "alpha"
name: Niuva Design System
description: "Fondasi runtime v1.0; panduan komposisi berbasis konten untuk partner pengembangan produk dengan kapabilitas manufaktur."
colors:
  primary: "#3F607F"
  on-primary: "#FFFFFF"
  primary-hover: "#344F67"
  primary-pressed: "#2B4053"
  brand: "#6390BB"
  background: "#F8FAFC"
  foreground: "#0F172A"
  surface: "#FFFFFF"
  muted: "#F1F5F9"
  muted-foreground: "#475569"
  border: "#E2E8F0"
  input: "#64748B"
  dark-background: "#0F172A"
  dark-foreground: "#F8FAFC"
  dark-surface: "#1E293B"
  dark-muted-foreground: "#CBD5E1"
  success: "#166534"
  success-background: "#F0FDF4"
  warning: "#92400E"
  warning-background: "#FFFBEB"
  info: "#1D4ED8"
  info-background: "#EFF6FF"
  destructive: "#B91C1C"
  destructive-background: "#FEF2F2"
typography:
  display:
    fontFamily: "Space Grotesk"
    fontSize: 40px
    fontWeight: 600
    lineHeight: 43px
    letterSpacing: "-0.03em"
  heading:
    fontFamily: "Space Grotesk"
    fontSize: 30px
    fontWeight: 600
    lineHeight: 36px
    letterSpacing: "-0.02em"
  subheading:
    fontFamily: "Space Grotesk"
    fontSize: 22px
    fontWeight: 600
    lineHeight: 29px
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Space Grotesk"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0em
  ui-data:
    fontFamily: "Space Grotesk"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0em
    fontFeature: "tnum"
  editorial-accent:
    fontFamily: "Fraunces"
    fontSize: 28px
    fontWeight: 500
    lineHeight: 35px
    letterSpacing: "-0.01em"
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  full: 9999px
spacing:
  section: 4rem
  content: 1.5rem
  card: 1rem
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.ui-data}"
    rounded: "{rounded.sm}"
    height: 44px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
    textColor: "{colors.on-primary}"
  page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
  content-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  quiet-surface:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
  dark-stage:
    backgroundColor: "{colors.dark-background}"
    textColor: "{colors.dark-foreground}"
  dark-content:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-muted-foreground}"
  status-success:
    backgroundColor: "{colors.success-background}"
    textColor: "{colors.success}"
  status-warning:
    backgroundColor: "{colors.warning-background}"
    textColor: "{colors.warning}"
  status-info:
    backgroundColor: "{colors.info-background}"
    textColor: "{colors.info}"
  status-error:
    backgroundColor: "{colors.destructive-background}"
    textColor: "{colors.destructive}"
---

# Niuva Design System

## Overview

**Status: aktif.** Konsep panduan disetujui Owner pada 11 Oktober 2026, dengan shadcn/ui sebagai dasar komponen seluruh halaman Niuva sesuai kontrak Components di bawah. Nilai fondasi tetap Foundation/Typography v1.0 yang diotorisasi DS-DEC-019. Pembaruan ini hanya dokumentasi; token dan UI runtime belum diubah. `version: alpha` di atas adalah versi format Google DESIGN.md, bukan versi fondasi Niuva.

**The Precision Workshop** berarti antarmuka membantu orang memeriksa kebutuhan, artefak, keputusan, dan langkah berikutnya. Niuva adalah partner pengembangan produk dengan kapabilitas manufaktur; jangan menyempitkan identitasnya menjadi toko printer atau startup SaaS. Kekhasan berasal dari pekerjaan dan bukti Niuva: prototipe yang sedang diuji, model yang perlu direview, produk yang bisa dibeli, atau order yang perlu ditangani.

Hipotesis **Minimalist Editorial × Precision Engineering** cocok untuk diuji sebagai penajaman arah tersebut. Terjemahan kerjanya: judul mengungkap tugas, bukti mendapat ruang sesuai kepentingannya, metadata menjelaskan artefak, dan tindakan mengikuti keputusan pengguna. Hipotesis ini belum membuktikan bahwa font, palet, atau seluruh tampilan lama harus diganti. [Proposal fondasi](docs/design/foundation-proposal.md) berstatus usulan, bukan instruksi aktif.

Baca dokumen bersama ini lalu hanya panduan area yang relevan:

| Area | Panduan penerapan | Keberhasilan pengguna |
| --- | --- | --- |
| Company: `/`, layanan, projects | [Company](docs/design/company.md) | Memahami kemampuan Niuva dan memilih langkah berikutnya |
| Shop, MAKE, cart, checkout, akun | [Commerce & Customer](docs/design/commerce.md) | Memeriksa produk, konsekuensi, dan status sebelum bertindak |
| Seluruh Admin | [Admin](docs/design/admin.md) | Menemukan pekerjaan dan menyelesaikannya dengan akurat |

PRD beserta addenda menentukan produk; Tech Design beserta addenda menentukan kontrak teknis; [AGENTS.md](AGENTS.md) menentukan workflow. [PRODUCT_CONTEXT.md](PRODUCT_CONTEXT.md) memiliki positioning, bahasa, dan vocabulary. Nilai yang benar-benar dikirim ke browser berada di [globals.css](src/app/globals.css), kelas tipe di [typography.ts](src/design/typography.ts), dan pemuatan font di [layout.tsx](src/app/layout.tsx). Bila dokumentasi berbeda dengan kode, catat drift dan periksa authority terbaru; jangan menganggap salah satunya otomatis memberi izin mengubah kontrak.

## Colors

Gunakan semantic class/token dari runtime. Front matter menuliskan nilai yang sudah di-resolve untuk pemeriksaan; bukan sumber CSS kedua atau generator tema baru. `components` di front matter adalah pasangan warna representatif untuk lint, bukan katalog state runtime yang lengkap.

| Token dokumentasi | Sumber runtime terang | Peran |
| --- | --- | --- |
| `brand` | `--brand-500` | Logo resmi dan aksen identitas; bukan teks normal pada putih |
| `primary / on-primary` | `--primary / --primary-foreground` | Tindakan utama dan labelnya |
| `primary-hover / primary-pressed` | `--brand-800 / --brand-900` | Nilai state yang tersedia; dukungan state bergantung pada komponen |
| `background / foreground` | `--background / --foreground` | Kanvas dan teks utama |
| `surface` | `--card` | Form, kelompok record, dan permukaan konten |
| `muted / muted-foreground` | `--muted / --muted-foreground` | Pengelompokan dan teks sekunder |
| `border / input` | `--border / --input` | Divider tenang / batas input yang lebih kuat; keduanya berbeda |
| `success / warning / info / destructive` | Token semantic dengan nama yang sama | Status dengan label; background memakai pasangan `*-background` |
| `dark-background / dark-foreground / dark-surface / dark-muted-foreground` | `.dark`: `--background / --foreground / --card / --muted-foreground` | Konteks gelap yang disengaja |

Warna logo terkunci pada Logo System v1.0. Gelap-terang boleh menandai perubahan konteks pada Company; tidak wajib bergantian pada setiap seksi. Commerce tetap light-first; Admin netral dan operasional. Status, selected, error, dan fokus harus punya petunjuk selain warna. Periksa kontras hasil compositing aktual, termasuk opacity, hover, disabled, dan gambar di belakang teks; lint pasangan solid tidak memeriksa semuanya.

CLI Google 0.4.0 melaporkan orphan warning untuk `brand`, `border`, dan `input`: logo adalah aset resmi, sedangkan contoh pasangan komponen tidak mendeklarasikan properti border. Ketiganya dipetakan ke runtime di atas dan sengaja dipertahankan; jangan membuat pasangan teks/background palsu untuk menghilangkan warning.

## Typography

Space Grotesk adalah family utama. Fraunces hanya untuk statement atau quote editorial yang memang perlu jeda suara; bukan label, navigasi, harga, data, atau body panjang. Pedoman historis 5–10% berarti aksen minor, bukan kuota yang harus diisi. Halaman tanpa Fraunces tetap valid. Tidak ada family mono ketiga pada v1.0; nama variable `--font-public-sans` memuat Space Grotesk, bukan Public Sans.

Front matter merekam nilai **compact**. Tabel berikut melengkapi perilaku responsive yang sudah ada di kelas bersama; jangan mengirim front matter saja sebagai spesifikasi typography lengkap.

| Role di `typographySystemTokens` | Compact: <640px | Standard: 640–1279px | Wide: ≥1280px | Weight; tracking |
| --- | --- | --- | --- | --- |
| `display` | 40/43px | 48/51px | 60/63px | 600; -.03 / -.035 / -.04em |
| `heading` | 30/36px | 36/42px | 40/46px | 600; -.02 / -.025 / -.03em |
| `subheading` | 22/29px | 24/31px | 24/31px | 600; -.015em |
| `body` | 16/24px | 16/24px | 16/24px | 400; 0 |
| `ui-data` | 14/20px | 14/20px | 14/20px | 500; 0; angka tabular |
| `editorial-accent` | 28/35px | 32/39px | 36/43px | 500; -.01em |

Gunakan role sesuai fungsi, bukan selalu `display` untuk setiap h1. Heading dokumen/operasional boleh memakai skala lebih kecil dari headline Company; jelaskan pengecualian yang sudah ada daripada meratakan seluruh aplikasi. Body panjang memakai measure sekitar 55–70ch. Technical micro-label yang berguna memakai Space Grotesk 12/18px, weight 500, tracking .05em, uppercase 1–3 kata; belum ada export role khususnya di file typography.

Berat inti 400/500/600; 700 adalah pengecualian, 300 bukan default v1. Fraunces memakai Roman normal dan optical sizing `opsz`; tidak menambahkan italic, SOFT, atau WONK. Fallback sans: Arial/Helvetica/sans-serif; accent: Georgia/serif. Uji judul, angka, dan label panjang ketika web font gagal.

## Layout

| Kontrak | Nilai aktif dan pemakaian |
| --- | --- |
| Public / reading container | `max-w-public` 72rem / `max-w-reading` 48rem |
| Admin shell / area kerja | Shell memenuhi viewport; inner content `max-w-admin` 90rem sesuai implementasi aktif |
| Gutter public | 1.25rem compact; 2rem mulai 640px |
| Jarak semantic | `spacing-section` 4rem; `spacing-content` 1.5rem; `spacing-card` 1rem |
| Variasi lokal existing | Seksi public dapat 5rem pada layar lebar; isi operasional rapat dapat .75rem |
| Ukuran seksi | Mengikuti isi dan keputusan pengguna; tidak wajib satu viewport |

Gunakan grid untuk hubungan konten. Narasi pendek dengan satu artefak besar bisa memakai pembagian 5/7 dari 12 kolom; judul layanan dengan uraian panjang bisa 4/8. Ini contoh komposisi lokal, bukan token baru atau template wajib. Pada compact, susun kebutuhan → bukti/opsi → tindakan dalam urutan DOM yang bisa dibaca.

Pilih wadah berdasarkan tugas: paragraf untuk penjelasan, daftar untuk langkah, definition list untuk spesifikasi, tabel untuk perbandingan, grid gambar untuk katalog, card untuk record/tugas dengan batas yang nyata. Kekosongan antara dua blok harus menjelaskan perubahan topik atau prioritas. Jangan membesarkan whitespace sampai harga, error, atau pekerjaan Admin sulit ditemukan.

## Elevation & Depth

Gunakan divider, alignment, dan perubahan tone sebelum shadow. `shadow-card` mengikuti `--shadow-card-token` untuk kelompok yang perlu terpisah; `shadow-floating` mengikuti `--shadow-floating-token` untuk overlay. Jangan menambah shadow pada setiap seksi atau membuat panel berlapis hanya untuk kedalaman visual. Dialog, menu, dan Sheet tetap perlu pemisahan serta focus management yang jelas.

## Shapes

Runtime `--radius-control / --radius-card / --radius-media` adalah 8/12/16px. Front matter `rounded.sm / md / lg` memetakan peran tersebut, bukan nama utility radius Tailwind. Pill 9999px untuk badge yang memang sesuai; jangan menerapkannya otomatis pada semua CTA.

Foto produk, CAD, atau artefak yang harus diperiksa utuh memakai `contain`. Foto proses/workshop boleh `cover` dengan crop dan focal point yang menjaga bukti. Rasio dipilih per kebutuhan media, tidak ditetapkan global. Jangan memberi tekstur blueprint, crosshair, nomor seksi, atau garis ukur jika tidak menjelaskan objek atau proses yang nyata.

## Components

**Keputusan Owner — 11 Oktober 2026:** seluruh halaman Niuva menggunakan **shadcn/ui sebagai dasar komponen bersama**. Cakupannya Company Website, Commerce/Customer (Shop, MAKE, cart, checkout, quote/status, account, auth/pemulihan), dan seluruh Admin, termasuk state loading, empty, error, dan unavailable pada area tersebut.

Gunakan konfigurasi proyek yang sudah ada: [components.json](components.json) memakai `base-nova`, primitive lokal berada di `src/components/ui`, dan komponen khusus Niuva berada di `src/components/niuva`. Aturan lapis komponen mengikuti [Tech Design](docs/TechDesign-Niuva-MVP.md):

- Kode fitur memakai `@/components/ui/*` atau komposisi `@/components/niuva/*`. Gunakan atau perluas komponen lokal yang sesuai; jangan membuat Button, Input, Dialog, atau primitive setara yang paralel khusus untuk satu area.
- Komponen domain seperti product card, project evidence, ringkasan quote, atau workspace MAKE disusun dari komponen bersama. Kebutuhan khusus yang belum memiliki padanan diperluas pada lapis bersama yang tepat sambil mempertahankan kontrak semantik dan aksesibilitas.
- Import Base UI langsung dibatasi pada pembangunan/perubahan shared primitive. Form native, progressive enhancement, serta fallback tanpa JavaScript yang berlaku tetap dipertahankan.
- Tema komponen mengikuti logo, font, semantic tokens, radius, fokus, dan state Niuva. Jangan menginisialisasi ulang shadcn atau menimpa fondasi dengan preset/demo sebagai langkah default.
- Heading, paragraf, daftar, media, dan layout tetap memakai HTML semantik yang sesuai. Komposisi halaman tetap milik route: Company mengutamakan narasi/bukti, Commerce keputusan produk/transaksi, dan Admin pekerjaan operasional. Berbagi komponen tidak mewajibkan shell, density, card, atau layout dashboard yang sama.

**Status implementasi:** Admin sudah memakai fondasi shadcn/ui `base-nova`. Keputusan cakupan global ini tidak menyatakan seluruh halaman lain sudah bermigrasi atau diterima secara visual. Migrasi runtime tidak dikerjakan dalam pembaruan dokumen ini; penerapannya mengikuti permintaan implementasi berikutnya.

| Komponen | Kontrak |
| --- | --- |
| Button / link aksi | Tinggi minimum 44px, radius control, label wrap. Link untuk navigasi; button untuk mutasi. Gunakan varian yang ada dan state aslinya; jangan menyatakan semua varian memiliki pressed color yang belum diimplementasikan. |
| Form | Label nyata; input memakai `border-input`, bukan divider `border-border`. Bantuan/error dekat field; loading mencegah submit ganda tanpa menghilangkan konteks. Form native/progressive enhancement dipertahankan. |
| Focus / status | `focus-visible` jelas tanpa layout shift; pola ring 3px dan offset/separator sesuai surface. Validasi kontras aktual ring, termasuk opacity. Status loading/hasil memakai live region yang tepat; spinner dekoratif. |
| Card / badge | Card mengelompokkan record atau satu tugas; landmark/heading tetap semantik. Jangan nest control di link seluruh card. Badge noninteraktif boleh 24px dan label wrap. |
| Option chip | Komposisi Button shadcn dengan elemen button native minimum 44px, selected marker 18px, `aria-pressed`, dan unavailable yang jelas. Bukan pengganti semua selector. |
| Summary | Nilai dan tindakan mudah diperiksa dalam alur. Tidak ada floating sticky bar global; pengecualian harus berasal dari kebutuhan route dan kontrak produk. |
| Navigation / shell | Detail public di Company; detail akun/checkout di Commerce; shell dan navigasi berizin di Admin. Jangan menyalin kontrak shell lama dari arsip. |

## Do's and Don'ts

| Keputusan yang membantu Niuva | Pola yang perlu alasan konkret |
| --- | --- |
| Bukti proyek menunjukkan objek, kebutuhan, proses, dan output yang bersumber | Hero besar berisi klaim umum tanpa artefak atau informasi yang bisa diperiksa |
| Pisahkan DEVELOP, MAKE, BUY melalui maksud pengguna | Tiga layanan diperlakukan seperti paket subscription atau CTA checkout yang sama |
| Harga/status/varian dekat objek yang dipilih | Whitespace atau animasi menggeser informasi transaksi dari keputusan |
| Card untuk record, product, atau pekerjaan yang benar-benar terpisah | Semua paragraf, langkah, capability, dan CTA dibungkus rounded card |
| Metrik Admin punya definisi, periode, sumber, serta tujuan tindakan | Angka contoh, vanity KPI, atau chart tanpa manfaat operasional |
| Metadata menjawab material, tahap, status, atau konteks yang relevan | Eyebrow, nomor, badge, gradient, glass, glow, blob, atau 3D yang hanya mengisi ruang |

Centered hero, tiga kolom, card, dan bento bukan larangan universal. Gunakan ketika konten dan tugas mendukungnya; jangan mengganti pola yang mudah dipahami hanya agar terlihat berbeda. Pada public, gradient/dekorasi tetap memerlukan tujuan yang disetujui brief, bukan menjadi default. Originalitas tidak boleh mengurangi usability.

Bahasa UI adalah Bahasa Indonesia yang langsung. Copy Company menghubungkan kebutuhan → cara kerja → bukti → tindakan; copy operasional menjelaskan keadaan dan langkah berikutnya. Jangan menciptakan klien, outcome, harga, stok, testimoni, spesifikasi, atau media yang tampak nyata tanpa sumber. Prinsip copy rinci ada di PRODUCT_CONTEXT; `niuva-editorial` adalah bantuan editorial opsional.

## Responsive Behavior

Periksa 320/390px, sekitar 768/1024px, serta 1280/1440px sesuai route; breakpoint mengikuti kebutuhan konten. Compact bukan desktop yang diperkecil: ubah urutan, jumlah kolom, dan letak utilitas tanpa mengubah keputusan pengguna. Halaman tidak boleh overflow horizontal; tabel lebar dapat memakai area scroll berlabel yang disengaja.

Kontrol interaktif minimum 44px; navigasi keyboard, heading/landmark, label/error, zoom 200%, focus return pada overlay, dan state loading/empty/error/success diperiksa pada implementasi. Mobile navigation memakai disclosure/Sheet yang sesuai dan dapat ditutup dengan Escape. Browser emulation tidak membuktikan perangkat fisik atau screen reader.

### Motion

Motion memberi umpan balik. Gunakan duration-fast 150ms, duration-normal 220ms, dan ease-standard dari runtime. Press pointer/touch maksimal 1px selama sekitar 100ms. Fokus serta status langsung; jangan memakai animasi layout, scroll reveal, atau angka menghitung sebagai hiasan. Saat reduced motion, hentikan gerakan nonesensial dan pertahankan penyampaian state. Empat interaksi Admin yang disetujui dijelaskan hanya di [panduan Admin](docs/design/admin.md).

## Iteration Guide

Mulai dari brief, route sebenarnya, panduan area, komponen, dan artefak yang tersedia. Nyatakan keputusan komposisi singkat bersama alasan kontennya; tidak perlu putaran konsep atau preview terpisah. Jalankan [review kualitas](docs/design/quality.md) pada route yang diimplementasikan. [Skill niuva-design](.agents/skills/niuva-design/SKILL.md) membantu menghubungkan langkah ini tanpa menggandakan token.

Ubah panduan bersama hanya untuk keputusan lintas halaman; ubah panduan area untuk kontrak area. Perubahan fondasi yang belum diputuskan tetap di proposal berstatus usulan. Tidak ada desain massal sebagai konsekuensi otomatis dari pembaruan dokumen ini.

## Known Gaps

Audit 11 Oktober berbasis source dan lint; server lokal :3000 tidak aktif saat dicoba. Dokumen ini tidak mengklaim review visual baru, perbaikan seluruh drift UI, pengujian device/AT, atau kesiapan produksi. Inventaris temuan, studi sumber, dan eksperimen pertama ada di [laporan audit](docs/design/audit-2026-10-11.md).

Kontrak shell Admin 1/7 Oktober serta komposisi empat kartu sebelum penghentian B2B bukan instruksi aktif. Gunakan panduan Admin, navigasi runtime, dan keputusan 8/9/11 Oktober. [Arsip AUiS](docs/archive/auis-retired/DESIGN-before-retirement.md) tetap bukti historis; acceptance-nya tidak diperluas. Bukti implementasi yang pernah diperiksa berada di [release readiness](docs/frontend/mvp-release-readiness.md) dan [verifikasi Admin](docs/frontend/admin-redesign-verification-2026-10-08.md).
