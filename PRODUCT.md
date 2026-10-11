# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Customer B2B:** Tim product, engineering, design, procurement, startup, dan perusahaan yang membutuhkan partner untuk R&D, konsultasi, desain, prototyping, merchandise, atau dukungan manufaktur. Mereka perlu memahami kapabilitas Niuva, lalu menghubungi tim melalui WhatsApp untuk membahas kebutuhan hingga kesepakatan.
- **Customer retail/B2C:** Mahasiswa, hobbyist, pembeli custom gift, customer dengan file 3D, serta customer yang baru memiliki ide atau referensi. Mereka perlu membeli produk ready-made atau mengajukan custom 3D print dengan konteks dan status yang jelas.
- **Owner/Admin Niuva:** Pengguna internal non-teknis yang perlu mengelola order, quotation custom print, product, stock, portfolio, dan pekerjaan yang membutuhkan tindakan tanpa menyentuh source code.

MVP melayani ketiga konteks tersebut; belum ada prioritas segmen eksternal yang lebih sempit yang ditetapkan.

## Product Purpose

Niuva adalah website operasional responsif yang menyatukan company profile dan kontak WhatsApp B2B, retail ready-made, dan custom 3D print dalam satu pengalaman. Customer dapat melihat layanan untuk kebutuhan proyek, mengajukan Custom Print, atau berbelanja melalui Shop.

Keberhasilan berarti alur B2B, retail, dan custom print dapat dijalankan end-to-end, sementara Owner/Admin dapat menyelesaikan tugas operasional utama tanpa bantuan teknis.

## Positioning

Niuva diposisikan sebagai **product-development partner dengan manufacturing capability**, bukan hanya jasa 3D printing.

Janji utama produk: **Idea → Design → Prototype → Finished Product**.

## Operating Context

- Pengalaman digunakan melalui browser desktop dan mobile.
- Customer memulai dari salah satu dari tiga konteks: memiliki ide atau project, sudah memiliki model 3D, atau ingin membeli produk siap jadi.
- B2B berjalan langsung melalui WhatsApp tanpa login atau Project Brief. Pembahasan awal, negosiasi, finalisasi, dan pencatatan ditangani admin WhatsApp dengan calon klien.
- Retail berjalan melalui katalog, variant dan stock, cart, login Customer (Google atau email/password terverifikasi), checkout, shipping, payment, serta account/order status.
- Custom print berjalan melalui upload privat, konfigurasi awal, review dan slicing oleh operator, quotation, approval, payment, produksi, QC, pengukuran paket final, shipping, dan penyelesaian order.
- Artefak kerja yang perlu dipahami sistem meliputi file 3D, data hasil slicing, quotation, snapshot commercial, payment, shipping, dan riwayat status.

## Capabilities and Constraints

- Public experience menjelaskan company profile, empat layanan Niuva, proses kerja, project atau case study yang didukung bukti, dan tiga entry path.
- CTA B2B memakai **Hubungi Kami** tanpa keterangan tambahan di bawah tombol. Project Brief, proposal akun Customer, dan inquiry Admin tidak termasuk pengalaman aktif fase ini. Data historis tetap mengikuti privasi dan retensi yang berlaku.
- Retail mendukung katalog, category, product variant, harga, stock, cart, checkout setelah login Customer, payment, shipping, dan account/order status. Account Customer read-only termasuk scope MVP.
- Custom 3D print mendukung upload STL, 3MF, dan OBJ. STEP/STP hanya menjadi attachment untuk manual review pada MVP.
- Harga custom tidak dihitung final secara otomatis dari geometry file. Operator memverifikasi material, slicer weight, print duration, configuration, dan catatan sebelum sistem membuat quote Pricing v1.
- Owner pada 11 Oktober 2026 menetapkan shadcn/ui sebagai dasar komponen seluruh halaman Company, Commerce/Customer, dan Admin. Kontrak penerapan dimiliki [DESIGN.md](DESIGN.md); Admin sudah memakai fondasi tersebut, sedangkan pemerataan route lain mengikuti pekerjaan implementasi berikutnya. Keputusan dokumentasi ini tidak menyatakan migrasi global sudah selesai.
- Owner/Admin memakai dashboard shadcn/ui `base-nova` untuk pekerjaan order, review Custom Print, customer, product/stock, konten, keuangan, laporan, dan pengaturan sesuai permission. Navigasi aktif mengikuti `src/modules/admin/navigation-items.ts`; Queue/Pricing lama adalah jalur kompatibilitas, bukan komposisi utama.
- Owner/Admin dilindungi Better Auth dengan MFA wajib; Customer memakai Google atau email/password terverifikasi. Kontrak auth, token/reference akses quote dan status, allowlist pengujian internal, serta gate pendaftaran publik mengikuti addenda [PRD](docs/PRD-Niuva-MVP.md) dan [Tech Design](docs/TechDesign-Niuva-MVP.md). Ringkasan ini tidak mengaktifkan pendaftaran atau provider.
- File customer bersifat privat, menggunakan random storage key dan akses bertanda tangan berumur pendek. Batas file binary 100 MiB dan lifecycle 14/60/90 hari sudah ditetapkan; retensi catatan legal/akuntansi masih terbuka.
- Catalog, stock, shipping, total, payment notification, dan state transition harus authoritative di server. Nilai komersial penting disimpan sebagai snapshot yang tidak berubah; perhitungan uang harus deterministik.
- Sistem tidak mencakup automatic slicing, instant geometry pricing, full CMS atau page builder, full inventory/accounting, production scheduler, automated custom shipping sebelum ukuran paket final, atau customer-facing AI pada MVP.

