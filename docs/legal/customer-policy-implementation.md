# Policy Customer dan pusat privasi — Development

Status: implementasi lokal/test, 2 Oktober 2026. Draf legal bukan penerimaan legal, dokumen resmi pendaftaran, atau izin publikasi.

## Dokumen dan operasional

- Draf `DRAFT-TERMS-2026-10-02-v2` dan `DRAFT-PRIVACY-2026-10-02-v2` memakai identitas dan kontak yang dikonfirmasi Owner. Preview `/admin/privacy/policy?document=terms|privacy` memerlukan izin Owner.
- Shop dan Custom Print mempertahankan batas kirim yang disepakati; estimasi kedatangan berbeda dari batas kirim. Ketentuan B2B mengikuti kesepakatan kedua pihak. Penggantian form B2B tidak termasuk perubahan ini.
- Tanggapan keluhan 1 hari kerja, pemeriksaan 2 hari kerja setelah bukti lengkap/retur, mulai refund 1 hari kerja setelah persetujuan/syarat retur. Senin–Jumat selain libur nasional, WIB. SLA ini memerlukan penanggung jawab, kalender libur, alamat penerimaan retur, proses refund dan pencatatan operasional sebelum publikasi.
- Permintaan akses/koreksi data mempunyai tenggat tetap 72 jam kalender dari penerimaan. Status penanganan tidak mengulang tenggat; Owner tidak boleh menandai selesai sebelum hasil disampaikan/tindakan selesai.

## Aktivasi dan kontrak keamanan

`/account/privacy` dan tindakan mutasi hanya aktif dengan konfigurasi pengujian internal Development yang lengkap, origin loopback dan PostgreSQL `niuva_dev` di `127.0.0.1`, atau mock terisolasi `NODE_ENV=test` dengan database bernama test. Pendaftaran publik tetap ditahan oleh kontrak legal yang ada.

Boundary memeriksa sesi, Origin dan Host yang dipercaya, Zod, ukuran body, dan rate limit PostgreSQL. Forwarded headers tidak memberi kepercayaan. Owner biasa/admin tanpa izin Owner tidak dapat menangani permintaan atau membaca preview draf.

Owner dapat menerapkan koreksi nama profil aktif hanya melalui pilihan eksplisit saat menyelesaikan permintaan koreksi. Email, metode login dan transaksi historis tidak berubah. Koreksi lain memerlukan penanganan pada sistem sumber yang tepat dan hasilnya dicatat; tidak tersedia penggantian massal data otomatis.

Ekspor dan penutupan memakai konfirmasi email 15 menit, terikat Customer, hash sesi pemohon, dan tindakan. Database menyimpan hash token; GET hanya preview. POST mengonsumsi secara atomik setelah pengiriman provider diterima. Sesi/token akun internal dibatasi tenggat akun. JSON v1 memakai proyeksi field eksplisit dan tidak memuat credential, token, kunci storage, URL akses privat atau payload provider.
Logger request Next Development mengecualikan route konfirmasi privasi, verifikasi/reset dan callback Google agar query token tidak tercetak pada log request standar. Ini tidak membuktikan redaksi seluruh log infrastruktur/provider produksi.

Penutupan menghapus Customer, profil, credential, sesi, token dan persetujuan. Pesanan/brief/Custom Print tetap ada dengan FK dilepas, penanda `accountClosedAt`, dan rotasi token claim. Permintaan privasi aktif menyimpan kontak terverifikasi untuk penyelesaian. Lock transaksi bersama seluruh penerbitan autentikasi dan closure mencegah callback/reset/verification lama menghidupkan Customer kembali. Fence hash identitas 30 hari menyimpan batas waktu intent; daftar ulang sah menghasilkan ID baru dan tidak mengklaim riwayat lama otomatis.

## Retensi yang diterapkan

