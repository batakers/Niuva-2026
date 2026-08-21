# Product Requirements Document: Niuva MVP

## Product Overview

**App Name:** Niuva  
**Tagline:** **Dari Ide Menjadi Produk Nyata**  
**Version:** MVP 1.0  
**Document Status:** Draft — Ready for Technical Design  
**Document Date:** 21 Agustus 2026  
**Target Launch:** 1–4 minggu setelah development dimulai  
**Platform:** Responsive Web — `niuva.id`

### Launch Goal

MVP Niuva bertujuan membuat website yang benar-benar dapat digunakan secara operasional, bukan hanya menjadi prototype visual.

MVP dianggap berhasil ketika:

1. Flow retail **Product → Cart → Checkout → Payment → Order → Shipping** berjalan end-to-end.
2. Minimal **3 test transaction end-to-end** berhasil tanpa blocker kritis.
3. Flow B2B **Inquiry → Project Brief → Admin menerima inquiry** berjalan.
4. Owner dapat menerima dan mengelola order melalui website.
5. Owner memahami perbedaan dan keseluruhan alur **B2B, Retail, dan Custom 3D Print**.
6. Owner dapat melakukan tugas utama pada admin dashboard tanpa membutuhkan bantuan teknis untuk aktivitas operasional sehari-hari.

---

## Who It's For

### Primary User: Customer Niuva

Customer Niuva terbagi menjadi beberapa kebutuhan utama.

#### B2B

- Startup/perusahaan yang membutuhkan R&D produk.
- Product atau engineering team yang membutuhkan prototype.
- Design/product team yang membutuhkan partner pengembangan produk.
- Brand atau procurement team yang membutuhkan merchandise.
- Perusahaan yang membutuhkan konsultasi, design, prototyping, atau manufacturing support.

#### Retail / B2C

- Mahasiswa.
- Hobbyist.
- Customer yang mencari custom gift.
- Customer yang ingin membuat figur/custom product.
- Customer yang sudah mempunyai file 3D untuk dicetak.
- Customer yang baru mempunyai ide, gambar, atau referensi dan membutuhkan bantuan desain.

### Internal User: Owner / Admin Niuva

Owner dan Admin bukan user teknis.

Dashboard harus:

- memakai bahasa bisnis yang mudah dipahami;
- menunjukkan pekerjaan yang membutuhkan tindakan;
- menghindari tampilan seperti tabel database mentah;
- membuat order, quotation, custom print, product, stock, dan portfolio mudah dikelola.

---

### Their Current Pain

#### Customer

- Belum ada satu website yang menjelaskan Niuva secara lengkap.
- Sulit memahami layanan Niuva dan proses pemesanannya dari satu tempat.
- Tidak ada flow terintegrasi untuk membeli ready-made product.
- Custom 3D printing membutuhkan komunikasi manual yang belum terstruktur.
- Customer belum mempunyai satu tempat untuk memahami status order.
- Calon client B2B belum mempunyai structured project brief flow.

#### Owner/Admin

- Informasi company profile, produk, custom order, dan project belum berada dalam satu sistem.
- Order dari website belum dapat diterima dan diproses secara terstruktur.
- Tidak ada workflow yang jelas untuk membedakan order retail, custom 3D print, dan B2B inquiry.
- Perubahan product/portfolio dasar berpotensi membutuhkan bantuan teknis jika admin tool tidak tersedia.

---

### What They Need

#### Customer

- Mengetahui Niuva itu siapa dan apa kemampuannya.
- Memilih jalur berdasarkan kebutuhan.
- Membeli produk ready-made dengan mudah.
- Mengirim custom 3D print request dengan aman.
- Mendapatkan quotation yang dapat dipahami.
- Membayar secara online.
- Mengetahui status order.
- Menghubungi Niuva untuk kebutuhan kompleks.

#### Owner/Admin

- Melihat inquiry/order baru.
- Mengetahui pekerjaan yang perlu ditindaklanjuti.
- Review custom print.
- Menghitung dan mengirim quotation.
- Memantau payment dan shipping status.
- Mengubah status order.
- Mengelola produk, variant, stock dasar, dan portfolio.
- Mengoperasikan website tanpa menyentuh source code untuk aktivitas rutin.

---

### Example User Story

**Persona hipotetis — Raka, Product Lead**

Raka bekerja di startup yang sedang mengembangkan physical product. Timnya mempunyai konsep dan beberapa desain awal tetapi belum mempunyai prototype yang dapat diuji.

Raka menemukan website Niuva, melihat bahwa Niuva tidak hanya menyediakan 3D printing tetapi dapat membantu proses dari R&D, desain, prototyping, sampai produksi.

Ia melihat case study yang relevan, memahami proses kerja Niuva, kemudian mengisi project brief.

Admin Niuva menerima inquiry tersebut secara terstruktur dan dapat melanjutkan proses konsultasi serta quotation.

