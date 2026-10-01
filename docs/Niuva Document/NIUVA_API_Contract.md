# NIUVA — API & Operation Contract Reference

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

### 1. Boundary dan response

Bagian utama adalah inventory **route handler, server page dan Server Action
yang sudah ada**. Ia menjelaskan runtime commit sumber, bukan memperkenalkan
API baru. [Technical Sequence](NIUVA_Technical_Sequence_Diagrams.md) menjelaskan
urutan transaksi. Semua nama field/enum tetap sesuai kode.

Handler JSON umum memakai [response helpers](../../src/lib/http/response.ts):
success adalah **objek langsung**, tanpa envelope data/meta buatan. Header
`x-correlation-id` ditambahkan. Error berbentuk:

```json
{
  "code": "VALIDATION_ERROR",
  "correlationId": "<correlation-id>",
  "error": "Data permintaan tidak valid.",
  "fields": { "<field>": "<message>" }
}
```

`fields` opsional. Contoh tersebut adalah bentuk, bukan response universal.
Analytics memakai respons tersendiri (`{error}` / empty body), auth memakai
redirect/cookie, Server Actions memakai AdminActionState.
Zod strict hanya diterapkan ketika schema memang strict; contoh tidak
menambah rejection aturan unknown keys pada schema yang melakukan strip.

| Error runtime umum | HTTP |
| --- | --- |
| INVALID_JSON | 400 |
| VALIDATION_ERROR / UPLOAD_REJECTED / PAYMENT_VERIFICATION_FAILED | 422 |
| UNAUTHORIZED | 401 |
| FORBIDDEN / ORIGIN_NOT_ALLOWED | 403 |
| NOT_FOUND | 404 |
| CONFLICT / OUT_OF_STOCK / INVALID_STATE_TRANSITION / QUOTE_NOT_READY / PRICING_RULE_NOT_APPROVED / PAYMENT_ALREADY_PROCESSED | 409 |
| REQUEST_TOO_LARGE | 413 |
| RATE_LIMITED | 429, Retry-After bila tersedia |
| AUTH_UNAVAILABLE / CUSTOMER_AUTH_UNAVAILABLE / PROVIDER_UNAVAILABLE / SHIPPING_PROVIDER_UNAVAILABLE / LOCAL_SETUP_DISABLED | 503 |
| INTERNAL_ERROR | 500 |

Sumber lengkap: [errors](../../src/modules/shared/errors.ts).
Mutation publik umumnya memeriksa same-origin, bounded JSON dan limiter sebelum
service. Webhook memakai signature provider; cron memakai bearer, bukan sesi.
Limiter proses bukan jaminan edge produksi.

### 2. Inventory route handler lengkap

