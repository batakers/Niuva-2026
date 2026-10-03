# Requirements Document

## Introduction

Audit arsitektur halaman, IA, dan user-flow pada repo Niuva (Next.js App Router, `src/app`) menemukan state sistem dan utilitas yang belum ada atau belum konsisten. Spec ini hanya mencakup irisan pertama: halaman 404 dan error yang bermerek, loading state, pemisahan state akses admin, respons browser untuk kegagalan autentikasi admin pada `src/proxy.ts`, verifikasi rute sign-in Clerk, pembaruan copy yang usang, perbaikan tautan preview pada komponen bersama, dan pembersihan direktori kosong AUiS yang bergantung pada persetujuan.

Requirements ditulis dalam bahasa Inggris dengan pola EARS; copy UI yang terlihat pengguna wajib berbahasa Indonesia.

Spec ini mematuhi batasan `AGENTS.md` dan `DESIGN.md`:

- Permukaan publik dan customer memakai `PublicShell`; permukaan admin memakai `AdminShell` atau layout admin.
- Komponen yang dipakai adalah `StatusNotice`, `NiuvaLink`, token tipografi `src/design/typography.ts`, dan token semantik. Tidak ada nilai visual arbitrer.
- Clerk ditambah `requireAdmin()` tetap menjadi otoritas autentikasi admin. Tidak ada dependency baru, perubahan migrasi, pembayaran, provider, atau logika auth di luar yang dinyatakan.
- Next.js pada repo ini memiliki breaking changes. Fase design wajib membaca `node_modules/next/dist/docs/` sebelum memakai konvensi `not-found`, `error`, `global-error`, dan `loading`.
- Halaman error tidak boleh membocorkan token, stack trace, data privat, atau keberadaan token/record.

Di luar cakupan spec ini: halaman publik Terms/Privacy, gating registrasi, kelanjutan konfirmasi quote-accept, pelestarian `returnTo` pada halaman detail akun, Midtrans return URL, terjemahan label status, `/contact`, `/faq`, halaman profil, dan alur create admin.

Penerimaan visual tetap berstatus belum ditinjau sampai pengguna menerimanya secara eksplisit. Lulus test atau build bukan persetujuan visual.

## Glossary

- **Niuva_App**: Aplikasi Next.js App Router pada `src/app`.
- **Root_Not_Found**: Berkas `src/app/not-found.tsx` yang menangani URL tidak cocok dan pemanggilan `notFound()` tanpa `not-found` yang lebih spesifik.
- **Scoped_Not_Found**: Empat berkas `not-found.tsx` yang sudah ada pada `projects/[slug]`, `shop/[slug]`, `quote/[token]`, dan `orders/[token]`.
- **Non_Revealing_Not_Found**: Perilaku `not-found` pada `quote/[token]` dan `orders/[token]` yang tidak membedakan token tidak valid, kedaluwarsa, atau tidak ada.
- **Public_Error_Boundary**: Error boundary route-segment (`error.tsx`) untuk permukaan publik dan customer.
- **Admin_Error_Boundary**: Error boundary route-segment untuk `src/app/admin`.
- **Global_Error_Boundary**: Berkas `global-error.tsx` yang menangani kegagalan pada root layout.
- **Loading_State**: Berkas `loading.tsx` yang menampilkan fallback saat segmen dynamic dimuat.
- **Public_Shell**: Komponen `PublicShell` di `src/components/niuva/public-shell.tsx`.
- **Admin_Shell**: Komponen `AdminShell` di `src/components/niuva/admin-shell.tsx`.
- **Status_Notice**: Komponen `StatusNotice` di `src/components/niuva/status-notice.tsx`.
- **Niuva_Link**: Komponen `NiuvaLink` di `src/components/ui/NiuvaLink.tsx`.
- **Admin_Access_View**: Tampilan di `src/app/admin/admin-access-view.tsx` (`AdminAccessUnavailableView`).
- **Admin_Access_State**: Salah satu dari `UNAUTHENTICATED`, `FORBIDDEN`, atau `AUTH_UNAVAILABLE`.
- **Admin_Data_Unavailable_View**: Komponen `AdminDataUnavailableView` di `admin-shell.tsx`.
- **Admin_Loader**: Fungsi loader pada halaman detail admin yang mengembalikan data atau `null`.
- **Admin_Proxy**: Berkas `src/proxy.ts` dengan matcher `/admin/:path*` dan `/api/admin/:path*`.
- **Browser_Navigation_Request**: Request dengan header `Accept` yang memuat `text/html` dan tanpa prefix path `/api/`.
- **API_Request**: Request pada path `/api/admin/*`, atau request yang bukan Browser_Navigation_Request.
- **Admin_Sign_In_Route**: Rute `src/app/admin/sign-in` yang memakai Clerk `SignIn` dengan `routing="path"`.
- **Clerk_Sub_Step**: Path turunan sign-in milik Clerk, misalnya `/admin/sign-in/factor-one`.
- **Order_Status_Component**: Komponen `OrderStatus` beserta `NextAction` di `src/app/orders/[token]/order-status.tsx`.
- **Live_Projection**: Proyeksi order dari server dengan `isPreview` bernilai `false`.
- **Preview_Fixture**: Data sintetis dengan `isPreview` bernilai `true`.
- **AUiS_Empty_Directories**: Direktori kosong `src/app/auis/{proofs,styleguide,welcome,wireframes,_data}` dan `src/app/api/auis/brand`.
- **Sensitive_Detail**: Token, stack trace, pesan exception mentah, digest, query string, data privat, atau sinyal keberadaan record.
- **Owner**: Pengguna yang berwenang menyetujui penghapusan berkas.

## Requirements

### Requirement 1: Halaman 404 root yang bermerek

**User Story:** As a pengunjung, I want halaman tidak ditemukan yang konsisten dengan identitas Niuva, so that saya paham URL tidak tersedia dan bisa kembali ke jalur yang berguna.

#### Acceptance Criteria