Raka mendapatkan partner pengembangan produk tanpa harus mencari penyedia berbeda untuk setiap tahap.

---

## The Problem We're Solving

Niuva menjalankan tiga pola bisnis sekaligus:

1. **Service Business**
   - R&D
   - Consultant & Workshop
   - Design & Prototyping
   - Apparel & Merchandise

2. **Custom Manufacturing**
   - Custom 3D printing
   - Prototype
   - Custom product
   - Project berbasis quotation

3. **Retail Commerce**
   - Ready-made products
   - Variant
   - Stock
   - Cart
   - Checkout
   - Payment
   - Shipping

Masalah utama bukan hanya karena Niuva belum mempunyai website.

Masalah utamanya adalah belum ada **satu digital experience yang dapat menghubungkan ketiga model bisnis tersebut tanpa membingungkan customer maupun owner**.

### Product Positioning

Niuva harus diposisikan sebagai:

> **Product-development partner dengan manufacturing capability.**

Bukan hanya:

> “Jasa 3D Printing.”

Core customer promise:

> **Idea → Design → Prototype → Finished Product**

---

## Why Existing Solutions Fall Short

Research menunjukkan pola pasar yang terfragmentasi:

- 3D print service biasanya berfokus pada upload file dan fabrication.
- Engineering/product development company biasanya memakai inquiry/quotation dan tidak mempunyai retail commerce.
- Marketplace manufacturing dapat memberikan quotation tetapi mempunyai kompleksitas sistem jauh di atas kebutuhan MVP Niuva.
- Marketplace retail biasa tidak sesuai untuk custom manufacturing yang membutuhkan operator verification.

Karena itu Niuva membutuhkan pendekatan hybrid yang tetap sederhana.

---

# User Journey

## Three Primary Entry Paths

Homepage harus membantu user memilih kebutuhan sejak awal:

### 1. Punya Ide / Project

**CTA:** `Diskusikan Proyek`

Untuk:

- B2B;
- R&D;
- design;
- prototype;
- merchandise;
- project custom kompleks.

### 2. Sudah Punya Model 3D

**CTA:** `Custom 3D Print`

Untuk customer yang sudah mempunyai:

- STL;
- 3MF;
- OBJ;
- atau file/reference terkait.

### 3. Mau Produk Siap Beli

**CTA:** `Shop`

Untuk ready-made product.

---

# User Journey 1 — B2B

```text
Landing
→ Understand Niuva
→ Explore Service
→ View Case Study
→ Understand Process
→ Submit Project Brief
→ Admin Review
→ Consultation / Quotation
```

### Project Brief Minimum Fields

Required:

- Name
- Email
- WhatsApp
- Project goal
- Current stage:
  - Idea
  - Sketch
  - CAD
  - Prototype
  - Existing Product
- Description
- Target quantity
- Target deadline
- File/reference upload or link
- Confidentiality acknowledgment

Optional:

- Company
- Budget range
- Preferred service

### After Submission

System:

1. membuat inquiry/reference ID;
2. menyimpan project brief;
3. menampilkan confirmation;
4. memungkinkan customer melanjutkan komunikasi melalui WhatsApp menggunakan reference ID;
5. menampilkan inquiry pada admin dashboard.

---

# User Journey 2 — Ready-Made Retail

```text
Shop
→ Category
→ Product
→ Variant
→ Stock Check
→ Add to Cart
→ Guest Checkout
→ Shipping Address
→ Shipping Rate
→ Payment
→ Confirmation
→ Order Status
```

Customer account **tidak wajib pada MVP**.

Checkout menggunakan:

- name;
- email;
- phone;
- shipping address.

Setelah order:

- customer mendapatkan order/reference number;
- customer mendapatkan secure order-status link;
- email confirmation dikirim.

---

# User Journey 3 — Custom 3D Print

```text
Custom 3D Print
→ Upload File
→ Basic Configuration
→ Submit Request
→ Operator Review
→ Operator Slice
→ Input Weight + Duration
→ Pricing v1
→ Customer Receives Quote
→ Customer Approves
→ Payment
→ Production
→ QC
→ Final Package Measurement
→ Shipping Payment
→ Courier
→ Completed
```

### Important Rule

**Harga final tidak dihitung otomatis hanya dari geometry file pada MVP.**

Operator tetap melakukan slicing menggunakan konfigurasi Niuva.

Operator memasukkan:

- final slicer weight;
- print duration;
- material;
- configuration;
- notes bila diperlukan.

Pricing engine kemudian menghasilkan quotation berdasarkan **Pricing v1**.

---

# MVP Features

## Must Have for Launch

### 1. Company Profile, Services & Case Studies