| Method / runtime path | Authority / operasi | Sukses / source handler |
| --- | --- | --- |
| GET `/api/auth/google/start` | Google state/PKCE, safe returnTo | Redirect; [start](../../src/app/api/auth/google/start/route.ts). |
| GET `/api/auth/google/callback` | Verifikasi ID token, Customer/session | Redirect + cookie; [callback](../../src/app/api/auth/google/callback/route.ts). |
| POST `/api/auth/logout` | Same-origin, revoke current session | 204 tanpa body; [logout](../../src/app/api/auth/logout/route.ts). |
| POST `/api/account/claim` | Customer + valid unclaimed capability | 200 id/kind/reference; [claim](../../src/app/api/account/claim/route.ts). |
| POST `/api/account/inquiries/[id]/quotes/[quoteId]/decision` | Owned inquiry + latest valid B2B proposal | 200 id/version/status; [B2B decision](../../src/app/api/account/inquiries/[id]/quotes/[quoteId]/decision/route.ts). |
| POST `/api/account/make/[id]/model` | Customer owns request/file | 201 requestId; [account model](../../src/app/api/account/make/[id]/model/route.ts). |
| POST `/api/account/make/[id]/quotes/[quoteId]/decision` | Owned request/quote, QuoteService | 200 service result; [MAKE decision](../../src/app/api/account/make/[id]/quotes/[quoteId]/decision/route.ts). |
| POST `/api/account/make/[id]/rough-shipping` | Customer owns request | 200 AVAILABLE/PENDING; [rough shipping](../../src/app/api/account/make/[id]/rough-shipping/route.ts). |
| POST `/api/uploads/intents` | Upload capability, Customer ownership captured bila login | 201 file/upload fields; [intent](../../src/app/api/uploads/intents/route.ts). |
| POST `/api/uploads/confirm` | FILE_UPLOAD token, HEAD verification | 200 fileId/status UPLOADED; [confirm](../../src/app/api/uploads/confirm/route.ts). |
| POST `/api/project-brief` | Customer wajib, InquiryService | 201 inquiryId/referenceNumber; [Brief](../../src/app/api/project-brief/route.ts). |
| POST `/api/custom-print/requests` | Customer wajib, CustomPrintService | 201 requestId/referenceNumber/customerPreview opsional; [MAKE](../../src/app/api/custom-print/requests/route.ts). |
| POST `/api/custom-print/preview-estimate` | Customer + confirmed owned upload | 200 READY/REVIEW_REQUIRED; [preview](../../src/app/api/custom-print/preview-estimate/route.ts). |
| POST `/api/custom-print/requests/[token]/files` | Legacy unclaimed request token / upload ownership | 201 referenceNumber; [legacy file](../../src/app/api/custom-print/requests/[token]/files/route.ts). |
| POST `/api/quote/[token]/accept` | Legacy unclaimed latest quote token | 201 CREATED / 200 REPLAY; [token accept](../../src/app/api/quote/[token]/accept/route.ts). |
| POST `/api/quote/[token]/decline` | Legacy unclaimed quote token | 200 id/status; [token decline](../../src/app/api/quote/[token]/decline/route.ts). |
| POST `/api/shipping/rates` | Customer wajib, server catalog/package | 200 expiresAt/options; [retail rate](../../src/app/api/shipping/rates/route.ts). |
| POST `/api/checkout` | Customer wajib, items/key body | 201 CREATED / 200 REPLAY; [checkout](../../src/app/api/checkout/route.ts). |
| POST `/api/webhooks/midtrans` | Midtrans signature + persisted attempt validation | 200 ok/outcome atau error; [webhook](../../src/app/api/webhooks/midtrans/route.ts). |
| POST `/api/analytics/page-view` | Enabled flag + same-origin/bounded aggregate payload | 204 empty; [page view](../../src/app/api/analytics/page-view/route.ts). |
| GET `/api/analytics/retention` | Bearer CRON_SECRET | 200 deleted; [retention](../../src/app/api/analytics/retention/route.ts). |

Preview-only media handler dan demo action-queue tidak termasuk kontrak produk
MVP. Tidak ada JSON GET untuk account/catalog/Admin list/detail dalam baseline:
page SSR membaca repository/service secara langsung setelah guard yang relevan.

### 3. Account dan claim

| Operasi | Request dan response actual |
| --- | --- |
| Claim | Strict `{kind:"B2B_INQUIRY"\|"CUSTOM_PRINT_REQUEST",token}`; token 32–512 chars, max body 2 KiB, 5/min/process. Response `{id,kind,referenceNumber}`. Claim transactional + revoke token, email/company saja tidak cukup. |
| B2B decision | Strict `{decision:"ACCEPTED"\|"DECLINED"}`; IDs dari route, max 1 KiB, 5/min. Response `{id,version,status}`. Owner/latest/SENT/validUntil diperiksa; same decision replay, opposite/stale reject. ACCEPTED manual follow-up, tanpa order/payment. |
| MAKE model | `{fileId,unitConfirmation?}`; fileId UUID; unit enum MILLIMETER_CONFIRMED / OTHER_UNIT_NOTED / NEEDS_OPERATOR_HELP. requestId dari route, max 4 KiB, 5/min. Response `{requestId}`. Hanya REFERENCE_ONLY pada SUBMITTED/UNDER_REVIEW sebelum review; STL memerlukan unitConfirmation. |
| MAKE decision | Strict `{decision:"accept"\|"decline"}`; max 1 KiB, 5/min. Accept -> QuoteService result `{kind,orderId,orderNumber,orderAccessToken?,payment?,paymentAttemptId?,status?,totalRp?}`; decline -> `{id,status:"DECLINED"}`. Handler pass-through, selalu success 200. |
| Rough shipping | Strict `{postalCode,areaId?}`, postalCode 5 digits, areaId 2–80 chars. Max 1 KiB, 2 checks/10 menit per Customer/request; cache proses 10 menit. AVAILABLE berisi checkedAt/lowerRp/upperRp/package/destination/couriers; PENDING berisi message “Ongkir menyusul”. |

