# Input dan bukti menuju Customer publik

**Diperbarui:** 3 Oktober 2026. **Status:** catatan kerja untuk menutup input secara bertahap. Sumber keputusan: jawaban Owner pada percakapan ini; sumber teknis: checkout dan pemeriksaan lokal terbatas; sumber provider/hukum: dokumentasi resmi yang ditautkan. Tidak menyatakan legal approval, aktivasi provider atau kelulusan staging.

## Keputusan Owner yang sudah dicatat

| Input | Hasil | Batas yang masih perlu dilengkapi |
| --- | --- | --- |
| Petugas utama Customer, privasi dan tindak lanjut pembayaran/refund | **Rheza**, dikonfirmasi Owner | Jam layanan, coverage akhir pekan/libur, pengganti dan akses kanal belum disebutkan. Penugasan operasional tidak otomatis memberikan role Owner/Admin atau permission aplikasi. |
| Persetujuan refund | Tetap **Owner** sesuai keputusan sebelumnya | Rheza dapat menindaklanjuti kasus/pembayaran dalam kewenangannya; pengajuan provider tetap membutuhkan approval Owner dan rekonsiliasi. |
| Alamat retur | **Jl. Telekomunikasi No.1, Sukapura, Kec. Dayeuhkolot, Kabupaten Bandung, Jawa Barat**; Owner mengonfirmasi alamat profil juga menerima retur | Detail penerima serta jam penerimaan akan diisi Owner. Customer mendapat instruksi nomor kasus, penerima, jadwal dan metode sebelum mengirim. |
| Cara review | Kerjakan review internal berdasarkan sumber resmi dan lanjutkan pekerjaan yang sudah mempunyai kontrak; penunjukan konsultan formal tidak menjadi syarat mulai pekerjaan kode | Review substansi, keputusan yang sah, kelayakan anak, bukti provider dan kewajiban pelaporan tetap harus dipenuhi sebelum kemampuan terkait diaktifkan. Jawaban Owner bukan persetujuan final atas policy atau klasifikasi risiko. |

Nama penasihat hukum/akuntansi tidak diwajibkan sebagai isian awal. Istilah **legal** di matriks adalah fungsi menilai kewajiban dan mencatat keputusan/bukti; Owner dapat mengatur review internal. Bila suatu persoalan memerlukan keahlian, verifikasi atau keputusan pihak berwenang, kebutuhan itu dicatat secara spesifik. Jangan mengubahnya menjadi persyaratan merekrut tim formal untuk seluruh pengembangan.

## Bukti konfigurasi lokal terbaru

Pemeriksaan 3 Oktober membaca `.env.local` hanya untuk status terisi/kosong dan scope loopback; **tidak mencetak nilai** dan tidak mengirim request ke provider. Nama group mengikuti kontrak environment runtime. File staging/production diperiksa keberadaannya saja, tanpa membaca credential. Bukti ini menutup pertanyaan presence lokal, bukan PUB-PROVIDER/PUB-STAGING.

| Group lokal | Hasil presence | Interpretasi |
| --- | --- | --- |
| Clerk | 2 dari 2 field terisi | Konfigurasi lokal tersedia; role/akses Rheza dan hosted belum dibuktikan. |
| Customer Google OAuth | 3 dari 3 field terisi | Konfigurasi lokal tersedia; OAuth hosted, akun supervised/anak dan policy eligibility perlu pengujian tersendiri. |
| Resend | 2 dari 2 field terisi | Konfigurasi lokal tersedia; sender/domain publik, penerimaan inbox dan retensi provider belum dibuktikan. |
| R2, termasuk batas file | 7 dari 7 field terisi | Konfigurasi lokal tersedia; akses privat, region/retensi/purge/restore hosted belum dibuktikan. |
| Midtrans | 0 dari 3 field terisi | Checkout ini belum mempunyai group konfigurasi Midtrans untuk smoke sandbox. Dukungan merchant/refund aktual belum dibuktikan. |
| Biteship | 0 dari 3 field terisi | Group lokal belum tersedia untuk smoke shipping provider. |
| Sentry | 0 dari 4 field terisi | Group lokal belum tersedia; ini tidak membuktikan monitoring lain tidak ada. |
| App URL dan database lokal | Keduanya loopback | Tidak merupakan lingkungan hosted. |
| File lingkungan | `.env.local` dan `.env.test.local` ada; `.env.staging` dan `.env.production` tidak ada | Ketiadaan file lokal tidak membuktikan resource/environment manager hosted tidak ada. |

