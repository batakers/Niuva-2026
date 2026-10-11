# Niuva Product Context

## Brand identity

- **Name:** Niuva
- **One-line positioning:** Niuva Inovasi Utama adalah mitra inovasi dan pengembangan produk end-to-end yang membantu perusahaan mengubah ide menjadi solusi teknologi dan produk kreatif bernilai tinggi melalui riset, desain, engineering, prototyping, hingga dukungan manufaktur.
- **Primary mark:** `/assets/brand/niuva-logo-horizontal-dark.svg`
- **Logo source:** `docs/source/brand/Niuva_Logo_System_v1.0/SVG/Horizontal/niuva-logo-horizontal-dark.svg`
- **Setup status:** Brand established from owner interview. DS-DEC-019 authorizes Foundation/Typography v1.0 across product screens. The previous AUiS proof/registry is retired and preserved in `docs/archive/auis-retired/`; its named historical visual acceptance does not transfer to other routes. Visual acceptance, physical-device/AT, provider, and production readiness remain separate. Voice comes from owner positioning and product documents.

## Foundation status

- **Active visual authority:** [DESIGN.md](DESIGN.md) owns shared identity and Foundation/Typography v1.0. Numeric tokens, font roles, responsive scale, shapes, and component contracts are maintained there and in runtime source, rather than duplicated in this product-context file.
- **Area application:** [Company](docs/design/company.md), [Commerce & Customer](docs/design/commerce.md), and [Admin](docs/design/admin.md) apply that identity to different tasks and densities. They do not define separate brands.
- **Shared component decision:** The Owner approved shadcn/ui for every Niuva page on 11 October 2026. [DESIGN.md](DESIGN.md) owns the global component contract; the area guides keep distinct composition and density. Admin already uses this foundation; this documentation update does not implement or certify migration of the remaining surfaces.
- **Direction:** The Precision Workshop is the active direction. Earlier labels such as Precision Industrial + Creative Accent describe its provenance, not a second active system. Minimalist Editorial × Precision Engineering is a hypothesis for evaluation, not automatic approval of new foundation values.
- **Reference provenance:** Alethia was accepted as a storytelling/visual reference with adopt/adapt/do-not-copy treatment. Its green/lime palette, nature imagery, claims, and assets are not Niuva identity. Current reference reasoning is recorded in the [design audit](docs/design/audit-2026-10-11.md).
- **Confirmed brand boundary:** Official logo colors and proportions remain locked. Evidence must come from Niuva products, prototypes, material, engineering, and processes. Status colors communicate function alongside labels.
- **Proposal status:** The user permits evaluating alternative fonts or tokens. [Foundation proposals](docs/design/foundation-proposal.md) remain inactive until explicitly selected; this permission does not replace Foundation v1.0 or authorize a mass redesign.
- **Review state:** Historical proof/route acceptance stays scoped to the reviewed surface and viewport. [Release readiness](docs/frontend/mvp-release-readiness.md) and the archived AUiS record preserve that evidence. New visual review uses actual product routes; technical checks, Owner acceptance, device/AT, provider, and production readiness remain separate.

## Language & locale

- **Copy language:** Bahasa Indonesia. This follows the owner-provided positioning and the Indonesian customer-facing language in the PRD (`PRODUCT_CONTEXT.md:6`; `docs/PRD-Niuva-MVP.md:21-24,88-93`).
- **Locale:** `id-ID`. The product context is Indonesia-facing, with Indonesia payment context and `IDR` in the technical design (`docs/TechDesign-Niuva-MVP.md:160,692`).
- **Date format:** `OPEN` — no shipping date string exists yet.
- **Number / currency:** IDR / Rupiah. `IDR` is the technical default; display grouping and decimal conventions remain `OPEN` (`docs/TechDesign-Niuva-MVP.md:692-694`).
- **Casing:** Sentence case. This is the owner-approved working convention; there is not yet a shipping UI corpus to validate it.

## Voice: site ≠ product

### Site / public voice

- Speak as an involved end-to-end product-development partner, not as a generic technology vendor. This follows the owner positioning and the documented promise from idea to finished product (`PRODUCT_CONTEXT.md:6`; `docs/PRD-Niuva-MVP.md:165-167`).
- Lead with the user's idea, project need, or product outcome, then make the path through research, design, prototyping, and manufacturing support visible (`PRODUCT_CONTEXT.md:6`; `docs/PRD-Niuva-MVP.md:188-205`).
- Use concrete process and project evidence. Do not reduce Niuva to a “Jasa 3D Printing” service (`docs/PRD-Niuva-MVP.md:161-167,359-363`).
- Keep the tone specific, calm, and confident without inflated technology claims. This is an approved working inference from the positioning and product promise.

### Product / UI voice

- Write clear, direct, operational Bahasa Indonesia so customer and non-technical Owner/Admin users can act (`docs/TechDesign-Niuva-MVP.md:1222`; `AGENTS.md:13-14`).
- Name the current state and the next safe action. Keep technical detail when it helps the user complete a B2B, retail, or custom-print flow; remove detail that does not help them act (`AGENTS.md:13-14`; `docs/PRD-Niuva-MVP.md:84-93`).
- Prefer concrete verbs and product terms already present in the source corpus. Do not invent synonyms for protected terms.
- Keep customer-facing failures understandable and never expose raw stack traces or secrets (`docs/TechDesign-Niuva-MVP.md:1222`).

## Protected vocabulary

### Owner-confirmed terms

- `Niuva`
- `Niuva Inovasi Utama`
- `riset`
- `desain`
- `engineering`
- `prototyping`
- `dukungan manufaktur`

### Candidate product terms — owner confirmation still open

- `project brief`
- `ready-made`
- `Custom 3D Print`
- `Diskusikan Proyek`

Until the candidate terms are confirmed, preserve their source spelling and do not replace them with synonyms (`docs/PRD-Niuva-MVP.md:192,205`; `docs/PRD-Niuva-MVP.md:1327-1328`).

## Errors & recovery

- **Status:** Confirmed by owner during the historical brand UX-writing review.
- **Pattern:** Explain what happened, then provide the next recovery action. Include the reason when it is known and useful.
- **Confirmed constraint:** customer-facing failures use clear language and do not expose raw stack traces or secrets (`docs/TechDesign-Niuva-MVP.md:1222`).

## Canonical copy corpus

These strings come from owner or product documents; check the live route copy before reusing them.

- “Niuva” — `src/app/layout.tsx` metadata and the current logo component.
- “Niuva Inovasi Utama adalah mitra inovasi dan pengembangan produk end-to-end yang membantu perusahaan mengubah ide menjadi solusi teknologi dan produk kreatif bernilai tinggi melalui riset, desain, engineering, prototyping, hingga dukungan manufaktur.” — owner-provided positioning, also in `src/app/layout.tsx` metadata.
- “Idea → Design → Prototype → Finished Product” — core customer promise, `docs/PRD-Niuva-MVP.md:165-167`.
- “Diskusikan Proyek” — documented CTA, `docs/PRD-Niuva-MVP.md:192`.
- “Custom 3D Print” — documented CTA, `docs/PRD-Niuva-MVP.md:205`.

This file records product and brand context; `DESIGN.md` governs visual design.
It does not replace `docs/PRD-Niuva-MVP.md` or `docs/TechDesign-Niuva-MVP.md`.