1. THE Niuva_App SHALL menyediakan Root_Not_Found pada `src/app/not-found.tsx`.
2. WHEN sebuah URL tidak cocok dengan rute apa pun, THE Root_Not_Found SHALL dirender di dalam Public_Shell dengan tepat satu elemen `main` ber-`id="main-content"`.
3. WHEN `notFound()` dipanggil pada segmen yang tidak punya Scoped_Not_Found (termasuk `/services/[slug]`, `/account/make/[id]`, `/account/orders/[id]`, `/account/inquiries/[id]`, `/custom-print/requests/[token]`), THE Niuva_App SHALL merender Root_Not_Found, bukan halaman 404 bawaan Next.js.
4. THE Root_Not_Found SHALL menampilkan tepat satu judul `h1` berbahasa Indonesia yang tidak kosong dengan kelas dari `src/design/typography.ts`, serta minimal satu paragraf berbahasa Indonesia yang menyatakan bahwa halaman yang diminta tidak tersedia.
5. THE Root_Not_Found SHALL menampilkan tautan ke beranda (`/`) dan tautan ke `/shop` memakai Niuva_Link, masing-masing dengan teks tautan tidak kosong, dapat difokus dan diaktifkan dengan keyboard, serta tinggi target minimal 44px.
6. THE Root_Not_Found SHALL menyertakan metadata `robots` dengan `index: false` dan `follow: false`.
7. WHEN sebuah URL tidak cocok dengan rute apa pun atau `notFound()` dipanggil tanpa Scoped_Not_Found, THE Niuva_App SHALL merespons dengan status HTTP 404.
8. THE Root_Not_Found SHALL memakai token semantik untuk seluruh warna, spasi, dan radius, tanpa nilai warna literal (heksadesimal, `rgb()`, `hsl()`) dan tanpa nilai piksel arbitrer pada kelas atau gaya yang didefinisikan di komponen tersebut.
9. THE Root_Not_Found SHALL menampilkan teks (termasuk judul dokumen dan metadata) yang tidak memuat path, slug, token, atau query string dari URL yang diminta.
10. IF sebuah segmen memiliki Scoped_Not_Found dan `notFound()` dipanggil pada segmen tersebut, THEN THE Niuva_App SHALL merender Scoped_Not_Found tersebut, bukan Root_Not_Found.

### Requirement 2: Pelestarian not-found yang tidak mengungkap

**User Story:** As a pemilik quote atau order, I want halaman tidak ditemukan tidak mengungkap apakah token ada, so that akses ke data saya tetap aman.

#### Acceptance Criteria

1. WHEN token pada `/quote/[token]` tidak valid (format salah), kedaluwarsa, atau tidak ada, THE Niuva_App SHALL merender Non_Revealing_Not_Found dengan HTML yang identik byte-per-byte untuk ketiga kondisi tersebut, tidak termasuk nilai yang dihasilkan per permintaan (misalnya nonce dan pengenal build).
2. WHEN token pada `/orders/[token]` tidak valid (format salah), kedaluwarsa, atau tidak ada, THE Niuva_App SHALL merender Non_Revealing_Not_Found dengan HTML yang identik byte-per-byte untuk ketiga kondisi tersebut, tidak termasuk nilai yang dihasilkan per permintaan (misalnya nonce dan pengenal build).
3. THE Niuva_App SHALL mempertahankan isi Scoped_Not_Found yang ada untuk `quote/[token]` dan `orders/[token]` sehingga teks, judul halaman, dan tautan yang ditampilkan sama dengan sebelum perubahan ini, tanpa penambahan Sensitive_Detail.
4. WHEN `/custom-print/requests/[token]` menerima token yang tidak valid (format salah) atau tidak ada, THE Niuva_App SHALL merender halaman tidak ditemukan dengan HTML yang identik byte-per-byte untuk kedua kondisi tersebut, tidak termasuk nilai yang dihasilkan per permintaan (misalnya nonce dan pengenal build).
5. IF tidak ada Scoped_Not_Found untuk `/custom-print/requests/[token]`, THEN THE Root_Not_Found SHALL menangani kasus tersebut tanpa memuat nilai token dalam DOM, title, atau metadata.
6. THE Niuva_App SHALL mengirim `robots` dengan `index: false` untuk semua halaman tidak ditemukan pada `/quote/[token]`, `/orders/[token]`, dan `/custom-print/requests/[token]`.
7. WHEN halaman tidak ditemukan dirender untuk `/quote/[token]`, `/orders/[token]`, atau `/custom-print/requests/[token]`, THE Niuva_App SHALL menghasilkan DOM, title, dan metadata yang tidak memuat nilai token yang diminta dalam bentuk apa pun.

### Requirement 3: Error boundary publik dan customer

**User Story:** As a pengunjung atau customer, I want halaman error yang jelas ketika terjadi kegagalan tak terduga, so that saya tahu cara mencoba lagi tanpa melihat detail teknis.

#### Acceptance Criteria

1. THE Niuva_App SHALL menyediakan Public_Error_Boundary pada `src/app/error.tsx` sebagai Client Component sesuai konvensi Next.js yang dikonfirmasi pada fase design.
2. WHEN sebuah exception tidak tertangkap dilempar saat render segmen publik atau customer (termasuk `throw error` pada `src/app/account/page.tsx` dan halaman detail akun), THE Public_Error_Boundary SHALL menampilkan, di dalam elemen `main` ber-`id="main-content"`, satu heading dan satu paragraf penjelasan berbahasa Indonesia yang menyatakan bahwa terjadi kegagalan dan pengguna dapat mencoba lagi atau kembali ke beranda.
3. THE Public_Error_Boundary SHALL menyediakan satu tombol berlabel "Coba lagi" yang memanggil fungsi reset dari Next.js, dan satu tautan ke beranda (`/`), keduanya dapat dioperasikan dengan keyboard (Tab untuk fokus, Enter atau Spasi untuk tombol, Enter untuk tautan).
4. THE Public_Error_Boundary SHALL menampilkan tombol dan tautan dengan area target interaktif minimal 44 x 44 CSS pixel dan indikator `focus-visible` yang terlihat dengan rasio kontras minimal 3:1 terhadap latar di sekitarnya.
5. IF sebuah error dilempar, THEN THE Public_Error_Boundary SHALL merender halaman tanpa menyertakan `error.message`, `error.stack`, atau Sensitive_Detail lain pada DOM, baik yang terlihat maupun yang tersembunyi secara visual.
6. WHEN Public_Error_Boundary dirender, THE Niuva_App SHALL menyertakan direktif `noindex` pada dokumen yang dirender, sehingga mesin pencari diinstruksikan untuk tidak mengindeks halaman tersebut.
7. WHEN pengguna menekan "Coba lagi", THE Public_Error_Boundary SHALL memanggil reset tepat satu kali per penekanan.
8. WHILE pengguna memilih `prefers-reduced-motion: reduce`, THE Public_Error_Boundary SHALL menampilkan seluruh elemennya tanpa animasi atau transisi non-esensial (yaitu animasi dan transisi yang tidak diperlukan untuk menyampaikan informasi atau status fokus).
9. WHERE sebuah halaman sudah menangkap kegagalan data dan merender Status_Notice inline, THE Niuva_App SHALL mempertahankan perilaku inline tersebut tanpa perubahan dan tanpa menampilkan Public_Error_Boundary untuk kegagalan yang sama.
10. WHILE konteks Public_Shell tersedia pada boundary tersebut, THE Public_Error_Boundary SHALL dirender di dalam Public_Shell.
11. IF konteks Public_Shell tidak tersedia pada boundary tersebut, THEN THE Public_Error_Boundary SHALL dirender dengan layout mandiri yang tidak bergantung pada Public_Shell dan tetap memuat elemen `main` ber-`id="main-content"`, tombol "Coba lagi", dan tautan ke beranda.
12. IF pemanggilan reset menghasilkan exception yang sama atau exception baru, THEN THE Public_Error_Boundary SHALL tetap ditampilkan dengan tombol "Coba lagi" dan tautan ke beranda yang masih dapat dioperasikan, tanpa menampilkan Sensitive_Detail.

