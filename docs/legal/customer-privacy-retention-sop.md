# SOP hak privasi, data dan retensi Customer

**Versi:** PRIVACY-OPERATIONS-2026-10-03-v1. **Status:** paket review/kontrak target publik. [Draf Privasi v3](customer-privacy-draft.md) belum berlaku. Kemampuan yang sudah ada tetap dibatasi Development/test sebagaimana [snapshot implementasi](customer-policy-implementation.md). Register ini tidak membuktikan konfigurasi, DPA, penghapusan provider atau pemulihan production.

## Tanggung jawab dan kanal

Owner adalah penanggung jawab keputusan. **Rheza** ditetapkan sebagai petugas utama privasi/layanan/tindak lanjut pembayaran: mencatat, memverifikasi dan memantau permintaan dalam kewenangannya; engineering menjalankan penghapusan/pemulihan yang sah. Review dasar, pengecualian serta arsip wajib dilakukan sebagai fungsi kepatuhan/akuntansi berdasarkan sumber resmi; penunjukan konsultan formal bukan syarat memulai kode. Penugasan Rheza tidak otomatis memperluas permission Owner pada pusat privasi; aksi yang memerlukan izin tetap melalui pihak berizin. Pengganti, akses inbox/telepon dan coverage akhir pekan/libur masih perlu ditetapkan PUB-SERVICE/PUB-INCIDENT. Kanal terkonfirmasi **niuvamakerspace@gmail.com** dan **085117678901** tetap tersedia setelah akun ditutup. Jawaban dan bukti terbaru ada di [catatan input](customer-public-input-evidence.md).

Semua kanal mempunyai catatan penerimaan awal dan satu referensi kasus. Migrasi dari email/telepon ke aplikasi, perubahan status, penambahan bukti, pergantian petugas dan closure tidak membuat tenggat baru. Tidak meminta password, OTP atau credential. Verifikasi kewenangan harus proporsional; jika belum aman, jangan memberikan data/tindakan pada orang yang salah, tetapi tetap pantau tenggat, eskalasi dan catat dasar respons yang sah.

## Pemetaan data dan dasar pemrosesan

Ini adalah **calon pemetaan untuk review PUB-DATA**, bukan dasar hukum final. [UU PDP Pasal 20 dan 25](https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang%2Bnomor%2B27%2Btahun%2B2022) menjadi acuan; setiap tujuan/field memerlukan dasar yang tepat. Penerimaan Syarat/Privasi tidak dianggap persetujuan seragam untuk semua pemrosesan. Digest/hash tetap data pseudonim bila dapat dikaitkan; tidak otomatis anonim.

