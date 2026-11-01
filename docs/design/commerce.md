# Commerce & Customer — pedoman penerapan aktif

Baca setelah [DESIGN.md](../../DESIGN.md). Berlaku untuk Shop, detail produk, cart, checkout, Custom Print/MAKE, quote, account, status, serta auth/pemulihan Customer. Keputusan produk dan transaksi mendapat prioritas di atas ekspresi editorial.

## Komponen shadcn/ui pada Commerce dan Customer

Seluruh surface di atas mengikuti kontrak shadcn/ui global di [DESIGN.md](../../DESIGN.md). Gunakan lapis komponen lokal yang sama dengan Company dan Admin, termasuk untuk form auth, pemulihan, serta state transaksi. Keputusan ini tidak menyatakan migrasi semua route sudah selesai; pekerjaan saat ini hanya dokumentasi.

- Gunakan Button, Field/Label, Input/NativeInput, Textarea, NativeSelect/Select, RadioGroup, dan komponen status/overlay lokal sesuai kebutuhan. Pilihan native dan fallback tanpa JavaScript yang berlaku tetap tersedia.
- Product card, pilihan varian, cart item, ringkasan biaya, timeline, serta workspace/file preview MAKE tetap komponen domain Niuva yang mengomposisi lapis bersama. Jangan membuat primitive form atau dialog paralel khusus checkout/Customer.
- Media produk dan viewer khusus tetap memiliki tugas domainnya; kontrol dan feedback antarmukanya mengikuti komponen bersama. Kebutuhan viewer tidak memberi izin menambahkan dependency atau mengubah akses file privat.
- Penerapan komponen mempertahankan name/value form, submit/validasi, state server, auth/permission, serta aturan harga dan pembayaran. Tema shadcn mengikuti token Niuva dan kepadatan Commerce; layout account tidak menjadi workspace Admin.

## Komposisi route (Foundation v2, T48)

Dibangun di atas Foundation v2; belum ditinjau Owner.

