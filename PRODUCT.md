# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Customer B2B:** Tim product, engineering, design, procurement, startup, dan perusahaan yang membutuhkan partner untuk R&D, konsultasi, desain, prototyping, merchandise, atau dukungan manufaktur. Mereka perlu memahami kapabilitas Niuva, mengirim konteks proyek, lalu melanjutkan konsultasi atau quotation.
- **Customer retail/B2C:** Mahasiswa, hobbyist, pembeli custom gift, customer dengan file 3D, serta customer yang baru memiliki ide atau referensi. Mereka perlu membeli produk ready-made atau mengajukan custom 3D print dengan konteks dan status yang jelas.
- **Owner/Admin Niuva:** Pengguna internal non-teknis yang perlu mengelola inquiry, order, quotation custom print, product, stock, portfolio, dan pekerjaan yang membutuhkan tindakan tanpa menyentuh source code.

MVP melayani ketiga konteks tersebut; belum ada prioritas segmen eksternal yang lebih sempit yang ditetapkan.

## Product Purpose

Niuva adalah website operasional responsif yang menyatukan company profile, project brief B2B, retail ready-made, dan custom 3D print dalam satu pengalaman. Produk membantu customer memilih jalur yang sesuai—Diskusikan Proyek, Custom 3D Print, atau Shop—lalu menyelesaikan inquiry atau transaksi tanpa kehilangan konteks.

Keberhasilan berarti alur B2B, retail, dan custom print dapat dijalankan end-to-end, sementara Owner/Admin dapat menyelesaikan tugas operasional utama tanpa bantuan teknis.

## Positioning

Niuva diposisikan sebagai **product-development partner dengan manufacturing capability**, bukan hanya jasa 3D printing.

Janji utama produk: **Idea → Design → Prototype → Finished Product**.

## Operating Context

- Pengalaman digunakan melalui browser desktop dan mobile.
- Customer memulai dari salah satu dari tiga konteks: memiliki ide atau project, sudah memiliki model 3D, atau ingin membeli produk siap jadi.
- B2B berjalan melalui project brief terstruktur, reference ID, review Owner/Admin, dan kelanjutan komunikasi yang dapat menggunakan WhatsApp.
- Retail berjalan melalui katalog, variant dan stock, cart, guest checkout, shipping, payment, serta order status.
- Custom print berjalan melalui upload privat, konfigurasi awal, review dan slicing oleh operator, quotation, approval, payment, produksi, QC, pengukuran paket final, shipping, dan penyelesaian order.
- Artefak kerja yang perlu dipahami sistem meliputi brief proyek, file 3D, data hasil slicing, quotation, snapshot commercial, payment, shipping, dan riwayat status.

## Capabilities and Constraints

- Public experience menjelaskan company profile, empat layanan Niuva, proses kerja, project atau case study yang didukung bukti, dan tiga entry path.
- B2B project brief memerlukan validasi server, reference ID, attachment privat, visibilitas admin, confirmation state, dan jalur tindak lanjut WhatsApp.
- Retail mendukung katalog, category, product variant, harga, stock, cart, guest checkout, payment, shipping, dan secure order status. Customer account tidak diperlukan pada MVP.
- Custom 3D print mendukung upload STL, 3MF, dan OBJ. STEP/STP hanya menjadi attachment untuk manual review pada MVP.
- Harga custom tidak dihitung final secara otomatis dari geometry file. Operator memverifikasi material, slicer weight, print duration, configuration, dan catatan sebelum sistem membuat quote Pricing v1.
- Owner/Admin menggunakan thin admin dengan Action Queue dan operasi untuk orders, B2B inquiries, custom print reviews, products dan stock, portfolio, serta pricing rules.
- Authentication diwajibkan untuk Owner/Admin. Customer memakai guest flow dan secure token atau reference mechanism untuk status atau quote yang relevan.
- File customer bersifat privat, menggunakan random storage key dan akses bertanda tangan berumur pendek. Batas ukuran upload dan kebijakan retention final belum ditetapkan.
- Catalog, stock, shipping, total, payment notification, dan state transition harus authoritative di server. Nilai komersial penting disimpan sebagai snapshot yang tidak berubah; perhitungan uang harus deterministik.
- Sistem tidak mencakup customer account, automatic slicing, instant geometry pricing, full CMS atau page builder, full inventory/accounting, production scheduler, automated custom shipping sebelum ukuran paket final, atau customer-facing AI pada MVP.

**OPEN — keputusan yang belum boleh diisi diam-diam:**

- Kebijakan pricing untuk 1–49 gram.
- Pricing communal ABS.
- Izin mempublikasikan nama atau logo client dan outcome kuantitatif case study.
- Dataset launch untuk product, SKU, variant, media, dan stock awal.
- Maximum upload size dan final customer-file retention.
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
- Public client permission, verified quantitative case-study outcomes, final launch inventory, dan final retention policy belum tersedia sebagai keputusan yang confirmed.

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
