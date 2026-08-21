# Technical Design Document: Niuva MVP

**Document:** `TechDesign-Niuva-MVP.md`  
**Version:** 1.0  
**Status:** Approved Technical Direction — Ready for Part 4 / Implementation Planning  
**Date:** 21 Agustus 2026  
**Target platform:** Responsive web — `niuva.id`  
**User level:** A — Vibe-coder  
**Primary coding workflow:** VS Code + Codex  
**Product AI:** None in MVP  
**Timeline:** 1–4 minggu  
**Budget:** Rp1.000.000 first month; target recurring ≤ Rp500.000/month  
**Technical priority:** Reliability > Visual Quality > Scalability

---

# 1. Executive Summary

Niuva MVP akan dibangun sebagai **modular monolith** menggunakan **Next.js 16.3 + TypeScript** dan managed services.

Satu codebase akan menangani:

- public company profile;
- services dan case studies;
- B2B project brief;
- ready-made retail catalog;
- cart + guest checkout;
- Midtrans payment;
- Biteship shipping rates;
- custom 3D print request;
- private customer file upload;
- operator-reviewed quotation;
- Pricing v1;
- secure order status;
- thin operational admin;
- transactional email;
- monitoring dan audit trail minimum.

Architecture ini sengaja **tidak** memakai microservices, Kubernetes, message broker besar, full CMS, server-side slicer, atau customer account pada MVP.

Prinsip utama:

> **Satu aplikasi yang sederhana secara operasional, tetapi mempunyai boundary domain yang jelas, state transition yang eksplisit, dan integration code yang dapat diuji.**

Keputusan UI juga dikunci sejak awal agar Codex tidak menghasilkan interface generik:

> **Tailwind CSS + shadcn/ui berbasis Base UI primitives + semantic design tokens + Niuva-specific components + explicit anti-AI-slop rules.**

---

# 2. Requirements That Drive This Design

Technical Design ini harus menjaga requirement berikut:

1. Retail flow harus bekerja: `Product → Cart → Checkout → Payment → Order → Shipping`.
2. Minimal 3 end-to-end test transaction harus berhasil sebelum launch.
3. B2B inquiry harus dapat `Submit Project Brief → masuk admin → dapat ditindaklanjuti`.
4. Custom print tidak menggunakan automatic final pricing dari geometry file; operator slicing dan memasukkan verified weight + duration.
5. Customer account tidak wajib.
6. File custom 3D harus private.
7. Payment redirect/browser callback bukan source of truth.
8. Owner/admin non-IT harus dapat mengoperasikan website.
9. Thin admin adalah requirement launch, bukan Phase 2.
10. Dua ambiguity Pricing v1 tidak boleh diselesaikan diam-diam oleh aplikasi: rule 1–49 gram dan communal ABS price.

---

# 3. Recommended Technical Approach

## 3.1 Primary Recommendation

**Editor / coding agent:** VS Code + Codex  
**Architecture:** Modular monolith  
**Deployment:** Vercel Pro  
**Backend runtime:** Next.js server runtime on Node.js 24 LTS  
**Database:** PostgreSQL on Neon  
**ORM:** Prisma  
**Language:** TypeScript strict mode

### Why this is the best fit

- Satu codebase mengurangi operational complexity untuk developer tunggal.
- Next.js App Router cocok untuk public pages, commerce UI, server-rendered content, route handlers, dan internal admin.
- PostgreSQL cocok untuk transactional order/payment/quote data.
- Managed services mengurangi kebutuhan DevOps.
- Domain boundaries tetap dibuat agar aplikasi dapat berkembang tanpa langsung pindah ke microservices.
- Ecosystem ini mudah dibaca dan dimodifikasi oleh Codex.
- Git-based workflow memberi rollback ketika AI membuat perubahan yang salah.

### Main trade-offs

- Vendor dependency lebih tinggi dibanding self-hosting.
- Serverless/runtime constraints harus diperhatikan untuk file processing berat.
- Commerce logic tetap custom karena Niuva mempunyai hybrid retail + service + custom manufacturing.
- Thin admin perlu dibangun sendiri.
- Scaling dilakukan berdasarkan bottleneck nyata, bukan asumsi.

---

# 4. Major Technology Decisions and Alternatives

## 4.1 Web Framework

| Option | Pros | Cons | Decision |
|---|---|---|---|
| **Next.js 16.3 App Router** | Full-stack, SSR/RSC, route handlers, strong Vercel integration, large ecosystem, Codex-friendly | Framework conventions cukup banyak; perlu disiplin Server/Client Component | **Selected** |
| React + Vite + separate API | Simple frontend mental model | Dua app/deployment, lebih banyak glue, auth/deploy lebih rumit | Reject for MVP |
| Remix / React Router full-stack | Strong web primitives, good forms | Lebih sedikit project-specific familiarity dibanding chosen research direction | Valid fallback |

**Decision:** Next.js 16.3 App Router.

## 4.2 Runtime

| Option | Pros | Cons | Decision |
|---|---|---|---|
| **Node.js 24 LTS** | Current LTS, broad package compatibility | Tidak memakai latest Current features | **Selected** |
| Node.js 26 Current | Fitur terbaru | Current, bukan pilihan paling konservatif untuk MVP | Reject |
| Node.js 22 LTS | Mature | Lebih tua | Acceptable fallback |

## 4.3 Database

| Option | Pros | Cons | Decision |
|---|---|---|---|
| **Neon PostgreSQL** | Real PostgreSQL, serverless, managed, usage-based | External vendor; connection strategy harus benar | **Selected** |
| Supabase PostgreSQL | DB + integrated services | Banyak overlap dengan auth/storage yang sudah dipilih | Valid alternative |
| Firebase / Firestore | Easy managed backend | Kurang natural untuk relational commerce + audit snapshots | Reject |

Gunakan database terpisah untuk staging dan production. Preview deployments tidak boleh menunjuk production DB.

## 4.4 ORM

| Option | Pros | Cons | Decision |
|---|---|---|---|
| **Prisma** | Type-safe, readable schema/migrations, Codex familiarity | Generated client + abstraction overhead | **Selected** |
| Drizzle | Lighter, SQL-like | Lebih banyak detail SQL untuk vibe-coder | Valid alternative |
| Raw SQL | Maximum control | Highest implementation/maintenance risk | Reject |