- **What:** Public website yang menjelaskan positioning, services, process, project, dan capability Niuva.
- **User Story:** Sebagai calon customer, saya ingin memahami apa yang dapat dilakukan Niuva sehingga saya bisa menentukan apakah Niuva cocok untuk kebutuhan saya.
- **Priority:** P0 — Critical

#### Success Criteria

- [ ] Homepage menjelaskan value proposition tanpa memosisikan Niuva hanya sebagai 3D printing service.
- [ ] Empat layanan Niuva dapat ditemukan dengan jelas.
- [ ] User dapat melihat selected project/case study.
- [ ] User dapat memahami basic workflow Niuva.
- [ ] User dapat menuju jalur B2B, Custom Print, atau Shop dari homepage.
- [ ] CTA utama jelas dan dapat digunakan pada desktop maupun mobile.

---

### 2. B2B Project Brief

- **What:** Form untuk menerima kebutuhan B2B secara terstruktur.
- **User Story:** Sebagai calon client perusahaan, saya ingin menjelaskan project saya sehingga Niuva dapat menilai kebutuhan dan menghubungi saya dengan konteks yang cukup.
- **Priority:** P0 — Critical

#### Success Criteria

- [ ] User dapat mengisi seluruh required project fields.
- [ ] Form melakukan server-side validation.
- [ ] Submission menghasilkan reference ID.
- [ ] Admin dapat melihat submission baru.
- [ ] Customer melihat confirmation state setelah berhasil submit.
- [ ] Customer dapat melanjutkan melalui WhatsApp setelah submission.
- [ ] File/reference project tidak terekspos sebagai public URL.

---

### 3. Ready-Made Product Catalog

- **What:** Catalog untuk produk siap beli Niuva.
- **User Story:** Sebagai retail customer, saya ingin browsing product, melihat variant, harga, dan stock agar dapat memilih produk yang ingin saya beli.
- **Priority:** P0 — Critical

#### Success Criteria

- [ ] Product dapat mempunyai category.
- [ ] Product dapat mempunyai satu atau lebih variants.
- [ ] Variant mempunyai harga.
- [ ] Variant mempunyai stock.
- [ ] Product page menampilkan foto, harga, variant, stock, dan informasi penting.
- [ ] Out-of-stock variant tidak dapat dibeli.
- [ ] Admin dapat melakukan CRUD sederhana pada product/variant.

---

### 4. Cart & Guest Checkout

- **What:** Checkout tanpa mewajibkan customer membuat account.
- **User Story:** Sebagai customer, saya ingin membeli produk dengan sedikit friction agar saya dapat langsung menyelesaikan pesanan.
- **Priority:** P0 — Critical

#### Success Criteria

- [ ] User dapat Add to Cart.
- [ ] User dapat update quantity.
- [ ] User dapat remove item.
- [ ] Total product dihitung dengan benar.
- [ ] Checkout meminta contact dan shipping information.
- [ ] Order dibuat sebelum pembayaran.
- [ ] Duplicate checkout/payment tidak membuat duplicate paid order.
- [ ] Customer account tidak diwajibkan.

---

### 5. Online Payment

- **What:** Payment menggunakan Midtrans Snap.
- **User Story:** Sebagai customer, saya ingin melakukan pembayaran online sehingga order dapat segera dikonfirmasi.
- **Priority:** P0 — Critical

#### Success Criteria

- [ ] Customer dapat membuka payment flow untuk valid order.
- [ ] Payment reference berhubungan dengan order yang benar.
- [ ] Browser redirect bukan source of truth pembayaran.
- [ ] Backend menerima dan memverifikasi webhook payment.
- [ ] Webhook handler idempotent.
- [ ] Status `PAID` hanya diberikan setelah payment terverifikasi.
- [ ] Midtrans Server Key tidak pernah dikirim ke browser.
- [ ] Sandbox flow berhasil diuji sebelum production.

---

### 6. Ready-Made Shipping

- **What:** Shipping rate untuk ready-made order menggunakan Biteship.
- **User Story:** Sebagai customer, saya ingin melihat pilihan pengiriman agar saya mengetahui total biaya sebelum membayar.
- **Priority:** P0 — Critical

#### Success Criteria

- [ ] Shipping address dapat digunakan untuk request rate.
- [ ] Weight/dimension data produk tersedia sesuai kebutuhan shipping.
- [ ] User dapat memilih shipping option yang valid.
- [ ] Shipping cost masuk ke order total.
- [ ] Shipping option disimpan sebagai snapshot pada order.
- [ ] API failure menghasilkan pesan yang jelas dan tidak membuat order korup.

---

### 7. Private Custom 3D File Upload

- **What:** Customer dapat mengirim file desain secara privat.
- **User Story:** Sebagai customer custom print, saya ingin mengupload model dengan aman agar Niuva dapat melakukan review dan quotation.
- **Priority:** P0 — Critical

#### Initial File Support

- STL
- 3MF
- OBJ

STEP/STP:

- manual-review attachment only;
- tidak dianalisis otomatis pada MVP.