- **Toko (`/shop`):** judul display dan satu kalimat cara membeli, lalu langsung katalog: chip kategori (`aria-pressed`) dan kolom cari di satu baris, jumlah produk, kemudian grid kartu produk persegi (1/2/3 kolom). Kartu berisi foto utuh (contain) di permukaan putih, kategori, nama, harga ("Mulai" hanya bila harga varian berbeda), dan status stok berwarna; tanpa ringkasan panjang. Panel penutup biru dengan maskot kunci inggris mengarah ke Custom 3D Print. Header tidak membawa aksi tambahan; Keranjang dengan badge jumlah sudah ada di utilitas.
- **Detail produk:** tautan "Kembali ke Toko", lalu galeri dan panel keputusan berdampingan mulai `lg`. Galeri: foto persegi besar, keterangan "Foto n dari N", dan thumbnail (satu baris geser di ponsel, grid mulai `sm`). Memilih varian menampilkan foto yang dikaitkan ke varian itu (diisi importer atau dipilih di Admin); alt text "Foto varian <nama varian>" menjadi cadangan, dan tanpa keduanya galeri tidak berpindah. Panel: kategori, nama, ringkasan, harga dan stok, daftar varian, kartu harga dan jumlah, tombol terisi "Tambah ke keranjang", dan satu kalimat bahwa harga dan stok diperiksa lagi saat checkout. Deskripsi katalog lengkap ada di disclosure di bawahnya.
- **Produk tidak ditemukan:** bidang biru sistem dengan maskot ide, "Lihat Toko" dan "Kembali ke beranda".
- **Keranjang (`/cart`):** judul "Keranjang" dan satu kalimat, lalu isi keranjang dan ringkasan berdampingan mulai `lg` (ringkasan sticky di bawah header). Isi keranjang adalah satu permukaan putih dengan baris dipisah hairline: foto varian (cadangan foto sampul) contain, kategori, nama yang menaut ke detail, varian, total baris di atas harga per barang, jumlah, stok, dan "Hapus" (ghost, teks destructive). Ringkasan memuat subtotal, ongkir "Dihitung di checkout", dan satu tombol terisi. Keranjang kosong memakai panel maskot `brand-100` (bukan bidang biru kedua) dengan "Lihat Toko".
- **Checkout (`/checkout`):** tautan "Kembali ke keranjang", judul "Selesaikan pesanan", lalu tiga langkah bernomor di permukaan putih (Kontak pemesan, Alamat penerima, Opsi pengiriman) dan ringkasan pesanan di samping mulai `lg`, di bawah langkah pada compact. Field yang berasal dari akun tampil read-only dengan latar `muted`. Ringkasan menulis ongkir "Pilih di langkah 3" sampai dipilih dan "Perkiraan total"; tombol utama "Buat pesanan". Hasil pembuatan pesanan memakai StatusNotice di atas langkah, dengan fokus berpindah ke sana.
- **Custom 3D Print (`/custom-print`):** bidang biru dengan geometri detail layanan: judul "Review dulu. Baru produksi.", satu kalimat, "Pilih titik mulai" (`onBrand`) dan tautan "Lihat alurnya", maskot laptop, dan satu kartu fakta mulai `xl`. Lalu dua kartu titik mulai yang setara (model 3D/CAD dan referensi), masing-masing dengan daftar fakta berhairline (format, batas ukuran) dan satu tombol outline; daftar "Sebelum mengirim"; alur empat langkah bernomor; batas Harga/File/Ongkir dalam satu permukaan putih (memuat "Estimasi awal, bukan harga final." tepat satu kali); FAQ disclosure; panel penutup dengan maskot kunci inggris. Tidak ada ilustrasi selain maskot.
- **Workspace pengajuan (`/custom-print/request`):** tautan kembali, judul display, satu kalimat, dan dua pill mode (`aria-current`). Form berupa langkah bernomor di permukaan putih seperti checkout (model: File, Konfigurasi, Simulasi opsional, Kontak; referensi: Kebutuhan, Kontak) dengan ringkasan error dan hasil di atas langkah; panel "Setelah Anda mengirim" dan "Yang perlu disiapkan" di samping mulai `lg`, di bawah form pada compact. Select native tidak memakai gaya read-only.
- **Status pengajuan (`/custom-print/requests/[token]`):** nomor referensi, judul display, fakta 2×2 berhairline, StatusNotice sesuai tahap, lalu form tambah model di permukaan putih bila berlaku.
- **Review quote (`/quote/[token]`):** judul display dan satu kalimat, strip fakta berhairline (nomor quote, versi, berlaku sampai), lalu scope dalam grid 2×2 dan asumsi dalam satu daftar. Rincian biaya dan kartu keputusan berada di samping mulai `lg`. Konfirmasi terima/tolak tampil di dalam kartu keputusan, menerima fokus, tertutup dengan Escape atau "Kembali", dan mengembalikan fokus ke tombol pembukanya; hasil keputusan memindahkan fokus ke kartu. Total menyebut bahwa ongkir ditagih terpisah setelah paket final diukur.
- **Status pesanan (`/orders/[token]`):** judul display berisi status saat ini, satu kalimat, dan strip fakta (nomor pesanan, jenis, dibuat). Tahapan pesanan di kolom utama; di samping mulai `lg`: langkah berikutnya lebih dulu, lalu ringkasan pesanan, pengiriman, dan bantuan. Halaman tidak menampilkan alamat lengkap, kontak, file privat, atau catatan operator. Token tidak valid memakai shell publik dengan "Kembali ke beranda".
- **Komponen domain:** `MoneySummary` dan `OrderStatusTimeline` berupa permukaan putih tanpa bayangan, eyebrow, atau garis kiri. Badge ringkasan hanya muncul untuk state yang perlu perhatian; tahap aktif timeline memakai warna `primary`.
- **Akun (`/account`, T49):** judul display "Pekerjaan dan pesanan Anda.", profil satu baris (avatar atau inisial, nama, email terverifikasi, Pusat privasi, Logout), lalu daftar Custom 3D Print dan riwayat pesanan sebagai baris berhairline dalam satu permukaan putih. Tiap baris: nomor, tanggal dan jenis, label status, lalu ringkasan atau total. Label status netral; amber hanya bila langkah berikutnya menunggu Customer (quote menunggu keputusan, pembayaran). Form tautkan pengajuan lama di samping mulai `lg`.
- **Detail Custom 3D Print di akun (`/account/make/[id]`, T49):** judul berisi status pengajuan, satu kalimat, strip fakta (nomor referensi, titik mulai, model terverifikasi, file diterima). Bila quote sudah ada, seksi Quote memimpin karena itu harga yang berlaku; estimasi dan simulasi menyusul. Hanya quote terbaru yang menampilkan Terima/Tolak dengan konfirmasi inline yang sama dengan review quote bertoken. Tambah model dan perkiraan ongkir di samping.
- **Detail pesanan di akun (`/account/orders/[id]`, T49):** geometri yang sama dengan status pesanan bertoken (judul status, strip fakta, tahapan pesanan), dengan "Lanjutkan pembayaran" di kartu langkah berikutnya bila tautan pembayaran masih berlaku, lalu rincian, pembayaran, pengiriman, dan refund di samping.
- Label status untuk pelanggan, Rupiah, berat, dan durasi memakai `src/features/customer-status/labels.ts` dan `src/modules/shared/format.ts`; jangan menampilkan enum mentah atau angka tanpa format.
- Copy memakai bahasa pelanggan ("keranjang", "Toko", "pengajuan"); batas server tetap dinyatakan dengan kalimat sederhana, tanpa istilah sistem seperti "browser", "runtime", "storage", atau "otoritas". Notice login yang tidak tersedia tetap memakai frasa "login Customer" tanpa kata "Google".