## 4.5 Admin Authentication

| Option | Pros | Cons | Decision |
|---|---|---|---|
| **Clerk** | Fast integration, hosted auth, server-side helpers, low implementation risk | Vendor dependency | **Selected** |
| Auth.js | More control | More auth configuration responsibility | Valid alternative |
| Custom auth | Full control | Unnecessary security risk | Reject |

Customer tetap guest checkout.

## 4.6 Object Storage

| Option | Pros | Cons | Decision |
|---|---|---|---|
| **Cloudflare R2 private** | S3-compatible, direct upload, no internet egress charge | Separate vendor/config | **Selected** |
| AWS S3 | Very mature | More billing/config complexity | Valid alternative |
| Vercel Blob | Easy Vercel integration | Kurang aligned dengan current research/storage control | Valid alternative |

## 4.7 Payment

| Option | Pros | Cons | Decision |
|---|---|---|---|
| **Midtrans Snap** | Indonesia payment methods, sandbox, official Node client, webhook flow | Provider onboarding + payment state complexity | **Selected** |
| Xendit | Strong Indonesia ecosystem | Requires re-research/re-integration | Valid alternative |
| Manual bank transfer | Simple code | Poor automation and higher operational friction | Fallback only |

## 4.8 Shipping

| Option | Pros | Cons | Decision |
|---|---|---|---|
| **Biteship Rates API** | Multi-courier, one integration | Variable API cost, external dependency | **Selected** |
| Direct courier APIs | Full control | Too much integration scope | Reject |
| Manual shipping quote | Lowest technical scope | Poor retail checkout UX | Custom-order fallback only |

---

# 5. UI Technology Decision

## 5.1 Selected UI Stack

```text
Next.js + TypeScript
│
├── Tailwind CSS
│   └── semantic tokens + responsive layout
│
├── shadcn/ui
│   └── project-owned styled component layer
│
├── Base UI
│   └── accessible behavioral primitives
│
├── Motion for React
│   └── selective animation / micro-interaction
│
├── Lucide React
│   └── single icon family
│
├── Embla Carousel
│   └── product/project galleries
│
├── TanStack Table
│   └── complex admin tables only
│
└── React Hook Form + Zod
    └── form UX + shared validation
```

## 5.2 UI Alternatives

| Option | Reliability | Visual freedom | AI consistency | Trade-off |
|---|---:|---:|---:|---|
| **Tailwind + shadcn + Base UI** | High | High | High | Requires our own design rules |
| Tailwind + Base UI directly | High | Very high | Medium | More components must be designed manually |
| MUI / Chakra / Mantine | High | Medium | High | Higher risk of generic brand feel |

**Decision:** Tailwind + shadcn/ui + Base UI.

---

# 6. Design System Architecture

## 6.1 Core rule

> shadcn/ui is the **component layer**.  
> Base UI is the **behavioral primitive layer**.  
> Feature code should not freely choose between them.

Normal feature code imports from:

```text
@/components/ui/*
@/components/niuva/*
```

Direct Base UI imports hanya ketika membangun/mengubah shared primitive.

## 6.2 Component hierarchy

```text
Feature page
   ↓
components/niuva/*
   ↓
components/ui/*
   ↓
Base UI primitives
   ↓
Tailwind semantic tokens
```

Recommended structure:

```text
src/components/
├── ui/
│   ├── button.tsx
│   ├── input.tsx
│   ├── textarea.tsx
│   ├── select.tsx
│   ├── dialog.tsx
│   ├── sheet.tsx
│   ├── tabs.tsx
│   ├── tooltip.tsx
│   ├── badge.tsx
│   ├── card.tsx
│   ├── table.tsx
│   ├── skeleton.tsx
│   └── form-field.tsx
│
└── niuva/
    ├── section-heading.tsx
    ├── service-card.tsx
    ├── project-card.tsx
    ├── case-study-block.tsx
    ├── product-card.tsx
    ├── product-gallery.tsx
    ├── order-status.tsx
    ├── pricing-summary.tsx
    ├── file-upload.tsx
    ├── action-queue-card.tsx
    ├── empty-state.tsx
    └── status-badge.tsx
```

## 6.3 Semantic design tokens

Codex harus memilih semantic token, bukan arbitrary visual values.

```text
COLOR
brand
brand-foreground
surface
surface-raised
surface-inverse
muted
border
text-primary
text-secondary
success
warning
danger
info

RADIUS
radius-control
radius-card
radius-media

SHADOW
shadow-card
shadow-floating

LAYOUT
container-public
container-reading
container-admin

SPACING
section-gap
content-gap
card-gap

MOTION
duration-fast
duration-normal
ease-standard
ease-emphasis
```

Exact brand colors dan final typography: **TBD during UI Foundation / Visual Proof** menggunakan identity asset Niuva yang sebenarnya. Jangan membuat permanent brand hex hanya untuk unblock coding.

---

# 7. Anti-AI-Slop Rules

1. Never add a new UI component library without explicit approval.
2. Reuse `components/ui` and `components/niuva` before creating another primitive.
3. Do not use arbitrary colors when a semantic token exists.
4. Do not introduce one-off radius, shadow, spacing, or typography values unless the design reason is documented.
5. Do not default to gradients, glassmorphism, glowing borders, decorative blobs, oversized pills, or generic SaaS dashboard cards.
6. Avoid repeated `centered heading → short paragraph → three equal cards` unless content genuinely needs it.
7. Do not wrap every information block in a card.
8. Real Niuva project/product/workshop imagery takes priority over generic illustration.
9. Icons are functional support, not decoration for every heading.
10. Public marketing pages may be expressive; checkout/payment predictable; admin operational.
11. New visual patterns should be reusable or intentionally page-specific with documented reason.
12. A UI task is not complete until checked for token compliance, component reuse, desktop, mobile, keyboard, focus, loading, empty, error, success, and reduced motion.

---

# 8. Visual Proof Gate

Before building all screens, create a small **UI Foundation / Visual Proof**.

Approve first:

