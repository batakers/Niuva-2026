---
version: "alpha"
name: Niuva Design System
description: "Fondasi runtime v2: dasar biru-dingin terang, satu bidang Niuva Blue, permukaan putih membulat, Manrope, dan maskot Niuva sebagai satu-satunya ilustrasi."
colors:
  brand: "#6390BB"
  brand-50: "#F1F6FB"
  brand-100: "#E6EEF7"
  brand-200: "#D3E2F0"
  brand-400: "#8EB2D3"
  brand-600: "#4F7CA9"
  brand-800: "#2D5278"
  primary: "#3D6893"
  on-primary: "#FFFFFF"
  primary-hover: "#2D5278"
  background: "#F2F5F9"
  foreground: "#0F1D2E"
  surface: "#FFFFFF"
  surface-quiet: "#F7F9FC"
  muted: "#E4EAF1"
  muted-foreground: "#4A5A6D"
  border: "#DBE2EB"
  input: "#6B7A8C"
  ring: "#4F7CA9"
  dark-background: "#0F1D2E"
  dark-foreground: "#F7F9FC"
  dark-surface: "#1F2F42"
  dark-muted-foreground: "#DBE2EB"
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
    fontFamily: "Manrope"
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.022em"
  heading:
    fontFamily: "Manrope"
    fontSize: 30px
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  subheading:
    fontFamily: "Manrope"
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.012em"
  body:
    fontFamily: "Manrope"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: 0em
  lead:
    fontFamily: "Manrope"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: 0em
  ui:
    fontFamily: "Manrope"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0em
  caption:
    fontFamily: "Manrope"
    fontSize: 13.5px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0em
  ui-data:
    fontFamily: "Manrope"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0em
    fontFeature: "tnum"
  editorial-accent:
    fontFamily: "Manrope"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.018em"
rounded:
  control: 12px
  card: 22px
  media: 30px
  pill: 9999px
spacing:
  section: 8rem
  content: 1.5rem
  card: 1rem
components:
  button-outline:
    textColor: "{colors.foreground}"
    typography: "{typography.ui}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
    height: 44px
  button-outline-hover:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
  button-on-brand:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.ui}"
    rounded: "{rounded.pill}"
    height: 44px
  button-on-brand-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.brand-800}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.ui}"
    rounded: "{rounded.pill}"
    height: 44px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
  blue-panel:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.media}"
  mascot-panel:
    backgroundColor: "{colors.brand-100}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.media}"
  content-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.card}"
  fact-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.caption}"
    rounded: "{rounded.control}"
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

**Status: aktif — Foundation v2.** Fondasi v2 diputuskan Owner pada 31 Oktober 2026 (TASKS.md "Redesign frontend", Q19–Q25, T46) dan menggantikan Foundation/Typography v1.0 yang diotorisasi DS-DEC-019. Beranda diterima Owner secara visual pada 31 Oktober 2026. Acceptance visual halaman lain, pengujian device/AT, staging, dan produksi tetap gerbang terpisah dan **belum direview**. `version: alpha` di atas adalah versi format Google DESIGN.md, bukan versi fondasi Niuva.

**Creative North Star: "Ide → Produk jadi, dibawa maskot Niuva."** Niuva adalah partner pengembangan produk dengan kapabilitas manufaktur; dunianya terang, tenang, dan ramah. Dasar biru-dingin yang terang menampung permukaan putih membulat di atas hairline; satu bidang Niuva Blue menjadi satu-satunya warna jenuh, dan di sanalah maskot Niuva (render Blender milik Owner) berdiri bersama fakta nyata dalam kartu putih. Judul ringan (Manrope 400) membiarkan isi dan maskot yang berbicara; tindakan berbentuk pill outline.

Dunia ini menolak dua default kategori: hero foto proyek dan split gelap ala SaaS. Ilustrasi hanyalah maskot Niuva — tidak ada 3D realtime, tidak ada ilustrasi stok, tidak ada foto proyek di beranda. Foto proyek tetap bukti utama di `/projects`; foto produk tetap milik Toko.

