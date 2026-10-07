# Product Requirements Document: Niuva MVP

## Product Overview

**App Name:** Niuva  
**Tagline:** **Dari Ide Menjadi Produk Nyata**  
**Version:** MVP 1.0  
**Document Status:** Draft — Ready for Technical Design  
**Document Date:** 21 Agustus 2026  
**Target Launch:** 1–4 minggu setelah development dimulai  
**Platform:** Responsive Web — `niuva.id`

> **Scope expansion addendum — 25 September 2026:** Customer Google OAuth
> sekarang termasuk scope implementasi. `/login` dan `/register` memakai flow
> Google yang sama, `/account` menampilkan profil read-only dan seluruh order
> milik Customer, dan login wajib sebelum checkout termasuk demo/preview. Clerk
> tetap khusus Owner/Admin. Google credential dan redirect URI hanya boleh ada di
> environment non-production yang disetujui; secret tidak masuk repository atau
> chat.

> **Addendum irisan kedua — 27 September 2026:** Customer Google login wajib
> sebelum mengirim Project Brief dan MAKE. Akun menampilkan inquiry, custom
> request, proposal/quote, serta order; keputusan quote dilakukan oleh pemilik
> akun. Ketentuan lengkap ada pada bagian "Customer work, estimasi, dan
> proposal B2B" di bawah. Addendum ini menggantikan batas `/account` yang
> sebelumnya hanya profil dan order.

> **Addendum Target IA — 27 September 2026:** Empat layanan publik memiliki
> detail route dari copy `publicServices`, dengan Project Brief yang terisi
> sesuai layanan tetapi tetap dapat diganti. Project terkait hanya ditautkan
> jika sudah terbit dan memiliki detail yang disetujui. MAKE menjelaskan dua
> mode intake dan menyediakan simulasi biaya komponen awal opsional untuk
> model mesh yang sudah diunggah serta input slicer customer. Kontraknya di
> bawah melengkapi, tanpa mengganti, estimasi operator dan quote final.

> **Addendum riwayat stok — 27 September 2026:** Admin dapat memeriksa
> perubahan saldo stok fisik per varian sejak saldo pembuka migrasi. Riwayat
> mencakup pembuatan varian, impor katalog, penyesuaian Admin, dan konsumsi
> order. Riwayat sebelum saldo pembuka tidak direkonstruksi.

### Riwayat perubahan stok varian

- Setiap perubahan `stockOnHand` menghasilkan satu entri berisi jenis,
  selisih, saldo sebelum/sesudah, waktu, dan sumber. Penyesuaian manual wajib
  menyimpan alasan dan pelaku Admin; konsumsi stok menautkan order dan
  reservasi yang bersangkutan. Saldo pembuka bertanggal adalah batas awal
  rekonsiliasi bagi varian yang sudah ada saat migrasi.
- Admin melihat stok fisik, reservasi aktif, dan jumlah tersedia sebagai tiga
  angka terpisah, serta riwayat berpaginasi per varian. Form menolak saldo
  lama, penyesuaian tanpa perubahan, dan hasil yang lebih kecil dari reservasi
  aktif. Perubahan stok dan riwayatnya harus atomik.
- Pembuatan atau pelepasan reservasi hanya mengubah jumlah tersedia; saldo
  fisik berubah saat reservasi dikonsumsi. Refund tidak otomatis menambah stok;
  pengembalian fisik, jika terjadi, dicatat sebagai penyesuaian Admin dengan
  alasan. Ini tetap riwayat stok sederhana, bukan warehouse ledger lengkap.

### Customer Pre-Review Simulation dan IA layanan

- `/services/[slug]` hanya untuk empat layanan publik yang disetujui. Input
  yang dibutuhkan dan CTA Project Brief disajikan sesuai layanan. Project
  `card-only` tetap dapat tampil sebagai kartu di `/projects`, tetapi tidak
  ditautkan sebagai halaman detail dari layanan. Project tidak terbit tidak
  muncul di publik.
