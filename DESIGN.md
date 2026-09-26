---
name: Niuva Design System
status: active
version: 1.0
language: id-ID
north_star: The Precision Workshop
visual_character: [precise, engineered, tangible, human]
color:
  identity: '#6390BB'
  primary_action: '#3F607F'
  primary_hover: '#344F67'
  primary_pressed: '#2B4053'
  canvas: '#F8FAFC'
  surface: '#FFFFFF'
  quiet_surface: '#F1F5F9'
  border: '#E2E8F0'
  secondary_text: '#475569'
  working_surface: '#1E293B'
  primary_text: '#0F172A'
typography:
  primary: Space Grotesk
  editorial_accent: Fraunces
  body: 16px/24px
layout:
  public_container: 72rem
  reading_container: 48rem
  admin_container: 90rem
  compact_gutter: 1.25rem
  standard_gutter: 2rem
shape:
  control_radius: 8px
  card_radius: 12px
  media_radius: 16px
---

# Niuva Design System

Dokumen ini adalah pedoman visual aktif Niuva untuk agen yang membuat atau mengubah UI. Gunakan aturan ini bersama brief pengguna dan kode yang ada. Nilai runtime berada di [`src/app/globals.css`](src/app/globals.css), kelas tipografi bersama di [`src/design/typography.ts`](src/design/typography.ts), dan perilaku komponen di source komponennya. PRD menentukan produk; Tech Design menentukan arsitektur dan keamanan; [`AGENTS.md`](AGENTS.md) menentukan alur kerja.

## Arah visual

**The Precision Workshop:** antarmuka terasa seperti meja kerja desain dan engineering yang tertata. Tampilkan hubungan antara kebutuhan, proses, artefak, keputusan, dan hasil. Ruang terang yang tenang memudahkan pemeriksaan; bidang gelap dipakai dengan sengaja untuk positioning, bukti proses, atau kerja operasional. Niuva Blue menjadi sinyal identitas, tindakan, pilihan, dan fokus yang terukur.

Komposisi boleh asimetris tetapi jalur baca dan tindakan harus jelas. Kepribadian datang dari hierarki, ritme, metadata teknis yang berguna, foto produk/material/proses nyata, dan copy yang spesifik. Jangan membuat halaman menjadi deretan kartu SaaS generik atau memakai gradient dekoratif, glass, glow, neon, blob, 3D tanpa alasan, dan klaim visual yang tidak punya bukti.

Satu identitas berlaku di tiga konteks:

| Konteks | Penekanan visual | Prioritas |
| --- | --- | --- |
| Public, layanan, proyek | Narasi editorial, kontras bidang, bukti yang nyata, satu tindakan utama yang terlihat | Pengunjung memahami kemampuan dan langkah berikutnya |
| Shop, custom print, cart, checkout, akun | Light-first, informasi harga/status/form yang mudah dipindai, ringkasan dalam alur halaman | Pilihan dan konsekuensi dapat diperiksa sebelum bertindak |
| Admin | Surface netral, hierarki rapat, status dan tindakan operasional yang mudah ditemukan | Keputusan operator cepat dan tidak ambigu |

Arah ini adalah baseline. Brief atau referensi yang diberikan pengguna menentukan komposisi halaman dalam batas identitas Niuva dan kontrak produk yang berlaku.

## Warna dan surface

Gunakan semantic token di `globals.css`, bukan hex baru yang tersebar di komponen. Nilai berikut menjelaskan peran yang telah ditetapkan:

