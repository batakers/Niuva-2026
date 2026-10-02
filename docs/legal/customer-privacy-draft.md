# Draf Kebijakan Privasi Customer Niuva

**Versi:** DRAFT-PRIVACY-2026-10-02-v2. **Status:** draf untuk tinjauan, belum berlaku atau menjadi persetujuan pendaftaran publik. Fitur pusat privasi tahap ini hanya Development lokal/test. Tanggal berlaku: TBD setelah tinjauan serta pemeriksaan prasyarat.

## 1. Pengendali dan kontak

**PT. NIUVA INOVASI UTAMA**, **Jl. Telekomunikasi No.1, Sukapura, Kec. Dayeuhkolot, Kabupaten Bandung, Jawa Barat**. Kontak privasi/Customer: **niuvamakerspace@gmail.com**, **085117678901**. Fakta dikonfirmasi Owner. Kontak tersebut tetap tersedia setelah akun ditutup.

## 2. Data dan tujuan

Kategori akun: nama, email dan status verifikasi, profil/identitas Google bila digunakan, hash password untuk metode password, sesi, token verifikasi/reset/konfirmasi, serta rekaman persetujuan. Password asli tidak disimpan. Tujuan: membuat dan mengamankan akun serta membuktikan tindakan pemohon.

Kategori layanan: kontak Project Brief B2B, spesifikasi Custom Print, berkas Customer, pesanan Shop, alamat penerima, rincian pembayaran dan pengiriman, komunikasi keluhan/refund, permintaan privasi, dan hasil penanganan. Tujuan: review, kesepakatan pekerjaan, pemenuhan transaksi, tindak lanjut dan hak data. Data pihak lain yang dimasukkan sebagai penerima/anggota proyek memerlukan dasar yang tepat dan perlindungan tersendiri.

Kategori keamanan: pembatasan percobaan persisten dengan digest, bukti konfirmasi tindakan, dan metadata audit yang diperlukan. Tujuan: mencegah penyalahgunaan, mengendalikan akses dan menangani insiden. Digest tetap diperlakukan sebagai data pseudonim, bukan data anonim.

TBD sebelum publikasi: pemetaan dasar pemrosesan per tujuan (kontrak, kewajiban hukum, persetujuan atau dasar sah lain); minimisasi setiap field; inventaris log infrastruktur dan cookie; prosedur data sensitif pada unggahan. Persetujuan policy tidak otomatis menjadi dasar untuk semua pemrosesan. Akun minimal 18 tahun; pelaksanaan batas usia belum diterapkan pada tahap ini. Tidak ada promosi Customer dalam lingkup ini.

## 3. Provider dan lokasi pemrosesan

Development menggunakan PostgreSQL lokal serta Google OAuth Development. Resend Development digunakan untuk verifikasi/reset dan konfirmasi privasi jika pengiriman diterima provider; penerimaan inbox merupakan bukti terpisah. Akun/password peserta internal berbeda; pengirim tanpa domain terverifikasi dapat memiliki pembatasan penerima dari Resend. Mock hanya pada lingkungan test terisolasi.

R2 privat, Midtrans, Biteship, Clerk Owner/Admin, hosting, database produksi, monitoring, dan analitik harus diinventaris berdasarkan konfigurasi serta bukti penggunaan. Konfigurasi tidak membuktikan provider aktif bagi Customer publik. Inventaris tahap ini ada dalam `docs/legal/customer-policy-implementation.md`, dengan status Development/test/rencana yang dipisahkan.

TBD sebelum publikasi: daftar provider produksi dan kategori data yang diterima masing-masing, lokasi pemrosesan, subprocessor, transfer lintas negara dan dasar/perlindungannya, backup serta jadwal hapus, kontak pemroses. Tidak menjanjikan penghapusan data pada Google, Resend, R2 atau backup tanpa bukti. Penutupan akun Niuva tidak menutup akun Google.