| Kategori minimum | Tujuan / calon dasar untuk ditinjau | Penerima / retensi / penghapusan | Bukti dan batas |
| --- | --- | --- | --- |
| Profil akun, email terverifikasi, identitas metode Google | Akun dan autentikasi; pelaksanaan layanan/kontrak dan pengamanan yang diperlukan | Aplikasi/database, Google hanya alur OAuth; profil/auth dihapus saat closure | Verifikasi email tidak membuktikan usia atau wali. Google tidak dihapus oleh closure Niuva. |
| Hash password, sesi, token hash, pending registration | Verifikasi/reset, sesi dan pencegahan penyalahgunaan; layanan dan keamanan dengan penilaian dasar | Database; sementara +7 hari setelah selesai/expired/revoked sesuai kategori | Password asli/token mentah tidak disimpan di database auth. Token mentah dalam email/outbox masa depan memerlukan perlindungan terpisah. |
| Versi policy, waktu/metode penerimaan dan bukti integritas | Membuktikan kesepakatan serta kepatuhan; dasar kontrak/kewajiban yang relevan | Rekaman akun saat ini dihapus bersama akun; bukti kontrak wajib masa depan diproyeksikan minimum ke arsip terpisah | Internal consent berbeda tujuan/versi. Retensi bukti publik pasca-closure perlu legal/akuntansi, tidak diam-diam mempertahankan semua profil. |
| Hasil usia/kelayakan, persetujuan wali dan bukti kewenangan | Pelindungan anak, kewajiban hukum dan persetujuan wali untuk data anak | Belum dikumpulkan/diimplementasikan; penerima/retensi bahan verifikasi ditetapkan PUB-AGE/PUB-GUARDIAN | Tidak memilih dokumen identitas/biometrik tanpa asesmen. Minimisasi hasil; akses wali terbatas tujuan yang diverifikasi. |
| Order, quote, alamat penerima, kontak dan item Shop/Custom Print | Menawarkan/memenuhi kontrak, pengiriman dan penyelesaian sengketa | Aplikasi, petugas berwenang, payment/shipping sesuai kebutuhan; arsip transaksi terpisah | Data penerima pihak ketiga memerlukan dasar/informasi yang tepat; tidak termasuk pemasaran. |
| Berkas privat 3D/CAD dan metadata minimum | Review, quote, produksi yang disepakati; tindakan sebelum/pelaksanaan kontrak | R2 privat dan operator; kelas 14/60/90 hari di bawah | Tidak menjadi izin promosi/latih AI atau akses publik. Signed URL tidak masuk ekspor/log. |
| Kontak, isi Project Brief B2B dan spesifikasi | Menanggapi calon kesepakatan/pemenuhan B2B | Aplikasi, petugas terkait; masa simpan brief tanpa kontrak masih OPEN PUB-DATA/PUB-RECORDS | Tidak menganggap seluruh brief/komunikasi wajib disimpan 10 tahun. |
| Identitas/reference pembayaran, nominal, status, refund, ongkir/biaya | Memenuhi transaksi, refund, rekonsiliasi dan pembukuan | Aplikasi, Midtrans/bank, petugas pembayaran dan akuntansi; arsip wajib | Provider menerima field minimum sesuai metode; tidak menyimpan credential/payment card mentah. |
| Pengajuan dan komunikasi keluhan/retur/refund | Menyelesaikan layanan dan hak konsumen | Petugas, sistem komunikasi/provider yang relevan; isi +7 hari selesai, receipt +30 hari | Bukti finansial wajib dipisah; kasus aktif tidak dihapus hanya karena closure akun. Runtime cleanup belum mencakup kasus layanan eksternal. |
| Kasus privasi, kontak tindak lanjut, hasil dan proof | Memenuhi hak data dan membuktikan otorisasi; kewajiban hukum/pengamanan | Customer terkait dan Owner; isi +7 hari selesai, receipt +30 hari, hold sah | Development punya proyeksi ekspor aman, tenggat tetap dan proof sekali pakai. Hak yang belum otomatis perlu SOP manual. |
| Limiter digest, closure fence dan audit minimum | Mencegah replay/abuse dan membuktikan penanganan; penilaian kepentingan sah/kewajiban keamanan | Database/petugas keamanan; limiter sampai expiry, fence 30 hari, audit privacy 30 hari | Target semua log keamanan 30 hari belum terbukti di infrastruktur/provider; jangan log token/isi kasus. |
| Email/outbox, delivery status, kontak inbox/telepon | Menyampaikan pesan transaksi/hak dan memastikan pengiriman | Resend dan kanal operasional yang digunakan; minimisasi, expiry, jadwal hapus tersendiri | Outbox/retry hosted belum ada; retensi email provider/mailbox/pesan telepon harus dikonfirmasi. |
| Aggregate analytics dan telemetry error bila diaktifkan | Operasional/keamanan/analitik yang disetujui; dasar dinilai per field | Penyimpanan analytics, monitoring yang benar-benar aktif | Analytics off-by-default; lihat draf notice. Jangan menganggap aggregate anonim tanpa penilaian; raw event/PII tidak boleh ditambah dari paket ini. |