## Informasi berada dekat keputusan

| Surface | Informasi utama | Bentuk yang sesuai |
| --- | --- | --- |
| Shop | Objek, nama, kategori yang berguna, harga/status availability | Grid produk dengan gambar yang dapat dibandingkan; heading ringkas, tanpa hero promosi besar sebelum katalog |
| Detail produk | Media, varian terpilih, harga, stok, konsekuensi pilihan, tindakan | Media dan panel keputusan berdampingan pada wide; compact menempatkan pilihan/harga dekat tindakan |
| Cart | Item, varian, jumlah, nilai, perubahan atau masalah | Daftar item dan summary; pengguna dapat melacak kontribusi tiap item ke total |
| Checkout | Data yang diperlukan, shipping, ringkasan biaya, validasi | Form berurutan dan summary dalam alur; jangan menyembunyikan biaya demi komposisi |
| MAKE | Apa yang diajukan, konfigurasi, file/referensi, status review | Form/workspace sesuai tahap; penjelasan batas estimasi dekat nilai dan tindakan |
| Quote / status order | Keadaan saat ini, nilai yang berlaku, langkah berikutnya | Summary dan timeline/definition list; detail penting tidak disembunyikan dalam badge |
| Account | Pekerjaan/order sendiri dan statusnya | Daftar record yang bisa dipindai; bukan dashboard KPI promosi atau workspace Admin |
| Login / pemulihan | Satu tugas auth, bantuan/error, tujuan kembali | Form yang tenang; tidak memerlukan CTA Company tambahan |

Product card adalah pola yang berguna karena mewakili objek yang dapat dipilih. Tidak perlu menghapusnya demi originalitas. Hindari membungkus setiap baris spesifikasi, harga, bantuan, dan total dalam card terpisah; kedekatan, divider, serta alignment sering cukup.

## Media, tipe, dan kepadatan

Produk/CAD harus utuh dan dapat diperiksa. Gunakan contain, latar yang tidak bersaing dengan objek, dan urutan gambar yang menjelaskan keputusan. Jangan memotong bagian penting agar semua thumbnail terasa seragam. Jangan menambahkan badge bestseller, rating, urgensi stok, atau diskon tanpa data yang berwenang.

Heading Commerce memakai role yang sesuai konteks, tidak otomatis display besar. Harga, unit, jumlah, dan status harus terbaca bersama. Label tidak diperkecil agar form terlihat bersih. Teks body tetap mengikuti fondasi; ui-data dan angka tabular membantu perbandingan.