**Key Characteristics:**
- Dasar `background` biru-dingin terang, tinta `foreground` biru-gelap, hairline `border`.
- Satu bidang Niuva Blue (gradien `brand-400`→`brand-800`) per layar sebagai panggung maskot dan tindakan utama.
- Permukaan putih membulat 12/22/30px; shadow hanya pada kartu yang mengambang di atas bidang berwarna.
- Manrope untuk setiap peran: 400 untuk judul, 500–600 untuk UI.
- Tindakan pill outline; "Hubungi Kami" (WhatsApp B2B) selalu outline.
- Render maskot sebagai satu-satunya ilustrasi, dengan gerak ringan yang berhenti total saat reduced motion.

Baca dokumen bersama ini lalu hanya panduan area yang relevan:

| Area | Panduan penerapan | Keberhasilan pengguna |
| --- | --- | --- |
| Company: `/`, layanan, projects | [Company](docs/design/company.md) | Memahami kemampuan Niuva dan memilih langkah berikutnya |
| Shop, MAKE, cart, checkout, akun | [Commerce & Customer](docs/design/commerce.md) | Memeriksa produk, konsekuensi, dan status sebelum bertindak |
| Seluruh Admin | [Admin](docs/design/admin.md) | Menemukan pekerjaan dan menyelesaikannya dengan akurat |

Prosedur review visual dan validasi dokumen ada di [Quality](docs/design/quality.md). PRD beserta addenda menentukan produk; Tech Design beserta addenda menentukan kontrak teknis; [AGENTS.md](AGENTS.md) menentukan workflow; [PRODUCT.md](PRODUCT.md) dan [PRODUCT_CONTEXT.md](PRODUCT_CONTEXT.md) memiliki positioning dan bahasa. Nilai yang benar-benar dikirim ke browser berada di [globals.css](src/app/globals.css) (`:root` dan `@theme inline`), kelas tipe di [typography.ts](src/design/typography.ts), dan pemuatan font di [layout.tsx](src/app/layout.tsx). Bila dokumentasi berbeda dengan kode, catat drift dan periksa authority terbaru.

Commerce/MAKE/Customer dan Admin mewarisi fondasi bersama ini (token, font, radius, tombol, fokus). Komposisi area tersebut didesain ulang pada T48–T50; dokumen ini tidak menambahkan aturan area baru untuk mereka.

## Colors

Satu aksen jenuh di atas netral yang diwarnai biru. Front matter menuliskan nilai runtime yang sudah di-resolve untuk pemeriksaan; gunakan semantic class/token dari runtime, bukan hex literal.

### Primary
- **Niuva Blue** (`brand`, `--brand-500`): nilai identitas yang dikunci **Logo System v1.0**. Dipakai untuk logo, garis aktif navigasi, hover border kartu pintu, dan seleksi teks. Bukan warna teks normal di atas putih.
- **Action Blue** (`primary`, `--brand-700`): tombol terisi, badge jumlah keranjang, `accent-color`/`caret-color`, dan garis tahap aktif pada proses. Dipilih agar label putih lolos AA pada ukuran normal. Hover terisi memakai `primary-hover` (`--brand-800`).
- **Blue Field** (`brand-400` → `brand-600` → `brand-700` → `brand-800`): gradien radial bidang hero dan gradien linear `brand-700`→`brand-800` bidang penutup. Titik terang hero diletakkan di belakang maskot (bawah pada compact, kanan pada wide) agar tidak pernah berada di belakang teks. Ini satu-satunya bidang jenuh; teks di atasnya putih.
- **Mascot Tint** (`brand-100`): latar panel maskot pada titik mulai; `brand-200` menutup gradien panggung proses.