Untuk tiap baris, lengkapi register field, sumber, tujuan, dasar final, siapa yang mengakses, provider/lokasi, deadline, job/manual action, pengecualian/hold dan bukti purge. Penggunaan baru memerlukan pembaruan register serta informasi/consent yang sesuai. Tidak ada pemasaran Customer dalam scope. Desain anak/aturan usia dirujuk ke [asesmen akun anak](customer-public-launch-readiness.md#penilaian-akun-anak), bukan menyatakan checkbox sebagai bukti wali.

## Register provider dan lokasi

Snapshot lokal 2 Oktober hanya orientasi; konfigurasi produksi, region, subprocessor, backup dan jadwal purge **belum diverifikasi**. Kolom kebutuhan adalah data yang mungkin diperlukan integrasi, bukan klaim bahwa sudah dikirim. Owner/privasi harus menandai tiap provider `ACTIVE`, `NOT_USED` atau `CANDIDATE` dengan bukti, bukan mengisi lokasi berdasarkan merek provider.

| Provider/sistem | Cakupan data/tujuan yang harus dibatasi | Bukti yang tersedia / kebutuhan sebelum publikasi |
| --- | --- | --- |
| PostgreSQL lokal / database hosted calon | Seluruh record aplikasi sesuai izin | `niuva_dev` loopback dan database test terisolasi. Vendor/region database hosted, akses, DPA, backup, transfer dan purge OPEN. |
| Google OAuth | Identitas akun/token pertukaran OAuth yang diperlukan | Konfigurasi Development peserta internal; persetujuan/app verification/origin hosted dan kategori data harus dikonfirmasi. Akun Google bukan objek penghapusan Niuva. |
| Resend / mailbox operasional | Alamat tujuan, pesan autentikasi/layanan dan status delivery | Adapter Development; domain/sender, inbox, lokasi/subprocessor, retensi pesan/provider dan purge OPEN. Provider accepted bukan inbox received. |
| Clerk | Identitas/sesi Owner/Admin | Konfigurasi lokal; tetap terpisah dari Customer. Kontrak/lokasi/retensi hosted dan hak akses petugas OPEN. |
| Cloudflare R2 | Binary privat 3D/CAD, metadata dan akses sementara | Konfigurasi lokal bukan bukti penyimpanan/purge hosted. Binding bucket/region yang tersedia, akses, versioning/salinan, expiry dan bukti delete OPEN. |
| Midtrans / bank / jalur pembayaran manual | Reference pembayaran, nominal, status dan data penerima yang diperlukan | Sandbox guard/integrasi kode bukan aktivasi production. Merchant/channel aktif, API refund, retensi, lokasi serta data manual OPEN. |
| Biteship / kurir | Kontak/alamat penerima, paket, harga/resi dan status | Kontrak/integrasi yang ada bukan bukti provider aktif. Wilayah, data kurir, lokasi, retensi dan prosedur penghapusan OPEN. |
| Vercel / hosting staging-production calon | Request/metadata, runtime dan log yang diperlukan | Pilihan proyek staging terpisah; resource belum dibuktikan. Region, logging/redaksi, deployment access, backup dan transfer OPEN. |
| Sentry / monitoring lain bila digunakan | Metadata error minimum | Snapshot lokal tidak membuktikan konfigurasi aktif. Pilihan vendor, PII redaction, region, retensi dan subprocessor OPEN. |
| Analytics aplikasi / kanal komunikasi eksternal | Aggregate yang sah; pesan/lampiran inbox/telepon yang benar-benar dipakai | Analytics off-by-default; register setiap mailbox/perangkat/tool. Coverage retensi eksternal belum diimplementasikan. |

Register per provider aktif wajib memuat nama badan/layanan, peran pengendali/pemroses, field/tujuan, kontrak/DPA dan subprocessor, lokasi primary/backup, dasar dan pelindungan transfer lintas negara, akses internal, jadwal purge, SLA permintaan hak/insiden, kontak eskalasi dan bukti. Simpan reference konfigurasi aman tanpa secret. Negara/region dan lama backup yang belum tersedia tetap OPEN PUB-PROVIDER/PUB-BACKUP. Hak hapus Niuva, kebutuhan provider mempertahankan arsip sah dan akun milik Customer dibedakan saat menjawab permintaan.

## Hak dan tenggat kalender

1. Catat `receivedAt`, jenis, kontak, sumber, scope dan `dueAt` sejak penerimaan pertama. Akses/koreksi: **72 jam kalender**, termasuk akhir pekan/libur; case status tidak mengubah deadline. `submittedAt` di aplikasi bukan alasan memulai ulang permintaan yang lebih dahulu diterima lewat kontak resmi.
2. Verifikasi pemohon, kepemilikan data dan kewenangan wali dengan langkah minimum yang disahkan. Pertahankan deadline ketika menunggu bukti. Permintaan pihak lain/hasil usia keliru/sengketa wali dieskalasi; tidak menyerahkan data ke alamat yang belum terverifikasi. Respons/pengecualian harus mempunyai dasar dan review, bukan otomatis “selesai”.
3. Ekspor aplikasi adalah proyeksi JSON berversi: tanpa hash/password, token, secret, payload provider, kunci/URL privat atau data Customer lain. Data tambahan menelusuri sistem sumber/provider/komunikasi eksternal dan hanya memberikan scope yang sah. Koreksi nama tersedia eksplisit pada Development; email/metode dan transaksi historis tidak diubah otomatis.
4. Unduh/closure Development memakai email proof sekali pakai 15 menit, terikat Customer, hash sesi/browser dan tujuan; GET preview, POST konsumsi atomik. Failure pengiriman tidak mengotorisasi tindakan. Hosted harus membuktikan mekanisme ekuivalen tanpa memperlemah origin, proof atau lifecycle lock.
5. Selesaikan setelah tindakan/hasil benar-benar dilakukan dan disampaikan. Catat outcome dan waktu; jangan mengubah `resolvedAt` berulang untuk menggeser purge. Status terlambat tetap terlihat, termasuk sesudah akun ditutup.

Penarikan persetujuan dan pembatasan/penghentian sesuai UU PDP Pasal 40/41 mempunyai ketentuan **3×24 jam tersendiri**. Catat waktu awal hak tersebut dan dasar kategori yang masih sah dipertahankan; jangan menganggap withdrawal harus menghapus kewajiban transaksi yang mempunyai dasar lain. Portabilitas, keberatan, penghapusan provider, keputusan pengecualian dan kanal sengketa memerlukan legal review PUB-INCIDENT. Kontrol hak tersebut belum otomatis hanya karena halaman privacy tersedia.

Pemantauan target hosted: antrean deadline/overdue dan case yang belum mempunyai petugas terlihat setiap saat; petugas/pengganti mempunyai coverage kalender, pemeriksaan terjadwal dan alarm sebelum jatuh tempo. Cadence/ambang alarm/on-call harus disahkan dan dibuktikan sebelum publikasi. Job yang gagal tidak mengubah deadline. Eskalasi ke Owner/legal dilakukan segera ketika risiko lewat tenggat atau kewenangan belum dapat diverifikasi; kontak pemohon menerima pembaruan yang diperlukan.

## Retensi dan penghapusan

Seluruh waktu retensi dihitung dari kejadian asli dalam database/sistem sumber, bukan waktu job dijalankan. “Hapus setelah” adalah due untuk proses; job yang gagal dapat menyebabkan lag yang wajib terukur dan ditindaklanjuti. Belum ada janji maksimum lag hosted/provider/backup pada draf ini. Publikasi memerlukan penetapan serta bukti PUB-JOBS/PUB-BACKUP.

| Kelas | Pemicu / aturan | Pelaksanaan yang ada dan batas target |
| --- | --- | --- |
| Akun publik aktif | Sampai closure, dengan minimisasi berkala | Target publik; runtime internal memiliki batas sendiri. |
| Profil/credential/sesi/token/consent saat closure | Hapus/revoke pada transaksi closure yang dikonfirmasi | Development ada; business FK dilepas, marker/capability diproteksi; arsip transaksi dan provider tidak dihapus bersamaan. |
| Akun/pending internal | 30 hari sejak dibuat/dimulai, tidak diperpanjang login | Deadline lookup dan cleanup lokal yang ditandai saja; tidak diterapkan diam-diam ke akun biasa. |
| Token/proof/sesi/pending selesai atau expired/revoked | +7 hari dari event sesuai jenis record | Job privacy Development; penggunaan sudah ditolak pada expiry. Outbox dan salinan email bukan bagian purge ini. |
| Isi kasus privasi selesai | +7 hari dari penyelesaian nyata | Details/correction/response/contact/metadata penanganan dipurge; receipt minimum hingga +30 hari. |
| Kasus keluhan/retur/refund selesai | Isi/lampiran +7 hari; receipt minimum +30 hari | Target operasional, belum job runtime. Proyeksikan bukti finansial wajib ke arsip terpisah sebelum purge. |
| Kasus aktif dan kontak pasca-closure | Sampai penyelesaian yang sah, lalu jadwal kasus | Tidak otomatis selesai; kontak minimum hanya untuk tindak lanjut. Audit kebutuhan kasus yang tidak bergerak. |
| Audit privacy / limiter / closure fence | Audit +30 hari sejak event; limiter/fence pada expiry, fence 30 hari | Cleanup Development tersedia. Cakupan semua log keamanan 30 hari memerlukan implementasi/register; provider tidak diasumsikan sama. |
| Berkas abandoned PENDING/REJECTED/unattached | 14 hari sesuai event lifecycle upload dalam kontrak berkas | Aturan terpisah; konfirmasi object delete lalu marker DELETED. Bukti purge R2 hosted belum ada. |
| Berkas cancelled/declined/unpaid | 60 hari sesuai event lifecycle request/quote dalam kontrak berkas | Jangan reset umur melalui retry/status administratif. Kode berikutnya wajib memetakan timestamp pemicu jika belum tersedia. |
| Berkas attached completed custom order | 90 hari dari order completed | Order aktif, dispute atau legal hold menunda; bukan retensi kasus 7 hari. Maksimum binary 100 MiB. |
| Arsip pembukuan/transaksi yang wajib | 10 tahun untuk kategori pembukuan/pencatatan yang diwajibkan, lokasi Indonesia | PUB-RECORDS OPEN: klasifikasi, start point, kewajiban lain, format/access dan purge harus disahkan akuntansi/legal. Bukan profil/chat/token 10 tahun. |
| Brief tanpa kontrak, bukti wali, bahan verifikasi, inbox/outbox dan log provider | Jadwal minimum per tujuan/aturan yang disahkan | PUB-DATA/PUB-PROVIDER OPEN; tidak mengambil angka 7/30/10 tahun tanpa dasar kategori. |
| Backup/snapshot/export sementara | Expiry dan deletion per penyimpanan yang diverifikasi | PUB-BACKUP OPEN; penghapusan primary bukan purge backup/provider. |

Dasar arsip: [UU KUP Pasal 28 ayat (11)](https://www.pajak.go.id/id/undang-undang-nomor-28-tahun-2007). Ketentuan tempat simpan dan kategori wajib harus dicocokkan dengan konfigurasi database/arsip sebenarnya. Kontrak berkas tetap [phase-2-closure-decisions](../backend/phase-2-closure-decisions.md); tidak menggantinya dengan retensi pembukuan atau menganggap seluruh metadata berkas harus disimpan lama.

Penahanan memerlukan kategori data spesifik, alasan sah, petugas/Owner, tanggal mulai dan review. Kasus privacy runtime mewajibkan review paling jauh 30 hari ke depan; tanpa perpanjangan terdokumentasi, hold berakhir dan due asli berlaku. Target kelas lain mengikuti review terdokumentasi yang disahkan; jangan menahan seluruh akun hanya karena satu transaksi disengketakan. Hold tidak memberi akses kembali ke akun tertutup atau menghentikan tenggat hak. Pada expiry, purge yang sudah jatuh tempo dilanjutkan; bukan menghitung 7/30 hari lagi dari expiry hold.

## Cleanup hosted, backup dan recovery

Development memakai job lokal harian/logon yang menolak database non-loopback; komputer offline dapat menunda tanpa batas terukur. Hosted memerlukan job tersendiri dengan resource/tier binding, service identity minimum, dry-run dan execute yang disengaja, lock/idempotensi, checkpoint, retry terbatas serta monitoring jumlah/lag/last-success tanpa PII. Cleanup terus berjalan saat signup dimatikan; tidak membuka public capability agar job bekerja. Kegagalan sebagian menyimpan scope yang belum selesai dan bukti retry; job tidak boleh menandai purge provider sebelum objek benar-benar terhapus.

Petugas menerima alarm kegagalan/lag, memeriksa sebab, menjalankan pemulihan/retry yang aman dan menyimpan hasil. Batas lag, frekuensi, petugas/pengganti, prosedur saat provider/database tidak tersedia dan jadwal purge eksternal adalah blocker PUB-JOBS; batch ini tidak menjalankan cleanup data nyata.

Backup harus mempunyai lokasi/expiry, enkripsi, akses, kalender, RPO/RTO dan prosedur deletion yang disetujui. Latihan restore terisolasi harus merekonsiliasi closure/revocation, holds dan deadline dari sumber mutakhir sebelum resource melayani traffic. Akun/sesi/claim lama tidak boleh hidup kembali; riwayat tidak ditautkan via email baru. Jalankan purge yang jatuh tempo dan rekonsiliasi payment/refund/outbox agar restore tidak mengirim ulang uang atau proof lama. Bukti provider yang masih menyimpan arsip sah dijelaskan, bukan diberi label “semua data sudah dihapus”.

## Insiden dan bukti penyelesaian

Catat waktu pertama diketahui, kategori/scope, containment, pihak terdampak, provider dan keputusan eskalasi; batasi akses, simpan bukti minimum dengan hold khusus, jangan mengirim payload atau daftar Customer ke log/chat umum. Prosedur [UU PDP Pasal 46](https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang%2Bnomor%2B27%2Btahun%2B2022) memperhatikan pemberitahuan tertulis paling lambat 3×24 jam kepada subjek dan lembaga yang dipersyaratkan. Legal harus menetapkan penerapan, penerima/kanal, isi pemberitahuan dan petugas; implementasi alarm/notifikasi belum terbukti (PUB-INCIDENT). Tenggat kalender tidak diganti SLA keluhan hari kerja.

Bukti penyelesaian hak/purge berisi reference permintaan, jenis/hasil, kategori yang dihapus/dipertahankan dan dasar, lokasi/scope, timestamp, petugas serta reference provider/job. Tidak menyimpan percakapan/profile lengkap dalam receipt. Informasikan keterbatasan backup/provider dan tindak lanjut nyata. Paket dinyatakan siap publik hanya setelah register, metode wali/hak, job, coverage dan pemulihan mempunyai bukti serta approval yang sesuai.