### Requirement 4: Global error boundary

**User Story:** As a pengunjung, I want halaman cadangan ketika root layout gagal, so that saya tidak melihat layar kosong atau halaman bawaan Next.js.

#### Acceptance Criteria

1. THE Niuva_App SHALL menyediakan Global_Error_Boundary pada `src/app/global-error.tsx`.
2. WHEN root layout melempar error yang tidak tertangani saat render, THE Global_Error_Boundary SHALL menggantikan seluruh dokumen dengan elemen `html` dan `body` miliknya sendiri, dengan atribut `lang="id"`.
3. WHEN Global_Error_Boundary dirender, THE Global_Error_Boundary SHALL menampilkan pesan berbahasa Indonesia, tombol berlabel "Coba lagi", dan tautan ke beranda (`/`), dengan setiap elemen interaktif berukuran minimal 44px x 44px dan dapat difokuskan serta dioperasikan melalui keyboard.
4. THE Global_Error_Boundary SHALL menampilkan teks tanpa Sensitive_Detail, yaitu tanpa isi pesan error asli, stack trace, dan digest error.
5. THE Global_Error_Boundary SHALL dirender tanpa memakai komponen, provider, atau context yang berasal dari root layout, sehingga dapat dirender secara mandiri pada saat root layout gagal.
6. THE Global_Error_Boundary SHALL memakai token warna dan font yang tersedia, tanpa nilai visual arbitrer.
7. THE Global_Error_Boundary SHALL menyertakan penanda `noindex` pada dokumen yang dirender sehingga mesin pencari tidak mengindeks halaman ini.
8. WHEN pengunjung mengaktifkan tombol "Coba lagi", THE Global_Error_Boundary SHALL memanggil fungsi reset dari Next.js tepat satu kali per aktivasi untuk merender ulang root layout.
9. IF render ulang setelah tombol "Coba lagi" diaktifkan gagal kembali, THEN THE Global_Error_Boundary SHALL tetap menampilkan halaman cadangan dengan pesan, tombol "Coba lagi", dan tautan beranda, tanpa layar kosong dan tanpa halaman error bawaan Next.js.
10. IF token global tidak tersedia pada Global_Error_Boundary, THEN THE Global_Error_Boundary SHALL memakai gaya minimal yang terdokumentasi pada design, dengan teks dan tombol tetap terbaca dan dapat dioperasikan.

### Requirement 5: Error boundary admin

**User Story:** As an Owner atau Admin, I want error di area admin tetap berada di konteks admin, so that saya bisa mencoba lagi atau kembali ke dashboard tanpa melihat detail teknis.

#### Acceptance Criteria

1. THE Niuva_App SHALL menyediakan Admin_Error_Boundary pada `src/app/admin/error.tsx`.
2. WHEN sebuah exception tidak tertangkap dilempar saat merender segmen mana pun di bawah `src/app/admin`, THE Admin_Error_Boundary SHALL menampilkan dalam satu tampilan: (a) satu judul dan satu paragraf penjelasan berbahasa Indonesia yang menyatakan bahwa terjadi kesalahan, (b) satu tombol berlabel "Coba lagi", dan (c) satu tautan ke `/admin`.
3. IF sebuah error dilempar pada area admin, THEN THE Admin_Error_Boundary SHALL merender teks tanpa `error.message`, `error.stack`, digest, nama kelas error, path berkas, atau data privat, dan SHALL menampilkan teks yang identik untuk semua jenis error.
4. WHEN pengguna mengaktifkan tombol "Coba lagi", THE Admin_Error_Boundary SHALL memicu satu percobaan render ulang segmen admin yang gagal per aktivasi.
5. IF percobaan render ulang segmen admin gagal kembali setelah tombol "Coba lagi" diaktifkan, THEN THE Admin_Error_Boundary SHALL tetap tampil dengan konten yang sama, tanpa redirect otomatis dan tanpa perulangan render otomatis.
6. WHEN pengguna mengaktifkan tautan ke `/admin`, THE Admin_Error_Boundary SHALL menavigasikan pengguna ke `/admin` dalam satu aktivasi.
7. THE Admin_Error_Boundary SHALL mengirim `robots` dengan `index: false` dan `follow: false`.
8. THE Admin_Error_Boundary SHALL merender tepat satu elemen `main` ber-`id="main-content"`, dengan tombol "Coba lagi" dan tautan `/admin` masing-masing berukuran target interaktif minimal 44 x 44 CSS px serta menampilkan indikator `focus-visible` yang terlihat saat difokuskan dengan keyboard.
9. THE Admin_Error_Boundary SHALL tidak menampilkan data admin, nama pengguna, alamat email, atau peran.
10. THE Admin_Error_Boundary SHALL tidak mengubah hasil `requireAdmin()` maupun keputusan otorisasi, sehingga pengguna yang tidak berhak tetap ditolak dengan perilaku yang sama seperti sebelum Admin_Error_Boundary ada.

