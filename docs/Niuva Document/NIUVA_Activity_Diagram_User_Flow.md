# NIUVA — Activity Diagrams & User Flow

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

### 1. Notasi dan traceability

Panah menunjukkan langkah/decision, bukan kebebasan mengubah status.
Service dan [lifecycle](../backend/lifecycle-contract.md) menentukan transisi.
28 ID dirujuk dari [Specification](NIUVA_Use_Case_Specification.md).
Wireframe tujuan setiap langkah ada pada [UI Flow](NIUVA_UI_Flow_Wireframes.md).

### 2. Eksplorasi, auth, account dan claim

UC-PUB-HOME-01 sampai UC-PUB-SHOP-02, UC-AUTH-C-01, UC-AUTH-C-02,
UC-ACCOUNT-01 dan UC-ACCOUNT-02.

```mermaid
flowchart TB
    P["Public / DEVELOP, MAKE, BUY"] --> C["Cart boleh sebelum login"]
    P --> F["Isi Brief atau MAKE"]
    C --> G{"Sesi Customer valid?"}
    F --> G
    G -- Tidak --> L["Google state + PKCE + ID verification"]
    L --> OK{"Sesi berhasil?"}
    OK -- Tidak --> E["Login unavailable / gagal"]
    OK -- Ya --> S["Return route aman"]
    G -- Ya --> S
    S --> W["Submit, rate, checkout atau account"]
    W --> A["Baca owned work / profil read-only"]
    A --> CL["Claim legacy dengan token privat"]
    CL --> V{"Scope, hash dan unowned valid?"}
    V -- Tidak --> X["Reject / jangan buka data"]
    V -- Ya --> T["Transaksi ownership + revoke token lama"]
    T --> A
    A --> LO["Logout / revoke sesi dan cookie"]
```

Tidak ada guest checkout. Login tidak mengubah cart browser menjadi tabel
database. Email/company saja tidak memberi ownership inquiry/MAKE.

### 3. DEVELOP — Brief dan proposal B2B

UC-BRIEF-01, UC-BRIEF-02, UC-ADMIN-B2B-01.

```mermaid
flowchart TB
    S["Service / project CTA"] --> F["Brief / service prefill editable"]
    F --> L["Customer session sebelum submit"]
    L --> D["Kontak, goal, stage, description, quantity, confidentialityAck"]
    D --> ST{"Stage IDEA?"}
    ST -- Ya --> OPT["Referensi opsional"]
    ST -- Tidak --> REQ["File privat atau link wajib"]
    OPT --> VAL["Validasi schema + email dan owner sesi"]
    REQ --> VAL
    VAL --> GOOD{"Field / file ownership sah?"}
    GOOD -- Tidak --> ERR["Field error / koreksi form"]
    ERR --> D
    GOOD -- Ya --> TX["Transaksi NEW + reference + file VERIFIED"]
    TX --> A["Account inquiry / Admin review"]
    A --> PROP["Proposal version SENT / scope, costs, validUntil"]
    PROP --> DEC{"Latest valid / Customer decision"}
    DEC -- ACCEPTED --> MAN["Catat keputusan / follow-up manual"]
    DEC -- DECLINED --> REC["Catat penolakan"]
    DEC -- Stale atau expired --> NO["Reject keputusan"]
    MAN --> OP["Operator menentukan tindak lanjut / WON atau LOST"]
```