- Pada `MODEL_READY`, customer boleh memasukkan berat gram dan durasi cetak
  **per unit** dari slicer sendiri. Material PLA/ABS dan jumlah berasal dari
  form; simulasi menggunakan filament stok Niuva. Input ini bersifat opsional.
  `.stl`, `.obj`, dan `.3mf` yang sudah diunggah secara privat dapat
  menghasilkan simulasi bila tepat satu aturan Pricing v1 aktif valid.
  `.step`/`.stp`, foto, `REFERENCE_ONLY`, data yang belum lengkap, atau aturan
  harga yang tidak memenuhi syarat menghasilkan **Perlu review**. Tidak ada
  slicing atau analisis geometri otomatis oleh Niuva.
- **Simulasi biaya awal** hanya menunjukkan komponen material dan waktu mesin
  indikatif dari angka customer. **Estimasi awal, bukan harga final.** Saat
  submit, server menghitung ulang dan menyimpan hasil saat itu bersama request;
  angka yang mungkin pernah tampil di browser bukan otoritas. Snapshot awal
  tetap terlihat sebagai riwayat dan ditandai belum diverifikasi.
- Tiga tingkat harga tetap terpisah: (1) simulasi komponen customer sebelum
  review, (2) estimasi produksi operator 100%–130% setelah review dan penilaian
  biaya, (3) quotation komersial final. Simulasi customer tidak menentukan
  estimasi operator, quote, order, ongkir, atau nominal pembayaran. Revisi dan
  keputusan komersial mengikuti kontrak irisan kedua.
- Tanpa R2, mode referensi berbasis deskripsi/link masih dapat dikirim selama
  database serta login tersedia. Upload foto, model siap, dan simulasi yang
  memerlukan file tampil sesuai kapabilitas environment. Status DEVELOP pada
  akun adalah status inquiry/proposal, bukan pelacakan eksekusi proyek B2B.

### Customer work, estimasi, dan proposal B2B — irisan kedua

- Inquiry dan MAKE baru langsung dimiliki satu Customer dari sesi Google.
  Kontak operator tetap diisi form, sedangkan email yang disimpan berasal dari
  sesi terverifikasi. Record lama hanya dapat diklaim sekali dengan token privat
  yang pernah diterbitkan; kecocokan email saja tidak cukup. Klaim mencabut
  token lama. Akses bersama antaranggota perusahaan belum termasuk.
- `/account` menampilkan daftar/detail status Project Brief, MAKE, quote, dan
  order. Pemilik request referensi dapat menambahkan model pada request yang
  sama. Tanpa R2, request referensi berbasis deskripsi/link tetap dapat dikirim
  jika database dan login tersedia.
- MAKE menampilkan **Perlu review** sampai model terverifikasi, slicer operator
  tercatat, Pricing v1 aktif, dan semua biaya pekerjaan dinilai. Operator
  mengisi pos tambahan bernama atau menyatakan secara eksplisit bahwa tidak
  ada pos tambahan. Dasar Pricing v1 ditambah pos itu secara Decimal; kisaran
  produksi non-mengikat adalah **100%–130%** dengan pembulatan total akhir.
  Faktor ini kebijakan awal Owner dan belum terbukti terkalibrasi oleh riwayat
  pekerjaan. Setiap publikasi menyimpan versi dan snapshot sumber input,
  pricing rule, pos biaya, serta operator. Revisi memerlukan versi baru.
- Quote custom final tetap tindakan operator, memakai pos yang dibekukan, dan
  harus berada dalam kisaran estimasi terbaru. Customer pemilik dapat menerima
  atau menolak quote terbaru dari akun. Order payable hanya dibuat oleh
  penerimaan quote yang valid; order langsung dimiliki Customer tersebut.
  Pada irisan ini total quote mengikuti total biaya yang telah dinilai operator;
  perubahan nominal memerlukan estimasi baru dengan pos biaya yang jelas.
  Token quote historis tetap berlaku hanya untuk record yang belum diklaim.
  Klaim request lama juga menautkan order custom lama yang masih belum memiliki
  pemilik, selama tidak ada order dari request tersebut milik akun lain.