#### Success Criteria

- [ ] Upload tidak menggunakan public bucket.
- [ ] File mempunyai random storage key.
- [ ] Upload divalidasi berdasarkan size/type yang ditentukan.
- [ ] Signed URL mempunyai expiry.
- [ ] Customer tidak dapat membaca file customer lain.
- [ ] Admin berwenang dapat mengakses file.
- [ ] User mendapat acknowledgement bahwa file diproses secara privat.
- [ ] STL meminta konfirmasi unit/scale bila diperlukan.

---

### 8. Custom Print Review & Pricing v1

- **What:** Operator memverifikasi request dan sistem menghitung quotation dari slicer data.
- **User Story:** Sebagai admin/operator, saya ingin memasukkan hasil slicing sehingga quotation dapat dihitung secara konsisten.
- **Priority:** P0 — Critical

#### Required Operator Inputs

- material;
- slicer weight;
- print duration;
- quantity/configuration;
- relevant notes.

#### Standard PLA Pricing

```text
PLA =
(min(g, 200) × Rp1.000)
+ (min(max(g − 200, 0), 300) × Rp900)
+ (max(g − 500, 0) × Rp800)
```

#### Standard ABS Pricing

```text
ABS =
(min(g, 200) × Rp1.200)
+ (min(max(g − 200, 0), 300) × Rp1.100)
+ (max(g − 500, 0) × Rp1.000)
```

#### Print Time

```text
Print Cost =
Print Duration × Rp5.000/hour
```

#### Final Calculation

```text
Total =
Material Cost
+ Print Cost
```

Final rounding:

```text
ROUND_HALF_UP
```

Hanya dilakukan pada total akhir.

#### Success Criteria

- [ ] Weight disimpan dengan precision asli.
- [ ] Duration disimpan dengan precision asli atau sebagai integer seconds.
- [ ] Calculation tidak memakai JavaScript floating-point untuk money.
- [ ] Material breakdown tersimpan.
- [ ] Time cost tersimpan.
- [ ] Unrounded subtotal tersimpan.
- [ ] Rounded total tersimpan.
- [ ] Pricing rule version tersimpan.
- [ ] Configuration/material snapshot tersimpan.
- [ ] Quote tidak dapat dikirim sebelum operator review selesai.

---

### 9. Order Status

- **What:** Customer dapat melihat status tanpa mandatory account.
- **User Story:** Sebagai customer, saya ingin mengetahui perkembangan order sehingga saya tidak perlu selalu bertanya melalui WhatsApp.
- **Priority:** P0 — Critical

#### Suggested User-Facing States

Untuk Retail:

```text
Waiting Payment
Paid
Processing
Ready to Ship
Shipped
Completed
Cancelled
```

Untuk Custom Print:

```text
Submitted
Under Review
Waiting for Approval
Waiting Payment
Paid
In Production
Finishing / QC
Waiting Shipping Payment
Ready to Ship
Shipped
Completed
Cancelled
```

#### Success Criteria

- [ ] Status page hanya dapat diakses dengan secure token/reference mechanism.
- [ ] Customer tidak melihat internal notes.
- [ ] Status mempunyai human-readable label.
- [ ] Order status changes tercatat.
- [ ] Admin dapat melakukan valid transition.
- [ ] Invalid transition ditolak.

---

### 10. Thin Admin Dashboard

- **What:** Operational dashboard minimum untuk menjalankan MVP.
- **User Story:** Sebagai Owner/Admin, saya ingin mengetahui order mana yang membutuhkan tindakan agar saya dapat mengoperasikan bisnis tanpa membuka database atau source code.
- **Priority:** P0 — Critical

#### Sections

```text
/admin
├── Action Queue
├── Orders
├── B2B Inquiries
├── Custom Print Reviews
├── Products & Stock
├── Portfolio
└── Pricing Rules
```

#### Action Queue Examples

- Custom print menunggu review.
- Quote belum dikirim.
- Paid order perlu diproses.
- Custom order menunggu shipping measurement.
- Payment/shipping exception.

#### Success Criteria

- [ ] Admin area memerlukan authentication.
- [ ] Unauthorized user tidak dapat mengakses admin.
- [ ] Owner dapat melihat order baru.
- [ ] Owner dapat memahami jenis order.
- [ ] Owner dapat update valid status.
- [ ] Owner dapat review custom print.
- [ ] Owner dapat menghitung quotation.
- [ ] Owner dapat mengelola product/variant/stock dasar.
- [ ] Owner dapat mengelola portfolio dasar.
- [ ] Critical change mempunyai audit information minimum.

---

### 11. Transactional Email

Minimum email:

- order received;
- payment confirmed;
- custom quotation available;
- order shipped;
- relevant admin notification.

#### Success Criteria

