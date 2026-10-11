# Commerce & Customer — pedoman penerapan aktif

Baca setelah [DESIGN.md](../../DESIGN.md). Berlaku untuk Shop, detail produk, cart, checkout, Custom Print/MAKE, quote, account, status, serta auth/pemulihan Customer. Keputusan produk dan transaksi mendapat prioritas di atas ekspresi editorial.

## Komponen shadcn/ui pada Commerce dan Customer

Seluruh surface di atas mengikuti kontrak shadcn/ui global di [DESIGN.md](../../DESIGN.md). Gunakan lapis komponen lokal yang sama dengan Company dan Admin, termasuk untuk form auth, pemulihan, serta state transaksi. Keputusan ini tidak menyatakan migrasi semua route sudah selesai; pekerjaan saat ini hanya dokumentasi.

- Gunakan Button, Field/Label, Input/NativeInput, Textarea, NativeSelect/Select, RadioGroup, dan komponen status/overlay lokal sesuai kebutuhan. Pilihan native dan fallback tanpa JavaScript yang berlaku tetap tersedia.
- Product card, pilihan varian, cart item, ringkasan biaya, timeline, serta workspace/file preview MAKE tetap komponen domain Niuva yang mengomposisi lapis bersama. Jangan membuat primitive form atau dialog paralel khusus checkout/Customer.
- Media produk dan viewer khusus tetap memiliki tugas domainnya; kontrol dan feedback antarmukanya mengikuti komponen bersama. Kebutuhan viewer tidak memberi izin menambahkan dependency atau mengubah akses file privat.
- Penerapan komponen mempertahankan name/value form, submit/validasi, state server, auth/permission, serta aturan harga dan pembayaran. Tema shadcn mengikuti token Niuva dan kepadatan Commerce; layout account tidak menjadi workspace Admin.

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