Account responses di atas memakai private/no-store pada detail mutations kecuali
claim yang mengikuti handler umum. Tidak ada Idempotency-Key header wajib pada
decision. Replay melalui status quote/proposal dan order terikat. Quote akun
berbeda enum decision dengan proposal B2B; kapitalisasi jangan disamakan.

Legacy request files mempunyai body `{fileId,unitConfirmation?}`, token dari
path. Token accept/decline tidak membaca body decision; operasi berada dalam
path dan ID diambil dari route-bound token. Accept response menurunkan
`orderAccessToken` menjadi string token, sedangkan account handler meneruskan
service result. Legacy quote/request akses gagal setelah record dimiliki.
Sumber: [access service](../../src/modules/custom-print/access-service.ts),
[customer work](../../src/modules/customer-work/repository.ts),
[quote](../../src/modules/quote/service.ts).

### 4. File privat

`POST /api/uploads/intents` menerima:

```json
{
  "originalName": "<filename.stl>",
  "mimeType": "model/stl",
  "sizeBytes": 104857600
}
```

Angka contoh adalah **batas**, bukan ukuran file contoh nyata. Nama 1–255,
MIME 1–120 chars, size positive integer max 100 MiB. Extension/MIME allowlist
STL/OBJ/3MF/STEP/STP/JPG/JPEG/PNG harus cocok; photo max 10 MiB. Body intent
4 KiB, limiter 10/min. Response 201:
`{expiresAt,fileId,requiredHeaders,uploadToken,uploadUrl}`.
URL/token FILE_UPLOAD berlaku 10 menit dan owner Customer bila session tersedia.
Browser PUT langsung ke R2 memakai required headers.

`POST /api/uploads/confirm` menerima `{fileId,uploadToken}` (UUID dan
32–512 chars); max 4 KiB, 20/min. Server memeriksa token/scope/expiry/hash dan
HEAD size/content type. Response `{fileId,status:"UPLOADED"}`.
Mismatch/missing object -> UPLOAD_REJECTED; stale token/status -> UNAUTHORIZED.
Confirm tidak set VERIFIED. Submit/append memeriksa ownership/unattached file,
lalu set VERIFIED + join atomik.

Legacy append juga hanya REFERENCE_ONLY SUBMITTED/UNDER_REVIEW sebelum review dan STL memerlukan unitConfirmation.

Model/CAD/reference bukan URL publik. Download melalui authorized owning
record/Admin action menghasilkan signed URL 5 menit, tidak ada invented
`GET /api/files/...` handler. Lifecycle binary 14/60/90 hari, legal hold/
dispute/active order menunda deletion. Retention finansial/audit terpisah.
Sumber: [upload service](../../src/modules/files/upload-service.ts),
[privacy](../../src/modules/policy/privacy.ts).

### 5. Brief, MAKE, simulasi dan quote

#### 5.1 Project Brief

Body `/api/project-brief` mengikuti
[schema](../../src/modules/inquiry/schema.ts):

- Wajib name, email, phone, projectGoal, currentStage, description,
  targetQuantity (teks), confidentialityAck true.
- Stage IDEA/SKETCH/CAD/PROTOTYPE/EXISTING_PRODUCT; selain IDEA wajib file
  atau referenceLink. IDs attachmentFileIds UUID unik, minimal satu bila ada.
- Opsional company/budgetRange/preferredService/targetDeadline (ISO date);
  referenceLink HTTP/HTTPS; service salah satu empat slug runtime.
- Max body 32 KiB, 5/min. Email/owner disimpan dari session.
- 201 `{inquiryId,referenceNumber}` setelah NEW/attachments atomik.
  Notification setelah persist; submit tidak memerlukan proposal/quote.

#### 5.2 MAKE intake

Body `/api/custom-print/requests` mengikuti
[schema](../../src/modules/custom-print/schema.ts):

