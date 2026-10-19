# Roadmap Niuva v1.0

**Status:** disetujui untuk implementasi pada 18 Oktober 2026. Baseline audit:
`f4799c77fedb86f185db29d6f9b9cbfd63828047`. Ini urutan dependensi, bukan janji
tanggal, pengesahan policy, atau izin aktivasi provider/deployment.

[PRODUCT.md](PRODUCT.md) membekukan hasil yang dibangun; [TASKS.md](TASKS.md)
adalah satu backlog aktif. [PRD](docs/PRD-Niuva-MVP.md) dan
[Tech Design](docs/TechDesign-Niuva-MVP.md) beserta addenda tetap memiliki kontrak
rinci. [Definition of Done](docs/v1-definition-of-done.md) menentukan kapan
pekerjaan, kandidat rilis, dan rilis production dapat disebut selesai.
[Ledger readiness](docs/frontend/mvp-release-readiness.md) menyimpan bukti
lingkungan; status task tidak otomatis menutup gate readiness.

## Milestone dan batas selesai

| Milestone | Task | Dependensi | Exit criteria |
| --- | --- | --- | --- |
| M0 — Scope dan baseline | T01–T02 | Audit dan persetujuan | Kontrak v1 dan backlog tunggal jelas; generate/lint/typecheck resmi dapat dijalankan. |
| M1 — Keandalan hosted | T03–T10 | M0 | Binding resource/origin, outbox, worker, job, pemantauan, dan batas laju terbukti pada cakupan uji; production tetap tertutup. |
| M2 — Customer publik | T11–T14 | M0; outbox M1 untuk bukti lengkap | Consent Google/email, deklarasi 18+, privacy, dan closure memenuhi kontrak. Policy resmi dan kemampuan hosted dibuktikan terpisah. |
| M3 — Admin mandiri | T15–T20 | M0; T03 untuk media hosted | Owner/Admin dapat menambah draft produk, varian, project, dan media, lalu publish dengan validasi server. |
| M4 — Penutupan transaksi | T21–T31 | M0; outbox/job M1 | Refund/reconciliation, email bisnis, dataset dan tarif siap untuk pembuktian BUY/MAKE terpadu. |
| M5 — Pembuktian staging | T32–T39 | M1–M4; resource dan input Owner | Dua transaksi BUY dan satu MAKE, failure/refund, operasi Admin, aksesibilitas dan restore memiliki bukti. |
| M6 — Rilis terkendali | T40 | M5; seluruh gate wajib | Instruksi rilis eksplisit, aktivasi terbatas, smoke production, monitoring, dan serah terima rollback. |

M2, M3, dan M4 dapat dikembangkan sebagai irisan terpisah setelah interface
fondasinya jelas. Pengembangan dengan fixture tidak perlu menunggu semua fakta
production. Task yang memerlukan policy/resource/izin tetap mencatat blocker;
fixture tidak menjadi pengganti bukti hosted atau keputusan Owner.

## Batas perubahan

- Pertahankan modular monolith dan dependency existing. Tidak ada penggantian
  stack, redesign global, atau refactor seluruh repository dalam roadmap ini.
- B2B berakhir pada kontak WhatsApp website. Brief/proposal/inquiry B2B baru di
  website tetap di luar scope; record historis tetap dilindungi.
- Pengelolaan konten mandiri adalah draft → lengkapi → publish, tanpa page
  builder. Media publik tidak boleh mengambil file privat Customer.
- Booking/label/tracking provider otomatis bukan gate v1 selama pemenuhan dan
  pencatatan resi manual memenuhi kontrak yang disetujui.
- Pendaftaran, pengiriman provider nyata, provisioning, deployment, dan
  production mempunyai instruksi aktivasi tersendiri. Tidak melepas guard
  untuk melewati prasyarat.
- Setelah task memenuhi acceptance criteria dan DoD, perubahan tambahan masuk
  backlog versi berikutnya. Tidak memperluas scope untuk mengejar kesempurnaan.

## Input dan bukti eksternal

| Input/bukti | Pemilik | Task/gate |
| --- | --- | --- |
| Policy resmi: isi, versi, tanggal berlaku | Owner sebagai pengesah; fungsi review | T11–T14; REL-01/PUB-POLICY |
| Resource staging, canonical origin, sender/inbox, provider dan biaya | Owner; engineering untuk implementasi | T03/T06/T18/T23/T33–T35; REL-02/03/06 |
| Cakupan refund merchant, window, saldo dan jalur manual | Owner; Rheza/operasi pembayaran | T23/T25/T35; REL-05 |
| Produk/SKU, stok fisik, media/izin, berat/dimensi, rule launch | Owner; operator | T31; REL-06 |
| Retensi arsip/bukti keuangan dan hak data hosted | Owner; fungsi privasi/akuntansi/review | T08/T14/T38; REL-07 |
| Coverage/pengganti, kalender/jam, SLA quote, penerima retur, engineering bernama | Owner; Rheza | T39; REL-07 |
| Sasaran backup/restore dan latihan pemulihan | Owner; engineering/privasi | T38; PUB-BACKUP |
| Perangkat fisik, AT, penerimaan dan instruksi rilis | Owner; pelaksana QA/operasi | T37/T40; REL-08 |

Identitas, alamat retur, Rheza sebagai petugas utama, arah 18+ melalui deklarasi,
refund penuh dengan approval Owner, B2B WhatsApp, dan batas file 100 MiB/14–60–90
hari sudah diputuskan. Jangan membuka ulang keputusan tersebut. Catatan
aktivasi PER_UNIT Development tidak menjadi izin aktivasi database launch.

## Riwayat dan kemajuan

Rencana di [tasks/plan.md](tasks/plan.md), [tasks/todo.md](tasks/todo.md), dan
checklist fase `.kiro/specs/` adalah histori/evidence fase masing-masing.
Jangan menghapus atau bulk-close item lama; rekonsiliasi tugas lanjutan ke
TASKS.md. Catat hasil per task di sana dan bukti lingkungan pada ledger pemilik.