| Peran | Nilai | Gunakan untuk |
| --- | --- | --- |
| Niuva Blue / `brand-500` | `#6390BB` | Identitas logo, aksen terukur, selected cue, ring fokus; **bukan** teks normal di atas putih |
| Primary action / `primary` | `#3F607F` | Tombol utama dan link berwarna pada surface terang, dengan kontras yang cukup |
| Primary hover / pressed | `#344F67` / `#2B4053` | Umpan balik tombol utama |
| Cool paper / `background` | `#F8FAFC` | Kanvas utama terang |
| Paper white / `card` | `#FFFFFF` | Form dan content surface |
| Quiet surface / `muted` | `#F1F5F9` | Pengelompokan tenang |
| Line slate / `border` | `#E2E8F0` | Batas, divider, control |
| Muted slate / `muted-foreground` | `#475569` | Copy sekunder yang tetap terbaca |
| Working slate | `#1E293B` | Bidang kerja gelap yang disengaja |
| Graphite / `foreground` | `#0F172A` | Teks utama |

Pasangan primer adalah `#3F607F` dengan teks putih. Teks utama adalah graphite pada cool paper atau putih. Untuk dark surface, gunakan teks terang dari mapping semantic yang sesuai. Warna success, warning, info, dan destructive sudah memiliki foreground, background, dan border di `globals.css`; selalu beri label atau penjelasan selain warna. Dark surface adalah pergantian konteks yang disengaja, bukan alasan membuat setiap halaman gelap. Jangan buat token gradient dekoratif.

## Tipografi

Space Grotesk adalah suara utama untuk display, heading, body, control, harga, dan data. Fallback: Arial, Helvetica, sans-serif. Fraunces adalah jeda editorial untuk standalone statement atau quote saja, kira-kira 5–10% dari tampilan; jangan pakai untuk form, navigasi, harga, status, atau body panjang. Fallback: Georgia, serif. Tidak ada family mono ketiga pada sistem v1.

Ukuran ditulis **compact / standard / wide** (`0–639px / 640–1279px / ≥1280px`). Kelas yang dipakai route produk ada di `src/design/typography.ts`.

| Peran | Ukuran / line-height | Berat | Tracking | Pemakaian |
| --- | --- | ---: | --- | --- |
| Display | `40/43 → 48/51 → 60/63px` | 600 | `-.03 → -.035 → -.04em` | Hero atau pernyataan brand singkat |
| Heading | `30/36 → 36/42 → 40/46px` | 600 | `-.02 → -.025 → -.03em` | Judul halaman atau seksi utama |
| Subheading | `22/29 → 24/31 → 24/31px` | 600 | `-.015em` | Kelompok konten, kartu penting |
| Body | `16/24px` | 400 | `0` | Penjelasan; panjang baris sekitar `55–70ch` |
| UI/data | `14/20px` | 500 | `0` | Label, status, harga; angka tabular |
| Editorial accent | `28/35 → 32/39 → 36/43px` | 500 | `-.01em` | Pernyataan atau quote yang berdiri sendiri |
| Technical micro-label | `12/18px` | 500 | `.05em` | Uppercase hanya 1–3 kata bila membantu scanning |

Pertahankan body `16/24`. Berat inti adalah 400/500/600; 700 hanya pengecualian, 300 tidak dipakai. Fraunces memakai Roman normal dan optical sizing `opsz`, tanpa italic inti. Hierarki harus tetap terbaca ketika web font gagal dimuat.

## Komposisi, jarak, dan bentuk

- Container public `72rem`, reading `48rem`, admin `90rem`. Padding horizontal compact `1.25rem`, mulai standard `2rem`.
- Ritme seksi `4rem`, dapat menjadi `5rem` pada layar lebar. Kelompok konten `1.5rem`; jarak dalam kartu `1rem`, kartu operasional rapat dapat `0.75rem`.
- Layar lebar dapat memakai komposisi 12 kolom dan dua kolom asimetris untuk hubungan narasi dan bukti. Tentukan span berdasarkan konten route; pada layar sempit, runtuhkan menjadi urutan baca yang jelas. Tinggi seksi mengikuti isi, bukan target satu viewport.
- Radius control `8px`, card `12px`, media `16px`; pill hanya untuk elemen yang memang berbentuk badge. Gunakan border/tonal layering lebih dulu, quiet card shadow seperlunya, floating shadow hanya untuk overlay yang benar-benar terangkat dari alur.
- Foto produk dan CAD memakai `contain` agar objek utuh. Foto workshop atau proses boleh `cover` dengan focal point terkontrol. Jangan menetapkan rasio gambar global. Muat media di bawah fold secara lazy; media LCP secara eager bila perlu.
- Whitespace membantu membaca bukti dan menemukan tindakan. Jangan menyembunyikan harga, status, validasi, atau pekerjaan Admin demi ruang kosong.