| Objek | Tindakan |
|---|---|
| Isi kasus privasi selesai | Hapus details/correction/response/contact dan metadata penanganan 7 hari setelah selesai; bukti nomor/jenis/status/tanggal/hasil sampai 30 hari. |
| Kasus aktif | Tidak ditandai selesai otomatis; tenggat awal tetap terlihat, termasuk sesudah akun ditutup. |
| Penahanan kasus | Alasan, kategori, Owner, tanggal peninjauan maksimal 30 hari ke depan. Tanpa perpanjangan terdokumentasi, penahanan berakhir dan tenggat asli berlaku. |
| Sesi/token/pending selesai atau kedaluwarsa | Hapus setelah 7 hari; akun aktif tidak dihapus oleh job ini. |
| Audit penanganan privasi | Metadata minimum, hapus setelah 30 hari. Rate limit kedaluwarsa dan fence closure kedaluwarsa dibersihkan. |
| Akun internal | Job yang sudah ada mempertahankan tenggat 30 hari; sekarang memakai pelepasan relasi/penanda yang sama. |
| 3D/CAD | Kontrak 14/60/90 hari yang ada; job privasi tidak menggantikannya. |
| Catatan transaksi/pembukuan | Tidak dihapus job privasi. Inventaris kewajiban simpan, pemisahan kategori serta penerapan batas pembukuan 10 tahun harus ditinjau sebelum publikasi. |

Cleanup memakai tenggat database dan berjalan harian/logon. Database offline menghasilkan kategori kegagalan, tanpa isi data; Windows mencoba ulang setiap jam tiga kali. Penundaan karena Windows mati/database tidak tersedia tetap mungkin: monitoring, pengoperasian job serta batas waktu penghapusan yang terukur merupakan prasyarat publikasi. Tidak ada klaim penghapusan backup/provider ataupun penghematan storage.

## Inventory provider (bukti konfigurasi lokal, bukan aktivasi publik)

| Provider | Bukti dan batas |
|---|---|
| Google | OAuth Development sudah dikonfigurasi untuk peserta internal. Penutupan Niuva tidak menghapus akun Google. |
| Resend | Konfigurasi lokal tersedia; adapter nyata untuk konfirmasi privasi. Respons diterima provider berbeda dari penerimaan inbox. Pengirim tanpa domain terverifikasi dapat membatasi penerima ke email akun Resend, termasuk penolakan alamat Google kedua. |
| PostgreSQL | Database Development loopback `niuva_dev`, test terisolasi `niuva_test`; tidak membuktikan lokasi/kontrak database production. |
| Clerk | Konfigurasi Owner/Admin lokal tersedia. Tidak dipakai untuk sesi Customer. |
| R2 | Konfigurasi lokal tersedia; tidak membuktikan objek provider publik/cleanup/backup production sudah tervalidasi. |
| Midtrans / Biteship / Sentry | Tidak ada konfigurasi aktif pada snapshot lokal tahap ini; integrasi atau rencana production tidak merupakan bukti penggunaan publik. |

Kredensial, alamat URL database berpassword, token konfirmasi dan isi outbox tidak dimasukkan dokumen atau Git. Mock hanya pada database test.

## Operasi Development dan rollback

```powershell
node node_modules/jiti/lib/jiti-cli.mjs scripts/cleanup-customer-privacy.ts --dry-run
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/register-customer-privacy-cleanup.ps1
```

Task baru `Niuva-Customer-Privacy-Cleanup`: 03.15 WIB dan logon, StartWhenAvailable, Limited/current user, tiga retry per jam. Task internal 03.00 tetap ada. CLI memeriksa Development/loopback/niuva_dev secara terpisah dari switch pendaftaran agar retensi tetap berjalan setelah pendaftaran dinonaktifkan. Eksekusi `--execute` mengikuti tenggat; tidak digunakan untuk menghapus akun nyata sebagai pengujian.

Rollback fitur: nonaktifkan konfigurasi pendaftaran internal untuk menutup akses tindakan Development, kembalikan kode aplikasi bila perlu, pertahankan migrasi tambahan serta jadwal retensi data yang sudah dibuat. Penutupan yang telah dikonfirmasi tidak dapat dibatalkan.

## Prasyarat publikasi

Review/persetujuan legal, verifikasi alamat identitas dan alamat retur, proses refund, penerapan usia minimal 18, daftar provider/lokasi produksi, perjanjian pemrosesan, hak privasi lain dan kanal tindak lanjut, kebijakan backup/penghapusan, pemisahan retensi transaksi, monitoring SLA/hold/cleanup, pengujian provider nyata dan penerimaan visual/device/AT. Tanpa promosi sesuai keputusan Owner. Dokumen pengujian internal tetap berbeda dari draf komersial ini.
