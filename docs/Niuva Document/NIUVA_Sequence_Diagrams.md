# NIUVA — Sequence Diagrams

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

### 1. Level diagram

Diagram ini menjelaskan urutan aktor dan sistem. Rincian transaksi, locking,
DTO dan replay ada pada [Technical Sequence](NIUVA_Technical_Sequence_Diagrams.md)
dan [API](NIUVA_API_Contract.md). “Sistem” selalu berarti service server,
bukan authority browser.

### 2. Customer login dan claim

UC-AUTH-C-01, UC-ACCOUNT-01, UC-ACCOUNT-02.

```mermaid
sequenceDiagram
    actor C as Visitor / Customer
    participant UI as Login / Account
    participant Auth as Customer auth /<br/>work server
    participant G as Google
    participant DB as Customer /<br/>Session / Work
    C->>UI: Login untuk submit, rate atau checkout
    UI->>Auth: Google start / safe returnTo
    Auth->>G: State + PKCE
    G-->>Auth: Callback code / verified ID token
    Auth->>DB: Customer dan hashed session
    Auth-->>UI: Session cookie + safe route
    C->>UI: Claim legacy dengan private token
    UI->>Auth: Account claim / Customer session + private token
    Auth->>DB: Validate scope/hash/unowned + claim transaksi
    DB-->>Auth: Owned work / old token revoked
    Auth-->>UI: Claim result
    UI-->>C: Read-only account detail
```

Clerk bukan Customer login. Profile edit dan saved address CRUD belum ada.
Legacy claim bukan lookup berdasarkan email saja.

### 3. DEVELOP — Brief sampai keputusan manual

UC-BRIEF-01, UC-BRIEF-02, UC-ADMIN-B2B-01.

```mermaid
sequenceDiagram
    actor C as Customer
    participant UI as Brief / Account
    participant S as Inquiry /<br/>Proposal services
    participant DB as Inquiry / File /<br/>B2BQuote
    actor A as Admin
    C->>UI: Isi mandatory fields / service editable
    UI->>S: POST project-brief / Customer session
    S->>DB: NEW + reference + file links VERIFIED atomik
    DB-->>S: Inquiry ID / reference
    S-->>UI: Inquiry ID / reference
    A->>S: Review dan sendB2BQuoteAction
    S->>DB: Proposal versi baru SENT + validUntil
    C->>UI: Baca proposal latest
    UI->>S: Decision ACCEPTED atau DECLINED
    S->>DB: Validate owner/version/expiry + catat keputusan
    S-->>UI: Keputusan tersimpan
    S-->>A: ACCEPTED perlu tindak lanjut manual
    Note over A,DB: Tanpa order atau invoice<br/>atau payment otomatis
```

### 4. MAKE — tiga tingkat biaya dan quote acceptance

UC-MAKE-01, UC-MAKE-02, UC-ADMIN-MAKE-01.

```mermaid
sequenceDiagram
    actor C as Customer
    participant UI as MAKE / Account
    participant S as MAKE / Estimate<br/>Quote services
    participant DB as Request / Review<br/>Estimate / Quote<br/>Order
    actor A as Operator
    participant P as Midtrans
    opt Mesh dan slicer per unit eligible
        C->>UI: Berat/durasi deklarasi Customer
        UI->>S: Preview estimate
        S-->>UI: Estimasi awal advisory / bukan harga final
    end
    UI->>S: Submit MODEL_READY atau REFERENCE_ONLY
    S->>DB: SUBMITTED + owned files + preview snapshot opsional
    A->>S: Catat review slicer terverifikasi
    A->>S: Publish estimasi / active rule + additional costs
    S->>DB: Versi dan snapshot / range 100%-130%
    A->>S: Buat draft quote dari latest estimate
    S->>DB: Source match / snapshot / final lowerRp
    A->>S: Send immutable quote
    S->>DB: SENT / expiresAt 7 hari
    C->>UI: Accept latest valid quote
    UI->>S: Account decision accept
    S->>DB: Revalidasi dan atomik ACCEPTED + APPROVED + payable order
    DB-->>S: WAITING_PAYMENT order
    S->>DB: Prepare payment attempt / deadline 24 jam
    S->>P: Create payment setelah commit
    P-->>S: Handoff / persisted deadline
    S-->>UI: Order dan payment
    Note over A,DB: Source berubah sebelum draft<br/>terbitkan estimasi baru
```

Runtime account decision tidak menerima header idempotency wajib. Replay
berdasarkan state/order terikat. Quote expired/superseded gagal di server.

### 5. BUY — cart sampai webhook

UC-CART-01, UC-CHECKOUT-01, UC-ORDER-C-01.

```mermaid
sequenceDiagram
    actor C as Visitor / Customer
    participant UI as Browser cart /<br/>Checkout
    participant S as Checkout /<br/>Payment server
    participant Ship as Biteship
    participant DB as Order / Inventory<br/>Payment
    participant MT as Midtrans
    C->>UI: Cart local variantId + quantity
    C->>UI: Google login sebelum rate/checkout
    UI->>S: Shipping rates / items + destination
    S->>Ship: Catalog package dan testing rate
    Ship-->>S: Testing rates
    S-->>UI: Options / valid 5 menit
    UI->>S: Checkout items + address + key dalam body
    S->>Ship: Validasi rate terbaru sebelum transaksi
    S->>DB: Lock variants / authoritative total / persist atomik
    DB-->>S: Order + snapshots + reservations + attempt 30 menit
    S->>MT: Snap create setelah commit
    MT-->>S: Handoff
    S-->>UI: CREATED 201 atau replay 200
    MT-->>S: Notification
    S->>S: Verify signature / persisted status, amount, reference
    S->>DB: Event + attempt/order + consume/release dalam transaksi
    S-->>MT: Ack / duplicate idempotent
    C->>UI: Baca status server
    Note over UI,MT: Browser return tidak mengubah PAID
```