### Requirement 6: Loading state publik dan akun

**User Story:** As a pengunjung atau customer, I want indikator pemuatan saat halaman dynamic diproses, so that saya tahu halaman sedang dimuat.

#### Acceptance Criteria

1. THE Niuva_App SHALL menyediakan satu Loading_State untuk setiap segmen publik dan akun yang memakai `connection()`, dengan daftar segmen yang tercakup ditetapkan secara eksplisit pada fase design sehingga setiap segmen `connection()` di area publik dan akun tercatat sebagai tercakup atau dikecualikan beserta alasannya.
2. WHILE sebuah segmen dynamic sedang dimuat, THE Loading_State SHALL menampilkan kerangka (skeleton) dengan teks berbahasa Indonesia di dalam Public_Shell, tanpa teks berbahasa Inggris yang terlihat atau terbaca oleh teknologi bantu.
3. WHILE Loading_State ditampilkan, THE Loading_State SHALL mengekspos tepat satu elemen dengan `role="status"` yang memiliki label aksesibel berbahasa Indonesia tidak kosong, dan elemen kerangka dekoratif SHALL disembunyikan dari teknologi bantu.
4. WHILE pengguna memilih `prefers-reduced-motion: reduce`, THE Loading_State SHALL menonaktifkan animasi pulse (nilai animasi terhitung pada setiap elemen kerangka adalah tidak ada) dan menampilkan kerangka statis dengan dimensi yang sama seperti saat animasi aktif.
5. THE Loading_State SHALL memakai hanya token semantik untuk warna, spasi, radius, dan tipografi, tanpa nilai warna literal atau nilai visual arbitrer.
6. THE Loading_State SHALL tidak menampilkan data pengguna atau Sensitive_Detail (termasuk nama, email, alamat, nomor telepon, data pesanan, data pembayaran, dan nama berkas unggahan) pada konten yang dirender maupun pada label aksesibel.
7. THE Loading_State SHALL dirender tanpa elemen `main` sendiri sehingga dokumen memuat tepat satu elemen `main` baik saat Loading_State ditampilkan maupun setelah halaman tujuan dirender.
8. WHEN halaman tujuan selesai dirender, THE Niuva_App SHALL menghapus Loading_State dari dokumen sehingga tidak ada elemen `role="status"` milik Loading_State yang tersisa.
9. THE Niuva_App SHALL mempertahankan `src/app/admin/loading.tsx` tanpa perubahan perilaku, dibuktikan dengan isi berkas dan pengujian yang ada untuk segmen admin tetap lulus tanpa modifikasi.

### Requirement 7: Pemisahan state akses admin

**User Story:** As an Owner atau Admin, I want tahu apakah saya belum login, tidak berizin, atau layanan auth tidak tersedia, so that saya mengambil langkah yang tepat.

#### Acceptance Criteria

1. THE Admin_Access_View SHALL menampilkan untuk setiap dari tiga Admin_Access_State (`UNAUTHENTICATED`, `FORBIDDEN`, `AUTH_UNAVAILABLE`) satu judul dan satu deskripsi berbahasa Indonesia yang tidak kosong, dengan teks judul dan teks deskripsi yang berbeda antar ketiga state.
2. IF Admin_Access_State adalah `UNAUTHENTICATED`, THEN THE Admin_Access_View SHALL menampilkan tepat satu tautan ajakan masuk yang mengarah ke `/admin/sign-in`.
3. IF Admin_Access_State adalah `FORBIDDEN`, THEN THE Admin_Access_View SHALL menampilkan pesan bahwa akun tidak memiliki akses admin, satu tombol keluar, dan satu tautan ke beranda (`/`).
4. IF Admin_Access_State adalah `AUTH_UNAVAILABLE`, THEN THE Admin_Access_View SHALL menampilkan pesan bahwa layanan autentikasi belum tersedia, satu tombol berlabel "Muat ulang", dan satu tautan ke beranda (`/`).
5. THE Admin_Access_View SHALL menyediakan tepat satu tautan ke halaman publik (`/`) pada setiap dari ketiga state.
6. THE `loadAdminPageAccess` dan loader akses admin lainnya SHALL meneruskan nilai Admin_Access_State yang identik dengan hasil evaluasi otorisasi kepada Admin_Access_View, dan Admin_Access_View SHALL tidak mengubah, menurunkan, atau menaikkan hasil tersebut.
7. IF `requireAdmin()` menolak akses, THEN THE Niuva_App SHALL tidak menyertakan data admin apa pun (daftar, nilai, atau konten yang hanya tersedia bagi Owner atau Admin) dalam respons halaman pada state `UNAUTHENTICATED`, `FORBIDDEN`, maupun `AUTH_UNAVAILABLE`.
8. WHERE pengelola memilih status HTTP non-200 untuk Admin_Access_State, THE Niuva_App SHALL memakai 401 untuk `UNAUTHENTICATED`, 403 untuk `FORBIDDEN`, dan 503 untuk `AUTH_UNAVAILABLE`; IF Next.js tidak mendukung pengaturan status tersebut dari halaman, THEN THE design SHALL mendokumentasikan batasannya dan Niuva_App SHALL mempertahankan HTTP 200 dengan `robots` `noindex` pada ketiga state.
9. THE Admin_Access_View SHALL mengirim `robots` dengan `index: false` dan `follow: false` pada setiap dari ketiga state.
10. THE Admin_Access_View SHALL mempertahankan tepat satu elemen `main` ber-`id="main-content"`, ukuran target minimal 44 x 44 piksel CSS untuk setiap tautan dan tombol, dan indikator `focus-visible` yang terlihat dengan rasio kontras minimal 3:1 terhadap warna di sekitarnya pada setiap elemen interaktif, pada setiap dari ketiga state.
11. THE Admin_Access_View SHALL tidak menampilkan alamat email, ID pengguna, nama peran, atau pesan error mentah (termasuk stack trace dan teks error dari penyedia autentikasi) dalam konten yang dirender pada setiap dari ketiga state.
12. WHEN pengguna mengaktifkan tombol keluar pada state `FORBIDDEN`, THE Admin_Access_View SHALL mengakhiri sesi pengguna dan mengarahkan pengguna ke beranda (`/`).
13. IF proses keluar gagal, THEN THE Admin_Access_View SHALL tetap menampilkan state `FORBIDDEN`, menampilkan indikasi kegagalan berbahasa Indonesia tanpa detail error mentah dalam 5 detik setelah kegagalan, dan mempertahankan tombol keluar agar dapat dicoba kembali.
14. WHEN pengguna mengaktifkan tombol "Muat ulang" pada state `AUTH_UNAVAILABLE`, THE Admin_Access_View SHALL memicu evaluasi ulang akses admin untuk halaman yang sama; IF hasil evaluasi ulang tetap `AUTH_UNAVAILABLE`, THEN THE Admin_Access_View SHALL tetap menampilkan state `AUTH_UNAVAILABLE` dengan tombol "Muat ulang" yang dapat diaktifkan kembali.