- [ ] Email gagal tidak mengubah payment/order menjadi gagal.
- [ ] Critical email error tercatat.
- [ ] Email tidak mengandung private storage URL permanen.

---

## Nice to Have — If Time Allows

- Basic 3D model preview.
- Simple product category filtering.
- Promo/announcement CRUD.
- Basic inventory adjustment history.
- Courier booking dari dashboard.
- Richer order email templates.
- Customer order-status search dengan verification.
- Basic analytics dashboard.

Fitur ini tidak boleh menunda P0.

---

# Out of Scope (Not in MVP)

### Customer Account

Ditunda karena guest checkout sudah cukup untuk launch.

**Trigger:** repeat orders mulai menjadi kebutuhan nyata.

### Automatic Browser/Server Slicing

Tidak dibangun untuk MVP.

**Reason:** pricing final bergantung pada slicer profile dan machine/process parameters.

**Trigger:** operator review menjadi bottleneck.

### Instant Final 3D Pricing from File

Tidak menjadi requirement launch.

### Full CMS / Page Builder

Portfolio/product CRUD sederhana cukup.

**Trigger:** content publishing frequency meningkat.

### Full Inventory Management

Stock basic tersedia, tetapi:

- inventory ledger kompleks;
- procurement;
- warehouse workflow;

ditunda.

### Financial Dashboard / Accounting

Tidak dibangun.

Gunakan atau integrasikan accounting solution pada fase berikutnya jika dibutuhkan.

### Membership Automation

Manual pada MVP.

### Rental Reservation

Manual pada MVP.

### Production Scheduler / Printer Queue

Tidak dibangun pada MVP.

### Automated Custom Shipping Before Production

Custom order menunggu ukuran/berat paket final.

### Customer-Facing AI

Tidak ada AI feature pada v1.

### Architecture Not Needed

Tidak membangun:

- microservices;
- Kubernetes;
- event bus;
- multi-region;
- dedicated search infrastructure.

---

# How We'll Know It's Working

## Launch Success Metrics — First 30 Days

| Metric | Target | Measurement |
|---|---:|---|
| Critical end-to-end flow | 100% flow P0 lolos sebelum launch | QA checklist |
| End-to-end transactions | Minimum 3 berhasil | Test order records |
| B2B inquiry flow | Berhasil dari submit sampai tampil di admin | Manual + system test |
| Owner operational readiness | Semua core admin task selesai tanpa blocker | Owner usability test |
| Critical payment/shipping blocker | 0 saat production release | QA + monitoring |

### 3 Required Test Transactions

Sedapat mungkin mencakup variasi:

1. Ready-made order normal.
2. Ready-made order dengan variant/shipping berbeda.
3. Custom 3D Print request → quote → payment → production/shipping flow.

B2B inquiry diuji sebagai flow tersendiri.

---

## Growth Metrics — Months 2–3

Business-volume target belum ditentukan oleh Niuva.

Metric yang perlu mulai dikumpulkan:

| Metric | Target |
|---|---|
| Number of real orders | TBD setelah soft launch |
| B2B inquiries | TBD setelah soft launch |
| Custom print requests | TBD setelah soft launch |
| Checkout completion rate | Baseline terlebih dahulu |
| Quote acceptance rate | Baseline terlebih dahulu |
| Repeat customer rate | Baseline terlebih dahulu |

Tidak membuat target revenue/user yang belum didukung data.

---

# Look & Feel

**Design Vibe:**

**Professional · Innovative · Precise · Creative · Trustworthy**

## Primary Direction

**Precision Industrial + Creative Accent**

### Visual Principles

1. **Outcome before technology**
   - Tampilkan apa yang Niuva hasilkan, bukan hanya printer dan mesin.

2. **Engineering credibility**
   - Gunakan visual project, process, detail produk, diagram, dan technical motifs secara terukur.

3. **Physical & real**
   - Prioritaskan foto workshop, prototype, project, material, dan hasil nyata dibanding generic stock-tech imagery.

4. **Clean but not generic SaaS**
   - Tampilan modern, tetapi tetap terasa seperti engineering + creative manufacturing business.

5. **Use existing Niuva identity**
   - Blue/white base.
   - Bold typography.
   - Rounded photography selectively.
   - Line/arch/technical motifs.
   - Jangan menyalin layout PDF company profile secara literal.

---

# Key Screens / Pages

1. **Homepage** — positioning + three entry paths.
2. **Services** — capability detail.
3. **Projects / Case Studies** — B2B proof.
4. **Project Detail** — context, challenge, process, result.
5. **Project Brief / Request Quote** — B2B conversion.
6. **Shop** — ready-made catalog.
7. **Product Detail** — variant, stock, price.
8. **Cart** — selected items.
9. **Checkout** — shipping + payment.
10. **Custom 3D Print Landing** — custom-print explanation.
11. **Custom Print Request** — upload/configuration.
12. **Quote Review** — customer sees quotation.
13. **Order Status** — customer tracking.
14. **Admin Action Queue** — operational homepage.
15. **Admin Orders**.
16. **Admin Custom Print Review**.
17. **Admin Products & Stock**.
18. **Admin Portfolio**.