Field lengkap dan enum pada [Specification](NIUVA_Use_Case_Specification.md#4-develop--project-brief).
Empat service detail tetap terpisah. ACCEPTED tidak membuat order/payment.

### 4. MAKE — intake dan simulasi Customer

UC-MAKE-01, UC-PUB-CUSTOM-02.

```mermaid
flowchart TB
    L["Customer session"] --> I{"Intake mode"}
    I -- MODEL_READY --> U["Upload model / confirm UPLOADED"]
    I -- REFERENCE_ONLY --> R["Notes wajib / link atau satu foto opsional"]
    U --> P{"Mesh + slicer per unit + eligible rule?"}
    P -- Ya --> SIM["Preview server / estimasi awal advisory"]
    P -- Tidak --> REV["Perlu review / tanpa harga final"]
    R --> REV
    SIM --> SUB["Ajukan untuk Review"]
    REV --> SUB
    SUB --> VAL["Revalidasi payload, owner, files dan preview"]
    VAL --> TX["SUBMITTED + file links VERIFIED + snapshot opsional"]
    TX --> AC["Account MAKE / operator review"]
```

STL/OBJ/3MF dapat eligible; STEP/STP/reference/photo tidak dihitung otomatis.
Input slicer Customer tidak menjadi evidence operator. Server menyimpan
`customerPreviewSnapshot` historis tanpa menjadikannya quote.

### 5. MAKE — operator sampai payable order

UC-ADMIN-MAKE-01, UC-MAKE-02, UC-OWNER-PRICING-01.

```mermaid
flowchart TB
    R["Verified model + review operator"] --> V["Weight, duration, material, quantity, configuration"]
    V --> RULE["Pricing v1 aktif / filament dan quantity semantics"]
    RULE --> COST["Named additional costs atau explicit no-cost"]
    COST --> EST["Publish latest estimate / snapshot versi / 100%-130%"]
    EST --> Q{"Sumber estimasi masih cocok?"}
    Q -- Tidak --> NEW["Review atau pricing berubah / estimasi baru"]
    NEW --> EST
    Q -- Ya --> D["Draft final quote / lowerRp / check range"]
    D --> SENT["Send immutable quote / expires 7 hari"]
    SENT --> C{"Latest valid decision?"}
    C -- Decline --> DECL["DECLINED"]
    C -- Expired atau superseded --> FAIL["Reject / quote baru diperlukan"]
    C -- Accept --> RV["Server revalidasi owner, snapshot, state, expiry"]
    RV --> TX["Atomik ACCEPTED + APPROVED + WAITING_PAYMENT order"]
    TX --> PAY["Midtrans di luar transaksi / attempt 24 jam"]
    PAY --> W["Verified webhook"]
    W --> PROD["PAID / produksi / ukur paket final"]
```

Request milik Customer wajib mempunyai estimasi terbaru sebelum quote.
Source matching mencakup reviewUpdatedAt, weight/duration/quantity/material,
filament dan pricing version. Ongkir perkiraan tidak menjadi pos quote.

### 6. Retail — browser cart, rate dan checkout

UC-CART-01, UC-CHECKOUT-01, UC-ORDER-C-01.

```mermaid
flowchart TB
    S["Shop / pilih variant"] --> C["Cart browser / items"]
    C --> L["Customer Google session"]
    L --> A["Alamat / items unik / request rate"]
    A --> R["Server catalog + paket + Biteship rate 5 menit"]
    R --> O["Pilih shippingOptionId"]
    O --> K["Checkout body items + idempotencyKey"]
    K --> IDEM{"Replay atau conflict?"}
    IDEM -- Replay --> OLD["Kembalikan persisted order / jangan perpanjang payment"]
    IDEM -- Conflict --> BAD["Koreksi key atau payload"]
    IDEM -- Baru --> RATE["Baca ulang rate sebelum transaksi"]
    RATE --> TX["Lock variant + cek catalog fingerprint / stock"]
    TX --> SAVE["Order, items, address, rate, reservations, attempt"]
    SAVE --> COM["Commit / deadline retail 30 menit"]
    COM --> MT["Midtrans create di luar transaksi"]
    MT --> HAND["Simpan handoff / tunggu webhook"]
    MT -- Hasil ambigu --> REC["Rekonsiliasi / hindari duplicate create"]
```

Cart tidak menjamin availability. Transaksi checkout memakai Decimal dan
catalog canonical, tanpa total/harga authoritative dari browser.
Key replay teknis berumur 24 jam, terpisah dari payment 30 menit.

### 7. Webhook, stock dan late settlement

UC-ORDER-C-01, UC-ADMIN-ORDER-01, UC-ADMIN-PRODUCT-01.

```mermaid
flowchart TB
    N["Midtrans notification"] --> V["Parse notification / verify signature server"]
    V --> OK{"Verified?"}
    OK -- Tidak --> ERR["Reject / tidak mutasi paid"]
    OK -- Ya --> TX["Mulai transaksi webhook"]
    TX --> EVENT["Unique PaymentEvent fingerprint"]
    EVENT --> DEDUP{"Duplicate?"}
    DEDUP -- Ya --> ACK["Ack tanpa mutasi ulang"]
    DEDUP -- Tidak --> LOCK["Lock attempt/order / cek amount, reference, status, expiry"]
    LOCK --> DEC{"Outcome"}
    DEC -- ORDER_TOTAL payable --> PAID["SETTLED + PAID / paidAt"]
    PAID --> ST["Retail consume ACTIVE reservation / StockMovement sekali"]
    DEC -- Failed atau expired --> CANCEL["Attempt terminal / cancel bila sah"]
    CANCEL --> REL["Retail release reservation"]
    DEC -- Late cancelled settlement --> EX["Tetap CANCELLED / refund exception penuh"]
    DEC -- CUSTOM_SHIPPING paid --> READY["SETTLED + READY_TO_SHIP"]
    DEC -- Mismatch atau stale --> NO["Simpan outcome / tanpa mutasi paid"]
    ST --> COM["Commit / response sesuai outcome"]
    REL --> COM
    EX --> COM
    READY --> COM
    NO --> COM
    ACK --> COM
```

Custom payments tidak menahan retail stock. Consumed reservation mengurangi
on-hand dan membuat ORDER_CONSUMPTION; release hanya mengembalikan available.
Expired reservation langsung tidak aktif bagi availability, meski cleanup
belum berjalan. Browser return tidak menjalankan diagram ini.

### 8. File privat dan lifecycle

UC-BRIEF-01, UC-MAKE-01, UC-MAKE-02.

```mermaid
flowchart TB
    I["Intent / extension, MIME, bytes"] --> P["StoredFile PENDING + token 10 menit"]
    P --> U["Browser PUT signed R2"]
    U --> C["Confirm token + server HEAD metadata"]
    C --> OK{"Metadata cocok?"}
    OK -- Tidak --> R["REJECTED / cleanup object"]
    OK -- Ya --> UP["UPLOADED / belum attached"]
    UP --> A["Transaksi submit atau append / ownership recheck"]
    A --> V["VERIFIED + join file"]
    V --> HOLD{"Active order / dispute / legal hold?"}
    HOLD -- Ya --> WAIT["Tunda deletion"]
    HOLD -- Tidak --> RET["Evaluasi kelas retention 14 / 60 / 90 hari"]
    RET --> DEL["Hapus object / tombstone DELETED + audit"]
```

CAD/model maksimal 100 MiB; foto referensi 10 MiB. Download privat signed
lima menit setelah otorisasi owning record. Akuntansi/legal record retention
tidak memakai jadwal binary. Lihat [API files](NIUVA_API_Contract.md#4-file-privat).

### 9. Admin Overview, analytics dan queue

UC-AUTH-A-01 dan UC-ADMIN-OPS-01.

```mermaid
flowchart TB
    A["Clerk + active AdminProfile"] --> P["Validate range 30d/13m dan group"]
    P --> W["Asia-Jakarta reporting window"]
    W --> B["Business read / Brief.createdAt, MAKE.createdAt, Order.paidAt"]
    W --> T["Traffic read / AnalyticsDailyPageView"]
    B --> BO{"Business query OK?"}
    T --> TO{"Traffic query OK?"}
    BO -- Ya --> BM["Tiga business metrics + filled periods"]
    BO -- Tidak --> BE["Business unavailable"]
    TO -- Ya --> TM["Page views + source/device/country/route"]
    TO -- Tidak --> TE["Traffic unavailable"]
    P --> Q["Queue deduplicate + group sebelum limit 50"]
    Q --> O["Total seluruh matching / lima prioritas tanpa filter"]
    BM --> UI["Overview / laporan dan aktivitas operasional terpisah"]
    BE --> UI
    TM --> UI
    TE --> UI
    O --> UI
    UI --> D["Detail berizin / admin queue"]
```

Collection off default; jika diaktifkan, allowlisted public routes mengirim
`{routeGroup, source, landing}`, endpoint melakukan atomic daily upsert.
Retensi authenticated cron menghapus sebelum bulan tertua 13m; bisnis tetap.
Range/group saling dipertahankan. Unavailable bukan nol.

Revisi navigasi lokal 2026-10-01: toggle di footer sidebar desktop hanya
mengubah preferensi sidebar lokal; tidak mengubah hasil queue, range/group
atau status pekerjaan. Logo dan footer tetap terlihat, daftar menu menggulir
sendiri. Situs publik berada di header kanan desktop sebelum role/Keluar.
Logo lengkap versi terang dan simbol biru memakai putih dengan skala selaras.
Di bawah lg, Menu Admin tetap disclosure berlabel penuh dengan Situs publik.
Payment-event exceptions dan alert stok tetap di luar projection sampai gate
lifecycle/policy masing-masing terpenuhi. Visual shell revisi ACCEPTED_OWNER_LOCAL pada 2026-10-01 setelah tinjauan Overview Admin aktual.

### 10. Operasi Admin lain dan fulfillment

| UC | Langkah runtime |
| --- | --- |
| UC-ADMIN-PRODUCT-01 | Detail product/variant -> validated action -> repository lock bila stock -> audit -> revalidate. |
| UC-ADMIN-B2B-01 | Inquiry review -> status/proposal action -> persisted version -> account manual decision. |
| UC-ADMIN-MAKE-01 | Private file/review -> latest estimate -> draft/send -> account acceptance. |
| UC-ADMIN-PORTFOLIO-01 | Edit content/media -> publication gate -> published/card-only read model. |
| UC-OWNER-PRICING-01 | Owner permission -> explicit semantics/confirmation -> guarded activation; bukan deployment. |

```mermaid
flowchart TB
    P["Verified PAID order"] --> K{"Order type"}
    K -- RETAIL --> R["PROCESSING"]
    R --> RT["READY_TO_SHIP"]
    K -- CUSTOM_PRINT --> C["IN_PRODUCTION"]
    C --> QC["FINISHING_QC"]
    QC --> M["Alamat + pengukuran paket final"]
    M --> S["Final rate / shipping payment attempt 24 jam"]
    S --> W["WAITING_SHIPPING_PAYMENT"]
    W --> V["Verified shipping settlement"]
    V --> RT
    RT --> SH["Metadata kurir/resi / SHIPPED"]
    SH --> CO["COMPLETED"]
```

Provider shipping/payment berada di luar transaksi database. Retry tidak
membuat referensi baru selama hasil PENDING ambigu; terminal attempt mengikuti
replacement policy. Aksi pembatalan paid bukan shortcut balik state.

## Lampiran — Usulan dan model konseptual lama

### A.1 Pemisahan contoh lama

Draf v0.2 memecah flow per halaman dan mencampur operasi konseptual dengan
runtime. Diagram utama v0.3 menyatukan decision bisnis yang telah diputuskan.
Database cart, wishlist, profile editor/address book dan CRUD REST Admin tetap
kandidat. Diagram konseptual tidak boleh menambah edge pembayaran otomatis B2B
atau menghilangkan latest-estimate gate MAKE.

### A.2 Gate terbuka

Provider/staging/production activation, calibration kisaran estimasi, fakta/izin
konten baru yang belum terverifikasi, Owner/legal privacy notice, edge analytics
dan accounting retention mengikuti authority pemiliknya. Nama/logo yang sudah
CONFIRMED tidak dibuka ulang. Render diagram adalah pemeriksaan dokumentasi,
bukan bukti provider atau penerimaan visual product.
