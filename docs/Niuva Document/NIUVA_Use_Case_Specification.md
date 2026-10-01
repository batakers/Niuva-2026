# NIUVA — Use Case Specification

> **Status:** Draft v0.3 — REFERENCE. Referensi penjelas, bukan sumber keputusan baru.
>
> **Pemeriksaan sumber:** 2026-09-30 (Asia/Jakarta), `main` pada `9605a96`
> (`9605a96e936236b7e54b526f05e6b344747b24ab`). Perilaku yang berlaku
> memakai commit tersebut sebagai baseline API/data. Revisi navigasi Admin pada checkout kerja
> dikirim melalui branch `codex/admin-navigation-docs-v03`. Owner menerima visual shell
> pada Overview Admin lokal pada 2026-10-01; activation/AT/perangkat/produksi tetap mengikuti gate sumber.
>
> **Authority:** [PRD](../PRD-Niuva-MVP.md), [Tech Design](../TechDesign-Niuva-MVP.md),
> [lifecycle](../backend/lifecycle-contract.md), [Phase 2 closure](../backend/phase-2-closure-decisions.md),
> [pricing/shipping](../backend/phase-3-pricing-biteship-contract.md).
> Schema, handler dan service menjadi bukti pemetaan runtime; addenda/closure terbaru dibaca bersama authority.
> [DESIGN](../../DESIGN.md), [Action Queue](../backend/SPEC-action-queue.md), dan
> [keputusan Owner sesi ini](NIUVA_Use_Case_Specification.md#9-keputusan-owner-dan-input-terbuka)
> melengkapi traceability. Keputusan sesi dibedakan dari capability yang sudah diimplementasikan.
>
> **Asal:** draf repo v0.2 direkonsiliasi dengan sumber di atas. Artefak diagram sumber
> asli yang pernah disebut belum ditemukan di repo. Lampiran memuat kandidat/model lama
> dengan label eksplisit; tidak menjadi kontrak implementasi.

## Perilaku yang berlaku

### 1. Cara membaca dan aktor

Spesifikasi mempertahankan **28 ID Use Case**. Route, prasyarat dan hasil
mengikuti checkout sumber. Peta aktor ada pada
[Use Case Diagrams](NIUVA_Use_Case_Diagrams.md); urutan tindakan pada
[Activity](NIUVA_Activity_Diagram_User_Flow.md) dan
[Sequence](NIUVA_Sequence_Diagrams.md).

| Aktor | Akses |
| --- | --- |
| Visitor | Halaman publik dan cart browser sebelum login. |
| Customer | Sesi Google sebelum submit Brief/MAKE, simulasi, shipping rate, checkout, atau akses pekerjaan miliknya. |
| Admin | Clerk valid **dan** `AdminProfile.isActive`; role dari database. Service memeriksa named permission untuk mutasi. |
| Owner | Permission Admin ditambah aktivasi pricing, pengelolaan profil Admin, refund penuh/pembatalan paid dan policy. Ketersediaan workflow tetap mengikuti implementasi. |

Google menangani Customer; Clerk menangani Admin. R2 menyimpan file privat,
Biteship menyediakan rate, Midtrans pembayaran, Resend notifikasi.
Ketersediaan provider merupakan gate tersendiri.

### 2. Eksplorasi publik

#### UC-PUB-HOME-01 — Explore Homepage

- **Actor/route:** Visitor/Customer, `/`.
- **Prasyarat/trigger:** konten publik tersedia; membuka home.
- **Alur:** baca identitas dan bukti, pilih DEVELOP, MAKE, atau BUY; buka route terkait.
- **Exception:** unpublished atau klaim tanpa evidence tidak ditampilkan.
- **Hasil:** navigasi; belum membuat inquiry/request/order.

#### UC-PUB-ABOUT-01 — View About NIUVA

- **Actor/route:** Visitor/Customer, company profile pada `/`.
- **Alur:** baca capability/process, lanjut ke layanan/proyek/CTA.
- **Exception:** tidak ada page `/about` atau `/contact` terpisah; kontak melalui CTA/section home.
- **Hasil:** memahami profil dan cara menghubungi Niuva.

#### UC-PUB-SERVICE-01 — Explore Services

- **Actor/route:** Visitor/Customer, `/services`, `/services/[slug]`.
- **Alur:** baca Research & Development, Consultant & Workshop, Design & Prototyping, atau Apparel & Merchandise.
- **Exception:** slug tidak tersedia -> not found.
- **Hasil:** detail layanan, belum Brief.

#### UC-PUB-SERVICE-02 — Continue to Project Brief

- **Actor/route:** Visitor/Customer, service CTA -> `/project-brief`.
- **Alur:** pilihan service menjadi prefill yang dapat diubah; login sebelum submit.
- **Exception:** prefill tidak sah tidak membuat layanan baru.
- **Hasil:** form; penyimpanan inquiry ada pada `UC-BRIEF-01`.

#### UC-PUB-PROJECT-01 — Browse Projects

- **Actor/route:** Visitor/Customer, `/projects` dan published `/projects/[slug]`.
- **Alur:** baca kartu, buka detail bila dipublikasikan.
- **Exception:** `card-only` tidak memberi link detail; unpublished tidak muncul.
- **Hasil:** bukti proyek sesuai publication gate, opsional lanjut Brief.

#### UC-PUB-CUSTOM-01 — Explore Custom Print

- **Actor/route:** Visitor/Customer, `/custom-print`.
- **Alur:** baca review operator, kebutuhan file/referensi dan tingkat informasi biaya.
- **Exception:** preview browser tidak menjanjikan produksi/harga final.
- **Hasil:** memahami MAKE.

#### UC-PUB-CUSTOM-02 — Continue to MAKE Request

- **Actor/route:** Visitor/Customer, `/custom-print/request`.
- **Alur:** pilih MODEL_READY atau REFERENCE_ONLY; login sebelum submit.
- **Exception:** tanpa file, reference-only tidak membutuhkan R2.
- **Hasil:** form; request disimpan pada `UC-MAKE-01`.

#### UC-PUB-SHOP-01 — Browse Shop & Product Detail

- **Actor/route:** Visitor/Customer, `/shop` dan `/shop/[slug]`.
- **Alur:** baca produk/varian published, harga dan availability; pilih varian.
- **Exception:** harga/stock dapat berubah; server membaca ulang saat rate/checkout.
- **Hasil:** pilihan produk. Kurasi copy tampilan tidak mengganti data canonical.

#### UC-PUB-SHOP-02 — Add Product to Cart

- **Actor/route:** Visitor/Customer, detail produk -> `/cart`.
- **Alur:** pilih variant/quantity; simpan cart browser `niuva.cart.v1`.
- **Exception:** storage blocked mempunyai fallback; invalid items dikoreksi.
- **Hasil:** cart lokal tanpa reservation; wishlist hanya kandidat lampiran.

### 3. Login dan account

#### UC-AUTH-C-01 — Sign In / Register with Google

- **Actor/route:** Visitor, `/login` atau `/register` -> Google start/callback.
- **Prasyarat:** Google config dan database session store tersedia.
- **Alur:** OAuth state/PKCE, verifikasi issuer/audience/expiry/email_verified,
  buat/ambil Customer dan sesi; lanjut safe return route.
- **Exception:** identitas/state gagal -> tidak membuat sesi; konflik identitas
  tidak digabung otomatis.
- **Hasil:** token sesi hashed, cookie httpOnly/sameSite lax/secure produksi,
  sesi 30 hari. Legacy retail tanpa owner dapat ditautkan menurut email
  terverifikasi. Safe return hanya `/account`, `/checkout`, `/project-brief`,
  `/custom-print/request`; lainnya kembali `/account`.

#### UC-AUTH-C-02 — Logout

- **Actor/operasi:** Customer, `POST /api/auth/logout`.
- **Alur:** periksa same-origin, cabut sesi sekarang, hapus cookie.
- **Exception:** rate limit/store error -> tidak mengklaim revoke berhasil.
- **Hasil:** sesi berakhir; cart browser bukan data account.

#### UC-ACCOUNT-01 — View Read-only Account

- **Actor/route:** Customer, `/account` dan detail inquiry/MAKE/order.
- **Prasyarat:** sesi dan ownership record.
- **Alur:** baca profil Google, daftar pekerjaan, timeline, proposal/estimate/quote/order.
- **Exception:** record asing tidak menampilkan data privat.
- **Hasil:** read model. Profil/alamat tersimpan tidak mempunyai editor MVP;
  keputusan, claim dan tambah model mempunyai operasi khusus.

#### UC-ACCOUNT-02 — Claim Legacy Work

- **Actor/operasi:** Customer, `POST /api/account/claim`.
- **Prasyarat:** token privat route-bound untuk B2B_INQUIRY atau
  CUSTOM_PRINT_REQUEST yang belum dimiliki.
- **Alur:** validasi scope/hash/owner; claim transaksi, rotasi/revoke token lama.
- **Exception:** token invalid/stale/already-owned -> gagal; email/company saja
  tidak memberi hak.
- **Hasil:** record dimiliki satu Customer; token lama bukan authority.

### 4. DEVELOP / Project Brief

#### UC-BRIEF-01 — Submit Project Brief

- **Actor/route/operasi:** Customer, `/project-brief` -> `POST /api/project-brief`.
- **Prasyarat:** sesi; lampiran selesai confirm (UPLOADED), owned dan unattached.
- **Alur:** isi kebutuhan dan akui kerahasiaan. Server memakai email/owner sesi,
  memvalidasi referensi, menyimpan B2BInquiry NEW/reference number/join file
  secara atomik. Notifikasi berada setelah persist.
- **Exception:** field, referensi atau ownership file gagal -> reject.
- **Hasil:** inquiry pada `/account/inquiries/[id]` untuk follow-up Admin.

| Field | Aturan |
| --- | --- |
| `name`, `phone` | Wajib untuk kontak; pengisian phone bukan consent pesan WhatsApp otomatis. |
| `email` | Format divalidasi; nilai tersimpan dari sesi Google terverifikasi. |
| `projectGoal`, `description`, `targetQuantity` | Wajib teks nonkosong; quantity Brief merupakan uraian kebutuhan. |
| `currentStage` | IDEA / SKETCH / CAD / PROTOTYPE / EXISTING_PRODUCT. |
| `confidentialityAck` | Harus true. |
| `attachmentFileIds` / `referenceLink` | Minimal salah satu untuk selain IDEA; IDEA opsional. ID unik, link HTTP/HTTPS. |
| `company`, `budgetRange`, `preferredService`, `targetDeadline` | Opsional; service salah satu empat slug aktif; deadline tanggal ISO. |

#### UC-BRIEF-02 — Track Brief and Decide B2B Proposal

- **Actor/route:** Customer, `/account/inquiries/[id]`.
- **Operasi:** `POST /api/account/inquiries/[id]/quotes/[quoteId]/decision`.
- **Prasyarat:** owned inquiry, proposal latest SENT dalam validUntil.
- **Alur:** baca scope/assumptions/lines/IDR total; putuskan ACCEPTED/DECLINED;
  server merekam versi, Customer dan waktu.
- **Exception:** stale/expired/foreign -> reject; replay mengikuti state service.
- **Hasil:** ACCEPTED menjadi **tindak lanjut manual**, tanpa order, invoice,
  pembayaran atau kontrak otomatis. WON/LOST tetap tindakan operator.

### 5. MAKE

#### UC-MAKE-01 — Submit MAKE Request

- **Actor/route/operasi:** Customer, `/custom-print/request` ->
  `POST /api/custom-print/requests`.
- **Prasyarat:** sesi, contact/material/quantity valid, confirmed UPLOADED file bila ada.
- **Alur:** MODEL_READY minimal satu model (STL memerlukan unitConfirmation); REFERENCE_ONLY notes wajib,
  opsional satu foto/link HTTPS. Server menyimpan SUBMITTED, owner dan files.
- **Simulasi opsional:** mesh STL/OBJ/3MF confirmed UPLOADED + berat/durasi slicer per
  unit dari Customer + Pricing v1 aktif PER_UNIT -> preview advisory. Server
  menghitung ulang saat submit; snapshot historis terpisah dari review.
- **Exception:** STEP/STP, foto/referensi, data/rule belum eligible -> “Perlu review”;
  tidak ada slicing otomatis.
- **Hasil:** reference/account detail, CTA “Ajukan untuk Review” dan label
  “Estimasi awal, bukan harga final”.

#### UC-MAKE-02 — Track MAKE and Decide Final Quote

- **Actor/route:** Customer, `/account/make/[id]`.
- **Prasyarat quote akun:** review operator + **estimasi produksi terbaru**
  yang sesuai source/pricing wajib tersedia.
- **Alur:** baca simulasi historis, estimasi 100%–130% dan pos tambahan,
  lalu quote. Perubahan review/material/filament/quantity/rule memerlukan
  estimasi baru. Model dapat ditambahkan ke REFERENCE_ONLY SUBMITTED/UNDER_REVIEW sebelum review pada request yang sama; STL memerlukan unitConfirmation.
- **Decision:** `{"decision":"accept"}` atau `{"decision":"decline"}`.
  Accept memeriksa latest SENT, tujuh hari dari SENT, ownership/snapshot/state;
  atomik quote ACCEPTED + request APPROVED + order WAITING_PAYMENT.
- **Exception:** expired/superseded/stale -> reject; replay accept mengambil
  order/state yang sudah ada, tanpa header Idempotency-Key.
- **Hasil:** payable custom order/attempt 24 jam dan provider handoff setelah
  commit. Rough shipping advisory terpisah; ongkir final sesudah ukur paket.

### 6. BUY

#### UC-CART-01 — Manage Browser Cart

- **Actor/route:** Visitor/Customer, `/cart`.
- **Alur:** tambah/ubah/hapus variant quantity pada localStorage versi 1;
  client maksimal 99 per varian.
- **Exception:** corrupt dipulihkan, storage blocked fallback; stock/harga belum dijamin.
- **Hasil:** payload items untuk rate/checkout; tidak ada tabel Cart/cart CRUD.

#### UC-CHECKOUT-01 — Checkout Retail

- **Actor/route/operasi:** Customer, `/checkout` -> shipping/rates -> checkout.
- **Prasyarat:** login, address lengkap, 1–50 items unik, shipping option valid,
  `idempotencyKey` pada **body**.
- **Alur:** server baca catalog/package/rate, lock variants, revalidasi harga,
  stock/fingerprint dan Decimal total. Transaksi menyimpan order/items/address/
  rate snapshot/reservations/payment attempt. Midtrans setelah commit.
- **Exception:** stock/catalog/rate berubah -> reject; key sama payload berbeda
  -> conflict; hasil provider ambigu memerlukan rekonsiliasi.
- **Hasil:** PENDING_PAYMENT, reservation/payment 30 menit; replay teknis
  24 jam tidak memperpanjang payment. Browser redirect belum PAID.

#### UC-ORDER-C-01 — Track Order

- **Actor/route:** Customer, `/account/orders/[id]`; `/orders/[token]` menurut access policy.
- **Alur:** baca persisted status, snapshots, deadline, kurir/resi.
- **Exception:** foreign record/token invalid -> fail closed; late settlement
  cancelled order memerlukan refund penuh, tidak reopen.
- **Hasil:** status server. Webhook signature/status/amount/reference yang valid
  mencatat event dan menerapkan payment/order/inventory dalam transaksi.

### 7. Admin dan Owner

#### UC-AUTH-A-01 — Enter Admin with Clerk

- **Actor/route:** Admin/Owner, `/admin/sign-in` -> `/admin`.
- **Prasyarat:** Clerk session + active AdminProfile tepat untuk Clerk user ID.
- **Alur:** baca role database sebelum read; named permission sebelum mutasi.
- **Exception:** tenant/profile/inactive -> fail closed; tidak self-provision.
- **Hasil:** akses sesuai role; login Clerk saja tidak cukup.

#### UC-ADMIN-PRODUCT-01 — Manage Products, Variants and Stock

- **Actor/route:** Admin/Owner, `/admin/products`, detail produk, detail stock varian.
- **Prasyarat:** CATALOG_WRITE / INVENTORY_ADJUST.
- **Alur:** Server Actions edit produk/varian/media; adjustment ledger
  menyimpan actor, reason, delta, before/after dengan lock.
- **Exception:** publication/reservation/concurrent stock gagal -> reject.
- **Hasil:** catalog canonical, StockMovement auditable. Reserve mengurangi
  available; paid consumption mengurangi on-hand sekali.

#### UC-ADMIN-ORDER-01 — Fulfill Orders and Shipping

- **Actor/route:** Admin/Owner, `/admin/orders` dan `/admin/orders/[id]`.
- **Prasyarat:** ORDER_FULFILL / SHIPPING_MANAGE; transition sah.
- **Alur retail:** PAID -> PROCESSING -> READY_TO_SHIP -> SHIPPED -> COMPLETED.
- **Alur custom:** PAID -> IN_PRODUCTION -> FINISHING_QC; ukur paket/alamat,
  rate/ongkir payment 24 jam -> verified paid -> READY_TO_SHIP -> delivery.
- **Exception:** unpaid tidak fulfillment; generic paid cancellation fail closed
  sampai dedicated refund penuh terverifikasi (Owner). Partial refund di luar MVP.
- **Hasil:** shipment/timeline/audit; provider retry mengikuti reference/state.

#### UC-ADMIN-B2B-01 — Handle Inquiry and Send Proposal

- **Actor/route:** Admin/Owner, `/admin/inquiries` dan detail inquiry.
- **Prasyarat:** INQUIRY_MANAGE / QUOTE_MANAGE menurut service.
- **Alur:** review privat, kontak/kualifikasi, kirim proposal versi baru berisi
  scope/assumptions/lines/validUntil; pantau keputusan account.
- **Exception:** ACCEPTED tidak boleh dianggap order paid.
- **Hasil:** proposal auditable; follow-up/WON/LOST manual mengikuti transition.

#### UC-ADMIN-MAKE-01 — Review, Estimate and Send Quote

- **Actor/route:** Admin/Owner, `/admin/custom-print` dan detail request.
- **Prasyarat:** CUSTOM_PRINT_REVIEW / QUOTE_MANAGE, model/review dan active rule.
- **Alur:** catat verifiedWeightG/duration/material/quantity/configuration,
  pilih rule/filament, named additional costs atau explicit no-cost;
  publish estimate versi baru 100%–130%, draft quote sesuai latest estimate, send.
- **Exception:** source berubah -> re-estimate; baseline final quote memakai
  lowerRp hasil perhitungan dan memeriksa kisaran/snapshot.
- **Hasil:** immutable SENT tujuh hari. Paket perkiraan hanya rough shipping.

#### UC-ADMIN-PORTFOLIO-01 — Manage Published Portfolio

- **Actor/route:** Admin/Owner, `/admin/portfolio` dan detail project.
- **Prasyarat:** PORTFOLIO_WRITE dan publication gate.
- **Alur:** edit konten/media, detail/card-only, publish/unpublish.
- **Exception:** tidak mengarang approval logo/client atau klaim hasil.
- **Hasil:** project published sesuai hak publikasi.

#### UC-ADMIN-OPS-01 — Read Overview, Analytics and Action Queue

- **Actor/route:** Admin/Owner, `/admin?range=30d&group=all`, `/admin/queue?group=all`.
- **Prasyarat:** Clerk + active AdminProfile sebelum semua reads.
- **Alur laporan:** range 30d (default) / 13m; kalender Asia/Jakarta, 13m =
  bulan berjalan + 12 sebelumnya. Empat metrik: tayangan publik, Brief dibuat,
  MAKE dibuat, order dibayar.
- **Sumber bisnis:** B2BInquiry.createdAt, CustomPrintRequest.createdAt,
  Order.paidAt; status order yang maju tetap dihitung.
- **Operasional:** status counts/aktivitas createdAt terpisah. Queue
  deduplicate, shipping exceptions lalu oldest; group all/inquiries/custom-print/orders
  difilter sebelum limit 50, total sebelum limit. Lima prioritas Overview tanpa filter.
- **Traffic:** AnalyticsDailyPageView aggregate; sources landing-only,
  device/country/route. Collection off default, angka perkiraan.
- **Exception:** bisnis/traffic independen; query gagal -> bagian unavailable,
  bagian lain tetap tampil; unavailable bukan nol. Overview/queue mempunyai
  unavailable state sendiri.
- **Hasil:** read projection/link detail berizin; group dipertahankan saat
  range berubah dan sebaliknya; laporan tanpa contact/file/provider JSON.
- **Navigasi (revisi lokal 2026-10-01):** mulai `lg`, toggle paling bawah pada
  footer sidebar mengubah lebar 13.25rem menjadi rail 4rem. Logo/footer tetap
  terlihat, daftar menu menggulir sendiri; fokus tombol bertahan setelah toggle.
  Logo penuh Horizontal light dan simbol biru resmi memakai putih, tinggi
  visual simbol sekitar 24px dan posisi selaras. Label aksesibel dan tooltip
  fokus/hover tetap tersedia. Situs publik berada di header kanan desktop
  sebelum role/Keluar dan menuju `/` pada tab yang sama. Default terbuka;
  preferensi lokal browser bertahan lintas route/reload. Mobile memakai logo
  penuh versi terang serta disclosure yang sama dengan Situs publik di dalamnya;
  ini tidak memberi permission tambahan. Visual shell revisi ACCEPTED_OWNER_LOCAL pada 2026-10-01 setelah tinjauan Overview Admin aktual.
- **Batas queue:** payment-event exceptions tidak masuk sampai ada lifecycle
  penyelesaian server yang otoritatif; alert stok tidak masuk sampai ambang dan
  tindakan disepakati. Shipping EXCEPTION tetap termasuk karena statusnya nyata.

#### UC-OWNER-PRICING-01 — Activate Approved Pricing v1

- **Actor/route:** Owner, `/admin/pricing`.
- **Prasyarat:** PRICING_RULE_ACTIVATE, confirmation dan PER_UNIT/AGGREGATE eksplisit.
- **Alur:** baca owner-approved v1/versioned definition, aktivasi melalui
  development guard; snapshot lama tetap merujuk versi semula.
- **Exception:** Admin tidak activate; quantity tidak dipilih diam-diam.
- **Hasil:** active version; aktivasi development bukan produksi/provider activation.

### 8. Traceability keputusan aktif

| Ketentuan | Sumber penjelas |
| --- | --- |
| 30 menit / 24 jam / 7 hari; refund dan file 14/60/90 | [Phase 2](../backend/phase-2-closure-decisions.md), [data lifecycle](NIUVA_Domain_Data_Model.md#5-lifecycle-dan-invariants). |
| DTO/enum/error/idempotency/upload | [API Contract](NIUVA_API_Contract.md). |
| Review -> estimate -> quote -> payable order | [Technical Sequence](NIUVA_Technical_Sequence_Diagrams.md#4-make-review-estimasi-dan-quote). |
| UI dan route | [UI Flow](NIUVA_UI_Flow_Wireframes.md). |
| Analytics / privacy gates | [Architecture](NIUVA_System_Architecture.md#5-analytics-dan-overview). |

### 9. Keputusan Owner dan input terbuka

Sumber bagian ini adalah keputusan Owner dalam diskusi dan instruksi implementasi
2026-09-30. Bagian ini mencatat hasil diskusi; tidak menetapkan keputusan baru.
PRD/Tech Design dan kontrak lifecycle tetap authority untuk perilaku sistem.
Kebijakan operasional di bawah tidak berarti timer SLA atau delivery provider
telah tersedia dalam runtime.

| Topik | Keputusan sesi / status implementasi |
| --- | --- |
| MAKE | Konfirmasi penerimaan maksimal satu hari kerja; estimasi waktu quote diberikan setelah kelengkapan dan kompleksitas ditinjau. Tidak ada janji durasi universal untuk quote final. Definisi kalender/jam kerja dan pengukuran SLA belum menjadi kontrak runtime. |
| B2B | Konfirmasi penerimaan saja, tanpa SLA respons yang dijanjikan. ACCEPTED proposal tetap tindak lanjut manual. |
| Payment-event exception | **EXCLUDED_UNTIL_LIFECYCLE** pada queue, sesuai keputusan Owner dan runtime. Lifecycle penyelesaian/acknowledgment tetap pekerjaan lanjutan sebelum dapat ditampilkan. Lihat [spec queue](../backend/SPEC-action-queue.md#batas-payment-dan-stock). |
| Alert stok | **EXCLUDED_UNTIL_POLICY** pada queue. Ambang, tingkat prioritas dan tindakan operator masih input Owner untuk fitur lanjutan. Stock ledger/reservation saat ini tetap berlaku. |
| Analytics | Tetap MVP, default mati. Produksi memerlukan pemberitahuan privasi Owner/legal dan bukti pembatasan laju edge; tidak ada aktivasi pada revisi ini. |
| WhatsApp | Roadmap di luar runtime. Preferensi Meta Cloud API langsung dan nomor bisnis publik Niuva sebagai sender, bergantung eligibility. Pesan transaksional saat submit Brief/MAKE, reference ID saja, tanpa file/link privat/token atau marketing. Opt-in opsional terpisah per request; request tetap berhasil tanpa consent. Satu retry untuk failure sementara; failure persisten nantinya terlihat pada request/queue/detail yang sama, tanpa membatalkan submit. Template, eligibility dan implementasi idempotency/delivery tetap gate lanjutan. |
| Provider | Biteship/Midtrans tetap ditunda aktivasi/smoke-nya sesuai keputusan Owner; kesiapan adapter lokal bukan aktivasi provider. |
| Visual Admin | Sidebar dapat dilipat diimplementasikan dalam checkout kerja. Owner menerima visual shell pada Overview Admin lokal pada 2026-10-01 (**ACCEPTED_OWNER_LOCAL**). |

Input yang belum mempunyai sumber final:

| Input terbuka | Pemilik / evidence yang dibutuhkan |
| --- | --- |
| Retensi legal/accounting per kategori record | Owner bersama akuntan/penasihat legal: kategori, dasar dan angka durasi. Lifecycle binary 14/60/90 hari serta retensi agregat analytics 13 bulan sudah diputuskan dan berbeda dari record finansial. |
| Biodata legal perusahaan | Owner: identitas legal, alamat dan kontak bisnis resmi serta data usaha untuk invoice/provider/klaim publik. Jangan memakai data sintetis. |
| Fakta studi kasus | Owner/sumber proyek: peran, tahun, deliverable dan hasil yang belum terverifikasi. Nama/logo yang sudah CONFIRMED dalam [dossier kurasi](../content/niuva-content-curation-dossier.md) tidak dibuka ulang; fakta hasil tidak boleh dikarang. |

Kalibrasi kisaran estimasi, evidence perangkat fisik/AT, provider/staging dan
produksi tetap gate masing-masing. Persetujuan kebijakan diskusi tidak menjadi
bukti gate teknis atau aktivasi produksi telah lulus.

## Lampiran — Usulan dan model konseptual lama

### A.1 Kandidat di luar MVP

Wishlist, edit profil, CRUD alamat tersimpan, shared-company account,
proposal-to-order otomatis, database cart, unique visitors/conversion dan
REST Admin terpisah tetap kandidat. Tidak menambah UC ID; UC-PUB-SHOP-02 kini
menjelaskan Add Product to Cart.

### A.2 Perubahan terhadap v0.2

“Open Validation” lama bukan status keputusan aktif. Stack, route, reservation,
state ownership, quote TTL, binary retention, timezone analytics dan hubungan
estimate/quote mempunyai sumber aktif. Legal/accounting retention, fakta/izin
konten baru yang belum terverifikasi, provider/staging activation, analytics
edge dan Owner/legal privacy review tetap mengikuti authority masing-masing.
Nama/logo yang sudah CONFIRMED pada dossier tidak dibuka ulang.
