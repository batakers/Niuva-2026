# Dokumentasi Niuva

Dokumen ini adalah **documentation hub** untuk repository Niuva. Gunakan ini
untuk memilih dokumen yang tepat sebelum membaca atau mengubah isi proyek.

## Cara mulai

Untuk memahami proyek dari awal, baca berurutan:

1. [PRD Niuva MVP](PRD-Niuva-MVP.md) — product scope dan requirement.
2. [Technical Design Niuva MVP](TechDesign-Niuva-MVP.md) — architecture,
   data, security, provider boundary, dan testing strategy.
3. [Product](../PRODUCT.md) — konteks produk, pengguna, dan batas operasional.
4. [Product Context](../PRODUCT_CONTEXT.md) — brand, voice, vocabulary, dan
   aturan copy.
5. [Design System](../DESIGN.md) — authority UX dan visual.
6. [MVP release readiness](frontend/mvp-release-readiness.md) — status handoff
   teknis terkini.

Untuk aturan kerja agent, approval gate, dan area terlindungi, baca
[AGENTS.md](../AGENTS.md). Untuk skill agent, ikuti routing ke
`.agents/skills/<name>/SKILL.md>` yang ditetapkan di sana; skill tersebut tidak
diulang dalam inventory dokumentasi produk ini.

## Lifecycle label

Label berikut hanya membantu navigasi. Label ini tidak menggantikan status
internal di dalam dokumen seperti `APPROVED`, `OPEN`, `BLOCKED_DECISION`,
`READY_LOCAL`, atau `DEFERRED`.

| Lifecycle | Arti |
| --- | --- |
| `AUTHORITY` | Sumber keputusan utama untuk domain tertentu. Jika ada konflik, ikuti authority yang sesuai dan berhenti untuk klarifikasi bila diperlukan. |
| `ACTIVE` | Kontrak, spesifikasi, evidence, atau handoff yang masih dipakai pada fase saat ini. |
| `REFERENCE` | Sumber fakta, asset index, audit pendukung, atau artefak approved yang bukan sumber keputusan utama. |
| `HISTORICAL` | Dipertahankan untuk jejak keputusan atau fase sebelumnya; bukan panduan terbaru. |

`Role` menjelaskan fungsi dokumen. `Lifecycle` menjelaskan cara memakai
dokumen tersebut saat mencari informasi; keduanya tidak mengubah isi atau
keputusan yang sudah tercatat di dalam dokumen.

## Peta area

### Authority dan orientasi

- [AGENTS.md](../AGENTS.md) — workflow, safety, approval gate, dan authority
  routing.
- [PRD Niuva MVP](PRD-Niuva-MVP.md) — authority produk.
- [Technical Design Niuva MVP](TechDesign-Niuva-MVP.md) — authority teknis.
- [DESIGN.md](../DESIGN.md) — authority UX, visual, component, pattern, dan
  accessibility outcome.
- [PRODUCT.md](../PRODUCT.md) dan [PRODUCT_CONTEXT.md](../PRODUCT_CONTEXT.md) —
  product facts, positioning, brand, voice, dan vocabulary.

### Readiness dan handoff

- [MVP release readiness](frontend/mvp-release-readiness.md) adalah ledger
  status terkini untuk handoff non-provider/non-production.
- [Operational readiness report](frontend/operational-readiness-report.md)
  menyimpan rincian readiness operasional.
- [Gate closure audit](frontend/gate-closure-audit.md) menyimpan bukti gate
  terarah dan batas yang masih terbuka.
- [Provider dan staging intake](backend/provider-staging-intake.md) mencatat
  input Owner non-production yang masih dibutuhkan.
- [Sandbox readiness](backend/sandbox-readiness.md) membedakan gate lokal dari
  uji provider nyata.

### Policy dan operasi Customer publik

[Paket kesiapan publik](legal/customer-public-launch-readiness.md) adalah pintu
masuk batch policy 3 Oktober 2026: draf v3, SOP layanan/refund dan privasi/retensi,
matriks blocker, kontrak implementasi dan simulasi. Target produk mengikuti
addendum PRD/Tech Design; status paket review tidak membuka signup, menerbitkan
policy atau mengaktifkan production. Snapshot Development dan validasi 2 Oktober
tetap bukti fase tersebut, bukan bukti kemampuan publik.