- Ongkir kasar memakai berat, dimensi, dan nilai paket perkiraan dari operator
  serta tujuan yang diisi Customer saat meminta rate. Opsi kurir dari Biteship
  testing ditampilkan sebagai rentang terpisah bersama asumsi paket dan waktu
  pengecekan. Jika data/provider testing tidak tersedia, tampilkan **Ongkir
  menyusul**. Angka kasar tidak masuk estimasi produksi, quote, order, atau
  pembayaran; ongkir yang ditagih tetap dari paket final. Check Rates testing
  memiliki biaya per panggilan, sehingga cache dan pembatasan frekuensi wajib.
- Proposal B2B adalah scope, asumsi, pos IDR, total, dan masa berlaku yang
  diterbitkan operator sebagai versi snapshot. Pemilik inquiry menerima atau
  menolaknya di akun; persetujuan tercatat dengan akun, versi, dan waktu untuk
  tindak lanjut manual. Ini tidak membuat order, invoice, kontrak, atau
  pembayaran. Status inquiry WON/LOST tetap diputuskan Admin.

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
- Confidentiality acknowledgment

Optional:

- Company
- Budget range
- Preferred service
- Target deadline, jika sudah diketahui
- File/reference upload or link pada tahap IDEA; pada tahap lain salah satunya wajib

### After Submission

System:

1. membuat inquiry/reference ID;
2. menyimpan project brief;
3. menampilkan confirmation;
4. memungkinkan customer melanjutkan komunikasi melalui WhatsApp menggunakan reference ID;
5. menampilkan inquiry pada admin dashboard.

**Implementation status (2026-09-14):** jalur berbasis link sudah terhubung dari
form publik ke `/api/project-brief`, persistence `B2BInquiry`, reference
confirmation, dan signal `B2B_INQUIRY` pada server-owned Action Queue. Handoff
WhatsApp memakai reference number. Capability-aware private binary attachment
dan Shop → Product → Cart → Checkout server flow sudah diimplementasikan pada
jalur lokal, tetapi live R2 object smoke, active Clerk tenant login, sandbox
payment/shipping, dan visual/production acceptance tetap merupakan gate
terpisah. Route-to-test-database smoke untuk persistence, audit, queue
projection, dan database-owned `AdminProfile` mapping sudah diverifikasi pada
integration harness; live tenant/provider smoke tetap membutuhkan environment
non-production yang disiapkan Owner.

---

# User Journey 2 — Ready-Made Retail

```text
Shop
→ Category
→ Product
→ Variant
→ Stock Check
→ Add to Cart
→ Customer Login/Register
→ Checkout
→ Shipping Address
→ Shipping Rate
→ Payment
→ Confirmation
→ Order Status
```

Customer wajib login sebelum checkout dengan email/password terverifikasi atau Google.
`/login` dan `/register` menyediakan kedua metode; `/verify-email` menyelesaikan
pendaftaran email. Clerk tetap khusus Owner/Admin. `/account` menampilkan nama, email terverifikasi,
avatar opsional, serta riwayat order retail dan custom print secara read-only.

Order guest lama yang belum memiliki Customer dapat ditautkan ketika login
pertama jika emailnya sama setelah normalisasi `trim().toLowerCase()`. Order
yang sudah dimiliki Customer lain tidak pernah ditimpa dan konflik identity
tidak di-auto-merge.

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

### 4. Cart & Customer Checkout

- **What:** Checkout retail setelah Customer login dengan Google.
- **User Story:** Sebagai customer, saya ingin login sekali dengan Google lalu menyelesaikan pesanan dan melihat riwayat order.
- **Priority:** P0 — Critical

#### Success Criteria

- [ ] User dapat Add to Cart.
- [ ] User dapat update quantity.
- [ ] User dapat remove item.
- [ ] Total product dihitung dengan benar.
- [ ] Checkout meminta contact dan shipping information.
- [ ] Order dibuat sebelum pembayaran.
- [ ] Duplicate checkout/payment tidak membuat duplicate paid order.
- [ ] Customer session wajib sebelum shipping rates dan checkout.
- [ ] Email order berasal dari Google session, bukan input browser.

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

#### Intake awal berbasis referensi