Surface utama light-first. Gunakan warna semantic untuk fungsi: selected, warning, error, atau action; biru bukan lapisan dekoratif pada semua panel. Ruang kosong memisahkan kelompok keputusan, bukan memperpanjang jarak produk dari tombolnya.

## Batas produk yang harus terlihat

- **BUY:** katalog ready-made, pilihan varian, harga/stok dari server, cart, login Customer sebelum checkout, lalu transaksi sesuai kontrak existing. Browser tidak menentukan harga final, availability, ongkir, atau pembayaran berhasil.
- **MAKE:** pertahankan **“Estimasi awal, bukan harga final”** dan **“Ajukan untuk Review”** pada konteksnya. Preview file tidak menjadi quote, pembayaran, atau izin produksi. Operator melakukan review/slicing; quote yang sah mengikuti validasi server.
- **DEVELOP:** pembahasan B2B melalui WhatsApp. Jangan memasukkan kebutuhan B2B ke checkout, membuat intake akun baru, atau mengembalikan Project Brief.
- Account Customer tetap read-only sesuai scope aktif. Jangan menambahkan pengelolaan order, pembayaran, file, atau data Customer lain lewat redesign.
- Login Google dan email/password terverifikasi mengikuti addenda PRD/Tech Design dan gate aktivasi yang sudah ada. Perubahan visual tidak membuka signup publik atau melemahkan allowlist/internal-testing boundary.
- Akses file privat, quote, dan status memakai mekanisme berizin existing. Jangan memakai URL publik/gambar palsu untuk memudahkan layout.
- Ongkir Custom Print mengikuti ukuran paket final; jangan menampilkan angka seolah sudah final hanya karena alur membutuhkan summary.

Detail bisnis, retention, harga, dan lifecycle tetap dimiliki PRD/Tech Design serta services. Panduan ini mengatur keterbacaan keputusan, bukan menyalin aturan komersial menjadi authority baru.

## Form dan feedback

Label, unit, bantuan, error, dan tindakan harus terhubung secara visual dan semantik. Pertahankan nilai yang sudah diisi setelah validasi gagal. Loading mencegah aksi ganda dan menjelaskan bahwa proses masih berjalan; tidak mengubah copy menjadi klaim sukses sebelum server mengonfirmasi.

Minimum control mengikuti fondasi 44px. Selector yang panjang wrap atau memakai pilihan native yang sesuai; jangan selalu menggantinya dengan chip. Pertahankan urutan tab, nama aksesibel, error association, focus return, dan native/progressive enhancement yang sudah ada.

Summary berada dalam alur dan dapat diperiksa pada compact. Tidak ada floating sticky bar global. Satu action utama boleh menonjol per tahap; tindakan kembali, ubah pilihan, atau periksa detail tetap dapat ditemukan.

## State yang harus dirancang

| State | Perilaku yang diperlukan |
| --- | --- |
| Loading | Pertahankan konteks/layout secukupnya; status dapat dibaca, skeleton bukan inventori palsu |
| Empty | Jelaskan tidak ada item/riwayat dan langkah relevan; jangan mengisi record contoh seolah nyata |
| Unavailable | Bedakan sumber data tidak tersedia dari stok nol atau harga gratis |
| Invalid / changed | Letakkan masalah pada pilihan terkait; jelaskan jika harga, stok, quote, atau ongkir perlu diperiksa ulang |
| Pending | Tunjukkan status transaksi saat ini; redirect provider bukan konfirmasi pembayaran |
| Success | Tampilkan hasil dan langkah lanjut yang dikonfirmasi; hindari auto-confetti atau promosi yang mengganggu |

Data preview harus tetap berlabel contoh dan tidak menjadi nilai operasional. Jangan menyamakan “—”, null, nol, gratis, dan belum dimuat.

## Pemeriksaan area

Gunakan [quality review](quality.md) untuk desktop/compact, keyboard, error, item/nama panjang, variasi harga, dan unavailable state. Bandingkan item/varian/nilai yang dilihat pengguna dengan sumber canonical existing. UI dinilai baik bila pengguna dapat menjelaskan pilihannya dan konsekuensi tindakan, termasuk batas MAKE dan status pembayaran.
