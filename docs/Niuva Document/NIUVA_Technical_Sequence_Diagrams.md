# NIUVA — Technical Sequence Diagrams

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

### 1. Boundary, locking dan replay

Route handler/Server Action -> auth/origin/schema/permission -> domain service
-> repository -> Prisma. Semua label operasi menunjuk inventory
[API](NIUVA_API_Contract.md); diagram bisnis pada
[Sequence](NIUVA_Sequence_Diagrams.md). Blok `critical` adalah transaksi
repository, bukan claim bahwa provider ikut dalam DB transaction.

| Boundary | Mekanisme aktual |
| --- | --- |
| Customer | Verified Google identity + database session; server ownership before reads/mutations. |
| Admin | Clerk + active AdminProfile; role database, permission service. |
| Checkout | Body idempotencyKey, scope checkout.retail, requestHash, replay TTL 24h; payment 30m terpisah. |
| Quote/proposal | State/version/ownership + order terikat menangani replay; tidak ada required Idempotency-Key header. |
| Webhook | Unique eventFingerprint + locked attempt/order dan variant; event outcome persisted. |
| Upload | Scoped FILE_UPLOAD token hash/expiry 10m; confirm status transition, tidak universal replay. |
| Provider uncertain | Persisted reference/handoff + reconciliation, jangan auto-create dua kali. |

### 2. File privat

UC-BRIEF-01, UC-MAKE-01, UC-MAKE-02.

```mermaid
sequenceDiagram
    participant UI as Browser
    participant H as Upload route<br/>handlers
    participant S as UploadService
    participant DB as StoredFile<br/>repository
    participant R2 as Private R2
    UI->>H: POST intents / name, MIME, size
    H->>S: Bounded JSON / origin / optional Customer ID
    S->>DB: PENDING + owner + FILE_UPLOAD hash/expiry 10m
    S->>R2: Create signed upload URL
    S-->>UI: 201 fileId, uploadToken, URL, headers, expiresAt
    UI->>R2: PUT binary langsung
    UI->>H: POST confirm / fileId, uploadToken
    H->>S: Token scope/hash/expiry dan PENDING
    S->>R2: HEAD object metadata
    R2-->>S: Size / MIME
    alt Metadata cocok
        S->>DB: Compare-and-set UPLOADED
        S-->>UI: 200 fileId / UPLOADED
    else Missing atau mismatch
        S->>DB: REJECTED
        S->>R2: Reject cleanup object
        S-->>UI: UPLOAD_REJECTED
    end
    Note over UI,DB: Submit/append kemudian recheck ownership dan attach VERIFIED atomik
```

Extension/MIME allowlist, 100 MiB CAD/model, foto 10 MiB. Confirm tidak berarti
operator telah memeriksa geometri. Append model hanya REFERENCE_ONLY pada
SUBMITTED/UNDER_REVIEW sebelum review; STL memerlukan unitConfirmation. Download melalui owning-record permission
memberi signed URL lima menit. Cleanup 14/60/90 hari dengan hold/dispute/active
order; object removal lalu tombstone DELETED/audit. Tidak ada invented files API.

### 3. Brief dan B2B decision

UC-BRIEF-01, UC-BRIEF-02, UC-ADMIN-B2B-01.

```mermaid
sequenceDiagram
    participant UI as Brief / Account
    participant H as Route /<br/>Admin Action
    participant S as Inquiry /<br/>B2BQuote services
    participant DB as Prisma
    participant N as Notification<br/>adapter
    UI->>H: POST project-brief
    H->>S: Customer context + validated fields
    S->>S: Non-IDEA reference required / file rules
    critical Persist inquiry
        S->>DB: Recheck UPLOADED owned unattached files
        S->>DB: NEW + reference + VERIFIED file links
    end
    S->>N: Notify setelah persist
    S-->>UI: 201 inquiryId / referenceNumber
    H->>S: sendB2BQuoteAction / scope, costs, validUntil
    S->>DB: Lock inquiry / new proposal version SENT
    UI->>H: Account decision ACCEPTED atau DECLINED
    H->>S: requireCustomer + IDs / strict decision
    critical Decide latest proposal
        S->>DB: Lock inquiry / check owner + latest quote
        S->>DB: SENT + validUntil atau same-decision replay
        S->>DB: status + decidedByCustomerId + decidedAt
    end
    S-->>UI: 200 id / version / status
    Note over S,DB: ACCEPTED memerlukan follow-up manual<br/>tanpa order/payment
```