- Customer dapat memilih `MODEL_READY` untuk file model 3D/CAD atau `REFERENCE_ONLY` bila baru memiliki deskripsi, sketsa, foto, atau link. Klien lama tanpa mode tetap masuk `MODEL_READY`.
- Pada `REFERENCE_ONLY`, deskripsi kebutuhan dan perkiraan jumlah wajib. Material boleh dinyatakan perlu rekomendasi. Link HTTPS dan satu foto JPG/JPEG/PNG privat (maksimal 10 MiB) opsional; tanpa storage privat, deskripsi/link tetap dapat dikirim selama database tersedia.
- Request mendapat nomor referensi dan tautan status privat. Pemegang token dapat menambahkan model pada request referensi yang sama sebelum review slicer; STL meminta konfirmasi unit/skala ketika model ditambahkan. Token dapat diterbitkan ulang oleh Admin setelah verifikasi identitas manual dan token lama dicabut.
- Foto, link, dan deskripsi hanya bahan triase. Review slicer dan quote membutuhkan model 3D/CAD terverifikasi serta penilaian operator. Intake ini tidak otomatis menjadi pekerjaan desain berbayar, quote, atau order.

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

- **What:** Overview operasional dan Action Queue untuk menjalankan MVP. Owner menyetujui prototype visual terpisah pada 2026-09-26; penerimaan visual route live masih menunggu review.
- **User Story:** Sebagai Owner/Admin, saya ingin mengetahui order mana yang membutuhkan tindakan agar saya dapat mengoperasikan bisnis tanpa membuka database atau source code.
- **Priority:** P0 — Critical

#### Sections

```text
/admin
├── Overview Dashboard (jumlah pekerjaan terbuka, tiga hitungan status, aktivitas 30 hari, lima prioritas, tabel kerja)
├── /admin/queue — Action Queue lengkap, maksimal 50 item per kelompok
├── Orders
├── B2B Inquiries
├── Custom Print Reviews
├── Products & Stock
├── Portfolio
└── Pricing Rules
```

Overview dan Action Queue membaca proyeksi server setelah otorisasi `AdminProfile` aktif. Jumlah pekerjaan terbuka dihitung sebelum batas 50 item. Kelompok `all`, `inquiries`, `custom-print`, dan `orders` difilter di server sebelum batas hasil. Grafik menghitung brief, permintaan custom, dan order yang **dibuat** per hari kalender selama 30 hari termasuk hari ini menurut `Asia/Jakarta`; hari tanpa aktivitas bernilai nol. Overview tidak memuat identitas kontak, alamat, file privat, rincian pembayaran, atau JSON provider. Data itu tetap berada pada detail berizin.

**Addendum Overview analytics — 2026-09-28.** Komposisi baru mengambil ritme frame Dashboard Overview terang dari referensi Figma: sidebar kiri dan header bersama untuk semua halaman Admin, area laporan utama, dan panel kanan untuk lima prioritas Action Queue serta aktivitas operasional terbaru. Warna, tipografi, logo, dan aksesibilitas tetap mengikuti `DESIGN.md`. Bukti penerimaan visual sebelumnya adalah riwayat untuk tampilan lama; tampilan baru belum ditinjau Owner.

Empat metrik utama pada `/admin` ialah tayangan route publik, brief B2B dibuat, permintaan custom print dibuat, dan order dibayar. Tiga metrik bisnis dihitung dari `B2BInquiry.createdAt`, `CustomPrintRequest.createdAt`, dan `Order.paidAt` dalam periode `30d` (awal) atau `13m`; order tetap dihitung setelah statusnya berlanjut. Filter pekerjaan `group` tetap berlaku saat periode berubah. Grafik traffic memakai hitungan agregat harian atau bulanan, diikuti sumber masuk, perangkat, negara, dan kelompok halaman. Angka traffic adalah perkiraan karena bot/pemblokir; tidak ada unique visitors, visits, active users, rasio konversi, atau atribusi order ke sumber traffic.