### Neutral
- **Cool Ground** (`background`, `--neutral-100`): kanvas setiap halaman publik; header sticky memakai versi 80–88% dengan blur.
- **Ink** (`foreground`, `--neutral-900`): teks utama dan isi tombol outline saat hover.
- **Paper White** (`surface`, `--card`): kartu pintu, daftar layanan, panel proses, kartu fakta, dialog.
- **Quiet White** (`surface-quiet`, `--neutral-50`): hover baris layanan, sidebar.
- **Muted** (`muted` / `muted-foreground`): pengelompokan tenang dan teks sekunder.
- **Hairline** (`border`, `--neutral-300`): batas permukaan dan divider. `input` (`--neutral-500`) adalah batas kontrol form yang lebih kuat; keduanya berbeda.
- **Ring** (`ring`, `--brand-600`): fokus, dipakai pada opacity 50%.

Status `success / warning / info / destructive` beserta pasangan `*-background`, `*-border`, `*-icon` dibawa tanpa perubahan dari v1. Mode gelap hanya lewat kelas `.dark` eksplisit; preferensi OS tidak diterapkan otomatis.

### Named Rules
**The One Blue Field Rule.** Warna jenuh hanya muncul sebagai satu bidang Niuva Blue (hero, penutup) atau aksen kecil (garis aktif, badge). Seksi lain tetap di dasar terang atau putih.