### Requirement 8: Pembedaan "record tidak ada" dan "sumber data tidak tersedia" pada detail admin

**User Story:** As an Owner atau Admin, I want tahu apakah record memang tidak ada atau sumber data sedang bermasalah, so that saya tidak salah mengira data hilang.

#### Acceptance Criteria

1. WHEN sebuah Admin_Loader menerima ID berformat UUID valid dan sumber data merespons berhasil tanpa record yang cocok, THE Niuva_App SHALL memanggil `notFound()` dan merender tampilan not-found admin berbahasa Indonesia.
2. IF sebuah Admin_Loader gagal membaca sumber data (pembacaan melempar error, atau sumber data tidak merespons), THEN THE Niuva_App SHALL merender Admin_Data_Unavailable_View berbahasa Indonesia yang menyatakan data belum dapat dimuat dan tidak menyatakan bahwa record tidak ada, tanpa memanggil `notFound()` dan tanpa merender data record.
3. THE Admin_Loader SHALL mengembalikan hasil dengan tepat tiga kemungkinan yang dapat dibedakan secara eksplisit, yaitu "ditemukan" (membawa data record), "tidak ada", dan "tidak tersedia", tanpa mengandalkan nilai `null` tunggal untuk membedakan ketiganya.
4. THE Niuva_App SHALL menerapkan pembedaan pada ayat 1 sampai 3 pada detail admin `orders/[id]`, `inquiries/[id]`, `custom-print/[id]`, `portfolio/[id]`, dan `products/[id]`, serta pada setiap halaman detail lain di bawah `src/app/admin` yang memakai pola Admin_Loader yang sama.
5. THE Niuva_App SHALL menyediakan `src/app/admin/not-found.tsx` yang dirender di dalam konteks admin (layout atau Admin_Shell), dengan satu `h1` berbahasa Indonesia, elemen `main` ber-`id="main-content"`, serta tautan kembali ke `/admin` dengan target interaktif minimal 44px dan indikator `focus-visible`.
6. THE tampilan not-found admin SHALL mengirim `robots` dengan `index: false` dan `follow: false`.
7. IF ID pada halaman detail admin bukan UUID valid, THEN THE Niuva_App SHALL memanggil `notFound()` tanpa membaca sumber data dan merender tampilan not-found admin yang sama dengan kasus pada ayat 1.
8. THE tampilan not-found admin dan Admin_Data_Unavailable_View SHALL menampilkan teks tanpa Sensitive_Detail, termasuk ID yang diminta dan pesan error mentah dari sumber data.
9. WHEN sebuah halaman detail admin dimuat, THE Admin_Loader SHALL menyelesaikan pemanggilan `requireAdmin()` sebelum membaca sumber data apa pun, dan IF `requireAdmin()` menolak akses, THEN THE Admin_Loader SHALL tidak membaca sumber data dan THE Niuva_App SHALL tidak merender data record maupun tampilan not-found atau Admin_Data_Unavailable_View.

### Requirement 9: Respons browser untuk kegagalan auth admin pada proxy

**User Story:** As an Owner atau Admin, I want halaman pemeliharaan ketika autentikasi admin tidak dikonfigurasi, so that saya tidak melihat JSON mentah saat membuka `/admin`.

#### Acceptance Criteria

1. WHEN Clerk credentials tidak tersedia dan Admin_Proxy menerima Browser_Navigation_Request pada path `/admin` atau `/admin/*`, THE Admin_Proxy SHALL merespons dengan dokumen HTML berbahasa Indonesia (atribut bahasa dokumen `id`) yang berisi satu judul utama (`h1`) dan teks yang menyatakan bahwa layanan autentikasi admin belum tersedia.
2. WHEN Clerk credentials tidak tersedia dan Admin_Proxy menerima API_Request, THE Admin_Proxy SHALL merespons dengan JSON `{"error":{"code":"AUTH_UNAVAILABLE","message":"Layanan autentikasi admin belum tersedia."}}` dan status 503, tanpa meneruskan request ke handler resource admin.
3. WHEN Clerk credentials tidak tersedia dan Admin_Proxy menerima Browser_Navigation_Request, THE Admin_Proxy SHALL merespons dengan status 503 dan tidak meneruskan request ke halaman admin yang diminta.
4. THE respons HTML SHALL menyertakan tepat satu tautan yang terlihat dengan teks jelas menuju beranda (`/`), setidaknya salah satu dari header respons `noindex` atau meta `noindex`, dan tepat satu elemen `main` dengan `id="main-content"` yang memuat judul utama, teks status, dan tautan beranda.
5. THE respons HTML SHALL tidak memuat Sensitive_Detail, nama variabel environment, nilai kredensial, stack trace, maupun nama penyedia autentikasi yang menunjukkan konfigurasi internal.
6. THE respons HTML SHALL memakai token atau gaya Niuva yang sudah ada, tidak menambah dependency pada manifest paket, dan tidak memuat skrip, stylesheet, font, atau gambar dari sumber eksternal.
7. WHEN Clerk credentials tersedia, THE Admin_Proxy SHALL meneruskan request ke `clerkMiddleware` dengan hasil (status, header, dan isi respons) yang identik dengan perilaku sebelum perubahan ini.
8. THE Admin_Proxy SHALL tidak memperluas matcher di luar `/admin/:path*` dan `/api/admin/:path*`.
9. THE Admin_Proxy SHALL mempertahankan `createAdminAuthUnavailableResponse()` sebagai respons JSON dengan isi dan status 503 yang sama seperti sebelum perubahan, sehingga seluruh test yang ada untuk fungsi tersebut tetap lulus tanpa modifikasi.
10. THE Admin_Proxy SHALL tidak melonggarkan `auth.protect`, `contentSecurityPolicy`, maupun pemeriksaan `requireAdmin()` pada resource.
11. IF Admin_Proxy menerima request pada path `/api/admin/*` saat Clerk credentials tidak tersedia, THEN THE Admin_Proxy SHALL merespons dengan JSON pada kriteria 2 dan status 503, apa pun nilai header `Accept` request tersebut, dan tidak merespons dengan HTML.