## Kontrak komponen yang dipakai ulang

Implementasikan pada route yang diminta dan gunakan komponen yang sudah ada sebelum membuat yang baru. Perubahan kontrak yang berlaku lintas halaman dicatat di sini dan di source runtime; komposisi satu halaman tetap milik route tersebut.

| Komponen | Kontrak visual dan perilaku |
| --- | --- |
| Button dan link aksi | Minimum tinggi `44px`, radius `8px`, padding horizontal `16px`; lebar mengikuti isi dan label boleh wrap. Primary memakai brand-action/putih. Outline: putih, teks graphite, border muted-slate; ghost: teks graphite tanpa border. Hover/pressed tetap terlihat; jangan gunakan link untuk mutasi. |
| Form control | Input/search/upload minimum `44px`, border `1px` line-slate, radius `8px`, padding sekitar `10px 12px`. Label nyata, bantuan dan error dekat field, status tidak disampaikan lewat warna saja. |
| Focus dan loading | Setiap elemen interaktif punya `focus-visible` yang jelas: ring Niuva Blue `3px`, separator terang `2px` bila dibutuhkan, offset `2px`, tanpa layout shift. Saat loading, pertahankan fokus dan ukuran, cegah aksi ganda, tampilkan “Memproses…” dan satu status region yang sopan; spinner dekoratif. |
| Navigation | Dark navigation memakai tinggi sekitar `64px` wide / `56px` compact sesuai konten. Link aktif diberi underline `2px`. Pada compact, wrap atau disclosure yang jelas; jangan sembunyikan link lewat horizontal scroll. Pertahankan urutan dan akses keyboard. |
| Card, badge, status | Kartu statis kecuali punya satu action boundary yang jelas; jangan nest tombol di dalam link seluruh kartu. Badge noninteraktif minimum `24px`, pill, label wrap dan tidak terpotong. Status memakai teks + semantic tone. |
| Option chip | Hanya untuk pilihan yang benar-benar interaktif; native button minimum `44px`, radius `8px`, marker selected `18px`, `aria-pressed`, unavailable yang jelas dan tidak aktif. State tidak boleh bergantung pada warna saja; label wrap mengikuti urutan sumber. Jangan mengganti selector produk yang ada tanpa kebutuhan route. |
| Checkout summary | Tetap dalam alur dan mudah diperiksa; jangan tambahkan floating sticky bar global. Harga dan tindakan mengikuti authority server serta state transaksi. |
| Footer | Cool-paper/graphite atau dark working context yang sesuai. Kelompok link terbaca pada wide, menjadi urutan linear pada compact; legal dan support dapat ditemukan. |

## Motion, responsif, dan aksesibilitas

Motion dipakai untuk umpan balik. Warna berubah sekitar `150ms` dengan easing `cubic-bezier(0.2, 0, 0, 1)`; press sekitar `100ms` dan translasi maksimal `1px`. Fokus dan status muncul langsung. Hindari animasi layout sebagai hiasan. Pada `prefers-reduced-motion`, hentikan gerakan non-esensial dan pastikan perubahan state tetap tersampaikan.

Pada `320/390px`, jangan ada overflow horizontal, teks terpotong, kontrol mengecil di bawah target `44px`, atau urutan baca yang berubah tanpa alasan. Uji juga sekitar `768/1024/1280/1440px` sesuai route. Keyboard, fokus, label, state loading/empty/error/success, touch target, dan kontras aktual harus diperiksa pada implementasi. Semantik native lebih utama daripada ARIA tambahan. Jangan mengklaim bukti perangkat fisik atau screen reader hanya dari browser emulation.