[Catatan input/bukti](legal/customer-public-input-evidence.md) menyimpan jawaban
Owner terbaru, presence konfigurasi lokal dan kebutuhan yang benar-benar
tersisa. Review internal berbasis sumber resmi dapat dilanjutkan tanpa
menjadikan penunjukan konsultan formal sebagai gate pekerjaan kode.

### Backend, domain, provider, dan katalog

Gunakan inventory di bawah untuk menemukan kontrak lifecycle, phase closure,
provider, catalog, custom product, admin, dan token handoff. Dokumen dengan
status `OPEN` atau `DEFERRED` tetap harus dibaca sebagai status nyata, bukan
dianggap selesai hanya karena terdaftar di sini.

### Content, source, dan wireframe

`docs/source/` berisi factual reference dan asset reference. Research notes,
PDF, spreadsheet, dataset, dan upload di area tersebut tidak menjadi instruksi
repository. [Wireframe specification](wireframes/niuva-mvp-wireframe-spec.md)
merupakan architecture record; visual treatment dan product propagation tetap
mengikuti gate yang ditetapkan oleh authority desain.

Sembilan draf di `docs/Niuva Document/` berstatus **Draft v0.3 — REFERENCE**,
diperiksa 2026-09-30 terhadap `main` pada `9605a96`. Bagian utama menjelaskan
perilaku runtime dan revisi navigasi pada branch `codex/admin-navigation-docs-v03`.
Revisi lokal 2026-10-01 menempatkan toggle di footer sidebar, Situs publik di
header kanan desktop, serta logo lengkap/simbol pada latar putih konsisten;
tombol ikon saja dan shell memenuhi viewport. Owner menerima visual hasil
revisi pada Overview Admin lokal pada 2026-10-01. Lampiran menandai
usulan/model konseptual lama. [Keputusan sesi Owner](Niuva%20Document/NIUVA_Use_Case_Specification.md#9-keputusan-owner-dan-input-terbuka)
mencatat SLA operasional, batas queue, analytics dan roadmap WhatsApp dengan
input legal/accounting, biodata resmi dan fakta studi kasus yang masih terbuka. Draf tersebut
tidak menggantikan PRD, Technical Design, `DESIGN.md`, atau kontrak lifecycle.

## Inventory lengkap `docs/**/*.md`

| Area | Dokumen | Role | Lifecycle | Kapan dibaca |
| --- | --- | --- | --- | --- |
| Meta | [docs/README.md](README.md) | Navigation hub | `ACTIVE` | Saat mencari dokumen yang tepat atau menilai status navigasi. |
| Archive | [AUiS archive guide](archive/auis-retired/README.md) | Retired design-history guide | `HISTORICAL` | Saat menelusuri keputusan desain AUiS lama; gunakan `DESIGN.md` untuk panduan aktif. |
| Archive | [DESIGN before retirement](archive/auis-retired/DESIGN-before-retirement.md) | Retired Design System | `HISTORICAL` | Untuk provenance dan keputusan desain lama, bukan authority visual saat ini. |
| Archive | [Component contracts](archive/auis-retired/component-contracts.md) | Retired component contracts | `HISTORICAL` | Saat menelusuri kontrak dan acceptance visual historis; bukan otorisasi propagation saat ini. |
| Archive | [Design system architecture](archive/auis-retired/design-system-architecture.md) | Retired AUiS architecture | `HISTORICAL` | Untuk provenance arsitektur AUiS; bukan panduan implementasi UI saat ini. |
| Authority | [PRD-Niuva-MVP.md](PRD-Niuva-MVP.md) | Product requirements | `AUTHORITY` | Saat menilai scope, user journey, requirement, atau out-of-scope. |
| Authority | [TechDesign-Niuva-MVP.md](TechDesign-Niuva-MVP.md) | Technical design | `AUTHORITY` | Saat menilai architecture, data, security, provider, atau testing. |
| Diagram | [NIUVA_Use_Case_Diagrams.md](<Niuva Document/NIUVA_Use_Case_Diagrams.md>) | Use case map, Draft v0.3 | `REFERENCE` | Saat menelusuri aktor, tujuan, dan perjalanan lintas area; cek PRD untuk keputusan produk. |
| Diagram | [NIUVA_Use_Case_Specification.md](<Niuva Document/NIUVA_Use_Case_Specification.md>) | Use case specification, Draft v0.3 | `REFERENCE` | Saat menelusuri skenario dan pengecualian; cek PRD dan kontrak lifecycle. |
| Diagram | [NIUVA_Activity_Diagram_User_Flow.md](<Niuva Document/NIUVA_Activity_Diagram_User_Flow.md>) | Activity and user flow, Draft v0.3 | `REFERENCE` | Saat membaca jalur Customer, Admin, dan Owner. |
| Diagram | [NIUVA_Sequence_Diagrams.md](<Niuva Document/NIUVA_Sequence_Diagrams.md>) | Actor and system sequence, Draft v0.3 | `REFERENCE` | Saat membaca interaksi Brief, MAKE, retail, shipping dan analytics pada runtime sumber. |
| Diagram | [NIUVA_System_Architecture.md](<Niuva Document/NIUVA_System_Architecture.md>) | Runtime architecture explanation, Draft v0.3 | `REFERENCE` | Saat membaca stack terpilih, boundary transaksi/provider, ownership dan analytics. |
| Diagram | [NIUVA_Domain_Data_Model.md](<Niuva Document/NIUVA_Domain_Data_Model.md>) | Runtime domain and data model, Draft v0.3 | `REFERENCE` | Saat menelusuri model Prisma, stock ledger, estimate/quote, lifecycle dan agregat analytics. |
| Diagram | [NIUVA_API_Contract.md](<Niuva Document/NIUVA_API_Contract.md>) | Runtime operation inventory, Draft v0.3 | `REFERENCE` | Saat membaca route handler, DTO, response, permission dan Server Actions aktual; kandidat ada di lampiran. |
| Diagram | [NIUVA_Technical_Sequence_Diagrams.md](<Niuva Document/NIUVA_Technical_Sequence_Diagrams.md>) | Runtime technical sequence, Draft v0.3 | `REFERENCE` | Saat membaca transaksi checkout/webhook, file, estimate/quote dan analytics; contoh lama ada di lampiran. |
| Diagram | [NIUVA_UI_Flow_Wireframes.md](<Niuva Document/NIUVA_UI_Flow_Wireframes.md>) | Structural UX wireframes, Draft v0.3 | `REFERENCE` | Saat membaca layar, state, Overview analytics dan matriks operasi; visual mengikuti DESIGN.md. |
| Backend | [CAPABILITY-MAP-admin-rebuild.md](backend/CAPABILITY-MAP-admin-rebuild.md) | Admin implementation map | `ACTIVE` | Saat menilai urutan dan batas rebuild admin. |
| Backend | [SPEC-action-queue.md](backend/SPEC-action-queue.md) | Admin action-queue specification | `ACTIVE` | Saat mengerjakan atau mereview module action queue. |
| Backend | [SPEC-admin-access.md](backend/SPEC-admin-access.md) | Admin access specification | `ACTIVE` | Saat mengerjakan atau mereview protected admin entry point. |
| Backend | [SPEC-r2-private-upload-smoke.md](backend/SPEC-r2-private-upload-smoke.md) | R2 private-upload specification | `ACTIVE` | Saat mereview smoke boundary dan evidence upload private. |
| Backend | [catalog-publish-readiness.md](backend/catalog-publish-readiness.md) | Catalog publish audit | `ACTIVE` | Saat menilai SKU, publish gate, dan status loopback catalog. |
| Backend | [catalog-seed.md](backend/catalog-seed.md) | Catalog seed contract | `ACTIVE` | Saat menilai importer, guard, dan dataset seed lokal. |
| Backend | [catalog-source-audit.md](backend/catalog-source-audit.md) | Catalog source audit | `REFERENCE` | Saat memeriksa sumber data dan relasi media-varian. |
| Backend | [custom-product-intake.md](backend/custom-product-intake.md) | Custom product intake contract | `ACTIVE` | Saat menilai request custom, review gate, dan batas checkout. |
| Backend | [foundation.md](backend/foundation.md) | Backend foundation contract | `ACTIVE` | Saat menilai boundary dasar domain dan runtime backend. |
| Backend | [lifecycle-contract.md](backend/lifecycle-contract.md) | Canonical lifecycle ownership | `AUTHORITY` | Saat menilai state owner, transition, order, quote, atau payment boundary. |
| Backend | [phase-1-domain-contract.md](backend/phase-1-domain-contract.md) | Phase 1 domain contract | `HISTORICAL` | Saat menelusuri asal keputusan Phase 1 atau membaca histori closure. |
| Backend | [phase-2-closure-decisions.md](backend/phase-2-closure-decisions.md) | Approved Phase 2 decisions | `ACTIVE` | Saat memeriksa policy lifecycle, file, permission, atau retention boundary. |
| Backend | [phase-2-service-contract.md](backend/phase-2-service-contract.md) | Core service contract | `ACTIVE` | Saat menilai service transition map dan route/service boundary. |
| Backend | [phase-3-pricing-biteship-contract.md](backend/phase-3-pricing-biteship-contract.md) | Pricing and Biteship boundary | `ACTIVE` | Saat menilai pricing v1 dan shipping boundary yang sudah dicatat. |
| Backend | [phase-3-provider-http-contract.md](backend/phase-3-provider-http-contract.md) | Provider HTTP contract | `ACTIVE` | Saat menilai R2, Midtrans, Resend, dan sandbox HTTP boundary. |
| Backend | [phase-3-technical-closure.md](backend/phase-3-technical-closure.md) | Phase 3 technical closure | `ACTIVE` | Saat menilai closure teknis dependency dan custom-shipping retry. |
| Backend | [provider-staging-intake.md](backend/provider-staging-intake.md) | Provider/staging intake | `ACTIVE` | Saat menyiapkan input Owner dan readiness non-production. |
| Backend | [sandbox-local-setup.md](backend/sandbox-local-setup.md) | Local and sandbox setup | `ACTIVE` | Saat menyiapkan database lokal dan onboarding sandbox. |
| Backend | [sandbox-readiness.md](backend/sandbox-readiness.md) | Sandbox readiness audit | `ACTIVE` | Saat membedakan bukti lokal dari provider readiness nyata. |
| Backend | [shop-catalog-owner-intake.md](backend/shop-catalog-owner-intake.md) | Owner catalog intake | `ACTIVE` | Saat menilai approval dataset dan status publish loopback. |
| Backend | [token-reissue-handoff.md](backend/token-reissue-handoff.md) | Customer-link handoff | `ACTIVE` | Saat menilai reissue dan delivery handoff route-bound link. |
| Content | [niuva-content-curation-dossier.md](content/niuva-content-curation-dossier.md) | Public content source dossier | `ACTIVE` | Saat menilai claim, evidence label, dan public content integration. |
| Content | [featured-covers/README.md](content/media-proofs/featured-covers/README.md) | Featured-cover asset index | `REFERENCE` | Saat mencari contact sheet dan asset proof featured covers. |
| Frontend | [analytics-privacy-notice-draft.md](frontend/analytics-privacy-notice-draft.md) | Analytics privacy notice draft | `REFERENCE` | Saat meninjau pemberitahuan analytics bersama Owner/legal sebelum aktivasi produksi; belum policy approved. |
| Frontend | [gate-closure-audit.md](frontend/gate-closure-audit.md) | Frontend gate evidence | `ACTIVE` | Saat menilai closure audit untuk checkout, admin, touch, atau provider boundary. |
| Frontend | [mvp-release-readiness.md](frontend/mvp-release-readiness.md) | Readiness ledger | `ACTIVE` | Saat membutuhkan status handoff terkini dan remaining gates. |
| Frontend | [operational-readiness-report.md](frontend/operational-readiness-report.md) | Operational readiness report | `ACTIVE` | Saat membutuhkan rincian evidence operasional. |
| Frontend | [product-route-proof.md](frontend/product-route-proof.md) | Product route proof | `ACTIVE` | Saat menilai bukti route dan propagation boundary. |
| Frontend | [public-batch.md](frontend/public-batch.md) | Public-surface batch record | `ACTIVE` | Saat menelusuri scope dan evidence batch public surface. |
| Legal | [customer-public-launch-readiness.md](legal/customer-public-launch-readiness.md) | Paket review dan matriks kesiapan publik | `ACTIVE` | Saat memeriksa keputusan, pemilik, bukti dan blocker menuju publik; bukan izin rilis. |
| Legal | [customer-public-input-evidence.md](legal/customer-public-input-evidence.md) | Input Owner dan bukti terkini | `ACTIVE` | Saat melengkapi data operasional/provider tanpa meminta ulang fakta yang sudah dikonfirmasi. |
| Legal | [customer-terms-draft.md](legal/customer-terms-draft.md) | Draf Syarat Layanan v3 | `REFERENCE` | Untuk review Owner/legal; belum berlaku atau menjadi consent publik. |
| Legal | [customer-privacy-draft.md](legal/customer-privacy-draft.md) | Draf Kebijakan Privasi v3 | `REFERENCE` | Untuk review data/hak/retensi sesuai kemampuan; belum policy resmi. |
| Legal | [customer-service-refund-sop.md](legal/customer-service-refund-sop.md) | Kontrak SOP keluhan/retur/refund | `ACTIVE` | Saat menugaskan operasi atau mengimplementasikan kasus/refund; kemampuan target belum tersedia. |
| Legal | [customer-privacy-retention-sop.md](legal/customer-privacy-retention-sop.md) | Kontrak SOP hak/data/retensi/provider | `ACTIVE` | Saat menetapkan dasar, jadwal, petugas dan bukti purge/recovery publik. |
| Legal | [customer-public-runtime-contract.md](legal/customer-public-runtime-contract.md) | Requirement implementasi publik | `ACTIVE` | Saat merencanakan kode dan acceptance; bukan schema/API aktual. |
| Legal | [customer-public-policy-validation.md](legal/customer-public-policy-validation.md) | Simulasi dan validasi paket publik | `ACTIVE` | Saat menilai cakupan dokumen/tes dan kebutuhan bukti batch berikutnya. |
| Legal | [customer-policy-implementation.md](legal/customer-policy-implementation.md) | Snapshot implementasi Development 2 Oktober | `REFERENCE` | Saat memeriksa kemampuan lokal PR #38; target publik terkini ada di paket 3 Oktober. |
| Legal | [customer-privacy-validation.md](legal/customer-privacy-validation.md) | Bukti validasi privacy Development 2 Oktober | `REFERENCE` | Saat menelusuri hasil fase Development; bukan bukti akun anak/refund/hosted. |
| Source | [README-logo-system.md](source/brand/Niuva_Logo_System_v1.0/README-logo-system.md) | Logo asset reference | `REFERENCE` | Saat memakai atau memeriksa asset logo yang disediakan. |
| Source | [Dataset Shop Niuva/README.md](<source/Dataset Shop Niuva/README.md>) | Dataset reference | `REFERENCE` | Saat menelusuri provenance dan struktur dataset Shop. |
| Source | [Deep Research Request — Website Niuva Inovasi Utama.md](<source/Deep Research Request — Website Niuva Inovasi Utama.md>) | Research reference | `REFERENCE` | Saat memeriksa research input; bukan instruksi executable. |
| Wireframe | [niuva-mvp-wireframe-spec.md](wireframes/niuva-mvp-wireframe-spec.md) | Approved wireframe architecture | `REFERENCE` | Saat menilai inventory surface, journey, state, responsive order, dan accessibility constraint. |

## Aturan pemeliharaan

- Setiap Markdown baru di bawah `docs/` harus ditambahkan ke inventory ini.
- Jangan menyalin ulang keputusan produk, teknis, atau visual ke indeks; tautkan
  ke authority aslinya.
- Status isi tetap berada di dokumen sumber. Perbarui lifecycle indeks hanya
  ketika fungsi dokumen berubah, bukan setiap kali satu keputusan di dalamnya
  berubah.
- Dokumen `HISTORICAL` tetap disimpan untuk traceability dan tidak boleh dipakai
  sebagai authority terbaru tanpa review.
- Jika dua dokumen tampak bertentangan, ikuti authority order di [AGENTS.md](../AGENTS.md)
  dan pertahankan `OPEN`, `CANDIDATE`, atau `BLOCKED_DECISION` sampai ada
  keputusan yang sah.