Pengumpulan `public_page_view` hanya untuk route publik yang diizinkan dan mati secara default. Satu pemuatan/perpindahan route menghasilkan satu hit tanpa visitor ID, cookie analitik, URL penuh, query, token, IP tersimpan, email, atau backfill. Negara dua huruf berasal dari header platform bila tersedia, selain itu `Tidak diketahui`. Agregat yang lebih lama daripada 13 bulan kalender laporan dihapus harian. Aktivasi produksi memerlukan pemberitahuan privasi yang ditinjau Owner/legal dan pembuktian batas laju di edge; lihat [draf pemberitahuan](frontend/analytics-privacy-notice-draft.md).

Estimasi diagnostik kesiapan awal `47/100 (Broken)` berasal dari perencanaan sebelum instrumentasi dan bukan metrik produk yang terukur. Hasil uji lokal tidak mengesahkan kualitas traffic produksi; angka traffic baru boleh dipakai untuk keputusan setelah pengumpulan produksi, pemeriksaan kualitas, dan review privasi selesai.

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
- Basic inventory adjustment history — diimplementasikan lokal sebagai
  riwayat seluruh perubahan saldo stok fisik sejak saldo pembuka.
- Courier booking dari dashboard.
- Richer order email templates.
- Customer order-status search dengan verification.
- Analitik bisnis lanjutan di luar aktivitas operasional 30 hari.

Fitur ini tidak boleh menunda P0.

---

# Out of Scope (Not in MVP)

### Customer Account

Customer Account kini mencakup pemantauan inquiry, MAKE, quote, dan order serta
keputusan quote sesuai addendum irisan kedua. Edit profil, password login,
account recovery, dan kepemilikan bersama antaranggota perusahaan tetap di
luar scope.

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
| Customer Auth | Google OAuth custom; checkout wajib Customer session |
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

Binary upload limit/lifecycle sudah ditutup untuk implementasi melalui
`docs/backend/phase-2-closure-decisions.md`: 100 MiB dengan handling 14/60/90
hari. Retensi record finansial/order dan keputusan legal/accounting tetap
membutuhkan konfirmasi Niuva.

Draft dari research:

- abandoned upload: 7–14 hari;
- cancelled/unpaid quote: 30–60 hari;
- completed model: sekitar 90 hari kecuali ada kebutuhan retention lain;
- financial/order records mengikuti kewajiban legal/accounting terpisah.

Nilai final untuk retensi record di luar lifecycle binary tetap **TBD setelah
konfirmasi owner/compliance**.

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
   - Keputusan implementasi: tidak ada minimum 50 g; rujuk
     `docs/backend/phase-3-pricing-biteship-contract.md`. Active-rule seed dan
     aktivasi provider tetap menjadi gate.

2. **Communal ABS pricing**
   - Pricing brief menyebut Rp700/g.
   - Spreadsheet belum sepenuhnya eksplisit.
   - Keputusan implementasi: ABS communal Rp700/g tanpa machine charge; rujuk
     `docs/backend/phase-3-pricing-biteship-contract.md`. Jangan memilih nilai
     baru atau menganggap rule sudah aktif sebelum seed diverifikasi.

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
   - Lifecycle binary 100 MiB/14/60/90 hari mengikuti
     `docs/backend/phase-2-closure-decisions.md`.
   - Retensi record legal/accounting di luar binary lifecycle tetap **TBD**.

7. **Exact launch inventory**
   - SKU, product, variant, image, stock awal yang akan dipublikasikan perlu final dataset.
   - **TBD.**

8. **Custom quotation SLA**
   - Berapa lama customer dijanjikan mendapatkan review/quote?
   - **TBD.**

9. **Official company biodata**
   - Data resmi identitas legal, alamat, kontak, dan detail usaha belum
     tersedia.
   - **DEFERRED.** Jangan mempublikasikan company profile/legal claims atau
     mengisi identitas bisnis provider dengan nilai sintetis; fixture yang jelas
     non-production tetap boleh dipakai untuk pengujian teknis.

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
- [x] Google Customer login/register dan mandatory Customer checkout bekerja
  pada gate teknis lokal; live Google smoke tetap menjadi readiness gate.
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
4. Verifikasi active seed untuk keputusan Pricing v1 yang sudah tercatat;
   jangan membuka kembali nilainya tanpa keputusan owner baru.
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
    "Cart & Customer Checkout",
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