1. Button variants.
2. Form field + validation state.
3. Section heading.
4. Project card / editorial case-study composition.
5. Product card.
6. Status badge.
7. One homepage section.
8. One admin Action Queue section.

Only after these feel like Niuva should Codex propagate patterns.

Acceptance questions:

- Does this look like Niuva rather than a shadcn demo?
- Is it recognizably Precision Industrial + Creative Accent?
- Are real outcomes/projects visually dominant?
- Does mobile still feel intentional?
- Are radius/shadow/colors consistent?
- Is admin practical rather than decorative?
- Is motion supporting hierarchy rather than distracting?

---

# 9. Motion Policy

```text
Public marketing → medium motion allowed
Shop / product → subtle motion
Checkout / payment → minimal motion
Admin → functional micro-interaction only
```

Requirements:

- support `prefers-reduced-motion`;
- no animation that blocks CTA availability;
- no animation as payment/status source of truth;
- no long entrance animation on critical form screens.

---

# 10. Frontend Architecture

## 10.1 Server vs Client Components

Default: **Server Component unless interaction requires Client Component.**

Server Components:

- homepage;
- services;
- projects;
- project detail;
- shop listing;
- product detail shell;
- order status initial fetch;
- admin list/detail reads.

Client Components only for:

- cart interaction;
- variant picker;
- interactive gallery;
- upload progress;
- checkout shipping selection;
- dialog/sheet;
- Motion;
- complex table interaction;
- complex form state.

Do not place `'use client'` at page/layout level merely because one child is interactive.

## 10.2 Form architecture

**Client UX:** React Hook Form where complexity warrants it.  
**Boundary validation:** Zod.  
**Authority:** server-side validation.

Recommended domain structure:

```text
src/modules/<domain>/
├── schema.ts
├── service.ts
├── repository.ts
├── types.ts
└── errors.ts
```

---

# 11. Repository Structure

```text
niuva/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx
│   │   │   ├── services/
│   │   │   ├── projects/
│   │   │   └── project-brief/
│   │   ├── shop/
│   │   ├── custom-print/
│   │   ├── checkout/
│   │   ├── order/
│   │   ├── quote/
│   │   ├── admin/
│   │   └── api/
│   │       ├── uploads/
│   │       ├── shipping/
│   │       ├── payments/
│   │       └── webhooks/
│   ├── components/
│   │   ├── ui/
│   │   ├── niuva/
│   │   └── layouts/
│   ├── modules/
│   │   ├── catalog/
│   │   ├── cart/
│   │   ├── order/
│   │   ├── payment/
│   │   ├── shipping/
│   │   ├── custom-print/
│   │   ├── pricing/
│   │   ├── portfolio/
│   │   ├── inquiry/
│   │   ├── inventory/
│   │   └── audit/
│   └── lib/
│       ├── db/
│       ├── auth/
│       ├── storage/
│       ├── email/
│       ├── observability/
│       ├── security/
│       ├── validation/
│       └── env/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/
├── .github/workflows/
├── AGENTS.md
├── .env.example
├── package.json
└── README.md
```

Satu deployable app; modularitas hanya untuk domain separation.

---

# 12. Database Design

## 12.1 Principles

- UUID primary keys.
- Human-facing reference numbers separate dari DB IDs.
- Timestamps UTC.
- Money tidak menggunakan JavaScript floating-point sebagai authority.
- Historical quote/order snapshots immutable after commitment.
- External provider IDs unique where possible.
- State changes auditable.
- PII access limited to authenticated admin paths.

## 12.2 Core tables

### `admin_profiles`

```text
id UUID PK
clerk_user_id TEXT UNIQUE NOT NULL
display_name TEXT
role ENUM OWNER | ADMIN
is_active BOOLEAN
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### `services`

```text
id UUID PK
slug TEXT UNIQUE
title TEXT
summary TEXT
body TEXT
sort_order INT
is_published BOOLEAN
updated_at TIMESTAMPTZ
```

### `portfolio_projects`

```text
id UUID PK
slug TEXT UNIQUE
title TEXT
summary TEXT
challenge TEXT
process TEXT
result TEXT
service_label TEXT
client_name TEXT NULL
is_featured BOOLEAN
is_published BOOLEAN
published_at TIMESTAMPTZ NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### `portfolio_media`

```text
id UUID PK
project_id UUID FK
storage_key TEXT
alt_text TEXT
sort_order INT
created_at TIMESTAMPTZ
```

### `categories`

```text
id UUID PK
slug TEXT UNIQUE
name TEXT
sort_order INT
is_active BOOLEAN
```

### `products`

```text
id UUID PK
category_id UUID FK NULL
slug TEXT UNIQUE
name TEXT
description TEXT
is_published BOOLEAN
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### `product_variants`

```text
id UUID PK
product_id UUID FK
sku TEXT UNIQUE
name TEXT
price_rp DECIMAL(18,0)
stock_on_hand INT
weight_grams DECIMAL(12,3)
length_cm DECIMAL(12,3) NULL
width_cm DECIMAL(12,3) NULL
height_cm DECIMAL(12,3) NULL
is_active BOOLEAN
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### `product_media`

```text
id UUID PK
product_id UUID FK
storage_key TEXT
alt_text TEXT
sort_order INT
```

---

# 13. Stock Reservation

To reduce overselling without full warehouse logic:

### `stock_reservations`