| Bagian | Field / validasi |
| --- | --- |
| Common wajib | customerName/customerEmail/customerPhone, materialRequested nonkosong, quantity positive integer. Email effective mengikuti session service; customerName tetap field kontak form. |
| Common opsional | colorRequested, faculty, productInterest (default CUSTOM_UNSPECIFIED atau ID custom-flow yang diizinkan), referenceLink HTTPS max 2048, requestedSize, targetDeadline ISO date, unitConfirmation sesuai mode. |
| MODEL_READY | intakeMode MODEL_READY (default pada cabang ini), fileIds UUID minimal satu/unik, notes opsional, customerPreviewInput opsional. Service mengharuskan model extension; STL memerlukan unitConfirmation. |
| REFERENCE_ONLY | intakeMode REFERENCE_ONLY, notes wajib, fileIds 0–1/unik (default empty), unitConfirmation tidak diisi; foto/link sebagai referensi. |

Max body 32 KiB, 5/min. Response 201
`{requestId,referenceNumber,customerPreview?}`. customerPreview bila tersimpan
memuat materialSubtotalRp/machineSubtotalRp/finalTotalRp sebagai string.
Snapshot source/definition tetap tersimpan di server. Request baru account-owned.

#### 5.3 Simulasi Customer

Strict request `/api/custom-print/preview-estimate`:

```json
{
  "fileId": "<uuid>",
  "materialRequested": "PLA",
  "quantity": 1,
  "customerPreviewInput": {
    "source": "CUSTOMER_DECLARED_SLICER",
    "weightGramsPerUnit": "<positive-decimal-string>",
    "printDurationSecondsPerUnit": 1
  }
}
```

Placeholders menunjukkan tipe. Weight positive Decimal string max enam
desimal, duration positive int. Customer owns UPLOADED/unattached file;
STL/OBJ/3MF, PLA/ABS dan tepat satu eligible active PER_UNIT Pricing v1.
Max 8 KiB, 15/min. 200 READY berisi materialSubtotalRp/machineSubtotalRp/
finalTotalRp/ruleVersion; atau REVIEW_REQUIRED tanpa harga. Missing file ->
NOT_FOUND, attached/notready -> CONFLICT. Server menghitung ulang saat submit.
Label “Estimasi awal, bukan harga final”; tidak melakukan slicing.

#### 5.4 Review -> estimate -> quote -> order

Review dan harga operator menggunakan Server Actions, bukan endpoint baru:

- Review menyimpan verifiedWeightG Decimal, printDurationSeconds, material,
  quantity/configuration, Admin/time.
- Estimate publish memerlukan verified model, reviewed request QUOTE_READY
  atau QUOTE_SENT, active Pricing v1 dan named additional costs atau explicit
  noAdditionalCosts. Snapshot versi memberikan range 100%–130%.
- Request Customer wajib latest estimate. Quote draft membandingkan source
  rule/material/filament/weight/duration/qty/reviewUpdatedAt; source berubah
  -> QUOTE_NOT_READY dan estimasi baru. Source/range tidak konsisten -> conflict.
- Runtime final quote mengambil lowerRp, check range dan Decimal recalculation.
  SENT immutable, expiresAt tujuh hari dari send.
- Account accept revalidasi frozen quote calculation/version/expiry/ownership,
  lalu atomik ACCEPTED/request APPROVED/payable custom order WAITING_PAYMENT.
  Payment preparation 24 jam dan Midtrans di luar transaksi.
- Replay membaca order/attempt/handoff yang tersedia; provider ambiguous
  tidak memicu create baru tanpa policy/reconciliation.