### Requirement 10: Verifikasi dan perbaikan rute sign-in Clerk

**User Story:** As an Owner atau Admin, I want seluruh langkah sign-in Clerk berfungsi, so that saya bisa menyelesaikan login, termasuk langkah lanjutan seperti faktor verifikasi.

#### Acceptance Criteria

1. THE design SHALL memverifikasi, sebagai pengunjung yang belum login, hasil permintaan ke `/admin/sign-in/factor-one` dan ke minimal satu Clerk_Sub_Step lain, lalu mencatat untuk setiap path: path yang diminta, URL akhir yang ditampilkan browser, dan klasifikasi hasil (halaman sign-in Clerk ter-render pada langkah yang diminta, 404, atau pengalihan kembali ke `/admin/sign-in`).
2. IF verifikasi mengonfirmasi bahwa Clerk_Sub_Step menghasilkan 404 atau pengalihan ke `/admin/sign-in` sehingga langkah yang diminta tidak ter-render, THEN THE Niuva_App SHALL menyediakan rute catch-all `src/app/admin/sign-in/[[...sign-in]]/page.tsx` atau mekanisme setara yang dicatat pada design, sehingga setiap Clerk_Sub_Step yang diverifikasi pada kriteria 1 ter-render pada URL yang diminta tanpa 404 dan tanpa pengalihan ke `/admin/sign-in`.
3. IF verifikasi mengonfirmasi bahwa Admin_Proxy menolak atau mengalihkan Clerk_Sub_Step milik pengunjung yang belum login, THEN THE Admin_Proxy SHALL mengizinkan path yang diawali `/admin/sign-in/` tanpa memanggil `auth.protect`.
4. IF verifikasi menunjukkan semua Clerk_Sub_Step yang diuji pada kriteria 1 sudah ter-render pada URL yang diminta, THEN THE spec SHALL mencatat bahwa tidak ada perubahan kode diperlukan untuk Requirement 10, beserta bukti verifikasi berupa path yang diuji, URL akhir, dan klasifikasi hasil untuk setiap path.
5. THE Admin_Proxy SHALL mengizinkan tanpa autentikasi hanya path yang persis `/admin/sign-in` atau yang diawali `/admin/sign-in/`.
6. IF path permintaan di bawah `/admin` tidak persis `/admin/sign-in` dan tidak diawali `/admin/sign-in/` (misalnya `/admin/sign-in-other`), THEN THE Admin_Proxy SHALL tetap memproteksi path tersebut dengan `auth.protect`.
7. THE Admin_Sign_In_Route SHALL mempertahankan `withSignUp={false}` dan `forceRedirectUrl="/admin"` pada setiap Clerk_Sub_Step yang ter-render.
8. THE Admin_Sign_In_Route SHALL mempertahankan `robots` dengan `index: false` dan `follow: false` pada `/admin/sign-in` dan pada setiap Clerk_Sub_Step.
9. THE perubahan pada Requirement 10 SHALL tidak membuat registrasi admin publik tersedia, yang dibuktikan oleh tidak adanya tautan atau formulir sign-up pada `/admin/sign-in` maupun pada setiap Clerk_Sub_Step yang diverifikasi, dan oleh tidak adanya rute sign-up publik baru.
10. IF verifikasi pada kriteria 1 tidak dapat diselesaikan untuk suatu path (misalnya layanan Clerk tidak dapat dijangkau atau konfigurasi lokal tidak tersedia), THEN THE design SHALL mencatat path tersebut sebagai belum terverifikasi beserta penyebabnya, dan THE spec SHALL tidak menyimpulkan bahwa tidak ada perubahan kode diperlukan untuk path tersebut.

### Requirement 11: Copy login Customer yang netral

**User Story:** As a customer, I want pesan ketersediaan login yang akurat, so that saya tidak mengira hanya Google yang didukung.

#### Acceptance Criteria

1. THE `src/app/checkout/page.tsx` SHALL menampilkan teks deskripsi notice ketersediaan login yang memuat frasa "login Customer" dan tidak memuat kata "Google" dalam bentuk huruf besar/kecil apa pun.
2. THE `src/app/project-brief/page.tsx` SHALL menampilkan teks deskripsi notice ketersediaan login yang memuat frasa "login Customer" dan tidak memuat kata "Google" dalam bentuk huruf besar/kecil apa pun.
3. THE `src/app/custom-print/request/page.tsx` SHALL menampilkan teks deskripsi notice ketersediaan login yang memuat frasa "login Customer" dan tidak memuat kata "Google" dalam bentuk huruf besar/kecil apa pun.
4. THE `src/app/custom-print/page.tsx` SHALL menampilkan teks pada tiga lokasi copy yang terdampak, yaitu (a) judul dan teks notice login, (b) teks ajakan pengajuan, dan (c) judul status pengiriman, dengan setiap lokasi memuat frasa "login Customer" dan tidak memuat kata "Google" dalam bentuk huruf besar/kecil apa pun.
5. THE perubahan copy SHALL tidak mengubah kondisi gating, nilai atau nama capability flag (termasuk `customerGoogle`), maupun tujuan redirect ke `/login`, sehingga perilaku setiap halaman pada kondisi login tersedia dan tidak tersedia identik dengan sebelum perubahan.
6. THE perubahan copy SHALL mempertahankan judul notice "Login Customer belum tersedia" dengan teks yang identik karakter demi karakter pada setiap halaman yang memakainya sebelum perubahan, dan tidak menambahkan judul tersebut ke halaman yang sebelumnya tidak memakainya.
7. IF sebuah test yang ada menegaskan copy lama yang memuat kata "Google", THEN THE test SHALL diperbarui agar menegaskan copy baru yang memuat frasa "login Customer" dan memastikan kata "Google" tidak muncul, dengan jumlah test dan jumlah assertion tidak berkurang dari sebelum perubahan.