```text
id UUID PK
variant_id UUID FK
order_id UUID FK
quantity INT
status ENUM ACTIVE | CONSUMED | RELEASED
expires_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

Available quantity:

```text
stock_on_hand - SUM(active reservations where expires_at > now)
```

On retail order creation:

1. DB transaction;
2. validate product/variant;
3. calculate active reservations;
4. reject if insufficient;
5. create order;
6. create reservations;
7. create payment attempt.

On successful payment:

1. verify event;
2. reservation → `CONSUMED`;
3. decrement `stock_on_hand`;
4. order → paid.

Expired reservations are ignored even before cleanup.

---

# 14. Order Model

### `orders`

```text
id UUID PK
order_number TEXT UNIQUE
order_type ENUM RETAIL | CUSTOM_PRINT
status ENUM
customer_name TEXT
customer_email TEXT
customer_phone TEXT
currency TEXT DEFAULT 'IDR'
items_subtotal_rp DECIMAL(18,0)
shipping_total_rp DECIMAL(18,0)
grand_total_rp DECIMAL(18,0)
public_token_hash TEXT UNIQUE
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
paid_at TIMESTAMPTZ NULL
completed_at TIMESTAMPTZ NULL
cancelled_at TIMESTAMPTZ NULL
```

### `order_items`

```text
id UUID PK
order_id UUID FK
variant_id UUID FK NULL
custom_quote_id UUID FK NULL
item_type ENUM PRODUCT | CUSTOM_PRINT
name_snapshot TEXT
sku_snapshot TEXT NULL
unit_price_rp DECIMAL(18,0)
quantity INT
line_total_rp DECIMAL(18,0)
configuration_json JSONB NULL
```

Historic order totals must not be recalculated from current product prices.

---

# 15. Address and Shipping

### `order_addresses`

```text
id UUID PK
order_id UUID FK UNIQUE
recipient_name TEXT
phone TEXT
address_line TEXT
district TEXT NULL
city TEXT
province TEXT
postal_code TEXT
country_code TEXT DEFAULT 'ID'
biteship_area_id TEXT NULL
latitude DECIMAL NULL
longitude DECIMAL NULL
```

### `shipment_rate_snapshots`

```text
id UUID PK
order_id UUID FK
provider TEXT DEFAULT 'BITESHIP'
courier_code TEXT
service_code TEXT
courier_name TEXT
service_name TEXT
price_rp DECIMAL(18,0)
eta_text TEXT NULL
raw_response_json JSONB
selected_at TIMESTAMPTZ
```

### `shipments`

```text
id UUID PK
order_id UUID FK
status ENUM
courier_code TEXT NULL
service_code TEXT NULL
tracking_number TEXT NULL
final_weight_grams DECIMAL(12,3) NULL
final_length_cm DECIMAL(12,3) NULL
final_width_cm DECIMAL(12,3) NULL
final_height_cm DECIMAL(12,3) NULL
shipping_amount_rp DECIMAL(18,0) NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Ready-made shipping dipilih saat checkout. Custom shipping ditentukan setelah final package measurement.

---

# 16. Payment Model

### `payment_attempts`

```text
id UUID PK
order_id UUID FK
purpose ENUM ORDER_TOTAL | CUSTOM_SHIPPING
provider TEXT DEFAULT 'MIDTRANS'
provider_order_id TEXT UNIQUE
amount_rp DECIMAL(18,0)
status ENUM PENDING | SETTLED | FAILED | EXPIRED | CANCELLED | REFUNDED
snap_token TEXT NULL
redirect_url TEXT NULL
provider_transaction_id TEXT NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
settled_at TIMESTAMPTZ NULL
```

### `payment_events`

```text
id UUID PK
payment_attempt_id UUID FK NULL
provider TEXT
event_fingerprint TEXT UNIQUE
provider_transaction_id TEXT NULL
provider_order_id TEXT
payload_json JSONB
received_at TIMESTAMPTZ
processed_at TIMESTAMPTZ NULL
processing_result TEXT
```

Never log Midtrans Server Key.

---

# 17. Midtrans Payment Flow

## 17.1 Create payment

```text
Customer checkout
→ server re-validates product/stock/shipping
→ DB transaction creates order + snapshots + reservation
→ server creates unique Midtrans provider_order_id
→ server calls Midtrans Snap
→ token returned to browser
→ customer pays
```

## 17.2 Browser redirect

May show: `Pembayaran sedang diverifikasi.`

It must not directly mark the order `PAID`.

## 17.3 Authoritative webhook

```text
Midtrans notification
→ HTTPS route handler
→ validate payload schema
→ verify signature / transaction authenticity
→ calculate event fingerprint
→ deduplicate
→ load payment attempt
→ validate amount + provider_order_id
→ validate allowed state transition
→ transactionally update payment/order/inventory
→ record event
→ return 2xx
```

Classic notification signature:

```text
SHA512(order_id + status_code + gross_amount + ServerKey)
```

Webhook must be idempotent.

---

# 18. Shipping Integration

## 18.1 Ready-made

Server calls Biteship Rates API; never expose API key to browser.

Normalize provider response:

```text
ShippingRate {
  courierCode
  courierName
  serviceCode
  serviceName
  priceRp
  etaText
}
```

Store selected rate snapshot. Do not trust shipping cost sent from browser at payment creation.

## 18.2 Custom print

```text
Production
→ QC
→ admin enters final package dimensions/weight
→ server requests rates or admin selects shipping
→ shipping payment attempt
→ paid
→ ready to ship
```

---

# 19. B2B Inquiry Model

### `b2b_inquiries`

```text
id UUID PK
reference_number TEXT UNIQUE
name TEXT
email TEXT
phone TEXT
company TEXT NULL
project_goal TEXT
current_stage ENUM IDEA | SKETCH | CAD | PROTOTYPE | EXISTING_PRODUCT
description TEXT
target_quantity TEXT
target_deadline DATE NULL
budget_range TEXT NULL
preferred_service TEXT NULL
confidentiality_ack BOOLEAN
status ENUM NEW | CONTACTED | QUALIFIED | QUOTED | WON | LOST | CLOSED
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

After submission:

- create reference number;
- show success screen;
- create WhatsApp continuation URL with reference;
- send admin email;
- show in Action Queue.

---

# 20. File Storage Model

### `stored_files`

```text
id UUID PK
storage_key TEXT UNIQUE
bucket_scope ENUM PRIVATE_CUSTOMER | PUBLIC_MEDIA
original_name TEXT
extension TEXT
mime_type TEXT
size_bytes BIGINT
sha256 TEXT NULL
upload_status ENUM PENDING | UPLOADED | VERIFIED | REJECTED | DELETED
created_at TIMESTAMPTZ
verified_at TIMESTAMPTZ NULL
deleted_at TIMESTAMPTZ NULL
```

Link through domain join tables such as `custom_print_request_files` and `b2b_inquiry_files`.

---

# 21. Private Upload Flow

```text
Customer requests upload intent
→ server validates declared filename/type/size
→ server generates random object key
→ DB stores PENDING file row
→ server returns short-lived presigned upload URL
→ browser uploads directly to R2
→ browser confirms upload
→ server checks object metadata
→ verification routine validates constraints
→ DB marks VERIFIED or REJECTED
```

Required controls:

- private bucket;
- random key;
- no customer filename as object key;
- short-lived presigned URL;
- extension allowlist;
- MIME validation;
- structural/magic validation where feasible;
- maximum size config;
- rate limiting;
- admin-only short-lived download;
- expired signed URL test;
- 3MF ZIP safety checks.

**File-size limit: TBD before production.** Implement as `CUSTOM_FILE_MAX_BYTES` config; do not silently choose a permanent limit.

---

# 22. Custom Print Request and Quote

### `custom_print_requests`

```text
id UUID PK
reference_number TEXT UNIQUE
customer_name TEXT
customer_email TEXT
customer_phone TEXT
material_requested TEXT
color_requested TEXT NULL
quantity INT
notes TEXT NULL
unit_confirmation TEXT NULL
status ENUM SUBMITTED | UNDER_REVIEW | QUOTE_READY | QUOTE_SENT | APPROVED | DECLINED | CANCELLED
public_token_hash TEXT UNIQUE
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### `custom_print_quotes`