Sumber: [estimate](../../src/modules/custom-print/estimate.ts),
[quote](../../src/modules/quote/service.ts), [sequences](NIUVA_Technical_Sequence_Diagrams.md#4-make-review-estimasi-dan-quote).

### 6. Retail rates, checkout dan webhook

#### 6.1 Shipping rates

Strict body `/api/shipping/rates`:
`{destination:{postalCode,countryCode:"ID",biteshipAreaId?},items:[{variantId,quantity}]}`.
Postal 5 digits, area max 160 chars, 1–50 unique UUID variants, quantity positive
int. Country defaults ID. Max 8 KiB, 10/min, session required. Server catalog
revalidasi active/published dan physical package data; Biteship rate testing
advisory 5 menit. Response:

```text
{
  expiresAt,
  options: [{
    optionId, courierCode, courierName, serviceCode, serviceName,
    priceRp: string, etaText?: string
  }]
}
```

Missing data/provider unavailable fail closed. optionId opaque; checkout
mengambil ulang rate dan memeriksa catalog/package fingerprint.
Sumber: [rate service](../../src/modules/shipping/retail-rate-service.ts).

#### 6.2 Checkout body dan transaksi

```text
{
  address: {
    addressLine, biteshipAreaId?, city, countryCode?: "ID",
    district?, phone, postalCode, province, recipientName
  },
  customerEmail, customerName, customerPhone,
  idempotencyKey,
  items: [{variantId: UUID, quantity: positive integer}],
  shippingOptionId
}
```

Address text wajib nonkosong kecuali optional; country dua huruf default ID.
Email valid. Key 8–128 chars `[A-Za-z0-9._~-]+` pada **body**. Items 1–50
unique variants. Max 16 KiB, 5/min, Customer session; effective email/name dari
sesi, bukan browser. Tidak ada client total authoritative.

Service scope `checkout.retail` menyimpan requestHash dan replay 24 jam.
Same key/payload berbeda atau in-flight conflict -> 409. Replay tidak memperpanjang
payment. Revalidasi Biteship sebelum transaksi; lock variant, catalog fingerprint,
stock dan Decimal totals; transaksi Order/Items/Address/RateSnapshot/
StockReservations/PaymentAttempt 30 menit. Midtrans setelah commit.

201 CREATED body `{accessToken,kind,orderId,orderNumber,payment,paymentAttemptId,totalRp}`.
200 REPLAY menambah `status`. Payment handoff mengikuti provider result
`{provider?,redirectUrl?,token?}`. Header bukan tempat idempotencyKey.
Sumber: [checkout schema](../../src/modules/checkout/schema.ts),
[service](../../src/modules/checkout/service.ts), [transaction](../../src/modules/checkout/repository.ts).

#### 6.3 Verified webhook

`POST /api/webhooks/midtrans` membaca JSON bounded 64 KiB.
Parsed provider notification termasuk order_id, status_code, gross_amount,
signature_key, transaction_status, transaction_id/payment_type/fraud_status
sesuai [parser](../../src/modules/payment/midtrans.ts).
Service memeriksa signature server dan repository memeriksa persisted amount/
reference/status/deadline. **Handler ini tidak memanggil Midtrans status API
sebagai langkah tambahan.**

Transaksi: unique PaymentEvent fingerprint/minimized payload, lock attempt dan
order, status validation, transition payment/order, consume/release reservations
dan StockMovement. paidAt diset pada settlement ORDER_TOTAL, bukan custom
shipping payment. Event processingResult disimpan; audit service sesudah
persist. Return `{ok:true,outcome}` 200 untuk accepted outcome/duplicate,
AMOUNT_MISMATCH disimpan lalu service mengembalikan PAYMENT_VERIFICATION_FAILED 422.

Outcome repository: PROCESSED, DUPLICATE, UNKNOWN_PAYMENT, STALE,
AMOUNT_MISMATCH, LATE_SETTLEMENT_REFUND_REQUIRED,
PARTIAL_REFUND_REQUIRES_EXCEPTION. Outcome bukan tombol status browser.
Late/nonpayable settlement tidak reopen cancelled atau consume released stock,
harus full-refund exception. Partial refund bukan workflow MVP.

Sumber: [webhook service](../../src/modules/payment/webhook-service.ts),
[transaction](../../src/modules/payment/webhook-repository.ts).

### 7. Analytics

#### 7.1 POST /api/analytics/page-view

Strict payload:

```json
{ "routeGroup": "home", "source": "direct", "landing": true }
```

| Field | Nilai / aturan |
| --- | --- |
| routeGroup | home, services, service_detail, projects, project_detail, shop, product_detail, custom_print, custom_request, project_brief. |
| source | direct, internal, google, bing, instagram, facebook, youtube, tiktok, linkedin, other_referral. |
| landing | Boolean; jika false, source wajib internal. Unknown keys ditolak. |

Collector hanya dipasang bila NIUVA_ANALYTICS_ENABLED=true dan allowlisted
pathname; endpoint juga mati default. Fetch credentials omit/referrerPolicy
no-referrer; tanpa URL/query/token/IP/email/cookie/visitor ID dalam payload.
UA diturunkan ke desktop/tablet/mobile/unknown, country platform 2 huruf atau
ZZ. IP hashed transient in-memory per-process limiter, tidak persistent.
Atomic daily upsert memakai tanggal Asia/Jakarta dan composite key.

| Response | Bentuk actual |
| --- | --- |
| 404 disabled | Empty body. |
| 403 origin | `{error:"Origin tidak diizinkan."}`. |
| 415 non-JSON content type | `{error:"Content-Type tidak valid."}`. |
| 413 lebih dari 512 bytes (header atau streamed body) | `{error:"Payload terlalu besar."}`. |
| 429 limit 60/min/hash/process | `{error:"Terlalu banyak permintaan."}` + Retry-After. |
| 400 unreadable body / schema | `{error:"Payload tidak valid."}`. |
| 400 invalid JSON | `{error:"JSON tidak valid."}`. |
| 204 upsert berhasil | Empty body. |
| 503 database failure | `{error:"Pengukuran sementara tidak tersedia."}`. |

Semua response Cache-Control no-store; tidak memakai apiError envelope.
Sumber: [contract](../../src/modules/analytics/contract.ts),
[handler](../../src/app/api/analytics/page-view/route.ts).

#### 7.2 GET /api/analytics/retention

Request header `Authorization: Bearer <CRON_SECRET>`; secret berasal konfigurasi,
bukan Customer/Admin session. Tidak ada payload/query retention custom.

| Response | Bentuk actual |
| --- | --- |
| 503 CRON_SECRET belum tersedia | Empty body. |
| 401 bearer invalid | Empty body, comparison timing-safe. |
| 200 deletion | `{deleted: number}`. |
| 503 DB/service error | `{error:"Retensi belum dapat dijalankan."}`. |

Semua no-store. Delete sebelum awal bulan tertua 13m (bulan berjalan + 12
sebelumnya), schedule harian 20.00 UTC/03.00 WIB. Tidak menghapus data bisnis.

#### 7.3 Read report / activation gate

Tidak ada dashboard JSON endpoint baru. Admin SSR setelah active profile
membaca traffic/business independen. Range 30d/13m, Asia/Jakarta;
Brief.createdAt, MAKE.createdAt, Order.paidAt. Operational createdAt/status
counts terpisah; queue group sebelum limit50. Unavailable tidak nol.
Sources landing-only; tanpa unique visitors/visits/conversions/order attribution.
Collection off default. Owner/legal privacy notice dan edge/WAF proof wajib
sebelum aktivasi produksi; draft
[notice](../frontend/analytics-privacy-notice-draft.md) bukan policy approved.

### 8. Server Actions Admin dan reads layar

Seluruh action berikut terdapat pada [actions](../../src/app/admin/actions.ts).
Input FormData dinormalisasi action, kemudian schema/permission/state dicek
service. Result `{status:"idle"|"success"|"error",message?,link?}`.

| Page / kemampuan | Action nyata |
| --- | --- |
| Product/variant/media | updateProductAction, updateVariantAction, replaceProductMediaAction. |
| Stock detail | adjustStockAction; variantId/delta/reason, ledger transaction. |
| Inquiry | transitionInquiryAction, sendB2BQuoteAction. |
| MAKE review/estimate | recordCustomPrintReviewAction, publishCustomPrintEstimateAction, saveEstimatedCustomPackageAction. |
| MAKE quote/token | createQuoteDraftAction, sendQuoteAction, reissueQuoteTokenAction, reissueCustomPrintRequestTokenAction. |
| Order/fulfillment | transitionOrderAction, reissueOrderTokenAction. |
| Custom shipping | saveCustomShippingAddressAction, createCustomShippingPaymentAction. |
| Shipment | recordShipmentMetadataAction. |
| File download | downloadPrivateFileAction (ownerType/ownerId/fileId -> signed 5m). |
| Portfolio/media | updatePortfolioAction, replacePortfolioMediaAction. |
| Pricing Owner | activatePricingRuleAction; confirmation dan quantitySemantics, development guard. |

Tidak ada generic CRUD pricing UI atau profile provision otomatis.
Routine Admin permissions mencakup catalog/review/quote/inquiry/stock/fulfill/
shipping/portfolio/audit/pending-cancel. Owner tambahan finance/admin/policy/
pricing sesuai [permissions](../../src/modules/admin/permissions.ts).
Paid cancellation generic tetap fail closed sampai verified full refund.

| Page read | Operasi server / UC |
| --- | --- |
| Public catalog/projects/services | Published read model; public UC register. |
| `/account` dan detail inquiry/MAKE/order | requireCustomer + owned repository reads; UC-ACCOUNT-01/B2B/MAKE/ORDER. |
| `/admin` | Active AdminProfile -> DashboardService, AnalyticsService, ActionQueueService; UC-ADMIN-OPS-01. |
| `/admin/queue` | Group all/inquiries/custom-print/orders, filter before 50, total before limit; UC-ADMIN-OPS-01. |
| Admin lists/details | Active profile -> scoped services/repositories, named permission mutations; UC-ADMIN-* dan UC-OWNER-PRICING-01. |

Full layar map: [Wireframes](NIUVA_UI_Flow_Wireframes.md#8-matriks-layar-dan-operasi).

Preferensi sidebar memakai `niuva.admin.sidebar.v1` lokal (`expanded`/`collapsed`),
bukan API atau field AdminProfile. Toggle tidak membuat mutation server.
Queue mengembalikan tujuh jenis signal runtime; payment-event exceptions dan
alert stok dikecualikan menurut [spec queue](../backend/SPEC-action-queue.md#batas-payment-dan-stock).
WhatsApp/consent/delivery/retry yang dibahas Owner adalah roadmap, belum ada
payload consent atau endpoint WhatsApp runtime pada inventory ini.

## Lampiran — Usulan dan model konseptual lama

### A.1 REST namespace lama

`/api/v1` adalah namespace **konseptual v0.2**, tidak ada route runtime.
Contoh berikut dipertahankan untuk memahami desain awal:

| Contoh lama | Padanan runtime / status |
| --- | --- |
| GET `/api/v1/products` / `/portfolio` | Published SSR pages, bukan handler JSON. |
| GET/PATCH `/api/v1/me` | SSR read-only account; PATCH kandidat di luar MVP. |
| CRUD `/api/v1/me/addresses` | Address book kandidat; checkout OrderAddress snapshot sudah ada. |
| CRUD `/api/v1/cart/items` | Cart browser; rate/checkout items payload, tanpa DB cart. |
| POST `/api/v1/checkout` | POST /api/checkout, key pada body. |
| POST `/api/v1/payments` | Tidak ada endpoint terpisah; checkout/quote/shipping service menyiapkan attempt. |
| POST `/api/v1/quotes/:id/accept` | Account decision atau legacy token accept, tanpa generic required idempotency header. |
| CRUD `/api/v1/admin/*` | Server Actions Admin saat ini; REST facade belum disetujui. |

Contoh envelope v0.2 berikut **HISTORICAL / konseptual**. Runtime success
mengembalikan objek langsung sebagaimana bagian 1, bukan envelope contoh ini.

```json
{
  "data": {
    "id": "resource-id"
  }
}
```

### A.2 Kontrak kandidat dan keputusan terbuka

Generic data/meta envelope, Idempotency-Key header universal, cursor/pagination
REST, CRUD profile/addresses/wishlist, webhook status-API fetch tambahan dan
OpenAPI spec generik hanya kandidat. Implementasi utama di atas menjadi acuan
nama field/response/enum saat membaca commit sumber.

Keputusan legal/accounting retention, provider onboarding/production, calibration,
fakta/izin konten baru yang belum terverifikasi, privacy approval dan edge gate
tetap pada authority pemiliknya. Nama/logo CONFIRMED tidak dibuka ulang.
API referensi ini tidak mengaktifkan env/provider atau mengubah kebijakan.
