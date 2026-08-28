# Niuva Product Context

## Brand identity

- **Name:** Niuva
- **One-line positioning:** Niuva Inovasi Utama adalah mitra inovasi dan pengembangan produk end-to-end yang membantu perusahaan mengubah ide menjadi solusi teknologi dan produk kreatif bernilai tinggi melalui riset, desain, engineering, prototyping, hingga dukungan manufaktur.
- **Primary mark:** `/assets/brand/niuva-logo-horizontal-dark.svg`
- **Logo source:** `docs/source/brand/Niuva_Logo_System_v1.0/SVG/Horizontal/niuva-logo-horizontal-dark.svg`
- **Setup status:** Brand established from owner interview; UI Foundation approved after Visual Proof acceptance; P0/P1 Design System contracts are approved and implemented in the styleguide, while product screen propagation remains gated; Voice bootstrapped from owner positioning and product documents.

## Foundation status

- **Direction:** Precision Industrial + Creative Accent.
- **Confirmed visual character:** Presisi dan engineered; kompeten dan tangible;
  kreatif dan progresif.
- **Confirmed visual exclusions:** Generic SaaS/startup teknologi; futuristik
  berlebihan seperti cyberpunk, neon, glow, atau glassmorphism ekstrem; chaotic
  dan dekoratif tanpa fungsi; serta AI Slop.
- **Confirmed reference treatment:** Website Alethia diterima sebagai referensi
  bahasa visual dan storytelling dengan prinsip `adopt`, `adapt`, dan `do not
  copy`; bukan template, aset, atau identitas yang disalin.
- **Confirmed reference principles for Niuva:** Editorial narrative, tangible
  proof, kontras surface gelap-terang, controlled accent, technical labels,
  dan directional CTA. Implementasinya harus memakai bukti produk, material,
  prototipe, engineering, dan manufaktur Niuva sendiri.
- **Confirmed adaptation constraints:** Visual language harus tetap membedakan
  public, checkout, dan admin; tidak mengambil palette hijau/lime atau objek
  alam Alethia; serta tidak memakai metrik, claim, atau visual dekoratif tanpa
  bukti Niuva.
- **Confirmed surface architecture:** Public memakai kombinasi dark stage untuk
  hero/proof dan light surface untuk konten; checkout memakai light-first,
  tenang, dan mudah dibaca; admin memakai surface netral yang padat dan
  operasional.
- **Confirmed color roles:** `#6390BB` menjadi aksen identitas Niuva; brand,
  neutral, dan semantic mapping pada Visual Proof telah diterima sebagai
  foundation resmi. Penggunaan reusable-nya mengikuti kontrak Design System.
- **Approved foundation palette:** Brand scale memakai `#6390BB` sebagai
  `brand-500` dengan rentang `#F5F9FC` sampai `#1F2E3B`; neutral industrial
  scale memakai rentang `#F8FAFC` sampai `#020617`; semantic colors memakai
  success, warning, error, dan info dengan foreground/background/border
  variants yang teruji kontras. `#6390BB` tidak dipakai sebagai normal text
  di atas putih, dan status tidak boleh disampaikan melalui warna saja.
- **Confirmed neutral direction:** Cool industrial — neutral UI memakai
  undertone abu-abu kebiruan untuk memberi kesan presisi, terukur, dan
  engineered. Kehangatan Niuva datang dari bukti nyata produk, material,
  prototipe, dan proses kerja; bukan dari menghangatkan core UI palette.
  Swatch, tonal scale, contrast pairs, dan dark-mode mappings telah diterima
  melalui Visual Proof.
- **Confirmed semantic color rule:** Success, warning, error, dan info harus
  memiliki peran fungsional yang jelas dan tidak boleh menjadi satu-satunya
  cara menyampaikan status.
- **Confirmed typography roles:** Display sans untuk headline dan positioning;
  body sans untuk penjelasan dan form; monospace terbatas untuk label teknis,
  metadata, dan status. Foundation mapping yang diterima adalah Geist Sans
  untuk display/body dan Geist Mono untuk technical metadata/status.
- **Evidence-backed identity accent:** `--brand-500: #6390BB`.
- **Approved type and shape:** Geist role mapping, type scale, weight,
  line-height, letter-spacing, spacing rhythm, radius roles, elevation, motion,
  and reduced-motion behavior shown in Visual Proof are accepted foundation
  decisions.
- **Review state:** Visual Proof at `/auis/styleguide` has been accepted by the
  owner on 2026-08-28. P0/P1 component contracts and their styleguide
  showcases are approved and implemented; the implementation is ready for the
  Design System review, and broad screen propagation remains blocked until that
  checkpoint is accepted.

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

- **Status:** Confirmed by owner during the `/auis/welcome` UX-writing review.
- **Pattern:** Explain what happened, then provide the next recovery action. Include the reason when it is known and useful.
- **Confirmed constraint:** customer-facing failures use clear language and do not expose raw stack traces or secrets (`docs/TechDesign-Niuva-MVP.md:1222`).

## Canonical copy corpus

These are real owner- or product-document strings. The public Niuva shipping corpus is empty because no public Niuva product screen exists yet; AUiS setup and styleguide scaffold strings are intentionally excluded.

- “Niuva” — `src/app/auis/_data/brand.runtime.json:2`.
- “Niuva Inovasi Utama adalah mitra inovasi dan pengembangan produk end-to-end yang membantu perusahaan mengubah ide menjadi solusi teknologi dan produk kreatif bernilai tinggi melalui riset, desain, engineering, prototyping, hingga dukungan manufaktur.” — owner-provided positioning, `src/app/auis/_data/brand.runtime.json:3`.
- “Idea → Design → Prototype → Finished Product” — core customer promise, `docs/PRD-Niuva-MVP.md:165-167`.
- “Diskusikan Proyek” — documented CTA, `docs/PRD-Niuva-MVP.md:192`.
- “Custom 3D Print” — documented CTA, `docs/PRD-Niuva-MVP.md:205`.

This file records the current brand identity for the AUiS setup slice. It does
not replace `docs/PRD-Niuva-MVP.md` or `docs/TechDesign-Niuva-MVP.md`.