## 4. Hak dan pusat privasi

Pusat privasi menyediakan salinan JSON berversi dari data aplikasi milik Customer: profil, persetujuan, pesanan, Project Brief, Custom Print, metadata berkas yang aman dan permintaan privasi. Tidak menyertakan password/hash, token akses, kredensial, payload provider, tautan privat permanen, atau data akun lain. Komunikasi eksternal/data di luar unduhan diminta melalui permintaan Data tambahan; Owner memverifikasi cakupan dan kepemilikan sebelum memberi jawaban.

Koreksi ditangani Owner berdasarkan data salah dan koreksi yang diminta. Perubahan email login, penggabungan metode akun dan transaksi historis tidak otomatis dilakukan. Nomor permintaan, status, tenggat awal dan tanggapan tersedia pada akun selama akses berlaku. Setelah penutupan, tindak lanjut melalui kontak terverifikasi; akun tertutup tidak dapat masuk untuk membaca status.

UU PDP Pasal 30 dan 32 mengatur tindakan koreksi dan akses dalam **3×24 jam**, dihitung kalender dari penerimaan awal. Tenggat tidak diulang ketika status berubah. Ketentuan penghentian setelah penarikan persetujuan (Pasal 40) dan penundaan/pembatasan (Pasal 41) memiliki ketentuan 3×24 jam tersendiri; hubungi kontak privasi untuk hak tersebut serta hak lain yang belum memiliki kontrol otomatis. Hari kerja keluhan pesanan tidak menggantikan tenggat hak data. Prosedur pengecualian yang sah, portabilitas, keberatan, dan pemberitahuan insiden harus ditinjau sebelum publikasi.

Unduhan dan penutupan memerlukan email konfirmasi sekali pakai, **15 menit**, terikat Customer, sesi/browser pemohon, dan tindakan. Hash token disimpan; membuka tautan hanya menampilkan konfirmasi, POST menjalankan tindakan. Kegagalan pengiriman tidak memberi izin tindakan. Konfirmasi baru membatalkan konfirmasi lama untuk tujuan/sesi yang sama.

## 5. Penutupan permanen

Customer disarankan mengunduh data terlebih dahulu. Setelah konfirmasi, akses dihentikan, seluruh sesi/token dicabut dan profil akun, credential, serta persetujuan akun dihapus. Tidak ada masa pemulihan. Permintaan penutupan tetap diterima walaupun pekerjaan, keluhan, pesanan atau refund aktif; data yang diperlukan untuk penyelesaian tetap dipisahkan dan digunakan melalui kontak terverifikasi.

Pesanan, pembayaran, pengiriman, Project Brief, Custom Print, berkas dengan retensi terpisah, dan bukti kasus yang masih diperlukan tidak dihapus bersamaan dengan profil. Penanda pada data bisnis mencegah riwayat ditautkan otomatis lewat email atau token claim setelah daftar ulang. Daftar ulang mengikuti gerbang pendaftaran yang berlaku dan membuat akun baru; callback/reset yang sedang berjalan tidak boleh mengaktifkan kembali akun yang telah ditutup.

Bukti minimum keamanan menggunakan digest dan tanggal penutupan selama maksimal 30 hari untuk menolak proses autentikasi lama, tanpa menyimpan profil akun. Halaman hasil menjelaskan kategori yang dihapus/dipertahankan dan alasan tindak lanjut. Penghapusan database aplikasi tidak membuktikan penghapusan seluruh salinan pada provider atau backup.

## 6. Retensi

Akun publik aktif tersedia sampai ditutup, dengan minimisasi data yang tidak lagi diperlukan. Profil/credential dihapus saat penutupan. Pendaftaran, sesi dan token sementara dibersihkan maksimal **7 hari setelah selesai/kedaluwarsa**. Akun internal tetap memiliki tenggat khusus **30 hari sejak dibuat**, tidak diperpanjang login; pending internal juga memiliki tenggat maksimum 30 hari sejak dimulai.