Late settlement terhadap order cancelled tidak consume stock/reopen order;
dibukukan sebagai exception refund penuh. Provider uncertainty tidak
diatasi dengan create payment ulang tanpa pemeriksaan.

### 6. Custom fulfillment dan ongkir final

UC-ADMIN-ORDER-01, UC-ORDER-C-01.

```mermaid
sequenceDiagram
    actor A as Operator
    participant S as Order / Shipping<br/>service
    participant DB as Order / Rate<br/>Payment /<br/>Shipment
    participant B as Biteship
    participant M as Midtrans
    actor C as Customer
    A->>S: PAID -> IN_PRODUCTION -> FINISHING_QC
    A->>S: Alamat dan ukuran/berat paket final
    S->>B: Rate untuk paket final
    B-->>S: Server shipping snapshot
    S->>DB: WAITING_SHIPPING_PAYMENT + attempt 24 jam
    S->>M: Create shipping payment di luar transaksi
    M-->>S: Handoff
    S-->>C: Bayar ongkir final
    M->>S: Verified notification
    S->>DB: Shipping attempt SETTLED + READY_TO_SHIP atomik
    A->>S: Metadata kurir/resi dan SHIPPED
    S->>DB: Shipment / timeline
    S-->>C: Tracking
```

Rough shipping account menggunakan paket **perkiraan**, range kurir dan
destinasi; tidak mengubah quote/order. Gagal atau belum ada data -> “Ongkir
menyusul”. Hasil provider ambiguous ditahan untuk rekonsiliasi.

### 7. Overview Admin dan analytics independen

UC-AUTH-A-01, UC-ADMIN-OPS-01.

```mermaid
sequenceDiagram
    actor A as Admin / Owner
    participant Page as Admin server page
    participant Auth as Clerk / Active<br/>AdminProfile
    participant Ops as Dashboard / Queue
    participant An as AnalyticsService
    participant DB as Business / Daily<br/>aggregate
    A->>Page: GET admin / range / group
    Page->>Auth: Authorize sebelum reads
    Auth-->>Page: DB role aktif
    Page->>Ops: Group filter sebelum limit 50 / total
    Ops-->>Page: Counts / activity createdAt / top five
    Page->>An: Validated 30d atau 13m
    par Query bisnis
        An->>DB: Brief createdAt / MAKE createdAt / Order paidAt
        DB-->>An: Rows atau business unavailable
    and Query traffic
        An->>DB: AnalyticsDailyPageView / Jakarta window
        DB-->>An: Rows atau traffic unavailable
    end
    An-->>Page: Independent results / collectionEnabled
    Page-->>A: Empat metrics / graph / breakdown / queue
    Note over Page,An: Unavailable tidak menjadi nol atau menghapus hasil lain
```

Collection mati default, retensi 13 bulan kalender. Sumber masuk dihitung
hanya landing. Tidak ada unique visitor, conversion atau atribusi order.
Kontrak collect/retention ada pada [API analytics](NIUVA_API_Contract.md#7-analytics).

Setelah halaman berizin dirender, client memulihkan preferensi sidebar lokal.
Revisi lokal 2026-10-01 menempatkan toggle di footer sidebar; toggle tidak
memanggil API atau mengubah queue dan mempertahankan fokus tombol. Menu
dapat menggulir terpisah dari logo/footer. Situs publik berada di header kanan
desktop atau disclosure mobile. Logo penuh versi terang dan simbol biru
tetap pada putih dengan skala selaras. Full/rail dan mobile disclosure mengikuti
[wireframe](NIUVA_UI_Flow_Wireframes.md#7-workspace-admin-aktual).
Visual shell revisi ACCEPTED_OWNER_LOCAL pada 2026-10-01 setelah tinjauan Overview Admin aktual.
Payment-event exceptions dan alert stok tidak ditambahkan ke hasil server.

### 8. Operasi Admin dan rujukan

| UC | Boundary |
| --- | --- |
| UC-ADMIN-PRODUCT-01 | Server Actions -> catalog/inventory service -> transactional stock ledger. |
| UC-ADMIN-PORTFOLIO-01 | Server Actions -> portfolio service -> publication read model. |
| UC-OWNER-PRICING-01 | Owner permission -> activation guard -> versioned rule. |
| UC-AUTH-C-02 | Same-origin logout -> session revoke/cookie delete. |

Mutasi Admin nyata tersedia pada [actions](../../src/app/admin/actions.ts);
tidak ada REST Admin CRUD runtime. File intents/confirm mempunyai urutan
terpisah pada [Technical Sequence](NIUVA_Technical_Sequence_Diagrams.md#2-file-privat).

## Lampiran — Usulan dan model konseptual lama

### A.1 Contoh konseptual

Urutan profile PATCH, address CRUD, cart database, payment endpoint terpisah,
dan REST Admin dari draf v0.2 adalah kandidat. Contoh nama endpoint dipertahankan
di lampiran [API](NIUVA_API_Contract.md#lampiran--usulan-dan-model-konseptual-lama).
Tidak ada tahap kandidat yang menjadi prasyarat alur runtime utama.

### A.2 Hal yang memang masih terbuka

Calibration estimasi, activation provider/produksi, accounting/legal retention,
fakta/izin konten baru yang belum terverifikasi dan privacy approval mengikuti
authority. Nama/logo yang sudah CONFIRMED tidak dibuka ulang. Diagram hanya
memeriksa urutan implementasi yang ada pada commit sumber.