## Addendum Customer authentication — 1 Oktober 2026

Keputusan Owner memperluas autentikasi Customer menjadi email/password plus
Google dan menggantikan pembatasan Google saja pada teks historis dokumen ini.
Register, Login, dan Verifikasi mengikuti struktur Figma dengan identitas Niuva
serta copy Bahasa Indonesia. Pemulihan password merupakan bagian alur ini.

- Email/password: nama, email, password 8–128 karakter, konfirmasi, dan
  persetujuan versi Syarat Layanan/Kebijakan Privasi resmi. Tidak ada sesi atau
  akses pesanan sebelum email diverifikasi; verifikasi tidak otomatis login.
- Pendaftaran baru belum aktif selama dokumen kebijakan belum disediakan.
  Login akun yang sudah ada tetap mengikuti capability metode masing-masing.
- Login Google tidak menggabungkan akun password yang emailnya sama.
- Verifikasi berlaku 24 jam; reset 30 menit. Reset mencabut seluruh sesi akun.
- Ingat saya pada login password: 30 hari; tanpa pilihan itu: cookie sesi browser
  dengan batas server 24 jam. Google mempertahankan sesi 30 hari.
- Mock pengiriman dan fixture kebijakan hanya untuk test terisolasi di database
  test loopback. Runtime normal tidak mengklaim email terkirim tanpa provider.
- Pengiriman Development nyata memerlukan konfigurasi aman. Aktivasi production,
  provider acceptance, device/AT, dan penerimaan visual tetap terpisah.
## Addendum pengujian autentikasi internal — 2 Oktober 2026

Owner menyetujui pengujian nyata Google dan email/password untuk dua alamat
milik sendiri pada Development loopback dengan database lokal `niuva_dev`.
Pendaftaran dibatasi per metode menggunakan allowlist server dan persetujuan
Ketentuan Pengujian Internal serta Pemberitahuan Privasi Pengujian berversi.
Dokumen tersebut tidak membuka pendaftaran publik; dokumen komersial tetap draf
dan identitas usaha, kontak resmi, pembatalan/refund, serta retensi legal tetap TBD.

Akses akun baru pengujian berakhir 30 hari sejak Customer dibuat; login tidak
memperpanjang tenggat. Pendaftaran pending memiliki tenggat sendiri 30 hari sejak
dimulai. Profil, credential, sesi, token, dan persetujuan lokal dibersihkan pada
jadwal berikutnya yang berhasil. Pesanan, brief, Custom Print, quote, unggahan,
dan catatan provider tidak termasuk penghapusan akun ini. Akun lama tidak ditandai
otomatis. Pengiriman Resend nyata dan penerimaan inbox harus dilaporkan terpisah
dari keberhasilan mock, pemeriksaan otomatis, dan penerimaan visual.

## Addendum draf policy dan pusat privasi Customer — 2 Oktober 2026

Identitas PT. NIUVA INOVASI UTAMA, alamat profil Ekraf dan kontak Owner serta
keputusan keluhan/refund kini tercatat pada draf legal versi v2 di `docs/legal/`.
Addendum ini menggantikan status TBD atas fakta tersebut pada addendum internal
sebelumnya, tanpa menerbitkan dokumen resmi atau membuka pendaftaran publik.

Customer Development/test memiliki `/account/privacy`: JSON milik sendiri,
koreksi, data tambahan, dan penutupan permanen dengan konfirmasi email sekali
pakai. Owner menangani permintaan di `/admin/privacy`; akses/koreksi memiliki
tenggat 3×24 jam kalender sejak diterima. SLA keluhan pesanan hari kerja berbeda.
Penutupan tetap diterima saat pesanan/kasus aktif, mempertahankan kontak
terverifikasi untuk penyelesaian. Tidak ada pemulihan akun/riwayat otomatis saat
daftar ulang. Preview draf hanya Owner, tidak masuk persetujuan pendaftaran.