```text
id UUID PK
request_id UUID FK
quote_number TEXT UNIQUE
pricing_rule_version_id UUID FK
verified_weight_g DECIMAL(12,6)
print_duration_seconds INT
material_code TEXT
quantity INT
material_subtotal_rp DECIMAL(18,6)
machine_subtotal_rp DECIMAL(18,6)
unrounded_total_rp DECIMAL(18,6)
final_total_rp DECIMAL(18,0)
calculation_snapshot JSONB
status ENUM DRAFT | SENT | ACCEPTED | DECLINED | EXPIRED
created_by_admin_id UUID FK
created_at TIMESTAMPTZ
sent_at TIMESTAMPTZ NULL
accepted_at TIMESTAMPTZ NULL
```

Quote immutable after `SENT`. Corrections create new quote/version.

---

# 23. Pricing Engine v1

Runtime source of truth is code/versioned rule, not spreadsheet.

```text
src/modules/pricing/
├── rules/
│   └── standard-3d-v1.ts
├── calculate-standard-print.ts
├── calculate-own-filament.ts
├── rounding.ts
└── pricing.types.ts
```

## PLA

```text
material =
  min(g, 200) * 1000
+ min(max(g - 200, 0), 300) * 900
+ max(g - 500, 0) * 800
```

## ABS

```text
material =
  min(g, 200) * 1200
+ min(max(g - 200, 0), 300) * 1100
+ max(g - 500, 0) * 1000
```

## Print time

```text
print_cost = duration_hours * 5000
duration_hours = duration_seconds / 3600
```

## Own filament

```text
PLA = billed_weight_g * 500
ABS = billed_weight_g * 700
time_fee = 0
```

## Rounding

Use `decimal.js` or deterministic Decimal implementation. Do not use JS `Number` as authoritative money calculation.

```text
subtotal = material_subtotal + machine_subtotal
final_total = ROUND_HALF_UP(subtotal)
```

Persist weight, duration seconds, material breakdown, machine breakdown, unrounded total, final total, rule version, material snapshot, configuration snapshot.

### Production blockers

- 1–49 g policy: **TBD owner confirmation**.
- Communal ABS: **TBD owner confirmation**.

Application must not silently pick one.

---

# 24. State Machine Design

Do not allow arbitrary status edits.

## 24.1 Retail

```text
PENDING_PAYMENT
  ├── success → PAID
  ├── expiry → CANCELLED
  └── admin cancel → CANCELLED
PAID → PROCESSING
PROCESSING → READY_TO_SHIP
READY_TO_SHIP → SHIPPED
SHIPPED → COMPLETED
```

Stale webhook cannot revert `PAID` to pending.

## 24.2 Custom print

```text
SUBMITTED
→ UNDER_REVIEW
→ WAITING_FOR_APPROVAL
→ WAITING_PAYMENT
→ PAID
→ IN_PRODUCTION
→ FINISHING_QC
→ WAITING_SHIPPING_PAYMENT
→ READY_TO_SHIP
→ SHIPPED
→ COMPLETED
```

Valid cancellation exits are defined explicitly by transition map.

---

# 25. Audit Log

### `audit_logs`

```text
id UUID PK
actor_type ENUM ADMIN | SYSTEM | WEBHOOK
actor_id TEXT NULL
entity_type TEXT
entity_id UUID
action TEXT
before_json JSONB NULL
after_json JSONB NULL
metadata_json JSONB NULL
created_at TIMESTAMPTZ
```

Audit at minimum:

- quote generated/sent;
- quote replaced;
- order status change;
- payment state change;
- shipping change;
- stock manual adjustment;
- pricing rule activation.

---

# 26. API / Mutation Surface

Public:

```text
POST /api/project-brief
POST /api/custom-print/requests
POST /api/uploads/intents
POST /api/uploads/confirm
POST /api/shipping/rates
POST /api/checkout/orders
POST /api/payments/:orderId/create
GET  /api/order-status/:token
GET  /api/quote/:token
```

Webhook:

```text
POST /api/webhooks/midtrans
```

Admin mutations should prefer authenticated Server Actions where practical. Every admin mutation: authenticate → authorize → validate → domain service → audit.

---