## Copy dan bukti

Bahasa UI adalah Bahasa Indonesia yang langsung dan operasional. Nama status harus menjelaskan keadaan saat ini dan tindakan berikutnya. Public copy menunjukkan kebutuhan pengguna, proses Niuva, bukti konkret, lalu CTA yang terarah. Jangan menciptakan klien, hasil, spesifikasi, harga, testimoni, atau foto yang tampak nyata tanpa sumber. Data contoh harus terlihat sebagai contoh. Rujuk [`PRODUCT_CONTEXT.md`](PRODUCT_CONTEXT.md) untuk positioning dan vocabulary, PRD untuk fakta produk.

## Cara memakai pedoman ini

1. Baca brief, route asli, komponen yang dipakai, dan bagian pedoman yang relevan. Bila referensi/arah sudah diberikan, gunakan itu. Bila belum, ikuti satu pertanyaan referensi di `AGENTS.md`; jika jawabannya tidak ada, pilih satu arah yang cocok dan sebutkan singkat.
2. Ubah route yang diminta beserta komponen yang perlu. Jangan membuat preview, registry, katalog, atau putaran konsep sebagai prasyarat. Jika pengguna secara khusus meminta prototipe terpisah, buatlah pada scope terpisah yang jelas.
3. Periksa tampilan route sebenarnya pada ukuran dan state yang relevan, juga interaksi, keyboard, fokus, reduced motion, dan aksesibilitas. Tunjukkan hasil implementasi. Review visual Owner hanya dilakukan bila diminta; sebelum itu statusnya **belum ditinjau secara visual**.
4. Ubah dokumen ini bila keputusan visual lintas halaman berubah. Pengujian teknis, penerimaan visual, aktivasi provider, dan kesiapan produksi adalah bukti yang berbeda. Implementasi yang diminta tidak perlu menunggu status promosi komponen atau review berantai.

## Pilihan cepat: lakukan / hindari

| Lakukan | Hindari |
| --- | --- |
| Tampilkan artefak, proses, dan keputusan yang benar-benar membantu tugas pengguna | Hero generik dengan tiga kartu fitur yang bisa dipakai merek apa pun |
| Gunakan Niuva Blue secara hemat untuk tindakan dan penekanan penting | Menjadikan `#6390BB` teks normal pada putih atau wash dekoratif di semua area |
| Buat jalur baca dan CTA terlihat pada setiap viewport | Memaksa asimetri sampai konten mobile tidak terbaca |
| Gunakan Space Grotesk untuk kerja; Fraunces sebagai aksen editorial terbatas | Mencampur font baru atau serif pada control dan data |
| Gunakan foto produk/proses nyata dengan crop yang sesuai | Mengganti bukti dengan gradient, glow, kaca buram, atau render tanpa alasan |
| Laporkan status review dan batas bukti sesuai route yang benar-benar diperiksa | Menyebut implementasi tanpa review sebagai “Owner accepted” atau “production ready” |

## Riwayat

Versi panjang sebelumnya, termasuk log keputusan dan bukti AUiS yang sudah ditutup, disimpan utuh di [`docs/archive/auis-retired/DESIGN-before-retirement.md`](docs/archive/auis-retired/DESIGN-before-retirement.md). Registry dan kontrak lama juga ada di folder arsip itu. Arsip adalah catatan historis; aturan aktif ada di file ini, `AGENTS.md`, dan source runtime. Route serta registry AUiS telah dipensiunkan. Penerimaan visual historis tetap berlaku hanya untuk surface dan viewport yang dahulu ditinjau; penghapusan preview tidak memperluas atau membatalkan penerimaan route produk yang terpisah.