Isi kasus selesai 7 hari, bukti minimum 30 hari, penahanan terdokumentasi dengan
penanggung jawab dan tanggal peninjauan. Data transaksi dan kelas berkas 14/60/90
hari tetap terpisah. Detail operasional, provider lokal, batas implementasi dan
prasyarat publikasi di `docs/legal/customer-policy-implementation.md`. Usia 18,
retensi pembukuan, backup/provider produksi, proses refund/retur dan tinjauan
legal merupakan prasyarat publikasi; tahap ini tidak mengubah B2B menjadi WA,
melakukan refund otomatis, deployment ataupun penerimaan legal.

## Addendum persiapan Customer publik — 3 Oktober 2026

Keputusan Owner menetapkan target **pendaftaran publik penuh**, dengan Google
dan email/password terverifikasi, menggantikan target pilot Customer undangan.
Target akun mencakup **semua usia** dan menggantikan pembatasan umum 18+ pada
draf/prasyarat 2 Oktober. Kelayakan akses anak per kelompok usia/fitur, penilaian
risiko PP TUNAS/aturan pelaksana, verifikasi yang proporsional dan persetujuan
orang tua/wali yang dapat dibuktikan merupakan prasyarat, bukan izin membuka
pendaftaran tanpa mekanisme tersebut. Pihak yang menyepakati transaksi anak,
memberi persetujuan pembayaran, menerima refund dan menjalankan hak data harus
ditetapkan melalui review legal serta diverifikasi oleh layanan.

Refund versi pertama tetap **penuh**, dengan alur Customer mengajukan, Owner
memeriksa dan menyetujui setelah syarat retur yang relevan terpenuhi, lalu
aplikasi mengirim dan memantau hasil melalui rekonsiliasi. Persetujuan bersyarat
sebelum retur tidak memberi izin kirim sebelum syaratnya terpenuhi. Nominal
berasal dari pembayaran server; ongkir yang menjadi tanggung jawab Niuva di
luar pembayaran awal dicatat terpisah. Pilihan metode pembayaran tetap luas;
metode tanpa refund API, window habis dan kegagalan provider mempunyai
pengecualian manual yang disetujui serta bukti rekonsiliasi agar tidak terjadi
refund ganda. API accepted tidak otomatis menyelesaikan kasus. Kasus keuangan
pasca-pengiriman tidak memaksa pembalikan lifecycle order atau stock.

Keputusan layanan tetap 1 hari kerja tanggapan awal, 2 hari kerja pemeriksaan
setelah bukti lengkap/retur yang diperlukan, serta mulai refund 1 hari kerja
setelah persetujuan dan syarat retur terpenuhi; Senin–Jumat selain libur
nasional, WIB. Kalender/jam, petugas/pengganti dan alamat retur harus dikonfirmasi.
Akses/koreksi privasi tetap 72 jam kalender sejak penerimaan awal tanpa reset
melalui status/kanal. Closure mencabut akses dan tidak menautkan kembali riwayat
saat daftar ulang; pesanan/kasus/refund aktif tetap diselesaikan melalui kontak
terverifikasi dan dasar pemrosesan yang tepat.

Batch pertama menghasilkan **draf policy dan paket operasional untuk review**.
[Paket kesiapan publik](legal/customer-public-launch-readiness.md) memiliki
matriks pemilik/bukti/syarat penutupan; [SOP layanan/refund](legal/customer-service-refund-sop.md),
[SOP privasi/retensi](legal/customer-privacy-retention-sop.md),
[kontrak implementasi](legal/customer-public-runtime-contract.md) dan
[simulasi](legal/customer-public-policy-validation.md) menetapkan pekerjaan
berikutnya. Draf Syarat/Privasi v3 belum berlaku dan tidak menjadi dokumen
pendaftaran publik. Review Owner/legal final dan tanggal berlaku masih diperlukan.

Implementasi publik, consent kedua metode, mekanisme anak/wali, privacy hosted,
refund provider, outbox dengan retry dan job hosted **belum tersedia** pada
baseline PR #38. Guard internal/allowlist serta dokumen persetujuan pengujian
30 hari tetap berlaku pada runtime sekarang. Pilihan proyek staging terpisah
dan outbox durable dipertahankan sebagai target. Tahap berikutnya: implementasi
dan CI → staging/provider/recovery → publikasi policy resmi → aktivasi
production setelah instruksi rilis eksplisit. Merge/build bukan penerimaan
legal/provider atau izin deployment/credential production.