---

# Homepage Wireframe

```text
┌─────────────────────────────────────────────┐
│ Logo      Services Projects Shop Custom 3D │
│                         [Diskusikan Proyek] │
├─────────────────────────────────────────────┤
│                                             │
│          DARI IDE MENJADI PRODUK NYATA      │
│                                             │
│   Riset • Design • Prototype • Production   │
│                                             │
│          [Diskusikan Proyek]                │
│                                             │
├─────────────────────────────────────────────┤
│  Punya Ide     Punya File       Shop        │
│  → Project     → Custom Print   → Ready Made│
├─────────────────────────────────────────────┤
│               SERVICES                      │
│  R&D | Consultant | Prototype | Merchandise│
├─────────────────────────────────────────────┤
│             SELECTED PROJECTS               │
├─────────────────────────────────────────────┤
│              HOW WE WORK                    │
├─────────────────────────────────────────────┤
│ Custom 3D Print         Ready Products      │
├─────────────────────────────────────────────┤
│ Trust / Location / FAQ / Final CTA          │
└─────────────────────────────────────────────┘
```

---

# Technical Considerations

## Platform

- Responsive web.
- Desktop and mobile browser.
- Native mobile app tidak diperlukan.

## Architecture

**Modular monolith + managed services.**

Satu aplikasi deployable dengan domain modules terpisah secara logis.

---

## Recommended Stack

| Area | Decision |
|---|---|
| Full-stack | Next.js + TypeScript |
| UI | Tailwind CSS + accessible components |
| Database | Neon PostgreSQL |
| ORM | Prisma |
| Hosting | Vercel Pro |
| Storage | Cloudflare R2 Private |
| Admin Auth | Clerk |
| Customer Auth | Guest checkout |
| Commerce | Custom commerce inside main app |
| Payment | Midtrans Snap |
| Shipping | Biteship |
| Email | Resend |
| Monitoring | Sentry + platform logs |
| CMS | Thin database CRUD |
| 3D Price | Operator-verified Pricing v1 |

Vendor pricing/capabilities harus diverifikasi kembali saat implementation/go-live karena dapat berubah.

---

## Performance

Target MVP:

- Public pages terasa cepat pada mobile connection.
- Target page load utama: **<3 seconds** pada kondisi pengujian yang wajar.
- Images dioptimasi.
- Lazy loading digunakan untuk media non-critical.
- Database queries tidak mengambil data yang tidak diperlukan.
- 3D files tidak diproxy melalui application server jika direct signed upload tersedia.

---

## Accessibility

Target minimum:

**WCAG 2.1 AA basics**

Termasuk:

- semantic HTML;
- keyboard navigation;
- focus states;
- form labels;
- sufficient contrast;
- descriptive errors;
- alt text untuk gambar penting.

---

# Security & Privacy

## Admin

- Authentication required.
- Owner/Admin only.
- Authorization dilakukan server-side.
- Secrets hanya disimpan di deployment secret manager.

## Payment

- Midtrans Server Key tidak pernah berada di browser.
- Payment webhook harus diverifikasi.
- Handler harus idempotent.
- Browser success callback tidak menentukan payment status final.

## Custom Files

- Private R2 bucket.
- Short-lived signed URLs.
- Random object keys.
- File type/extension/size validation.
- Customer tidak dapat membaca file customer lain.
- Model customer dianggap untrusted input.

## Input

Semua server mutation harus divalidasi.

Minimum:

- server-side schema validation;
- rate limiting pada upload/contact/quote endpoints;
- safe database queries;
- sanitization/escaping user-generated content.

---

# Privacy Requirements

Data yang berpotensi diproses:

- name;
- email;
- WhatsApp/phone;
- address;
- company/project information;
- order;
- payment metadata;
- shipping;
- uploaded 3D model;
- communication/admin notes.

Public site minimal membutuhkan:

- Privacy Policy;
- Terms of Service;
- Custom Manufacturing Terms.

Final retention period masih membutuhkan konfirmasi Niuva.

Draft dari research:

- abandoned upload: 7–14 hari;
- cancelled/unpaid quote: 30–60 hari;
- completed model: sekitar 90 hari kecuali ada kebutuhan retention lain;
- financial/order records mengikuti kewajiban legal/accounting terpisah.

Nilai final **TBD setelah konfirmasi owner/compliance**.

---

# AI / Automation Scope

**Product AI:** None.

Tidak ada:

- AI chatbot;
- AI pricing;
- AI recommendation;
- customer-facing agent.

AI hanya digunakan selama development untuk:

- research;
- coding;
- debugging;
- review;
- testing;
- documentation.

