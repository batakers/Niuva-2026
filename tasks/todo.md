# Niuva MVP — TODO Aktif

> Diperbarui 16 Oktober 2026. File ini hanya memuat pekerjaan yang masih
> terbuka; hapus item setelah selesai dan pindahkan konteks yang masih perlu
> ke status handoff singkat di bawah. Urutan dan kriteria ada di
> [`plan.md`](plan.md). Bukti hosted/rilis ada di
> [`docs/frontend/mvp-release-readiness.md`](../docs/frontend/mvp-release-readiness.md).

## Status terakhir

- Batch 1 dan Slices 2.1–2.3 sudah squash-merged.
- Sisa integrasi Batch 2 sudah diimplementasikan dan gate lokal lulus di branch
  `codex/batch-2-completion` dan sedang disiapkan untuk review melalui PR.
- Provider email nyata, hosted resources/roles, scheduler produksi, dan aktivasi
  produksi belum dilakukan. REL-02/03/04 tetap parsial.

## Pekerjaan aktif

- [ ] Setelah Batch 2 digabung, kerjakan Batch 3: pendaftaran Customer publik
  dan penutupan lifecycle privasi pada hosted environment. Pertahankan batas
  18+, allowlist internal Development, dan gerbang policy/legal/provider yang
  tercatat.

## Setelah Batch 3

1. **Batch 4 — Refund dan rekonsiliasi:** refund penuh, persetujuan Owner,
   nominal Decimal, idempotency, dan hasil provider/manual yang terkonfirmasi.
2. **Batch 5 — Staging, provider, operasi, dan recovery:** uji BUY lalu MAKE,
   scheduler, fulfillment, backup/restore, dan prosedur insiden.
3. **Batch 6 — Pemeriksaan rilis production:** tinjau seluruh bukti REL-01–REL-08,
   penerimaan Owner, monitoring, dan rollback sebelum instruksi aktivasi.

## Aturan pembaruan

- Saat lingkup berubah, perbarui `plan.md` dan daftar aktif ini; jangan buat
  salinan proposal atau plan per fitur.
- Hapus item yang selesai atau dibatalkan. Simpan keputusan produk/teknis hanya
  pada PRD atau Tech Design yang sudah ada; catat bukti rilis di readiness map.
- Commit, push, PR, deployment, credential produksi, dan aktivasi provider
  tetap memerlukan instruksi tersendiri.