Snapshot 25 September di [intake provider](../backend/provider-staging-intake.md) tetap historis. Snapshot 2 Oktober di [laporan Development](customer-policy-implementation.md) tetap bukti fase tersebut. Tidak menyalin credential, email peserta internal, URL database berpassword, log privat atau data transaksi ke catatan ini.

## Review akun anak yang dapat dikerjakan sekarang

Target semua usia dan dua metode autentikasi tetap mengikuti [PRD](../PRD-Niuva-MVP.md#addendum-persiapan-customer-publik--3-oktober-2026). [Penilaian kelompok usia](customer-public-launch-readiness.md#penilaian-akun-anak) membedakan akses anak, kelayakan fitur dan consent wali. Self-assessment memang merupakan bagian proses aturan; perekrutan konsultan eksternal bukan hasil yang dibuktikan oleh dokumen ini.

| Bagian review | Temuan konkret / requirement | Status kerja |
| --- | --- | --- |
| Identitas akun vs usia/wali | Google/email verified membuktikan kontrol metode autentikasi; tidak membuktikan usia, hubungan wali atau kapasitas transaksi | Ditetapkan dalam kontrak; assurance nyata belum dipilih/divalidasi. |
| Usia dan fitur | Akses anak di bawah 13 membutuhkan desain khusus anak/risiko rendah; kelompok lain mengikuti ketentuan usia/risiko dan consent | Kebutuhan sudah dipetakan; profil risiko Niuva belum ditetapkan. |
| Shop, checkout dan Custom Print berbayar | Fasilitas penawaran dan pembayaran harus masuk asesmen risiko konsumen, bukan diasumsikan rendah hanya karena situs bukan media sosial | Periksa indikator Permen 9/2026 Pasal 14–15 beserta bukti runtime dan kontrol. |
| Verifikasi/consent wali | Hasil minimum, hubungan/kewenangan, purpose/versi consent, penarikan dan bukti yang dapat diaudit | Desain dapat disiapkan. Email/OTP/checklist saja tidak diasumsikan bukti hubungan wali; tidak mengumpulkan KTP/biometrik dari paket ini. |
| Google bagi anak | Usia minimum untuk mengelola akun Google sendiri berbeda dari akun supervised; dukungan OAuth/izin orang tua perlu dibuktikan per tipe akun | Tambahkan skenario supervised/denied dan matriks metode per usia. Jangan menautkan identitas Google wali menjadi identitas anak otomatis. |
| Pembayaran/consent Niuva | Kontrol pembelian Family Link berlaku untuk billing Google Play; tidak menggantikan consent wali dan kontrol pembayaran Niuva/Midtrans | Ditetapkan sebagai batas integrasi; jangan memakai Family Link sebagai bukti otomatis persetujuan transaksi Niuva. |
| Penilaian/pelaporan profil | Penilaian mandiri, bukti pendukung, narahubung serta prosedur pelaporan/verifikasi/penetapan yang berlaku | Belum ada klaim laporan disampaikan atau penetapan diperoleh. Instruksi pengiriman ke pihak lain diperlukan terpisah. |

Rujukan: [UU PDP](https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang%2Bnomor%2B27%2Btahun%2B2022), [PP 17/2025](https://peraturan.go.id/files/pp-no-17-tahun-2025.pdf), [Permen Komdigi 9/2026](https://jdih.komdigi.go.id/produk_hukum/view/id/1007/t/peraturan%2Bmenteri%2Bkomunikasi%2Bdan%2Bdigital%2Bnomor%2B9%2Btahun%2B2026), [persyaratan usia akun Google](https://support.google.com/accounts/answer/1350409?hl=id), [Family Link](https://support.google.com/families/answer/7101025).

## Bukti provider yang masih diperlukan

Dokumentasi umum provider hanya menutup requirement produk/API, bukan fakta merchant, konfigurasi region atau penerimaan staging. Isian berikut dapat dilengkapi dari konfigurasi non-rahasia/support/account settings yang relevan; tidak meminta credential atau transaksi production lewat chat.

| Area | Yang sudah diketahui | Bukti spesifik yang diperlukan untuk lanjut |
| --- | --- | --- |
| Midtrans refund | API/refund_key, perbedaan accepted vs hasil bank, window/cutoff dan fallback terdokumentasi | Sandbox account tersedia, daftar metode/channel merchant, API refund aktif/eligible, batas waktu/ETA, prosedur saldo dan dana manual; lalu test sandbox. |
| Pendanaan refund manual/biaya retur | Owner tetap menyetujui; nominal transaksi server dan biaya luar charge terpisah | Jalur pembayaran bisnis yang berwenang, siapa eksekutor, sumber dana, bukti transfer serta verifikasi penerima. Nomor rekening pribadi/credential tidak perlu dicatat di repo. |
| Email | Resend lokal terisi | Sender/domain/from yang tersedia untuk hosted, penerima test, bukti inbox/bounce, retensi pesan/log dan purge provider. |
| Penyimpanan/data | R2 dan PostgreSQL lokal tersedia | Vendor/resource hosted yang benar-benar dipilih, lokasi primary/backup, subprocessor/DPA, akses, retensi dan bukti delete. |
| Backup/restore | Kontrak restore harus mempertahankan closure/holds/due dan rekonsiliasi refund/outbox | Resource, jadwal/expiry, pemilik, RPO/RTO yang disetujui dan latihan restore terisolasi. Tidak mengarang angka retensi atau kemampuan delete. |
| Staging | Proyek terpisah tetap pilihan Owner | Nama/project/resource non-secret, URL HTTPS, provider sandbox, owner teknis dan aturan pengoperasian; deployment membutuhkan instruksi sendiri. |

Dokumentasi [cakupan refund](https://docs.midtrans.com/docs/what-payment-method-that-have-refund-feature) dan [Refund API](https://docs.midtrans.com/reference/refund-transaction) diperiksa ulang 3 Oktober. Perbedaan antar-halaman tentang rincian metode harus dikonfirmasi untuk merchant/channel aktual sebelum membuat janji ETA atau dukungan di policy resmi. Tidak menyalin seluruh tabel provider menjadi konfigurasi aktif Niuva.

## Urutan kerja yang ringkas

1. Catat jawaban Owner sekali pada catatan ini dan dokumen yang menggunakannya. Jangan meminta ulang nama petugas atau alamat yang sudah dikonfirmasi.
2. Siapkan implementasi bagian yang kontraknya sudah jelas: consent berversi, kasus/approval/full refund/idempotensi, outbox/expiry, tier hosted dan job/monitoring. Desain serta test dengan fixture tidak memerlukan perekrutan konsultan formal. Eksekusi batch kode mengikuti scope yang diminta pengguna; catatan ini bukan perintah mengaktifkan resource.
3. Lengkapi keputusan assurance/akses anak berdasarkan asesmen dan bukti metode/provider; fitur terkait tetap gagal tertutup sampai hasilnya sah dan teruji. Generic auth framework tidak menjadi alasan menyatakan usia/wali sudah verified.
4. Isi detail operasional yang belum diberikan saat tersedia, lalu lakukan simulasi Rheza/Owner terhadap SLA dan tindak lanjut pasca-closure. Coverage 72 jam kalender memerlukan penugasan nyata, termasuk akhir pekan/libur.
5. Uji sandbox/staging/restore ketika resource non-production siap dan tindakan terkait diinstruksikan. Publikasi policy dan activation production mengikuti bukti serta instruksi terpisah.

PUB-BIZ/PUB-SERVICE sekarang mempunyai input Owner yang sudah dikonfirmasi, tetapi belum tertutup seluruhnya. PUB-AGE/PUB-GUARDIAN dan bukti provider/backup tidak dinyatakan selesai hanya karena proses administratif disederhanakan. Daftar status/bukti lengkap tetap di [matriks kesiapan](customer-public-launch-readiness.md#matriks-kesiapan).
