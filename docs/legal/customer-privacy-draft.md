# Draf Kebijakan Privasi Customer Niuva

**Versi:** DRAFT-PRIVACY-2026-10-24-v7. **Status:** draf untuk tinjauan, belum berlaku atau menjadi persetujuan pendaftaran publik. Owner menyetujui rekomendasi isi T11 dan identifier resmi v1.0 pada 24 Oktober. Provider/lokasi, gerbang hosted dan tanggal publikasi belum terbukti; fitur pusat privasi tetap Development lokal/test.

**Review T11 — 23 Oktober 2026:** kontrak penyimpanan kini S3-compatible dengan provider final belum dipilih. Daftar pemroses nyata, lokasi/backup dan penghapusannya tetap harus dilengkapi sebelum publikasi. Perubahan draf ini tidak mengesahkan provider, jadwal retensi transaksi atau versi/tanggal berlaku; lihat [bahan pembahasan Owner](customer-public-input-evidence.md#review-owner-t11-23-oktober-2026).

**Review menyeluruh T11 — 24 Oktober 2026:** Owner menyetujui rekomendasi isi dan identifier resmi v1.0. Pemetaan data/arsip dan prosedur hak yang belum otomatis diperjelas dalam SOP. Outbox dan runner job telah tersedia serta diuji lokal pada baseline ini; penerimaan inbox, scheduler, provider dan pemulihan hosted tetap memerlukan bukti tersendiri. Tanggal berlaku adalah tanggal publikasi aktual setelah fakta provider/lokasi dan prasyarat lain lengkap; lihat [paket review T11](customer-public-input-evidence.md#paket-review-menyeluruh-t11--24-oktober-2026).

**Rekonsiliasi draf — 13 Oktober 2026:** akun Customer aktif mengikuti keputusan Owner 5 Oktober, **18+ melalui pernyataan usia**; DEVELOP/B2B mengikuti WhatsApp langsung sejak 11 Oktober. Identifier di atas tetap identifier draf, belum versi resmi immutable atau bukti consent publik. Owner menjadi pengesah dokumen; versi resmi/tanggal berlaku, review kepatuhan dan bukti hosted masih terbuka. [Paket kesiapan publik](customer-public-launch-readiness.md) mencatat pemilik, bukti dan syarat penutupannya.

## 1. Pengendali dan kontak

**PT. NIUVA INOVASI UTAMA**, **Jl. Telekomunikasi No.1, Sukapura, Kec. Dayeuhkolot, Kabupaten Bandung, Jawa Barat**. Kontak privasi/Customer: **niuvamakerspace@gmail.com**, **085117678901**. Fakta dikonfirmasi Owner. Kontak tersebut tetap tersedia setelah akun ditutup.

## 2. Data dan tujuan

Kategori akun: nama, email dan status verifikasi, profil/identitas Google bila digunakan, hash password untuk metode password, sesi, token verifikasi/reset/konfirmasi, serta rekaman persetujuan. Password asli tidak disimpan. Tujuan: membuat dan mengamankan akun serta membuktikan tindakan pemohon.

Kategori layanan: spesifikasi Custom Print, berkas Customer, pesanan Shop, alamat penerima, rincian pembayaran dan pengiriman, komunikasi keluhan/refund, permintaan privasi, serta hasil penanganan. Project Brief B2B dalam aplikasi merupakan data historis; kontak dan pencatatan B2B baru berlangsung melalui WhatsApp/alat eksternal yang harus diinventaris tersendiri. Tujuan: review, kesepakatan pekerjaan, pemenuhan transaksi, tindak lanjut dan hak data. Data pihak lain yang dimasukkan sebagai penerima/anggota proyek memerlukan dasar yang tepat dan perlindungan tersendiri.

Kategori keamanan: pembatasan percobaan persisten dengan digest, bukti konfirmasi tindakan, dan metadata audit yang diperlukan. Tujuan: mencegah penyalahgunaan, mengendalikan akses dan menangani insiden. Digest tetap diperlakukan sebagai data pseudonim, bukan data anonim.

Pemetaan data dan calon dasar pemrosesan per tujuan terdapat dalam [SOP privasi dan retensi](customer-privacy-retention-sop.md#pemetaan-data-dan-dasar-pemrosesan). Pemetaan harus ditinjau legal, diminimalkan per field, dan dicocokkan dengan penggunaan nyata sebelum publikasi (PUB-DATA). Penerimaan policy tidak otomatis menjadi dasar untuk semua pemrosesan. Tidak ada promosi Customer dalam lingkup ini.

Review, quote dan pemenuhan pesanan memerlukan data untuk langkah sebelum atau pelaksanaan perjanjian. Pembukuan dan pemenuhan hak data mengikuti kewajiban hukum yang relevan. Pengamanan memakai data minimum yang diperlukan dengan penilaian tujuan, kebutuhan dan dampak terhadap Customer. Jika suatu pemrosesan memakai persetujuan, tujuan dan datanya dijelaskan secara khusus dan persetujuan dapat ditarik melalui kontak privasi. Penarikan tersebut tidak menghapus dasar yang sah untuk kewajiban transaksi atau arsip wajib; kategori dan alasannya dijelaskan kepada pemohon.

Target pendaftaran akun aktif adalah **18 tahun ke atas melalui self-declaration**, terpisah dari persetujuan policy. Kontrol internal/test menyimpan versi deklarasi dan waktu yang ditetapkan server bersama pending registration/proof dan consent. Deklarasi tidak membuktikan usia sebenarnya. Kontrol ini tidak mengumpulkan tanggal lahir, identitas resmi, KYC atau biometrik; masa simpan bukti consent publik setelah penutupan masih perlu ditetapkan tanpa mempertahankan seluruh profil akun.

Akun anak/wali tidak termasuk scope rilis aktif. Data pihak ketiga atau temuan data/pengguna di bawah umur tetap memerlukan dasar, penanganan dan review kepatuhan yang tepat; batas 18+ tidak menjadi klaim bahwa kewajiban tersebut hilang. Pengakuan sebagai wali atau kesamaan email tidak otomatis memberikan akses ke ekspor/transaksi pihak lain. Perluasan usia memerlukan keputusan dan kontrak baru.

## 3. Provider dan lokasi pemrosesan

Development menggunakan PostgreSQL lokal serta Google OAuth Development. Resend Development digunakan untuk verifikasi/reset dan konfirmasi privasi jika pengiriman diterima provider; penerimaan inbox merupakan bukti terpisah. Akun/password peserta internal berbeda; pengirim tanpa domain terverifikasi dapat memiliki pembatasan penerima dari Resend. Mock hanya pada lingkungan test terisolasi.

Berkas Customer memakai kontrak penyimpanan privat **S3-compatible**, dengan provider final belum dipilih. Kompatibilitas teknis tidak menetapkan nama pemroses, negara penyimpanan atau bukti penghapusan. Konfigurasi R2 lama hanya merupakan jalur transisi yang terpisah sesuai [kontrak object storage](../backend/object-storage-contract.md); tidak ada klaim bahwa data telah dipindahkan atau dihapus dari provider lama. Penyedia storage yang akhirnya dipakai, Midtrans, Biteship, hosting, database produksi, monitoring dan analitik harus diinventaris berdasarkan bukti penggunaan. Owner/Admin sekarang memakai Better Auth dan database aplikasi, terpisah dari Customer; Better Auth sendiri bukan bukti pengiriman data ke penyedia auth eksternal. Clerk pada [snapshot Development 2 Oktober](customer-policy-implementation.md) merupakan histori, dan kewajiban atas data historis tetap diperiksa. [Register provider/sistem](customer-privacy-retention-sop.md#register-provider-dan-lokasi) membedakan runtime saat ini dari kebutuhan hosted yang belum terbukti.

Daftar provider produksi dan kategori data yang diterima masing-masing, lokasi pemrosesan, subprocessor, transfer lintas negara dan dasar/perlindungannya, backup, jadwal hapus, dan kontak pemroses harus dilengkapi sebelum publikasi (PUB-PROVIDER, PUB-BACKUP). Tidak menjanjikan penghapusan data pada Google, Resend, R2 atau backup tanpa bukti. Penutupan akun Niuva tidak menutup akun Google.

## 4. Hak dan pusat privasi

Pusat privasi internal/test menyediakan salinan JSON berversi dari data aplikasi milik Customer: profil, persetujuan, pesanan, Project Brief historis, Custom Print, metadata berkas yang aman dan permintaan privasi. Kemampuan hosted masih harus diselesaikan. Ekspor tidak menyertakan password/hash, token akses, kredensial, payload provider, tautan privat permanen, atau data akun lain. Komunikasi eksternal/data di luar unduhan diminta melalui permintaan Data tambahan; Owner memverifikasi cakupan dan kepemilikan sebelum memberi jawaban.

Koreksi ditangani Owner berdasarkan data salah dan koreksi yang diminta. Perubahan email login, penggabungan metode akun dan transaksi historis tidak otomatis dilakukan. Nomor permintaan, status, tenggat awal dan tanggapan tersedia pada akun selama akses berlaku. Setelah penutupan, tindak lanjut melalui kontak terverifikasi; akun tertutup tidak dapat masuk untuk membaca status.

UU PDP Pasal 30 dan 32 mengatur tindakan koreksi dan akses dalam **3×24 jam**, dihitung kalender dari penerimaan awal. Tenggat tidak diulang ketika status berubah. Ketentuan penghentian setelah penarikan persetujuan (Pasal 40) dan penundaan/pembatasan (Pasal 41) memiliki ketentuan 3×24 jam tersendiri; hubungi kontak privasi untuk hak tersebut serta hak lain yang belum memiliki kontrol otomatis. Hari kerja keluhan pesanan tidak menggantikan tenggat hak data. Prosedur pengecualian yang sah, portabilitas, keberatan, dan pemberitahuan insiden harus ditinjau sebelum publikasi.

Unduhan dan penutupan memerlukan email konfirmasi sekali pakai, **15 menit**, terikat Customer, sesi/browser pemohon, dan tindakan. Hash token disimpan; membuka tautan hanya menampilkan konfirmasi, POST menjalankan tindakan. Kegagalan pengiriman tidak memberi izin tindakan. Konfirmasi baru membatalkan konfirmasi lama untuk tujuan/sesi yang sama.

## 5. Penutupan permanen

Customer disarankan mengunduh data terlebih dahulu. Setelah konfirmasi, akses dihentikan, seluruh sesi/token dicabut dan profil akun, credential, serta persetujuan akun dihapus. Tidak ada masa pemulihan. Permintaan penutupan tetap diterima walaupun pekerjaan, keluhan, pesanan atau refund aktif; data yang diperlukan untuk penyelesaian tetap dipisahkan dan digunakan melalui kontak terverifikasi.

Pesanan, pembayaran, pengiriman, Project Brief, Custom Print, berkas dengan retensi terpisah, dan bukti kasus yang masih diperlukan tidak dihapus bersamaan dengan profil. Penanda pada data bisnis mencegah riwayat ditautkan otomatis lewat email atau token claim setelah daftar ulang. Daftar ulang mengikuti gerbang pendaftaran yang berlaku dan membuat akun baru; callback/reset yang sedang berjalan tidak boleh mengaktifkan kembali akun yang telah ditutup.

Bukti minimum keamanan menggunakan digest dan tanggal penutupan selama maksimal 30 hari untuk menolak proses autentikasi lama, tanpa menyimpan profil akun. Halaman hasil menjelaskan kategori yang dihapus/dipertahankan dan alasan tindak lanjut. Penghapusan database aplikasi tidak membuktikan penghapusan seluruh salinan pada provider atau backup.

## 6. Retensi

Target akun publik aktif tersedia sampai ditutup, dengan minimisasi data yang tidak lagi diperlukan. Pada implementasi Development, profil/credential dihapus saat penutupan. Batas retensi pendaftaran, sesi dan token sementara adalah **7 hari setelah selesai/kedaluwarsa**, dengan penghapusan oleh job yang berhasil. Pemantauan keterlambatan serta batas penghapusan hosted yang terukur harus dibuktikan sebelum menjadi janji publik (PUB-JOBS). Akun internal tetap memiliki tenggat khusus **30 hari sejak dibuat**, tidak diperpanjang login; pending internal juga memiliki tenggat maksimum 30 hari sejak dimulai.

Target log keamanan aplikasi yang diperlukan: maksimal **30 hari**, kecuali penahanan insiden terdokumentasi. Cleanup saat ini menerapkan 30 hari pada audit penanganan privasi; cakupan seluruh log aplikasi/infrastruktur masih harus dipetakan. Isi percakapan/lampiran kasus selesai mengikuti batas **7 hari setelah penyelesaian benar-benar tercapai** dan bukti minimum kasus **30 hari**, berupa nomor, jenis, tanggal, dan hasil tanpa percakapan. Runtime menerapkan jadwal kasus tersebut pada permintaan privasi; penerapan pada keluhan/refund dan komunikasi eksternal masih perlu prosedur serta bukti tersendiri. Bukti transaksi wajib dipisahkan dari percakapan kasus.

Penahanan untuk sengketa, insiden, atau kewajiban hukum memerlukan kategori/alasan spesifik, penanggung jawab dan tanggal peninjauan. Tanpa perpanjangan terdokumentasi, penahanan berakhir dan tenggat awal kembali diterapkan. Penyelesaian tidak hanya berarti persetujuan refund atau penutupan administratif. Rincian kategori, pelaksanaan, dan bukti penghapusan ada dalam SOP privasi dan retensi.

Berkas 3D/CAD mempertahankan kelas **14/60/90 hari** dalam `docs/backend/phase-2-closure-decisions.md`: jangan menganggap file, salinan provider, atau backup telah dihapus sebelum prosesnya terverifikasi. Tidak mengubah kelas tersebut menjadi retensi kasus 7 hari. Lampiran kasus baru tidak dikumpulkan pada formulir privasi tahap ini; komunikasi/lampiran eksternal membutuhkan prosedur manual/integrasi retensi sebelum publikasi.

Dokumen pembukuan/transaksi wajib dipisahkan dari kasus. [UU KUP Pasal 28 ayat (11)](https://www.pajak.go.id/id/undang-undang-nomor-28-tahun-2007) mewajibkan buku, catatan dan dokumen yang menjadi dasar pembukuan/pencatatan disimpan **10 tahun di Indonesia pada tempat kedudukan badan**. Tidak perlu membentuk ruang arsip; Niuva memakai sistem operasional yang memenuhi ketentuan itu. Aturan ini tidak menyimpan seluruh profil, token dan percakapan selama 10 tahun. Penyedia dan lokasi layanan hosted yang benar-benar digunakan harus dijelaskan sebelum data diterima. Masa simpan bukti consent publik setelah penutupan masih perlu ditetapkan.

[Pemetaan arsip transaksi](customer-privacy-retention-sop.md#pemetaan-arsip-transaksi-untuk-review-t11) kini mengidentifikasi invoice, rincian order, bukti pembayaran/refund dan dokumen pendukung yang perlu dinilai sebagai bukti pembukuan. Data autentikasi, berkas model dan seluruh isi komunikasi tidak otomatis masuk kelas tersebut. Pemetaan belum menjadi janji bahwa arsip terpisah, penghapusan atau salinan provider sudah berjalan.

Prosedur Development terdahulu memakai cleanup harian/logon; runner dan handler retensi kini tersedia serta diuji lokal, dengan pemeriksaan lingkungan dan dry-run. Bukti itu tidak menetapkan jadwal aktif atau maksimum keterlambatan hosted. Hanya kategori yang mempunyai aturan diproses; transaksi serta data yang masih wajib dipertahankan dilindungi. Pelaksanaan penghapusan provider, salinan eksternal, backup dan arsip wajib tetap merupakan prasyarat publikasi.

## 7. Keamanan, pemberitahuan, dan publikasi

Kontrol meliputi sesi Customer, verifikasi email, hash password, pemeriksaan origin/host, akses Owner, token sekali pakai, pembatasan percobaan dan proyeksi data ekspor. Kontrol tersebut tidak menggantikan verifikasi lingkungan publik. Prosedur insiden dan pemberitahuan, pemulihan backup, akses pihak operasional, daftar subprocessor, serta bukti penghapusan menjadi PUB-INCIDENT, PUB-BACKUP, dan PUB-PROVIDER.

Sebelum diterbitkan: pengesahan final Owner dan tinjauan kepatuhan berbasis sumber resmi; seluruh blocker kesiapan diselesaikan; metode pengolahan/backup/provider produksi dikonfirmasi; kontrol akun 18+ beserta keterbatasan deklarasinya dicatat; retensi transaksi diinventaris; kanal hak data dan eskalasi setelah akun ditutup diuji; penghapusan provider/backup serta komunikasi eksternal dibuktikan. Versi resmi/tanggal berlaku dan mekanisme pemberitahuan perubahan belum ditetapkan oleh revisi draf ini. Gerbang pendaftaran publik tetap tertutup.

## Rujukan tinjauan

- UU PDP: https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang%2Bnomor%2B27%2Btahun%2B2022
- UU KUP: https://www.pajak.go.id/sites/default/files/2021-11/SDSN%20UU%20KUP%20stdtd%20UU%20HPP.pdf
- Keputusan retensi berkas: `docs/backend/phase-2-closure-decisions.md`
- PP TUNAS dan Permen Komdigi 9/2026: [penilaian akun anak dan sumber primer](customer-public-launch-readiness.md#penilaian-akun-anak).
- Draf analitik: `docs/frontend/analytics-privacy-notice-draft.md` (tidak membuktikan aktivasi publik)
