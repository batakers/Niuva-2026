# Kontrak implementasi kesiapan Customer publik

**Versi:** PUBLIC-RUNTIME-2026-10-03-v1. **Status:** requirement untuk batch kode berikutnya; bukan API/schema yang telah berjalan. Batch policy ini hanya mengubah dokumen dan ekspektasi tes preview. [PRD](../PRD-Niuva-MVP.md#addendum-persiapan-customer-publik--3-oktober-2026) memiliki keputusan produk; [Tech Design](../TechDesign-Niuva-MVP.md#addendum-kontrak-kesiapan-customer-publik--3-oktober-2026) menjadi authority teknis. Risiko/input dan persetujuan eksternal mengikuti [matriks kesiapan](customer-public-launch-readiness.md).

## Baseline yang harus dipertahankan

| Area | Kontrak saat ini | Kebutuhan publik yang belum ada |
| --- | --- | --- |
| Pendaftaran | [legal resolver](../../src/modules/customer-auth/legal.ts), [guard internal](../../src/modules/customer-auth/internal-testing.ts): allowlist Development loopback `niuva_dev`, atau fixture test terisolasi | Dokumen resmi, public consent, usia/wali dan capability hosted. Draf v3 tidak mengaktifkan resolver. |
| Email | [capability](../../src/modules/customer-auth/email-capabilities.ts) dan [mailer](../../src/modules/customer-auth/email-mailer.ts): Development, production ditolak | Outbox durable, retry/expiry, inbox dan kebijakan hosted. Test outbox bukan layanan produksi. |
| Privacy/closure | [core](../../src/modules/customer-privacy/core.ts), [repository](../../src/modules/customer-privacy/repository.ts): proof 15 menit, deadline tetap, lifecycle lock dan marker | Hosted, hak/wali tambahan, job/coverage dan operasi provider/backup. |
| Payment | [adapter](../../src/modules/payment/midtrans.ts), [webhook repository](../../src/modules/payment/webhook-repository.ts): Snap sandbox, verified notification dan exception | Pengajuan/refund case, persetujuan, pekerjaan provider dan rekonsiliasi final. Dukungan status refund bukan service refund otomatis. |
| Provider/CSP | [non-production guard](../../src/modules/providers/non-production.ts), [security headers](../../src/lib/security/headers.ts) | Tier hosted dan capability per provider yang diselaraskan dengan origin/CSP, bukan bypass `NODE_ENV`. |
| Cleanup | [privacy cleanup](../../src/modules/customer-privacy/cleanup.ts), CLI lokal dan Windows task | Job hosted dan retensi eksternal; job lokal bukan bukti jaminan lag hosted. |

Tidak mengubah Owner/Admin Clerk menjadi Customer, menggabungkan akun lewat email, menghapus internal consent/allowlist, melepas lifecycle lock, atau menautkan riwayat tertutup secara otomatis. Detail service/domain dan akses database tetap di service/repository; route/Server Action hanya boundary tervalidasi.

## Pendaftaran, policy dan wali

Setiap dokumen resmi mempunyai identifier, versi immutable, checksum/content reference, bahasa, tanggal berlaku, persetujuan Owner/legal dan status publikasi. Draf dan internal testing mempunyai namespace/tujuan berbeda. Salinan yang diterima tetap dapat ditemukan setelah revisi; perubahan file draf tidak mengganti bukti persetujuan lama. Penerimaan Syarat/Privasi dan persetujuan pemrosesan anak dipisahkan menurut tujuan/dasar.

Rekaman penerimaan minimum: operasi pendaftaran, metode/identity binding yang aman, versi masing-masing dokumen, waktu server dan outcome; field tambahan hanya jika dasar/minimisasi disetujui. Email/password menyimpan penerimaan pending, membuat account/consent atomik setelah verifikasi dan seluruh gate terpenuhi, tanpa sesi otomatis dari verifikasi. Google memakai bukti consent terikat identity/tujuan/sesi yang aman, diverifikasi saat callback dan dikonsumsi atomik. Tidak mengaktifkan account/sesi sebelum hasil usia/kelayakan/wali yang diperlukan lulus, meskipun OAuth/email valid. Gagal, expiry, replay dan pergantian versi material tidak boleh melewati gate.

Kontrak usia/wali dibuat **setelah PUB-AGE/PUB-GUARDIAN memberi keputusan**, dengan hasil yang bisa diverifikasi: kelompok usia, fitur yang eligible, assurance/metode dan waktu, kebijakan/verifikasi wali, cakupan/purpose consent, hubungan pihak transaksi, expiry/review/withdrawal dan alasan penolakan. Bahan identitas sementara dipisah dari hasil minimum, sesuai retensi/penghapusan yang disahkan. Tidak memilih vendor KYC, DOB wajib, ID atau biometrik dari dokumen ini.

Keputusan akses berasal dari server dan diperiksa pada setiap fitur/komitmen yang dibatasi, bukan UI/checkbox saja. Review usia keliru, perubahan wali, persetujuan ditarik, usia naik kelompok dan sengketa kewenangan mempunyai alur aman. Wali hanya mendapat data/aksi sesuai scope yang sah; tidak otomatis mengunduh akun anak. Review legal harus menetapkan pengaruh penarikan pada akses dan dasar penyelesaian pesanan/kewajiban yang masih berjalan. Retensi bukti kontrak/persetujuan publik pasca-closure perlu projection terpisah yang sah; tidak mengubah purge consent akun saat ini tanpa kontrak tersebut.

Matriks metode juga harus memeriksa akun Google mandiri/supervised dan penolakan izin provider pada tiap kelompok yang eligible. [Batas usia akun Google](https://support.google.com/accounts/answer/1350409?hl=id) dan [Family Link](https://support.google.com/families/answer/7101025) tidak menjadi bukti otomatis hubungan wali atau consent transaksi Niuva; kontrol pembelian Family Link berlaku pada billing Google Play. Identitas Google wali tidak boleh digabung atau dipakai sebagai identitas anak secara diam-diam. Tambahkan regresi provider denied/supervised, consent terpisah dan fallback hanya untuk metode yang benar-benar eligible. Review internal berdasarkan sumber resmi dapat dilanjutkan tanpa perekrutan konsultan formal; keputusan kelayakan dan bukti assurance tetap prasyarat kemampuan anak, sebagaimana [catatan input](customer-public-input-evidence.md).

## Kasus refund dan kewenangan

Model/endpoint final dirancang pada batch kode; requirement persistensi minimum adalah:

- Kasus: ID, order dan alokasi payment server, alasan/kategori, pemohon/pihak berwenang, kontak minimum, pilihan penyelesaian, waktu penerimaan/tenggat, syarat serta bukti retur, status dan expense di luar charge.
- Persetujuan: Owner berizin, waktu, alasan, revision dan snapshot amount/currency/alokasi; aplikasi memvalidasi ulang eligibility serta saldo yang relevan sebelum submit. Perubahan scope/nominal memerlukan persetujuan baru; version conflict tidak diam-diam mengirim versi lama.
- Operasi provider: ID stabil, payment/transaction reference, refund_key, nominal/parameter immutable, waktu request pertama, cutoff/window dan retry limit, attempt/lease, status accepted/unknown/rejected/confirmed, reference provider dan bukti minimum.
- Rekonsiliasi: sumber terverifikasi, signed notification/status query, amount/key/refund identity, waktu hasil/bank yang relevan, audit dan penyelesaian/pemberitahuan. Raw provider payload/credential bukan isi audit.
- Pengecualian/manual: alasan tidak bisa API, bukti operasi lama tidak akan membayar, Owner berwenang, penerima/nominal, bukti transfer/konfirmasi dan link operasi pengganti. Akses bukti sensitif dibatasi.

Nominal dihitung dari pembayaran berhasil di server memakai Decimal. Full refund mencakup seluruh charge sah terkait, dikurangi hasil refund yang sudah benar-benar diterima; pembayaran order dan ongkir akhir dapat berbeda reference. Constraint/lock mencegah refund case/alokasi yang tumpang tindih melampaui charge atau memproses dua kali. Tidak menambah expense retur ke request provider melebihi charge asal. Refund pasca-produksi/pengiriman adalah kasus keuangan terpisah: tidak membalik status order/stock yang tidak eligible menurut kontrak lama.

Refund membutuhkan aksi Customer/Owner sesuai peran; permission dan scope diperiksa server, origin/Host/Zod/body/rate-limit/idempotensi berlaku. Owner approval bukan job yang boleh dipanggil Customer/Admin biasa. Petugas yang menjalankan job/manual tidak mendapat kewenangan mengubah approval tanpa jejak. Approval tidak otomatis menyelesaikan kasus.

## Idempotensi dan hasil provider

Pembuatan kasus/approval/job mempunyai submission key dan unique constraint sesuai scope. Job mengirim **refund_key yang sama untuk operasi/parameter yang sama** pada semua retry. Key dan waktu request pertama tersimpan sebelum kemungkinan panggilan eksternal; timeout/crash setelah provider menerima tidak menciptakan operasi baru. Gunakan lease/lock agar worker tumpang tindih tidak menggandakan request; hasil worker lama dipadankan dengan operasi/revision yang benar.

[Kontrak Midtrans](https://docs.midtrans.com/reference/refund-transaction) membatasi reattempt same-key sampai tujuh hari dari request awal. Deadline aman adalah batas paling awal antara retry-key window, payment refund window dan cutoff merchant. Setelah batas, stop retry dan rekonsiliasi; tidak otomatis ganti key. Gunakan reference yang diwajibkan metode (termasuk transaction_id untuk static GoPay QRIS). Pending/authorize/capture memerlukan evaluasi Cancel, settled dievaluasi refund. Capability/window/ETA per metode tetap data terverifikasi PUB-REFUND-PROVIDER, bukan konstanta spekulatif.

HTTP/API accepted bukan final money outcome. Simpan hanya field akhir yang diperlukan, termasuk `bank_confirmed_at` bila sesuai metode serta identitas/nominal refund, melalui validasi dan binding transaksi. Perluasan webhook harus memverifikasi signature dan merchant/order/payment/amount, menangani payload hilang/tak cocok, dedup/replay/out-of-order dan menghindari downgrade confirmed ke pending. Jangan menyimpulkan full refund hanya dari satu status provider ketika ada beberapa pembayaran, refund sebagian, late settlement atau expense belum dibayar. Query status/support/manual evidence melengkapi notifikasi; definisi bukti final per metode harus disahkan.

Rekonsiliasi hasil tak pasti wajib mendahului retry tidak ekuivalen/manual. Jika tidak dapat membuktikan operasi lama gagal final/tidak dapat membayar, tahan pengiriman baru dan eskalasi. Key baru memerlukan kasus/operasi pengganti yang direview Owner, bukti aman dan tautan ke operasi lama. Manual transfer yang sudah dilakukan juga memblokir submit API tumpang tindih; notification datang kemudian menjadi exception yang ditinjau, bukan pembayaran kedua. Alasan publik ke provider bebas PII dan isi private kasus.

## Hosted, origin dan capability

Desain target memakai deployment tier eksplisit **local/test, staging, production**, terpisah dari mode provider **mock/sandbox/live** dan runtime `NODE_ENV`. Nama env/schema final bukan ditetapkan oleh batch ini. `NODE_ENV=production` pada build hosted tidak boleh menjadi izin live atau alasan mematikan seluruh staging; capability harus membutuhkan resource binding, konfigurasi lengkap, policy/usia yang sah dan izin aktivasi sesuai tier.

Tabel capability per tier wajib mencakup signup, Google/password, email sender/delivery, privacy/proof, R2, payment/refund/shipping, analytics dan job. Default gagal tertutup. Staging memakai proyek/resource/OAuth/database/bucket/mail/sandbox terpisah, tidak menyalin data/secret production. Production capability belum diizinkan oleh keberhasilan build atau pemasangan dokumen draf.

Selaraskan APP_URL/trusted origin, cookie secure/SameSite/expiry, OAuth redirect, proof link, native POST/303 dan progressive enhancement, CSP connect/form-action serta host storage/email. Origin null/hilang dan forwarded host tidak menjadi bypass. Provider guard, capability email, legal resolver, privacy guard, CSP dan resource/job binding harus memberi keputusan yang konsisten. Tidak hanya menambahkan satu flag public yang melewati guard lain.

## Outbox, job dan pemantauan

Target outbox durable mempunyai ID/logical message key, tujuan/template versi, purpose/binding, waktu enqueue/due/expiry, state, attempts/lease, provider reference, kategori failure dan audit minimum. Queue tidak dianggap delivery accepted; accepted tidak dianggap inbox received. Retry/backoff terbatas, cooldown/rate limit, bounce/permanent failure dan alarm memerlukan prosedur serta petugas. Clock memakai waktu server yang konsisten.

Token auth/privacy yang harus dikirim tidak boleh menjadi token plaintext permanen pada log/database umum. Desain outbox memakai perlindungan isi sensitif dan penghapusan berbatas expiry yang direview; database proof tetap hash. Sebelum setiap send/retry, pastikan proof/account/sesi/tujuan masih sah; proof dicabut/expired/resend lama/akun closed tidak dikirim ulang. Pengiriman gagal tidak menandai proof sebagai authorized. Retry token 15 menit tidak boleh memperpanjang masa berlaku; jika memerlukan proof baru, minta alur otorisasi baru yang aman, bukan mengganti token di pesan lama diam-diam. Pesan kasus bisnis pasca-closure memakai tujuan/kontak yang sah tanpa tautan sesi akun yang sudah dicabut.

Job hosted perlu service identity minimum, resource/tier checks, idempotensi/locking/checkpoint, safe dry-run dan execute, retry terbatas, jumlah/lag/last-success serta alarm. Cleanup dan penanganan hak/refund tetap berjalan ketika signup ditutup. Deadline permintaan/purge asli tidak berubah karena job retry, status, restore atau hold expiry. Failure parsial boleh diulang hanya untuk scope yang belum berhasil; object deletion/receipt financial harus mengikuti bukti. Job berbahaya tidak dijadikan endpoint publik tanpa autentikasi/izin yang sesuai.

SLA 1/2/1 hari kerja menggunakan kalender Owner WIB yang disahkan; privacy 72 jam memakai waktu kalender. Monitor kasus menjelang due, terlambat, hold menunggu review, job gagal, outbox tak terkirim dan refund unknown. Cadence, threshold, coverage dan pengganti merupakan input yang harus ditutup, bukan janji on-call yang belum tersedia.

## Closure, arsip dan pemulihan

Pertahankan lifecycle serialization pada seluruh auth/signup/reset/callback/claim, write bisnis Customer dan closure. Closed business marker dan rotasi capability mencegah account baru mengambil riwayat; email sama tidak memberi hak. Account baru memenuhi public consent/age gate dari awal. Kasus/order/refund/expense yang aktif tetap dapat diselesaikan dengan kontak verified dan dasar yang tepat, tanpa hidupkan akun atau FK akun lama.

Arsip transaksi/bukti wajib diproyeksikan minimum dengan retensi yang disahkan; receipt kasus 30 hari bukan pemicu hapus semua bukti keuangan. Privacy content +7 hari, hold review dan retensi berkas 14/60/90 tetap terpisah. Provider/backup tidak diberi status purged hanya karena row akun hilang. Pemulihan backup wajib menerapkan closure/revocation/holds/deadline terbaru sebelum melayani sesi, dan rekonsiliasi refund serta outbox agar tidak mengirim ulang. Rollback hanya menutup capability yang relevan, tetap menyediakan penanganan hak/kewajiban dan tidak mengubah policy consent historis.

## Skenario penerimaan batch kode dan staging

| Area | Regresi/bukti wajib |
| --- | --- |
| Consent | Kedua metode merekam versi yang benar; draft/internal tidak membuka publik; missing/expired/replay/version change ditolak; verifikasi tanpa consent/eligibility tidak membuat akses. |
| Usia/wali | Matriks semua kelompok/fitur yang disahkan; verified OAuth bukan bukti wali; parent refusal/withdrawal/wrong relationship/age appeal tidak melewati server gate; data wali tidak bocor lintas akun. |
| Refund | Owner permission dan immutable snapshot; race approvals/workers/manual, same-key retry, timeout/crash, cutoff tujuh hari, unsupported/expired/balance, multi-payment/full amount, expense dan bank confirmation diuji. |
| Webhook/rekonsiliasi | Bad signature/amount/key, replay/duplikat/out-of-order, partial refund, late settlement dan provider query mismatch; accepted/unknown tidak selesai atau mengirim dua kali. |
| Closure | Beradu dengan transaksi, claim, verifikasi/reset/OAuth, refund approval/worker dan outbox; tidak ada resurrection/reattachment, refund tetap selesai ke pihak berwenang. |
| Privacy/retensi | 72 jam termasuk libur, external first receipt, ganti status/hold tidak reset due, proof expiry/delivery fail, scope export, jobs offline/partial/purge, arsip terpisah dan restore aman. |
| Hosted | Native/JS POST, trusted origin/host/cookie/CSP, capability matrix dan isolate resource; email inbox/bounce, OAuth, payment/refund sandbox, private R2 dan job bukan hanya mocks. |

Batch kode menjalankan **lint, typecheck, unit/component, backend, integration PostgreSQL, Prisma validation, Chromium E2E dan build**, dengan regresi relevan di atas; migrasi non-destruktif direview. Staging menyimpan bukti provider, layanan dan recovery yang tidak dibuktikan CI. Visual, physical-device/AT dan Owner acceptance tetap tercatat sesuai scope. Publikasi, deployment, aktivasi provider dan credential production membutuhkan instruksi terpisah mengikuti [AGENTS.md](../../AGENTS.md).
