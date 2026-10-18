# Niuva

Website operasional responsif yang menyatukan company profile, kontak WhatsApp
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
- [ROADMAP.md](ROADMAP.md) — milestone v1 berbasis dependensi.
- [TASKS.md](TASKS.md) — satu backlog aktif dan bukti pelaksanaan.
- [Definition of Done v1](docs/v1-definition-of-done.md) — batas selesai task,
  kandidat rilis, dan production.

## Fase saat ini

Niuva menjalankan roadmap penutupan v1 yang disetujui pada 18 Oktober 2026.
Bukti public, catalog, authenticated-admin, dan quote yang tercatat tetap
memiliki cakupan lingkungannya. Pendaftaran publik, provider/staging, backup/
restore, operasi dan production belum dinyatakan selesai oleh persetujuan
rencana. Aktivasi provider dan deployment memerlukan instruksi tersendiri.

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