Log keamanan aplikasi yang diperlukan: maksimal **30 hari**, kecuali penahanan insiden terdokumentasi. Isi percakapan/lampiran kasus selesai: maksimal **7 hari setelah penyelesaian benar-benar tercapai**. Bukti minimum kasus: maksimal **30 hari**, berupa nomor, jenis, tanggal, dan hasil tanpa percakapan. Penahanan untuk sengketa, insiden, atau kewajiban hukum memerlukan kategori/alasan spesifik, penanggung jawab dan tanggal peninjauan. Tanpa perpanjangan terdokumentasi, penahanan berakhir dan tenggat awal kembali diterapkan. Penyelesaian tidak hanya berarti persetujuan refund atau penutupan administratif.

Berkas 3D/CAD mempertahankan kelas **14/60/90 hari** dalam `docs/backend/phase-2-closure-decisions.md`: jangan menganggap file, salinan provider, atau backup telah dihapus sebelum prosesnya terverifikasi. Tidak mengubah kelas tersebut menjadi retensi kasus 7 hari. Lampiran kasus baru tidak dikumpulkan pada formulir privasi tahap ini; komunikasi/lampiran eksternal membutuhkan prosedur manual/integrasi retensi sebelum publikasi.

Dokumen pembukuan/transaksi wajib dipisahkan dari kasus. UU KUP Pasal 28 ayat (11) menyebut penyimpanan **10 tahun untuk dokumen terkait pembukuan/pencatatan**; ini bukan alasan menyimpan seluruh profil, token dan percakapan selama 10 tahun. Inventaris dokumen yang benar-benar wajib, awal hitungan, arsip, akses, penghapusan, kewajiban lain dan penahanan harus ditinjau sebelum publikasi. Tahap ini mempertahankan transaksi dan tidak menyatakan inventaris tersebut selesai.

Cleanup Development lokal berjalan harian dan saat logon, dengan pemeriksaan lingkungan serta dry-run. Hanya kategori yang telah memiliki aturan dan batas terukur diproses; rekening/transaksi dan Customer aktif terlindungi. Tidak ada janji penghematan biaya tertentu sebelum diukur. Pelaksanaan penghapusan provider, salinan eksternal, backup dan arsip wajib masih merupakan prasyarat publikasi.

## 7. Keamanan, pemberitahuan, dan publikasi

Kontrol meliputi sesi Customer, verifikasi email, hash password, pemeriksaan origin/host, akses Owner, token sekali pakai, pembatasan percobaan dan proyeksi data ekspor. Kontrol tersebut tidak menggantikan verifikasi lingkungan publik. TBD: prosedur insiden, pemenuhan pemberitahuan UU PDP yang berlaku, pemulihan backup, akses pihak operasional, daftar subprocessor dan bukti penghapusan.

Sebelum diterbitkan: persetujuan Owner dan tinjauan legal; semua TBD diselesaikan; metode pengolahan/backup/provider produksi dikonfirmasi; usia minimum diterapkan; retensi transaksi diinventaris; kanal hak data dan eskalasi setelah akun ditutup diuji; penghapusan provider/backup serta komunikasi eksternal dibuktikan. Dokumen memiliki versi/tanggal berlaku serta mekanisme pemberitahuan perubahan. Gerbang pendaftaran publik tetap tertutup selama tahap ini.

## Rujukan tinjauan

- UU PDP: https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang%2Bnomor%2B27%2Btahun%2B2022
- UU KUP: https://www.pajak.go.id/sites/default/files/2021-11/SDSN%20UU%20KUP%20stdtd%20UU%20HPP.pdf
- Keputusan retensi berkas: `docs/backend/phase-2-closure-decisions.md`
- Draf analitik: `docs/frontend/analytics-privacy-notice-draft.md` (tidak membuktikan aktivasi publik)