Field wajib Brief sesuai [API bagian 5](NIUVA_API_Contract.md#5-brief-make-simulasi-dan-quote).
validUntil proposal berasal tanggal operator, akhir hari Jakarta, bukan quote
MAKE TTL tujuh hari. Same decision replay tidak membuat proposal versi baru.

### 4. MAKE review, estimasi dan quote

UC-MAKE-01, UC-ADMIN-MAKE-01, UC-MAKE-02.

#### 4.1 Submit dan production estimate

```mermaid
sequenceDiagram
    participant UI as MAKE / Admin
    participant H as Routes /<br/>Server Actions
    participant S as Request / Estimate<br/>Quote services
    participant DB as Prisma
    UI->>H: Optional Customer preview / per-unit slicer
    H->>S: Customer + UPLOADED owned mesh
    S->>DB: Eligible single active PER_UNIT rule
    S-->>UI: READY advisory atau REVIEW_REQUIRED
    UI->>H: POST requests / mode + fields + files
    H->>S: Validated input + Customer context
    S->>DB: Recompute preview / SUBMITTED + file VERIFIED links
    H->>S: recordCustomPrintReviewAction
    S->>DB: Verified model / review fields / QUOTE_READY
    H->>S: publishCustomPrintEstimateAction
    critical Publish estimate versi baru
        S->>DB: Lock request / latest review / active Pricing v1
        S->>S: Decimal baseline + named additional costs / 100%-130%
        S->>DB: Source snapshot + operator/time + next version
    end
    H->>S: createQuoteDraftAction
    S->>DB: Latest estimate wajib untuk owned request
    S->>S: Match reviewUpdatedAt, rule, filament, material, weight, duration, qty
    alt Source cocok dan range konsisten
        S->>DB: Draft quote / estimateId / lowerRp + snapshot
        H->>S: sendQuoteAction
        S->>DB: Immutable SENT / sentAt + expiresAt 7 hari
    else Source berubah
        S-->>UI: QUOTE_NOT_READY / publish estimasi baru
    end
```

Biaya tambahan max 20, name 2–80 chars, amountRp integer string positif.
`noAdditionalCosts` harus cocok dengan daftar kosong. Rule aktif/versioned dan
quantity semantics eksplisit; label `calibrated:false` menunjukkan belum ada
kalibrasi riwayat pekerjaan. Quote memakai lowerRp dan memeriksa
lower/upper/additional subtotal/snapshot hasil Pricing v1.

#### 4.2 Account acceptance dan payment continuation

```mermaid
sequenceDiagram
    participant UI as Account MAKE
    participant H as Quote decision<br/>handler
    participant Q as QuoteService
    participant DB as Quote / Request /<br/>Order repository
    participant MT as Midtrans
    UI->>H: POST decision / accept
    H->>H: Origin, session, strict enum, owned quote
    H->>Q: accept quoteId + customerId
    Q->>DB: Read quote, latest version, expiry, frozen calculation
    critical acceptAndCreatePayableOrder
        Q->>DB: Lock quote/request / recheck owner, state, version, expiry
        alt Sudah accepted / linked order
            DB-->>Q: REPLAY existing order
        else Latest SENT valid
            Q->>DB: Quote ACCEPTED + request APPROVED
            Q->>DB: Custom WAITING_PAYMENT order + snapshot item
            DB-->>Q: CREATED order
        end
    end
    Q->>DB: Prepare payment continuation / attempt deadline 24h
    alt Persisted handoff tersedia
        DB-->>Q: Payment existing
    else Attempt baru dan dapat dibuat
        Q->>MT: Create payment di luar transaksi
        MT-->>Q: Token / redirect
        Q->>DB: Persist handoff dan expected deadline
    end
    Q-->>H: Service result
    H-->>UI: 200 result / future payment via verified webhook
```

Acceptance revalidasi frozen quote calculation; source matching latest estimate
berada pada draft creation. Perubahan source sebelum draft memerlukan estimasi
baru, bukan perubahan diam-diam pada SENT snapshot. Legacy token acceptance
hanya untuk request unclaimed. Expired/superseded/opposite decision reject.
Provider uncertainty bukan izin automatic retry-create.

### 5. Retail checkout

UC-CART-01, UC-CHECKOUT-01.

```mermaid
sequenceDiagram
    participant UI as Cart / Checkout<br/>browser
    participant H as Checkout handler
    participant S as CheckoutService
    participant Ship as Retail rate service<br/>Biteship
    participant DB as Idempotency /<br/>Checkout<br/>repository
    participant MT as Midtrans
    UI->>H: POST items, address, shippingOptionId, body key
    H->>S: requireCustomer / bounded schema / session email-name
    S->>DB: Reserve key + effective requestHash / scope / 24h
    alt Replay
        DB-->>S: Persisted order / payment recovery
        S-->>UI: 200 REPLAY / original payment deadline
    else Key conflict
        S-->>UI: 409 CONFLICT
    else New checkout
        S->>Ship: Re-read rate / catalog package before DB transaction
        Ship-->>S: Quote + catalog fingerprint
        critical createCheckoutTransaction
            S->>DB: Lock variant rows / read active published catalog
            S->>DB: Compare fingerprint / stock / Decimal totals
            S->>DB: Order + item + address + rate snapshot
            S->>DB: ACTIVE reservations + PENDING attempt / 30m
            DB-->>S: Committed payable retail order
        end
        S->>MT: Create Snap after commit / persisted expiry
        MT-->>S: Handoff / provider expiry verification
        S->>DB: Store handoff + complete idempotency result
        S-->>UI: 201 CREATED
    end
```

Tidak ada read Cart database atau cart API. Server quantities berasal items
payload tetapi harga/stock/package authoritative berasal catalog terkunci.
Jika provider gagal/ambigu, persisted reference/attempt memerlukan recovery;
TTL key dan commercial expiry tidak ditukar.

### 6. Midtrans webhook dan inventory

UC-ORDER-C-01, UC-ADMIN-PRODUCT-01, UC-ADMIN-ORDER-01.

```mermaid
sequenceDiagram
    participant MT as Midtrans
    participant H as Webhook handler
    participant S as PaymentWebhook<br/>Service
    participant DB as Webhook repository<br/>Prisma
    MT->>H: Notification JSON
    H->>S: Max 64KiB / parse notification
    S->>S: Verify signature / event fingerprint
    critical processMidtransWebhook
        S->>DB: Insert minimized PaymentEvent / unique fingerprint
        alt Duplicate
            DB-->>S: DUPLICATE tanpa perubahan ulang
        else New event
            S->>DB: Lock PaymentAttempt by providerOrderId dan Order
            S->>DB: Check amount, transaction reference, status, expiry
            alt Payable settlement ORDER_TOTAL
                S->>DB: Retail lock variant / consume reservation / movement once
                S->>DB: Attempt SETTLED + Order PAID + paidAt
            else Custom shipping settlement
                S->>DB: Attempt SETTLED + Order READY_TO_SHIP
            else Failed atau expired payable
                S->>DB: Terminal attempt / cancel sah / release retail
            else Late atau nonpayable settlement
                S->>DB: Keep cancelled / full-refund exception / no stock consume
            else Mismatch, unknown atau stale
                S->>DB: Catat outcome tanpa mutasi paid
            end
            S->>DB: Finalize PaymentEvent processingResult
        end
    end
    S->>S: Audit sesudah persist bila bukan duplicate
    S-->>H: Outcome atau verification error
    H-->>MT: 200 ok/outcome atau 422 mismatch
```

Signature diverifikasi server; handler tidak melakukan external status-API
fetch tambahan. Invalid signature tidak mencapai transaction. Amount mismatch/
unknown/stale outcome dicatat sesuai repository; tidak dianggap PAID.
Retail consumption memakai unique reservationId movement; custom payments
tanpa retail reservation. Browser callback tidak hadir dalam transaksi.

### 7. Final measured custom shipping

UC-ADMIN-ORDER-01, UC-ORDER-C-01.

```mermaid
sequenceDiagram
    participant A as Admin<br/>Server Action
    participant S as ShippingService
    participant DB as Order / Shipment<br/>Attempt
    participant B as Biteship
    participant M as Midtrans
    participant W as Payment webhook<br/>service
    A->>S: Final dimensions/weight dan address / FINISHING_QC
    S->>B: Rate final package
    B-->>S: Authoritative rate
    S->>DB: Persist measurements, rate, pending attempt 24h
    S->>DB: WAITING_SHIPPING_PAYMENT
    S->>M: Create payment setelah transaksi
    M-->>S: Handoff atau ambiguous result
    S->>DB: Save handoff bila verified
    Note over S,DB: Pending ambiguous menunggu rekonsiliasi<br/>tanpa auto duplicate create
    M->>W: Notification / server signature verification
    W->>DB: Verified payment/order transaction
    DB-->>W: SETTLED / READY_TO_SHIP
    W-->>M: 200 outcome
    A->>S: Record courier / tracking + fulfillment transition
    S->>DB: Shipment / SHIPPED
```

Diagram menyingkat webhook pada bagian 6.
Rough account rate/paket perkiraan tidak mengisi final measurements.
Terminal replacement memakai referensi baru sesuai
[technical closure](../backend/phase-3-technical-closure.md), tanpa melanjutkan
expired attempt. Existing PENDING dengan hasil hilang/deadline konflik gagal aman.

### 8. Analytics collection, retention dan read

UC-ADMIN-OPS-01 mencakup laporan; collect dan cron adalah supporting operations.

#### 8.1 Collect dan retention

```mermaid
sequenceDiagram
    participant UI as Public collector
    participant H as Analytics<br/>handlers
    participant R as Analytics<br/>repository
    participant DB as Daily aggregate
    participant CR as Cron
    opt Enabled dan allowlisted route
        UI->>H: POST routeGroup/source/landing / no credentials-referrer
        H->>H: Flag, origin, JSON, 512 bytes, rate, strict enum
        H->>R: Derived device/country + Jakarta day
        R->>DB: Composite-key upsert / viewCount increment
        H-->>UI: 204 atau independent collection error
    end
    Note over UI,H: Disabled endpoint 404<br/>halaman tetap berfungsi bila collect gagal
    CR->>H: GET retention / bearer CRON_SECRET
    H->>H: Timing-safe bearer validation
    H->>R: Oldest month in current 13m window
    R->>DB: Delete day before first month
    H-->>CR: 200 deleted / 401 / 503
```

Raw URL/query/token/IP/email/cookie/visitor ID tidak disimpan. Country header
2-letter/ZZ; IP hashed sementara hanya rate limiter. Retensi tidak menghapus
tabel bisnis. Schedule 03.00 WIB bukan bukti production execution.

#### 8.2 Admin independent report reads

```mermaid
sequenceDiagram
    participant P as Admin server page
    participant Auth as Clerk /<br/>AdminProfile
    participant S as AnalyticsService
    participant R as Analytics<br/>repository
    participant O as Dashboard / Queue<br/>services
    P->>Auth: Authorize active profile sebelum reads
    P->>S: parse range 30d/13m / default 30d
    S->>S: Asia-Jakarta window / current + 12 months
    par Business query
        S->>R: Inquiry.createdAt / Request.createdAt / Order.paidAt
        R-->>S: Business rows atau rejection
    and Traffic query
        S->>R: Daily aggregate in window
        R-->>S: Traffic rows atau rejection
    end
    S->>S: allSettled / project successful data / failure null
    P->>O: group validated / queue before limit50 / operational createdAt
    O-->>P: Status counts / activity / total / top five
    S-->>P: business and traffic independently / collectionEnabled
    P-->>P: Render partial unavailable<br/>preserve range and group
```

Success queries fill empty reporting periods with zero; failed query bukan
zero. Sources breakdown landing-only; countries/devices/routes semua views.
Operational counts dan createdAt activity tidak mengganti paidAt report.
Overview queue read failure mempunyai page unavailable state tersendiri.

Client AdminSidebarLayout menggunakan snapshot browser untuk memulihkan
`niuva.admin.sidebar.v1`; SSR default terbuka, kemudian hydration membaca
preferensi. Toggle menulis lokal dan memicu pembaruan client tanpa API/DB.
Storage ditolak mempunyai fallback memori. Disclosure mobile tetap independen.
Payment-event exceptions/alert stok tidak termasuk tujuh jenis signal queue
runtime; gate lanjutan ada pada [spec](../backend/SPEC-action-queue.md#batas-payment-dan-stock).

### 9. Pemetaan operations lain

| UC | Runtime |
| --- | --- |
| UC-ADMIN-PRODUCT-01 | Product/variant/media actions -> catalog service; adjustStockAction -> inventory lock/ledger/audit. |
| UC-ADMIN-PORTFOLIO-01 | Portfolio/media actions -> publication service/read model. |
| UC-OWNER-PRICING-01 | activatePricingRuleAction -> Owner permission/development guard/explicit semantics. |
| UC-AUTH-C-02 | POST logout -> same-origin/session revoke/cookie deletion. |
| UC-ACCOUNT-02 | Claim -> token scope/hash/unowned locked -> owner + revoke token transaction. |
| UC-ADMIN-OPS-01 | SSR /admin dan /admin/queue, bukan JSON dashboard endpoint baru. |

Rujukan sumber: [actions](../../src/app/admin/actions.ts),
[checkout repository](../../src/modules/checkout/repository.ts),
[webhook repository](../../src/modules/payment/webhook-repository.ts),
[estimate](../../src/modules/custom-print/estimate.ts),
[quote service](../../src/modules/quote/service.ts),
[analytics service](../../src/modules/analytics/service.ts).

## Lampiran — Usulan dan model konseptual lama

### A.1 Contoh REST/cart lama

Namespace `/api/v1`, generic Idempotency-Key middleware, database cart read,
payment endpoint terpisah, profile PATCH dan address CRUD bukan kontrak runtime.
Cuplikan lama berikut hanya model konseptual; padanannya adalah browser items
dan checkout body key pada bagian 5.

Cuplikan Mermaid v0.2 berikut **HISTORICAL / konseptual**, bukan operasi implementasi.
Cart API dan Cart Repository pada diagram ini tidak terdapat pada flow runtime.

```mermaid
sequenceDiagram
    actor Visitor
    participant UI as Shop UI
    participant API as Cart API
    participant Auth as Auth Guard
    participant App as Cart Application Service
    participant Cart as Cart Module
    participant Catalog as Catalog Module
    participant CartRepo as Cart Repository
    participant CatalogRepo as Catalog Repository
    participant DB as Primary Database

    Visitor->>UI: Add variant to cart
    UI->>API: POST /cart/items
    API->>Auth: Resolve optional Visitor/Customer cart context
    Auth-->>API: Cart context
    API->>API: Validate quantity shape

    API->>App: Add item command
    App->>Catalog: Validate ProductVariant purchasability
    Catalog->>CatalogRepo: Load variant
    CatalogRepo->>DB: SELECT variant/current price
    DB-->>CatalogRepo: Variant
    CatalogRepo-->>Catalog: Variant

    alt Variant unavailable
        Catalog-->>App: Not purchasable
        App-->>API: 409/422
        API-->>UI: Error
    else Variant purchasable
        Catalog-->>App: Valid variant + server price
        App->>Cart: Add/update item
        Cart->>CartRepo: Load active cart
        CartRepo->>DB: SELECT cart/items
        DB-->>CartRepo: Cart
        Cart->>CartRepo: Persist item
        CartRepo->>DB: INSERT/UPDATE cart item
        DB-->>CartRepo: Saved
        Cart-->>App: Updated cart
        App-->>API: Cart result
        API-->>UI: 200/201 cart
    end
```

### A.2 Penutupan klaim lama

“Upload pattern belum diputuskan”, “reservation belum baseline”, “payment/order
state mapping TBD” dan “latest estimate relation belum final” telah dijawab
implementasi dan closure contracts. Bagian utama menunjukkan transaksi/
permission/response aktual. Legal/accounting retention, provider activation,
calibration, publication/privacy approval dan edge evidence tetap terbuka.