# 27. Error Contract

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
OUT_OF_STOCK
INVALID_STATE_TRANSITION
PAYMENT_VERIFICATION_FAILED
PAYMENT_ALREADY_PROCESSED
SHIPPING_PROVIDER_UNAVAILABLE
UPLOAD_REJECTED
QUOTE_NOT_READY
PRICING_RULE_NOT_APPROVED
INTERNAL_ERROR
```

Customer gets clear language. Technical logs get correlation ID. Never expose raw stack traces/secrets.

---

# 28. Security Architecture

## Authentication / authorization

- Clerk for admin authentication.
- App DB stores Niuva role.
- Protect `/admin` server-side.
- Every admin mutation re-checks authorization.
- Never trust client-only role values.

## Secrets

Server-only:

```text
DATABASE_URL
CLERK_SECRET_KEY
MIDTRANS_SERVER_KEY
BITESHIP_API_KEY
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
RESEND_API_KEY
SENTRY_AUTH_TOKEN
```

## Input

- Zod on server boundaries.
- Escape customer/admin text.
- No arbitrary HTML rendering.
- Rate limit project brief, custom request, upload intent, checkout, order-status lookup.

## Headers

Configure CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, appropriate frame rules, and HSTS in production. Build CSP from actual Niuva integrations; do not copy a random template.

---

# 29. Privacy Boundaries

Potential PII: name, email, phone, address, company/project info, order/payment metadata, 3D model, admin notes.

Rules:

- no private files to analytics;
- minimize address logging;
- never log secrets or full presigned URLs;
- redact/minimize Sentry PII;
- admin notes never appear on customer status page;
- retention values configurable.

Final retention policy: **TBD owner/compliance approval**.

---

# 30. Thin Admin Architecture

Admin home starts with **Action Queue**, not raw database table.

```text
Action Queue
├── custom print waiting review
├── quote waiting send
├── paid order waiting process
├── custom order waiting package measurement
└── payment/shipping exception
```

Routes:

```text
/admin
/admin/orders
/admin/orders/:id
/admin/inquiries
/admin/custom-print
/admin/custom-print/:id
/admin/products
/admin/products/:id
/admin/portfolio
/admin/pricing
```

TanStack Table only for detailed lists where sorting/filter/pagination is useful.

---

# 31. CMS Strategy

Database-backed CRUD for services, portfolio, products, FAQ/featured projects if needed.

Do not build drag-and-drop page builder, arbitrary layout schema, or separate headless CMS in MVP.

Revisit headless CMS after frequent editing, multiple content editors, localization, or approval workflow becomes real.

---

# 32. Email Architecture

Use Resend.

Events:

```text
ORDER_RECEIVED
PAYMENT_CONFIRMED
CUSTOM_QUOTE_READY
ORDER_SHIPPED
ADMIN_NEW_INQUIRY
ADMIN_NEW_CUSTOM_REQUEST
```

Send after DB commit. Email failure must not corrupt payment/order state. No permanent private R2 links.

---

# 33. Observability and Logging

Use Sentry Developer initially + Vercel logs + DB audit logs.

Track technical events: 5xx, failed payment webhook, shipping rate failures, upload failures, DB errors.

Track operational events: new retail order, paid order, B2B inquiry, custom request, quote sent/accepted.

Do not add a separate analytics SaaS before a real need exists.

Never log credentials, complete private files, raw permanent signed URLs, or unredacted sensitive payment data.

---

# 34. Testing Strategy

**Vitest** for unit/integration.  
**React Testing Library** for component behavior.  
**Playwright** for E2E.

## Unit tests — mandatory

Pricing boundaries: 0, 1, 199, 200, 201, 499, 500, 501 g for PLA and ABS; decimal grams; partial-hour duration; own filament; HALF_UP; quantity semantics; no intermediate rounding.

State tests: invalid transition rejected; stale webhook cannot revert paid; cancelled cannot enter production; completed cannot re-enter processing without explicit override.

## Integration tests

- order transaction;
- stock reservation;
- duplicate order idempotency;
- Midtrans signature verification;
- duplicate webhook;
- payment amount mismatch;
- Biteship normalization/timeout;
- R2 upload intent;
- expired signed URL;
- admin authorization;
- quote immutability.

## Required E2E

1. Retail normal flow.
2. Retail variant/destination variation.
3. Custom print → quote → payment → production → shipping payment.
4. Separate B2B brief → admin visibility.

## Failure tests

Wrong extension, spoofed MIME, oversized upload, expired URL, unauthorized admin, invalid transition, out-of-stock, duplicate checkout, payment fail/expire, duplicate webhook, wrong signature, amount mismatch, Biteship timeout, Resend failure, DB failure, missing env.

---

# 35. Visual Verification Loop

```text
Generate → Render → Inspect → Refine → Test → Commit
```

Codex must provide evidence for screen changed, mobile check, token/component reuse, accessibility, and test/build result.

---

# 36. Codex Guardrails

1. Read `AGENTS.md` before edits.
2. Plan before touching >3 files or a critical domain.
3. No unrelated refactor during feature work.
4. No schema change without migration.
5. No pricing logic change without pricing tests.
6. No state-machine change without transition tests.
7. No dependency without explaining purpose and impact.
8. Never use production secrets in tests.
9. Do not complete without lint/typecheck/relevant tests.
10. Payment/storage/security: official docs → sandbox → negative test → diff review.
11. Commit coherent vertical slices.
12. If tests break, fix or revert before continuing.

---

# 37. Git Workflow

```text
main
feature/<short-name>
fix/<short-name>
chore/<short-name>
```

`main` is deployable. Do not let Codex directly push risky payment/security/schema changes to `main`.

Commit examples:

```text
feat(checkout): add shipping rate selection
feat(custom-print): add operator quote calculation
fix(payment): ignore duplicate Midtrans webhook
test(pricing): cover PLA tier boundaries
chore(ci): add build gate
```

---

# 38. CI/CD

Required checks:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Critical flow changes additionally run:

```text
pnpm test:e2e
```

Branch/PR → Vercel Preview using staging environment.  
`main` → production after green checks.

---

# 39. Environment Strategy

## Local

Next.js local + staging/dev Neon + Midtrans sandbox + Biteship dev key + R2 dev bucket/prefix + Resend test domain.

## Preview/Staging

Vercel Preview/staging URL + staging Neon + provider sandboxes.

## Production

`niuva.id` + production Neon + production Midtrans/Biteship/R2/email.

Never share production payment secrets with preview.

---

# 40. Environment Variables

```text
APP_URL
DATABASE_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_PRIVATE_BUCKET
R2_PUBLIC_BUCKET
R2_ENDPOINT
CUSTOM_FILE_MAX_BYTES
MIDTRANS_IS_PRODUCTION
MIDTRANS_SERVER_KEY
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
BITESHIP_API_KEY
BITESHIP_ORIGIN_AREA_ID
RESEND_API_KEY
EMAIL_FROM
NEXT_PUBLIC_SENTRY_DSN
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
```

No secret committed.

---

# 41. Package Strategy

Core:

```text
next
react
react-dom
typescript
tailwindcss
@prisma/client
@clerk/nextjs
zod
react-hook-form
@hookform/resolvers
decimal.js
@aws-sdk/client-s3
@aws-sdk/s3-request-presigner
midtrans-client
resend
@sentry/nextjs
motion
lucide-react
embla-carousel-react
@tanstack/react-table
```

Dev:

```text
prisma
vitest
@testing-library/react
@testing-library/jest-dom
@playwright/test
eslint
```

Commit lockfile.

---

# 42. Initial Setup

Baseline:

- Git;
- VS Code;
- Codex;
- Node.js 24 LTS;
- pnpm.

```bash
pnpm create next-app@latest niuva
cd niuva
```

Choose TypeScript, ESLint, Tailwind, `src/`, App Router, `@/*` alias.

Initialize shadcn:

```bash
pnpm dlx shadcn@latest init
```

Initialize Prisma:

```bash
pnpm add @prisma/client
pnpm add -D prisma
pnpm prisma init
```

After repo exists:

```bash
pnpm install
pnpm dev
```

---

# 43. Package Scripts

Required scripts:

```text
dev
build
start
lint
typecheck
test
test:watch
test:e2e
db:generate
db:migrate
db:deploy
db:seed
```

Expected commands:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma migrate deploy
```

---

# 44. Deployment Plan

## Vercel Pro

Reasons: Next.js support, Git previews, managed HTTPS, environment separation, custom domain, spend controls.

Exact billing/quota must be checked at account creation and before launch.

Domain setup:

1. deploy production;
2. add `niuva.id`;
3. add DNS records in Rumahweb;
4. verify HTTPS;
5. set canonical domain;
6. verify Midtrans callback/webhook URLs after domain live.

Fallback host is only considered after real Vercel cost/runtime constraint appears.

---

# 45. Database Migration and Backup

Development:

```bash
pnpm prisma migrate dev
```

Production:

```bash
pnpm prisma migrate deploy
```

Never destructive reset production.

Before release: backup understood → migration tested staging → smoke test → production deploy.

Test restore on non-production data before launch. Keep export path for orders, quotes, products, inquiries.

---

# 46. Performance Strategy

Target PRD: main public page feels fast on mobile and target <3s in reasonable testing.

- Server Components by default.
- Avoid admin JS on public routes.
- Optimize public images.
- R2 direct upload; no proxying 3D files through app server.
- Paginate admin lists.
- Add only useful DB indexes.
- Avoid large provider JSON in list views.
- Lazy-load media-heavy interaction.
- No Redis before measurement proves need.

Initial indexes:

```text
products(slug)
products(is_published)
product_variants(sku)
product_variants(product_id, is_active)
orders(order_number)
orders(status, created_at)
orders(customer_email, created_at)
orders(order_type, status, created_at)
payment_attempts(provider_order_id)
payment_attempts(order_id, status)
payment_events(event_fingerprint)
custom_print_requests(reference_number)
custom_print_requests(status, created_at)
custom_print_quotes(request_id, status)
b2b_inquiries(reference_number)
b2b_inquiries(status, created_at)
stock_reservations(variant_id, status, expires_at)
audit_logs(entity_type, entity_id, created_at)
```

---

# 47. Scalability Path

MVP: no Redis, no queue, no microservices.

First growth actions: optimize queries, indexes, pagination, provider limits, paid tiers if needed.

Consider isolated slicer worker only when real usage proves it, e.g. >20–30 custom reviews/week or operator spends >5h/week on repetitive slicing and Niuva has frozen machine/material/process profiles.

Add customer accounts only after repeat-order need appears. Add headless CMS only after current CRUD becomes bottleneck.

---

# 48. Cost Guardrails

Research baseline estimated fixed recurring cost around **Rp353.560/month** while several services remain on free tiers. Treat as estimate, not guaranteed bill.

Current checked vendor direction (21 Aug 2026):

- Vercel Pro: paid plan with spend-management controls.
- Neon: Free exists; Launch is usage-based.
- Clerk Hobby: large free MRU allowance and up to 3 dashboard seats, suitable for tiny admin user base.
- Cloudflare R2 Standard: current free monthly allocation and free internet egress.
- Resend Free: 3,000 emails/month, 100/day.
- Sentry Developer: $0 for one user.

Variable: Midtrans transaction fees and Biteship request/shipping costs.

Required: spend alerts, weekly first-month usage review, no new SaaS without documenting monthly impact.

---

# 49. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Wrong architecture/tech choice | Medium | High | modular monolith; alternatives documented |
| Payment bug | Medium | Critical | signature verification + idempotency + sandbox E2E |
| Private CAD exposure | Low if designed correctly | Critical | private R2 + signed URLs + auth + tests |
| Pricing bug | Medium | Critical | Decimal + boundary tests + immutable quote snapshot |
| Stock oversell | Medium | High | reservation model + transaction checks |
| Shipping outage | Medium | Medium/High | clear error + retry/manual fallback |
| Cost overrun | Medium | Medium | spend limits + weekly review |
| Codex breaks unrelated code | Medium | High | branches + small commits + CI |
| Generic/inconsistent UI | High without rules | High brand impact | tokens + shared components + Visual Proof |
| Payment onboarding delay | Medium-High | High | start week 1 |
| Scope creep | High | High | explicit P0 and cut order |
| Owner cannot operate admin | Medium | High | owner usability test |

---

# 50. Scope Cut Order

Never cut: public positioning, project brief, catalog core, custom request/operator quote, payment, basic shipping, thin admin, security/private files, order status.

Simplify: cart polish, stock UI, case-study richness, email templates, custom shipping automation.

Cut first: advanced filters, elaborate animation, 3D preview, automated courier booking, detailed analytics, richer CMS.

Do not build month 1: automatic slicing, instant final pricing, AI features, membership automation, rental booking, full accounting, microservices.

---

# 51. Four-Week Implementation Sequence

## Week 1 — Foundation + risk-first

- repository;
- Node/pnpm;
- Next.js;
- UI foundation + Visual Proof;
- Neon staging/production;
- Prisma baseline;
- Clerk admin;
- Vercel staging;
- R2 private;
- start Midtrans production onboarding;
- sandbox integration skeleton;
- Sentry;
- CI.

Goal: repo deploys, auth/DB work, UI language locked.

## Week 2 — Public + Retail

Homepage, services, portfolio, shop, product detail, cart, stock reservation, checkout, Biteship, Midtrans sandbox, webhook, order status, admin order list/detail.

Goal: first retail E2E passes.

## Week 3 — B2B + Custom Print

Project brief, R2 upload, custom request, admin review, Pricing v1, quote snapshot/link, custom payment, production states, shipping balance, email.

Goal: custom + B2B core flows work.

## Week 4 — Reliability + Launch

Boundary tests, integration failures, E2E #1–#3, mobile QA, accessibility, owner usability, backup/alerts, production keys, domain, soft launch.

---

# 52. Definition of Technical Success

- [ ] Next.js deploys production.
- [ ] `niuva.id` HTTPS works.
- [ ] Staging/production data separated.
- [ ] Admin auth/authorization works.
- [ ] Retail end-to-end works.
- [ ] Minimum 3 test transactions pass.
- [ ] B2B inquiry appears in admin.
- [ ] Private 3D upload cannot be publicly accessed.
- [ ] Pricing v1 deterministic.
- [ ] Quote snapshot immutable after send.
- [ ] Midtrans webhook verified/idempotent.
- [ ] Duplicate webhook cannot duplicate processing.
- [ ] Biteship failure does not corrupt order.
- [ ] Invalid state transitions rejected.
- [ ] Stock oversell risk controlled.
- [ ] Owner can operate admin without technical help.
- [ ] UI uses one component system and Visual Proof gate.
- [ ] Mobile/desktop critical flow pass.
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] Relevant Playwright E2E passes.
- [ ] Error monitoring active.
- [ ] Monthly cost remains within budget or approved exception.

---

# 53. Open Questions Before Production

1. Pricing 1–49g — **TBD owner confirmation**.
2. Communal ABS rate — **TBD owner confirmation**.
3. Maximum customer file size — **TBD**.
4. Customer-file retention — **TBD owner/compliance**.
5. Portfolio client names/logos permission — **TBD**.
6. Initial launch inventory dataset — **TBD**.
7. Custom quote SLA — **TBD**.
8. Payment production onboarding — start immediately.

---

# 54. Current Documentation Verification Notes

Technical claims were cross-checked against current official docs on 21 Agustus 2026:

- Next.js 16.3 is a stable release.
- Node.js 24 is LTS.
- shadcn/ui defaults new projects to Base UI as of July 2026.
- Base UI is stable and unstyled/headless with accessibility focus.
- R2 currently has a free monthly Standard allocation and no internet egress fee.
- Clerk has an entry plan suitable for a tiny admin user base.
- Midtrans provides an official Node client and requires backend notification verification rather than trusting frontend callbacks.
- Midtrans recommends idempotent webhook handling.
- Biteship provides a Rates API.
- Resend and Sentry have entry/free tiers suitable for MVP.

Pricing and quotas are time-sensitive and must be re-checked immediately before launch.

---

# 55. Self-Verification Checklist

| Required Section | Present? |
|---|---|
| Platform/approach clearly chosen | Yes |
| Alternatives compared with pros/cons | Yes |
| Tech stack fully specified | Yes |
| Trade-offs acknowledged | Yes |
| UI stack and anti-AI-slop rules | Yes |
| Database design | Yes |
| Payment/security design | Yes |
| Shipping design | Yes |
| Private file design | Yes |
| Pricing engine design | Yes |
| State machine design | Yes |
| Testing strategy | Yes |
| Deployment strategy | Yes |
| Cost guardrails | Yes |
| Scaling path | Yes |
| AI assistance strategy | Yes |
| Open Questions | Yes |

---

# 56. Critical Sanity Check

## Stack vs budget

**Conditionally yes.** The architecture intentionally minimizes fixed paid services. Usage must be monitored.

## Timeline vs complexity

**Only with scope discipline.** The timeline works because no customer account, auto slicer, full CMS, advanced inventory, workflow engine, or microservices are in MVP.

## Highest-risk security boundaries

1. payment webhook authenticity/idempotency;
2. private CAD/3D files;
3. admin authorization;
4. pricing correctness;
5. order state integrity.

---

# 57. Handoff Context
<!-- Machine-readable summary for the next workflow step. Do not delete; the next prompt in the workflow reads this block. -->
- Stage: techdesign
- App name: Niuva
- User level: A
- Target platform: web
- Budget: Rp1.000.000 first month; target <= Rp500.000/month recurring
- Timeline: 1-4 weeks
- Chosen stack: Next.js 16.3 + TypeScript + Node.js 24 LTS; Tailwind CSS + shadcn/ui/Base UI; Neon PostgreSQL + Prisma; Vercel Pro; Cloudflare R2; Clerk; Midtrans Snap; Biteship; Resend; Sentry
- UI architecture: semantic design tokens + shared shadcn/Niuva components + Base UI primitives + Motion + Lucide + Embla + TanStack Table + React Hook Form/Zod
- AI coding tool: VS Code + Codex
- Product AI: none
- Architecture: modular monolith + managed services
- Reliability policy: verified payment webhooks, deterministic decimal pricing, explicit state transitions, private file storage, CI + E2E
- Visual policy: Precision Industrial + Creative Accent; Visual Proof gate; anti-AI-slop rules
- Source files: research-Niuva(1).md → PRD-Niuva-MVP.md → TechDesign-Niuva-MVP.md

---

```json
{
  "appName": "Niuva",
  "stack": {
    "frontend": "Next.js 16.3 App Router + TypeScript",
    "backend": "Next.js 16.3 server runtime on Node.js 24 LTS",
    "database": "Neon PostgreSQL + Prisma",
    "auth": "Clerk for admin only; guest checkout for customers",
    "styling": "Tailwind CSS + shadcn/ui with Base UI primitives",
    "deployment": "Vercel Pro"
  },
  "commands": {
    "setup": "pnpm install",
    "dev": "pnpm dev",
    "test": "pnpm test",
    "typecheck": "pnpm typecheck",
    "lint": "pnpm lint",
    "build": "pnpm build"
  },
  "aiScope": "development assistance only; no product AI"
}
```