**The Locked Logo Rule.** `--brand-500` (#6390BB) adalah nilai logo; jangan menggeser, mencampur, atau memakainya sebagai teks normal.

Periksa kontras hasil compositing aktual (gradien, opacity, hover, disabled, gambar di belakang teks); lint pasangan solid tidak memeriksa semuanya. Status, selected, error, dan fokus harus punya petunjuk selain warna.

## Typography

**Font tunggal:** Manrope (variable, dimuat lewat `next/font` sebagai `--font-niuva-sans`), fallback Arial/Helvetica/sans-serif. `--font-display-token`, `--font-body-token`, `--font-technical-token`, `font-sans`, dan `font-mono` semuanya menunjuk ke Manrope; tidak ada family kedua atau mono.

**Character:** geometris-humanis yang ringan; judul 400 dengan tracking rapat terasa tenang, bobot 500–600 menegaskan UI dan label.

### Hierarchy
Front matter merekam nilai compact. Perilaku responsive dari `typographySystemTokens`:

| Role | Compact <640px | ≥640px | ≥1280px | Weight; tracking |
| --- | --- | --- | --- | --- |
| `display` | 36px / 1.1 | 48px | 58px / 1.08 | 400; -.022em → -.025em |
| `heading` | 30px / 1.12 | 38px | 46px / 1.1 | 400; -.02em → -.022em |
| `subheading` | 22px / 1.25 | 26px | 26px | 500; -.012em |
| `body` | 16px / 1.65 | 17px | 17px | 400; measure maks 68ch |
| `ui-data` | 14px / 20px | sama | sama | 500; angka tabular |
| `editorial-accent` | 28px / 1.2 | 32px | 32px | 400; legacy (lihat bawah) |

Ukuran bernama di `@theme`: **`text-caption`** (13.5px / 1.45) untuk isi kartu fakta dan keterangan; **`text-ui`** (15px / 1.4) untuk tombol, navigasi, dan label; **`text-lead`** (17px / 1.65) untuk paragraf pengantar dan deskripsi seksi. Judul kartu/artikel di dalam seksi memakai skala Tailwind (`text-xl`–`text-4xl`, weight 500, tracking sekitar -.015em) di dalam route.

### Named Rules
**The Light Heading Rule.** `display` dan `heading` memakai weight 400; penekanan datang dari ukuran dan ruang, bukan bobot. Satu-satunya pengecualian adalah kata berganti di hero (600).

**The Named Size Rule.** Ukuran di luar skala Tailwind memakai `text-caption`/`text-ui`/`text-lead` atau role di `typography.ts`; jangan menulis ukuran px arbitrer di komponen bersama.

`editorial-accent` adalah nama role lama (dulu Fraunces) yang dipertahankan agar layar auth tetap berjalan sampai T49; sekarang Manrope biasa dan tidak dipakai untuk permukaan baru.

## Layout

| Kontrak | Nilai aktif dan pemakaian |
| --- | --- |
| Public / reading / admin container | `max-w-public` 81rem / `max-w-reading` 48rem / `max-w-admin` 90rem |
| Gutter konten public | 1.25rem compact; 3rem mulai 640px |
| Bidang tepi-ke-tepi | Bidang biru dan panel proses berjarak 0.75rem dari tepi viewport, 1.5rem mulai 640px |
| Teks di bidang tepi-ke-tepi | Mulai 640px, teks di dalam bidang biru, panel proses, dan bidang penutup sejajar dengan gutter konten (logo header) lewat `--panel-inset`, yang dideklarasikan `PublicShell` dengan container query; compact memakai padding 1.5rem |
| Jarak semantic | `spacing-section` 8rem (6rem compact); `spacing-content` 1.5rem; `spacing-card` 1rem |
| Header | Sticky, tinggi minimum 4.5rem, translucent `background` dengan blur |

Ritme beranda: bidang biru penuh-lebar → tiga kartu pintu tepat di bawahnya → seksi berjarak 8rem. Judul hero dua baris mulai `xl` (kolom teks `--panel-inset` + 49rem, cukup untuk kata berganti terpanjang); `lg` tiga baris; compact mengikuti lebar layar. Titik mulai adalah satu pemilih: tiga option chip pill (`aria-pressed`) mengganti teks jalur dan pose panel maskot, dengan teks dan panel berdampingan mulai `lg`; tanpa JavaScript ketiga jalur tampil berurutan dan chip disembunyikan. Pada compact, kartu pintu menjadi pill yang membungkus dan urutan DOM tetap teks → media → tindakan. Ukuran seksi mengikuti isi; tidak wajib satu viewport.

## Elevation & Depth

Hampir datar. Kedalaman datang dari kontras dasar terang ↔ permukaan putih ↔ bidang biru, serta hairline. Shadow hanya untuk elemen yang mengambang di atas bidang berwarna atau overlay.

### Shadow Vocabulary
- **Card** (`shadow-card`, `0 1px 2px rgb(15 29 46 / 0.05)`): pemisah halus untuk kelompok record yang memerlukannya.
- **Floating** (`shadow-floating`, `0 16px 36px rgb(15 29 46 / 0.14), 0 2px 6px rgb(15 29 46 / 0.08)`): kartu fakta dan gelembung contoh di atas bidang biru/panel maskot; menu, dialog, Sheet.
- **Mascot drop shadow**: render maskot memakai drop-shadow untuk menapak di panel.

### Named Rules
**The Float-Only-On-Color Rule.** Kartu putih di dasar terang cukup dengan hairline; shadow floating hanya untuk kartu di atas bidang biru, panel maskot, atau overlay.

## Shapes

Semua permukaan membulat; tidak ada sudut tajam pada kontainer publik.

- **Control** (`--radius-control`, 12px): kartu fakta, input, fokus link kecil. Utilitas `rounded-lg` memetakan ke sini.
- **Card** (`--radius-card`, 22px): kartu pintu (desktop), panggung proses, gelembung contoh. `rounded-xl` memetakan ke sini.
- **Media** (`--radius-media`, 30px): bidang biru, panel maskot, panel proses, daftar layanan. `rounded-2xl`/`rounded-3xl` memetakan ke sini.
- **Pill** (`--radius-pill`): semua tombol, link navigasi, kartu pintu compact, badge.

Hairline `border` 1px membatasi permukaan putih; tombol outline memakai garis 1.5px. Render maskot memakai `object-contain`, berdiri di dasar panel dan boleh terpotong di tepi bawah. Foto produk, CAD, atau artefak yang harus diperiksa utuh memakai `contain`.

## Components

**Keputusan Owner — 11 Oktober 2026:** seluruh halaman Niuva memakai **shadcn/ui sebagai dasar komponen bersama** (Company, Commerce/Customer, Admin, termasuk state loading/empty/error/unavailable). [components.json](components.json) memakai `base-nova`; primitive lokal di `src/components/ui`, komponen khusus Niuva di `src/components/niuva`. Aturan lapis mengikuti [Tech Design](docs/TechDesign-Niuva-MVP.md): kode fitur memakai `@/components/ui/*` atau komposisi `@/components/niuva/*`; jangan membuat primitive paralel; import Base UI langsung hanya untuk shared primitive; form native dan fallback tanpa JavaScript dipertahankan; jangan menginisialisasi ulang shadcn atau menimpa fondasi dengan preset.

### Buttons
- **Shape:** pill (`--radius-pill`), tinggi minimum 44px, label `text-ui` weight 600, wrap diizinkan.
- **Outline** (`button-outline`): garis 1.5px `foreground` 85%, latar transparan; hover mengisi `foreground` dengan teks `background`. Varian default untuk tindakan publik.
- **onBrand** (`button-on-brand`): outline putih di atas bidang biru; hover mengisi putih dengan teks `brand-800`; ring fokus putih 60%.
- **Default / terisi** (`button-primary`): `primary` dengan hover `primary-hover`; tetap tersedia untuk area transaksi dan Admin.
- **Secondary, ghost, destructive, link**: varian shadcn yang dibawa dari primitive.
- **States:** transisi `--duration-fast-token` + `--ease-standard-token`; press turun 1px; fokus `ring-3` `ring/50`; disabled opacity 50%.

**The Outline Contact Rule.** "Hubungi Kami" (WhatsApp B2B, `B2BContactLink`) selalu outline — `outline` di dasar terang, `onBrand` di bidang biru, `link` di footer — tidak pernah tombol terisi.

### Cards / Containers
- **Kartu pintu** (Layanan, Custom 3D Print, Toko): putih, hairline, `--radius-card` di desktop dan pill di compact; hover naik 2px dengan border `brand`; panah `primary` bergeser saat hover.
- **Kartu fakta**: putih, `--radius-control`, padding 1rem, `shadow-floating`, judul `text-base` 600 + isi `text-caption` `muted-foreground`. Hanya berisi fakta produk yang benar (format file, review operator, estimasi bukan harga final).
- **Daftar layanan**: satu permukaan putih `--radius-media` dengan baris dipisah hairline; hover `surface-quiet`.

### Navigation
Header sticky translucent: logo, link utama (Layanan, Proyek, Custom 3D Print, Toko), utilitas (Keranjang dengan badge jumlah, Akun), dan "Hubungi Kami" outline kecil pada scope Company. Link `text-ui` 500 berwarna `foreground` 80%; halaman aktif memakai teks penuh dan garis bawah pill `brand-600` 2px. Di bawah `xl`, menu menjadi disclosure dengan tombol outline "Menu", tertutup dengan Escape dan mengembalikan fokus. Footer empat kolom dengan link `text-ui` `muted-foreground`.

### Mascot Panels
Render Blender maskot Niuva (`public/assets/mascot/*.webp`, masing-masing dengan sidecar provenance) adalah **satu-satunya ilustrasi**. Pose dipilih sesuai pesan (melambai, menunjuk, laptop, tablet, kunci, kemenangan, dan untuk ide: wajah ceria, telunjuk ke atas, bohlam menyala dan tanda tanya melayang di atas kepala). Maskot di satu adegan tampil badan penuh pada skala yang sama; jangan mencampur potret close-up dengan badan penuh. Bila pose atau aksesori tidak tersedia di paket, bangun dari rig dan skrip build paket (`master/build_niuva.py`) dengan kamera, cahaya, dan skala yang sama, pastikan cek tembus geometri lolos, dan catat parameternya di sidecar. Paket sumber Owner tidak diubah. Panel maskot memakai `brand-100` atau bidang biru, radius media, dengan kartu fakta/gelembung contoh di atasnya. Gelembung contoh harus diberi label "Contoh" atau "(contoh)".

### Form, Focus, Status
Label nyata; field vertikal berjarak 16px (`gap-4`); input memakai `border-input`. Fokus `focus-visible` ring 3px tanpa layout shift. Badge status memakai pasangan `*-background`/teks dengan label; spinner dekoratif; hasil memakai live region yang tepat. Option chip tetap komposisi Button dengan target 44px dan `aria-pressed`.

### Motion (signature)
- **Kata berganti di hero**: kata terakhir judul berganti satu putaran (prototipe → desain → produk nyata → prototipe) dalam 4,5 detik dengan fade/geser 300ms `--ease-emphasis-token`, lalu berhenti pada kata yang disetujui; nama aksesibel judul tetap teks yang disetujui.
- **Maskot bob**: `niuva-bob` 2.4s ease-in-out dua kali (4,8 detik), naik 8px, lalu diam; maskot hero juga condong mengikuti pointer (maks ±7px).
- **Gerak otomatis selesai sendiri**: animasi yang berjalan tanpa interaksi berhenti sebelum 5 detik (WCAG 2.2.2), sehingga tidak perlu tombol jeda. Gerak yang mengikuti scroll atau pointer boleh terus aktif.
- **Drift kartu fakta**: kartu fakta hero bergeser terhubung scroll dengan kedalaman masing-masing.
- **Adegan proses sticky** (mulai `lg`): panggung maskot sticky menukar pose per tahap (Ide, Desain, Prototipe, Produk jadi) saat tahap mencapai tengah layar; tahap aktif ditandai garis `primary` dan `aria-current="step"`. Di bawah `lg` tidak ada yang menempel di atas teks: setiap tahap membawa render kecilnya sendiri.
- **Pergantian titik mulai**: memilih chip menukar pose panel maskot dengan fade/geser 500ms `--ease-emphasis-token`.
- **Reduced motion**: semua gerak di atas mati; komponen mulai dalam keadaan statis sampai preferensi terbaca, dan CSS global memotong animasi/transisi.

## Do's and Don'ts

### Do:
- **Do** gunakan semantic token dan ukuran bernama (`text-caption`, `text-ui`, `text-lead`, role `typography.ts`) alih-alih nilai px arbitrer; test permukaan menolak warna literal dan px arbitrer di kelas komponen bersama.
- **Do** satukan warna jenuh pada satu bidang Niuva Blue dengan teks putih dan tindakan `onBrand`.
- **Do** letakkan fakta nyata di kartu putih yang mengambang di atas bidang maskot.
- **Do** gunakan pill outline untuk tindakan publik dan selalu outline untuk "Hubungi Kami".
- **Do** pakai render maskot Owner sebagai ilustrasi, dengan alt yang menjelaskan pose atau alt kosong bila dekoratif.
- **Do** matikan semua gerak nonesensial saat reduced motion dan pertahankan penyampaian state.

### Don't:
- **Don't** menaruh foto proyek di beranda (keputusan Owner 31 Oktober); foto proyek tinggal di `/projects`.
- **Don't** menambah 3D realtime, ilustrasi stok, atau ilustrasi selain maskot Niuva.
- **Don't** membuat bidang jenuh kedua atau gradien di luar bidang Niuva Blue dan panggung proses.
- **Don't** memakai tombol terisi untuk "Hubungi Kami" atau menyalakan kembali form brief/inquiry B2B.
- **Don't** menebalkan judul `display`/`heading` di atas 400 atau membawa kembali Space Grotesk/Fraunces.
- **Don't** menciptakan klien, outcome, harga, stok, testimoni, atau spesifikasi tanpa sumber; contoh harus diberi label contoh.

Bahasa UI adalah Bahasa Indonesia yang langsung. Copy Company menghubungkan kebutuhan → cara kerja → bukti → tindakan. Prinsip copy rinci ada di PRODUCT_CONTEXT; `niuva-editorial` adalah bantuan editorial opsional.

## Responsive Behavior

Periksa 320/390px, sekitar 768/1024px, serta 1280/1440px sesuai route. Compact bukan desktop yang diperkecil: bidang biru menyusun judul di atas maskot dan menyembunyikan kartu fakta drift; kartu pintu menjadi pill; adegan proses menjadi daftar tahap dengan render maskot kecil per tahap (dua kolom mulai `md`), tanpa panggung sticky; navigasi menjadi disclosure di bawah `xl`. Halaman tidak boleh overflow horizontal.

Kontrol interaktif minimum 44px; navigasi keyboard, heading/landmark, label/error, zoom 200%, focus return pada overlay, dan state loading/empty/error/success diperiksa pada implementasi. Browser emulation tidak membuktikan perangkat fisik atau screen reader.

### Motion
Durasi `--duration-fast-token` 150ms dan `--duration-normal-token` 220ms dengan `--ease-standard-token` untuk umpan balik state; `--ease-emphasis-token` (`cubic-bezier(0.16, 1, 0.3, 1)`) untuk gerak maskot, kata hero, dan pergantian pose.

**Identitas motion** (Owner 31 Okt 2026: motion inti dibuat per halaman, motion pass global di T51):
- Karakter: UI tenang dan profesional; maskot boleh ceria tetapi tanpa overshoot atau bounce selain bob dua kali di hero.
- Palet durasi: 150ms umpan balik (hover, tekan), 220ms perubahan state, 500ms pergantian pose atau panel.
- Pola masuk: konten tampil sejak frame pertama. Satu-satunya pola masuk adalah pose atau panel maskot yang naik 12px sambil fade; animasi masuk per seksi diputuskan di T51.
- Setiap gerak memakai transform/opacity dan mati saat reduced motion. Gerak signature tercantum di Components. Jangan memakai scroll reveal atau angka menghitung sebagai hiasan. Interaksi Admin yang disetujui dijelaskan hanya di [panduan Admin](docs/design/admin.md).

## Iteration Guide

Mulai dari brief, route sebenarnya, panduan area, komponen, dan artefak yang tersedia. Komposisi halaman tetap milik route; fondasi ini memberi token, bentuk, tombol, maskot, dan gerak bersama. Jalankan [review kualitas](docs/design/quality.md) pada route yang diimplementasikan. Brief permukaan beranda ada di `.impeccable/surfaces/src-app-page-tsx.md`.

Ubah dokumen ini hanya untuk keputusan lintas halaman; ubah panduan area untuk kontrak area. Token baru masuk lewat `globals.css` dengan keputusan yang tercatat, bukan lewat nilai arbitrer di route.

## Known Gaps

- Semua route Company memakai komposisi v2 (T47): Beranda, Layanan dan detailnya, Proyek dan detailnya, legal (`/terms`, `/privacy`), serta 404 dan error publik. Halaman error publik belum dilihat di browser karena tidak ada route yang memicunya secara lokal; komposisinya sama dengan 404 dan diuji di unit test.
- Commerce/MAKE/Customer (T48–T49) dan Admin (T50) masih membawa komposisi v1 di bawah token v2.
- Kontras teks hero diukur pada compositing aktual (teks disembunyikan, latar terterang di kotak setiap teks) pada 1440/1280/1024/390 setelah kolom judul dilebarkan dan titik terang `xl` dipersempit ke belakang maskot: terendah 4,91:1 untuk headline, 5,12:1 untuk subcopy, dan 5,43:1 untuk tindakan (31 Okt 2026). Bidang biru 404 memakai geometri detail layanan: terendah 5,18:1 (judul, 1024) pada 1 Nov 2026. Ukur ulang bila gradien, posisi maskot, atau lebar kolom berubah.
- `button.tsx` masih membawa radius px dari preset shadcn pada ukuran `icon-xs`/`icon-sm`.
- E2E tidak dijalankan lokal (Postgres tidak aktif). Belum ada acceptance visual Owner, pengujian device/AT, staging, atau produksi.
- Arsip AUiS dan dokumen fondasi lama tetap bukti historis, bukan instruksi aktif.