### AI Product Data Access

Not applicable untuk MVP.

### Human Confirmation

Not applicable untuk product AI.

### Evaluation

AI-generated code tetap harus melewati:

- manual review;
- functional testing;
- security review pada critical path;
- payment/shipping sandbox test.

AI output tidak dianggap benar hanya karena berhasil di-generate.

---

# Quality Standards

## What This App Will NOT Accept

- Placeholder content pada production.
- Lorem Ipsum.
- Broken navigation.
- P0 feature yang hanya terlihat selesai tetapi tidak bekerja.
- Payment berdasarkan fake browser success.
- Public customer 3D files.
- Admin page tanpa authorization.
- Broken mobile experience.
- Checkout yang dapat menghasilkan duplicate payment/order tanpa protection.
- Pricing yang menggunakan rumus berbeda dari approved Pricing v1.
- Silent failure tanpa user feedback pada critical flow.

---

# Budget & Constraints

## Budget

**First month operational/tools budget:** ±Rp1.000.000

**Target recurring:** ≤Rp500.000/bulan

Recommended research baseline:

**±Rp353.560/bulan fixed**

selama:

- Neon;
- R2;
- Clerk;
- Resend;
- monitoring;

masih berada dalam tier awal yang direncanakan.

Payment dan shipping merupakan variable cost.

Domain `niuva.id` sudah tersedia dan tidak dihitung sebagai pembelian baru.

---

## Timeline

**1–4 minggu / sekitar 1 bulan.**

Jika terjadi scope pressure, P0 customer journey lebih penting daripada nice-to-have automation.

---

## Team / Resource Constraint

Implementation dipimpin oleh satu developer magang dengan pendekatan vibe-coding/AI-assisted development.

Operational stakeholder utama:

- Owner;
- Admin.

Karena itu solution harus:

- mudah dipahami;
- mempunyai dokumentasi yang cukup;
- tidak mempunyai terlalu banyak infrastructure moving parts;
- tidak membutuhkan DevOps kompleks.

---

# Open Questions & Assumptions

## Must Resolve Before Production

1. **Pricing 1–49 gram**
   - Research menemukan conflict antara spreadsheet yang menulis tier `50–200 g` dengan Pricing v1 yang menyatakan tidak ada minimum 50 g.
   - **TBD — owner confirmation required.**

2. **Communal ABS pricing**
   - Pricing brief menyebut Rp700/g.
   - Spreadsheet belum sepenuhnya eksplisit.
   - **TBD — owner confirmation required.**

3. **Client names/logos**
   - Apakah nama/logo seperti client pada portfolio existing boleh ditampilkan secara publik?
   - **TBD.**

4. **Case study results**
   - Data outcome kuantitatif project belum tersedia.
   - Jangan membuat angka sendiri.
   - **TBD.**

5. **Payment onboarding**
   - Pastikan dokumen legal/business yang dibutuhkan provider tersedia.
   - **TBD berdasarkan kesiapan Niuva.**

6. **Privacy retention**
   - Final retention policy perlu approval.
   - **TBD.**

7. **Exact launch inventory**
   - SKU, product, variant, image, stock awal yang akan dipublikasikan perlu final dataset.
   - **TBD.**

8. **Custom quotation SLA**
   - Berapa lama customer dijanjikan mendapatkan review/quote?
   - **TBD.**

---

# Launch Strategy

## Soft Launch

Tahap pertama adalah **operational soft launch**.

Audience:

- Owner;
- Admin;
- internal tester;
- customer/test user terbatas jika tersedia.

### Required Before Public Launch

- Minimal 3 end-to-end transaction tests.
- B2B inquiry test.
- Custom print quote flow test.
- Owner admin usability session.
- Payment sandbox verification.
- Shipping integration verification.
- Mobile + desktop QA.
- Monitoring/error logging aktif.

---

## Feedback Plan

Owner/Admin usability session harus menjawab:

1. Apakah owner tahu order mana yang harus ditindaklanjuti?
2. Apakah owner memahami perbedaan Retail, B2B, dan Custom Print?
3. Apakah owner dapat mengubah order status sendiri?
4. Apakah owner dapat melakukan custom-print review?
5. Apakah owner dapat mengelola product dan stock dasar?
6. Apakah owner memahami status payment/shipping?
7. Apakah ada istilah teknis yang membingungkan?

Blocker usability harus diperbaiki sebelum public launch.

---

# Definition of Done for MVP

MVP siap launch ketika:

### Product

- [ ] Homepage dan public company profile selesai.
- [ ] Services dapat diakses.
- [ ] Projects/case studies tersedia.
- [ ] B2B project brief bekerja end-to-end.
- [ ] Product catalog bekerja.
- [ ] Cart bekerja.
- [ ] Guest checkout bekerja.
- [ ] Midtrans payment flow bekerja.
- [ ] Ready-made shipping rate bekerja.
- [ ] Private custom-file upload bekerja.
- [ ] Operator review + Pricing v1 bekerja.
- [ ] Order status bekerja.
- [ ] Thin admin bekerja.

