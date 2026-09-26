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
| Frontend | [gate-closure-audit.md](frontend/gate-closure-audit.md) | Frontend gate evidence | `ACTIVE` | Saat menilai closure audit untuk checkout, admin, touch, atau provider boundary. |
| Frontend | [mvp-release-readiness.md](frontend/mvp-release-readiness.md) | Readiness ledger | `ACTIVE` | Saat membutuhkan status handoff terkini dan remaining gates. |
| Frontend | [operational-readiness-report.md](frontend/operational-readiness-report.md) | Operational readiness report | `ACTIVE` | Saat membutuhkan rincian evidence operasional. |
| Frontend | [product-route-proof.md](frontend/product-route-proof.md) | Product route proof | `ACTIVE` | Saat menilai bukti route dan propagation boundary. |
| Frontend | [public-batch.md](frontend/public-batch.md) | Public-surface batch record | `ACTIVE` | Saat menelusuri scope dan evidence batch public surface. |
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