Input Owner lanjutan 3 Oktober: **Rheza** adalah petugas utama layanan Customer,
privasi dan tindak lanjut pembayaran/refund; approval refund tetap Owner sesuai
izin. Alamat profil **Jl. Telekomunikasi No.1, Sukapura, Kec. Dayeuhkolot,
Kabupaten Bandung, Jawa Barat** dikonfirmasi juga sebagai alamat retur. Detail
penerima/jam akan diisi Owner; pengganti serta coverage kalender belum ditetapkan.
Penugasan operasional tidak otomatis memberikan role atau permission aplikasi.

Review kewajiban dilakukan berbasis sumber resmi dan dapat disiapkan secara
internal; perekrutan konsultan hukum/akuntansi formal bukan prasyarat mulai
pekerjaan kode. Kelayakan akun anak, assurance wali, kewajiban penilaian/
pelaporan yang berlaku, retensi dan bukti provider tetap dipenuhi sebelum
kemampuan terkait diaktifkan. [Catatan input/bukti](legal/customer-public-input-evidence.md)
menyimpan fakta yang sudah dikonfirmasi dan kebutuhan tersisa, sehingga input
yang sama tidak diminta berulang atau dianggap menutup seluruh gate publik.

## Addendum 6 Oktober 2026 — Auth Admin pada hosting NIUVA

Owner menyetujui penggantian Clerk untuk Owner/Admin dengan **Better Auth core**,
berjalan pada hosting NIUVA dan PostgreSQL. Target awal adalah 10 akun pribadi;
role setiap akun tetap ditentukan Owner secara eksplisit. Login memakai
email/password dan authenticator TOTP wajib, dengan kode pemulihan sekali pakai.

Registrasi Admin publik tetap tertutup. Penggantian engine auth tidak mengubah
hak Owner/Admin, business logic DEVELOP/MAKE/BUY, ataupun scope/lifecycle Customer.
ID AdminProfile dan riwayat bisnis tetap dipertahankan; mapping akun Clerk lama
ke identitas baru harus eksplisit. Login baru memerlukan verifikasi email dan
enrollment MFA, bukan pemindahan password/MFA atau sesi Clerk.

Email auth Admin menggunakan adapter SMTP lokal tanpa fallback Resend.
Pemilihan/aktivasi provider, deployment, dan provisioning akun nyata tetap
memerlukan instruksi Owner tersendiri. Implementasi dan batas aktivasi dicatat
pada [runbook migrasi](backend/admin-auth-migration.md). Addendum ini menggantikan
ketentuan terdahulu yang menetapkan Clerk sebagai engine sesi Owner/Admin.

## Addendum 7 Oktober 2026 — Tambah Admin melalui undangan Owner

Owner menyetujui halaman Tambah Admin di Dashboard dengan undangan email;
penerima membuat password sendiri. Hanya Owner aktif dengan MFA terverifikasi
yang dapat mengundang. Akun hasil undangan selalu berperan Admin, dengan
authenticator wajib sebelum mengakses Dashboard. Registrasi Admin publik tetap
tidak tersedia; pembuatan Owner tetap melalui provisioning tepercaya.

Undangan berlaku 30 menit dan sekali pakai. Undangan gagal kirim atau kedaluwarsa
dapat dikirim ulang melalui halaman yang sama. Email yang sudah memiliki akun
tidak diubah. SMTP yang belum lengkap harus terlihat sebagai kondisi belum
tersedia, tanpa klaim pengiriman berhasil. Kontrak dan batas validasi lokal ada
pada [runbook undangan Admin](backend/admin-invitations.md).

Owner menetapkan panjang password Admin baru menjadi **8–15 karakter** pada
7 Oktober 2026. Aturan ini berlaku pada provisioning Owner/Admin, aktivasi
undangan, reset, dan perubahan password. Password existing tetap dapat digunakan
untuk login dan verifikasi ulang; authenticator wajib tetap berlaku.