### End-to-End Validation

- [ ] Minimal **3 test transactions** berhasil.
- [ ] B2B inquiry berhasil diterima admin.
- [ ] Custom-print flow diuji sampai quotation/payment.
- [ ] Owner usability test selesai tanpa critical blocker.

### Security

- [ ] Admin authentication aktif.
- [ ] Authorization diuji.
- [ ] Private file access diuji.
- [ ] Payment webhook diverifikasi.
- [ ] Webhook idempotency diuji.
- [ ] Secrets tidak masuk frontend/repository.
- [ ] Critical server inputs divalidasi.

### UX

- [ ] Desktop tested.
- [ ] Mobile tested.
- [ ] Empty/loading/error/success states tersedia pada critical flow.
- [ ] Basic accessibility checked.
- [ ] Tidak ada placeholder production content.

### Operations

- [ ] Transactional email aktif.
- [ ] Error monitoring aktif.
- [ ] Database backup/restore procedure diketahui.
- [ ] Admin dapat memahami Action Queue.
- [ ] Basic deployment process terdokumentasi.

---

# Next Steps

Setelah PRD disetujui:

1. Buat **Technical Design Document — Part 3**.
2. Definisikan database schema final.
3. Definisikan order/payment/production/shipping state machine.
4. Finalisasi dua ambiguity Pricing v1 dengan Owner Niuva.
5. Mulai onboarding payment gateway sejak awal development.
6. Siapkan development/staging environment.
7. Implementasi P0 secara vertical slice.
8. Jalankan minimal 3 test transactions.
9. Jalankan owner usability test.
10. Perbaiki blocker.
11. Deploy ke `niuva.id`.
12. Soft launch.
13. Kumpulkan data real sebelum menentukan Phase 2.

---

*Document created: 21 Agustus 2026*  
*Status: Draft — Ready for Technical Design*

---

## Handoff Context
<!-- Machine-readable summary for the next workflow step. Do not delete; the next prompt in the workflow reads this block. -->
- Stage: prd
- App name: Niuva
- User level: A
- Target platform: web
- Budget: Rp1.000.000 first month; target <= Rp500.000/month recurring
- Timeline: 1-4 weeks
- AI in product scope: no
- Launch goal: end-to-end retail/payment/shipping operational; owner can operate B2B and retail flows
- Success test: minimum 3 end-to-end test transactions + owner operational readiness
- Primary architecture: modular monolith
- Primary stack: Next.js + TypeScript, Neon PostgreSQL, Prisma, Vercel Pro, Cloudflare R2, Clerk admin auth, Midtrans Snap, Biteship, Resend, Sentry
- Custom 3D pricing: Pricing v1 after operator slicing/verification; no instant final auto-slicing at MVP
- Source files: research-Niuva(1).md → PRD-Niuva-MVP.md

---

```json
{
  "appName": "Niuva",
  "oneLiner": "Website operasional yang menyatukan company profile dan project brief B2B, ready-made retail, serta custom 3D print berbasis review operator.",
  "targetUsers": "Calon klien B2B, customer retail/B2C, dan Owner/Admin Niuva",
  "phase": "Foundation",
  "mustHave": [
    "Company Profile, Services & Case Studies",
    "B2B Project Brief",
    "Ready-Made Product Catalog",
    "Cart & Guest Checkout",
    "Online Payment",
    "Ready-Made Shipping",
    "Private Custom 3D File Upload",
    "Custom Print Review & Pricing v1",
    "Order Status",
    "Thin Admin Dashboard",
    "Transactional Email"
  ],
  "niceToHave": [
    "Basic 3D model preview",
    "Simple product category filtering",
    "Promo/announcement CRUD",
    "Basic inventory adjustment history",
    "Courier booking from dashboard",
    "Richer order email templates",
    "Verified order-status search",
    "Basic analytics dashboard"
  ],
  "notInMvp": [
    "Customer account",
    "Automatic browser/server slicing",
    "Instant final 3D pricing from file",
    "Full CMS / Page Builder",
    "Full Inventory Management",
    "Financial Dashboard / Accounting",
    "Membership Automation",
    "Rental Reservation",
    "Production Scheduler / Printer Queue",
    "Automated Custom Shipping Before Production",
    "Customer-Facing AI",
    "Microservices, Kubernetes, event bus, multi-region, or dedicated search infrastructure"
  ],
  "successMetrics": [
    "All P0 flows pass before launch",
    "At least 3 successful end-to-end test transactions",
    "B2B inquiry succeeds from submission to admin",
    "Owner completes core admin tasks without a critical blocker",
    "Zero critical payment or shipping blockers at production release"
  ]
}
```