### Requirement 12: Tautan NextAction tidak mengarah ke rute preview pada proyeksi live

**User Story:** As a customer, I want tombol langkah berikutnya mengarah ke quote saya yang nyata, so that saya tidak dibawa ke halaman contoh.

#### Acceptance Criteria

1. WHILE Order_Status_Component merender Live_Projection, THE `NextAction` SHALL tidak menghasilkan `href` (pada elemen tautan atau tombol apa pun, untuk semua tipe `NextAction`) yang memuat `/quote/preview-quote` atau `preview=examples`.
2. WHILE Order_Status_Component merender Preview_Fixture, THE `NextAction` SHALL tetap dapat menautkan ke `/quote/preview-quote?preview=examples`.
3. WHEN `NextAction` bertipe `quote` dirender pada Live_Projection dan proyeksi server menyediakan URL quote nyata milik customer yang sedang melihat pesanan tersebut (URL relatif satu-origin yang tidak memuat `/quote/preview-quote` maupun `preview=examples`), THE `NextAction` SHALL menautkan ke URL tersebut tanpa mengubahnya.
4. IF `NextAction` bertipe `quote` dirender pada Live_Projection dan URL quote nyata tidak tersedia (kosong, tidak ada, atau memuat `/quote/preview-quote` atau `preview=examples`), THEN THE `NextAction` SHALL menampilkan Status_Notice yang menyatakan bahwa tautan quote belum tersedia, dan THE Order_Status_Component SHALL tidak merender elemen tautan atau tombol aktif (tanpa `href`, tidak dapat difokus dengan keyboard) untuk `NextAction` tersebut.
5. THE Order_Status_Component SHALL menentukan mode preview versus live hanya dari prop `isPreview` atau data proyeksi server, dan SHALL mengabaikan parameter query browser untuk penentuan tersebut.
6. IF prop `isPreview` tidak bernilai `true` (termasuk tidak diberikan), THEN THE Order_Status_Component SHALL memperlakukan render sebagai Live_Projection.
7. THE Order_Status_Component SHALL tidak merender pada DOM token quote milik pengguna lain, data privat, atau Sensitive_Detail, dan satu-satunya pengenal quote pada DOM SHALL berasal dari URL quote milik pesanan yang sedang dirender.
8. WHEN `payment.redirectUrl` tersedia pada proyeksi, THE Order_Status_Component SHALL merender tombol pembayaran dengan tujuan dan perilaku yang identik dengan sebelum perubahan ini.
9. FOR ALL kombinasi nilai `isPreview` dan tipe `NextAction`, IF `isPreview` bernilai `false`, THEN THE Order_Status_Component SHALL menghasilkan DOM yang tidak memuat `/quote/preview-quote` maupun `preview=examples` pada atribut tautan apa pun (properti invarian).

### Requirement 13: Pembersihan direktori kosong AUiS (bergantung persetujuan)

**User Story:** As an Owner, I want direktori AUiS yang sudah pensiun dibersihkan hanya atas persetujuan saya, so that penghapusan file tidak terjadi tanpa izin.

#### Acceptance Criteria

1. WHERE Owner memberikan persetujuan eksplisit untuk penghapusan melalui instruksi tertulis yang menyebut penghapusan AUiS_Empty_Directories, THE implementation SHALL menghapus hanya direktori AUiS_Empty_Directories yang pada saat verifikasi berisi 0 berkas dan 0 subdirektori yang berisi berkas, pada semua kedalaman.
2. IF Owner belum memberikan persetujuan eksplisit, THEN THE implementation SHALL tidak menghapus berkas atau direktori apa pun pada AUiS_Empty_Directories dan SHALL melaporkan bahwa penghapusan ditunda menunggu persetujuan Owner.
3. IF sebuah direktori pada AUiS_Empty_Directories berisi minimal 1 berkas saat verifikasi, THEN THE implementation SHALL melewati direktori tersebut tanpa menghapus isinya, mempertahankan direktori beserta seluruh berkasnya, dan melaporkan jalur direktori serta jumlah berkas yang ditemukan.
4. WHERE Owner memberikan persetujuan, THE implementation SHALL mencari impor dan referensi string ke setiap jalur AUiS_Empty_Directories di seluruh berkas sumber, konfigurasi, dan dokumentasi aktif sebelum penghapusan, dan hasil pencarian SHALL dilaporkan.
5. IF pencarian pada kriteria 4 menemukan minimal 1 impor atau referensi aktif ke sebuah jalur AUiS_Empty_Directories, THEN THE implementation SHALL melewati penghapusan direktori tersebut dan melaporkan lokasi referensi yang ditemukan.
6. THE implementation SHALL tidak menghapus, memindahkan, atau mengubah berkas atau direktori apa pun di luar AUiS_Empty_Directories, termasuk direktori induk `src/app/auis` dan `src/app/api/auis` serta berkas di dalamnya yang bukan bagian dari AUiS_Empty_Directories.
7. WHERE Owner memberikan persetujuan dan penghapusan telah selesai, THE implementation SHALL menjalankan `corepack pnpm typecheck` dan `corepack pnpm build` dan melaporkan untuk masing-masing perintah: exit code, serta status lulus atau gagal.
8. IF `corepack pnpm typecheck` atau `corepack pnpm build` gagal setelah penghapusan, THEN THE implementation SHALL melaporkan perintah yang gagal beserta ringkasan kesalahan tanpa Sensitive_Detail, dan SHALL tidak menyatakan pembersihan berhasil.

### Requirement 14: Aksesibilitas, token desain, dan copy lintas halaman sistem

**User Story:** As a pengguna dengan kebutuhan aksesibilitas, I want halaman sistem yang dapat dioperasikan dengan keyboard dan pembaca layar, so that saya dapat pulih dari kondisi error.

#### Acceptance Criteria