**CLOSED untuk implementasi lokal:** kebijakan pricing 1–49 gram dan communal ABS
mengikuti [keputusan Pricing v1](docs/backend/phase-3-pricing-biteship-contract.md);
batas upload binary 100 MiB dan lifecycle 14/60/90 hari mengikuti
[keputusan file privat](docs/backend/phase-2-closure-decisions.md). Ini tidak
mengaktifkan pricing rule atau provider produksi.

**OPEN — keputusan yang belum boleh diisi diam-diam:**

- Quantity semantics dan active-rule seeding Pricing v1.
- Izin mempublikasikan nama atau logo client dan outcome kuantitatif case study.
- Dataset launch untuk product, SKU, variant, media, dan stock awal.
- Retensi catatan legal/akuntansi di luar lifecycle file binary.
- Service-level promise untuk custom quotation.
- Kesiapan onboarding, legal, credential, dan pricing live dari provider produksi.

## Brand Commitments

- Nama produk dan brand: **Niuva / Niuva Inovasi Utama**.
- Tagline yang tersedia: **Dari Ide Menjadi Produk Nyata**.
- Bahasa utama pengalaman saat ini adalah Bahasa Indonesia.
- Logo yang digunakan harus berasal dari sistem logo Niuva yang tersedia, termasuk [public/assets/brand/niuva-logo-horizontal-dark.svg](public/assets/brand/niuva-logo-horizontal-dark.svg).
- Komunikasi dan bukti publik harus menggunakan project, product, workshop, process, material, client permission, dan outcome yang benar-benar tersedia. Jangan membuat testimonial, client claim, inventory, pricing decision, atau hasil project.

## Evidence on Hand

- Product requirements dan user journey: [docs/PRD-Niuva-MVP.md](docs/PRD-Niuva-MVP.md).
- Product brief dan build-facing requirements: [agent_docs/project_brief.md](agent_docs/project_brief.md) dan [agent_docs/product_requirements.md](agent_docs/product_requirements.md).
- Existing homepage implementation with positioning, process, four capabilities, and three entry paths: [src/app/page.tsx](src/app/page.tsx).
- Existing Niuva logo assets and logo-system references under `docs/source/brand/` and `public/assets/brand/`.
- Company profile, product portfolio, product-design-services references, dan pricing spreadsheet tersedia di `docs/source/` sebagai factual references.
- Public client permission, verified quantitative case-study outcomes, final launch inventory, dan retensi catatan legal/akuntansi belum tersedia sebagai keputusan yang confirmed.

## Product Principles

1. Position Niuva beyond 3D printing: connect product development with manufacturing capability.
2. Help customers choose the right path and preserve context across inquiry, quote, order, and status.
3. Keep price, stock, shipping, payment, permissions, and state transitions authoritative and reviewable.
4. Protect customer files and preserve immutable commercial snapshots.
5. Prefer real Niuva evidence and operational readiness over unsupported claims or visual-only prototypes.

## Accessibility & Inclusion

- Support responsive desktop and mobile browser use.
- Target WCAG 2.1 AA basics: semantic HTML, keyboard navigation, visible focus, sufficient contrast, descriptive form errors, and meaningful image alternatives.
- Support reduced-motion preferences.
- Use business language that is understandable to non-technical Owner/Admin users.
