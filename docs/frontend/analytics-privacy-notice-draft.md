# Draf pemberitahuan pengukuran halaman publik

**Status: draf internal untuk tinjauan Owner dan penasihat hukum. Belum diterbitkan atau berlaku sebagai pemberitahuan produksi.**

Niuva berencana menghitung tayangan halaman publik untuk memahami halaman yang digunakan dan memperbaiki pengalaman situs. Untuk setiap pemuatan atau perpindahan halaman publik yang diizinkan, sistem akan menyimpan **hitungan harian agregat** menurut kelompok halaman, kategori sumber masuk, jenis perangkat, dan negara bila tersedia. Negara berasal dari kode dua huruf platform; bila tidak tersedia, dicatat sebagai “Tidak diketahui”.

Pengukuran ini tidak memakai cookie analitik, ID pengunjung atau sesi. URL lengkap, query, token, email, dan alamat IP tidak disimpan dalam tabel pengukuran. Sumber masuk diturunkan menjadi kategori di browser; alamat rujukan lengkap tidak dikirim oleh collector. Hitungan ini tidak menunjukkan jumlah orang unik dan dapat dipengaruhi bot atau pemblokir. Data agregat yang melewati jendela 13 bulan kalender laporan dihapus setiap hari.

**Sebelum publikasi:** Owner/legal perlu memastikan tujuan dan dasar pemrosesan yang sesuai [UU Pelindungan Data Pribadi](https://peraturan.bpk.go.id/Home/Download/224884/UU%20Nomor%2027%20Tahun%202022.pdf), identitas pengendali, kanal kontak/hak subjek data, penempatan di kebijakan privasi situs, serta hubungan dengan log infrastruktur dan penyedia hosting. Kode pengumpulan tetap nonaktif sampai keputusan dan uji produksi yang terpisah.