1. THE Root_Not_Found, Public_Error_Boundary, Global_Error_Boundary, Admin_Error_Boundary, not-found admin, dan Admin_Access_View SHALL memuat tepat satu elemen `h1` yang teksnya berbahasa Indonesia dan tidak kosong.
2. THE Loading_State SHALL memuat elemen dengan `role="status"` yang berisi teks berbahasa Indonesia tidak kosong dan SHALL tidak memuat elemen `h1`.
3. THE halaman sistem tersebut SHALL menyediakan skip link ke `#main-content` sebagai elemen yang dapat difokuskan pertama melalui shell yang berlaku; WHERE sebuah halaman mandiri tidak memakai shell (misalnya Global_Error_Boundary), THE halaman SHALL menyediakan skip link sendiri sebagai elemen yang dapat difokuskan pertama dan menuju `#main-content` pada halaman yang sama.
4. THE elemen interaktif pada halaman sistem SHALL memiliki ukuran target minimal 44 x 44 piksel CSS, kecuali tautan inline di dalam kalimat, dan SHALL menampilkan indikator `focus-visible` dengan kontras minimal 3:1 terhadap warna di sekitarnya.
5. THE halaman sistem SHALL memakai Status_Notice, Niuva_Link, token tipografi `src/design/typography.ts`, dan token semantik, tanpa nilai warna, ukuran, atau font arbitrer.
6. WHILE pengguna memilih `prefers-reduced-motion: reduce`, THE halaman sistem SHALL tidak menjalankan animasi atau transisi non-esensial, termasuk animasi berulang, dan SHALL menampilkan indikator Loading_State dalam bentuk statis.
7. WHEN halaman error atau tidak ditemukan dirender, THE halaman SHALL memindahkan fokus ke `h1` atau kontainer `#main-content` sehingga elemen interaktif pertama di dalam konten utama (aksi pemulihan pertama) menerima fokus setelah tepat satu kali menekan Tab.
8. WHEN pengguna keyboard mengaktifkan aksi pemulihan dengan tombol Enter (tautan) atau tombol Enter atau Spasi (tombol), THE halaman sistem SHALL menjalankan aksi yang sama seperti aktivasi dengan pointer.
9. THE copy pada halaman sistem SHALL berbahasa Indonesia, terdiri dari kalimat dengan panjang maksimal 20 kata, dan tidak memuat istilah teknis "exception", "stack", atau "digest".
10. THE perubahan pada spec ini SHALL tidak menambah, menghapus, atau mengubah entri `dependencies` dan `devDependencies` pada `package.json`.

### Requirement 15: Verifikasi, pengujian, dan status penerimaan

**User Story:** As an Owner, I want bukti pengujian dan status penerimaan yang jujur, so that saya tahu apa yang sudah diverifikasi dan apa yang masih perlu saya tinjau.

#### Acceptance Criteria

1. THE implementation SHALL menyertakan test Vitest dan React Testing Library untuk Root_Not_Found, Public_Error_Boundary, Global_Error_Boundary, Admin_Error_Boundary, not-found admin, Admin_Access_View untuk masing-masing dari tiga Admin_Access_State (satu test case terpisah per state), dan Loading_State, dengan setiap test menegaskan bahwa pesan utama dan minimal satu aksi pemulihan atau navigasi dirender.
2. THE implementation SHALL menyertakan test unit untuk Admin_Proxy yang menegaskan: respons HTML 503 untuk Browser_Navigation_Request ketika credentials tidak tersedia, respons JSON 503 untuk API_Request ketika credentials tidak tersedia, dan penerusan ke `clerkMiddleware` ketika credentials tersedia tanpa menghasilkan respons 503.
3. THE implementation SHALL menyertakan test untuk `NextAction` yang menegaskan setiap kriteria Requirement 12, dengan minimal satu test case pada mode preview dan minimal satu test case pada mode live.
4. THE implementation SHALL menyertakan test yang menegaskan bahwa Admin_Loader, pada minimal satu halaman detail admin per entitas yang terdampak, menghasilkan not-found admin ketika data tidak ada dan menghasilkan keadaan tidak tersedia (bukan not-found) ketika sumber data gagal diakses.
5. THE implementation SHALL menyertakan test yang menegaskan bahwa, untuk setiap halaman tidak ditemukan dan halaman error pada kriteria 1, nilai token, `error.message`, dan stack trace yang disisipkan sebagai nilai uji tidak muncul di teks maupun atribut DOM yang dirender.
6. THE implementation SHALL menyertakan Playwright smoke test yang memverifikasi: URL acak menampilkan Root_Not_Found dengan status 404, `/services/tidak-ada` menampilkan Root_Not_Found dengan status 404, dan `/quote/token-tidak-valid` serta `/orders/token-tidak-valid` masing-masing menampilkan not-found dengan status 404 yang tidak mengandung nilai token yang diminta dan tidak membedakan token tidak valid dari token yang tidak ditemukan.
7. WHEN perubahan selesai, THE implementation SHALL menjalankan `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, dan `corepack pnpm build`, lalu melaporkan hasil lulus atau gagal untuk masing-masing perintah.
8. WHERE lingkungan mendukung eksekusi browser Playwright, THE implementation SHALL menjalankan `corepack pnpm test:e2e` dan melaporkan hasil lulus atau gagal.
9. THE laporan akhir SHALL mencantumkan file yang berubah, perintah yang dijalankan, hasil test dan build, kriteria penerimaan yang tercakup, risiko tersisa, dan catatan rollback.
10. THE laporan akhir SHALL menyatakan bahwa penerimaan visual belum ditinjau sampai pengguna menerimanya secara eksplisit, dan bahwa lulus test atau build bukan persetujuan visual.
11. THE laporan akhir SHALL menyatakan bahwa bukti bersifat lokal dan non-production, serta bahwa penerimaan perangkat fisik, teknologi bantu, provider, dan production tetap terpisah.
12. IF salah satu perintah pada kriteria 7 atau 8 gagal, THEN THE laporan akhir SHALL mencantumkan perintah yang gagal beserta ringkasan penyebab kegagalan, dan SHALL menandai pekerjaan terkait sebagai belum terverifikasi alih-alih melaporkannya lulus.
13. IF `corepack pnpm test:e2e` tidak dijalankan karena lingkungan tidak mendukung, THEN THE laporan akhir SHALL menyatakan bahwa E2E tidak dijalankan beserta alasannya, dan SHALL menandai kriteria 6 sebagai belum terverifikasi di browser.