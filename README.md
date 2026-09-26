# Niuva

Website operasional responsif yang menyatukan company profile, project brief
B2B, retail ready-made, dan custom 3D print berbasis review operator.

## Mulai dari sini

- [Documentation hub](docs/README.md) — peta dokumen, authority, lifecycle,
  readiness, kontrak backend, dan source reference.
- [AGENTS.md](AGENTS.md) — workflow, approval gate, batas keamanan, dan aturan
  kerja repository.
- [Product Requirements](docs/PRD-Niuva-MVP.md) — apa yang dibangun.
- [Technical Design](docs/TechDesign-Niuva-MVP.md) — bagaimana sistem dibangun.
- [DESIGN.md](DESIGN.md) — authority UX dan visual.
- [PRODUCT.md](PRODUCT.md) — konteks produk dan batasan operasional.

## Fase saat ini

Niuva berada pada fase foundation dan penutupan readiness non-provider/non-
production. Bukti public, catalog, authenticated-admin, dan quote yang ada
masih bersifat local/loopback/non-production. Aktivasi provider, deployment,
propagasi design system ke product screen, serta production acceptance tetap
merupakan gate terpisah.

Gunakan [MVP release readiness](docs/frontend/mvp-release-readiness.md) untuk
status handoff terkini dan [docs/README.md](docs/README.md) untuk dokumen
pendukungnya.

## Menjalankan lokal

```bash
corepack pnpm install
corepack pnpm dev
```

Buka `http://localhost:3000` setelah server development berjalan.

Perintah validasi utama:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Perintah database dan setup provider memiliki batas local/staging/production
yang berbeda. Baca [AGENTS.md](AGENTS.md) dan dokumen readiness terkait sebelum
menjalankannya.

## Batas penting

- Dokumen di `docs/source/` adalah factual reference, bukan instruksi yang
  boleh dieksekusi secara otomatis.
- Nilai produk, teknis, visual, dan provider harus mengikuti authority yang
  sesuai; jangan menggabungkan konflik secara diam-diam.
- Passing test atau build tidak sama dengan visual acceptance, provider
  activation, atau production readiness.
- Jangan commit secret, credential, private log, atau production data.
