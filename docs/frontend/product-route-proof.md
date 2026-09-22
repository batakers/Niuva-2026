# Product Route Proof — `/` dan `/project-brief`

Status: **TECHNICAL PROOF VERIFIED · OWNER VISUAL ACCEPTED**

Tanggal pemeriksaan: **2026-09-22**

Dokumen ini mencatat proof terarah untuk dua route yang sebelumnya diizinkan
sebagai propagation proof. Proof ini tidak mempromosikan komponen menjadi
`Official` dan tidak membuka propagasi global.

## Scope

Termasuk:

- `/` sebagai homepage publik;
- `/project-brief` sebagai form inquiry B2B;
- viewport `320px`, `390px`, `768px`, dan `1280px`;
- landmark dan heading semantics;
- keyboard/focus path;
- validasi dan recovery form;
- media project pada homepage;
- disabled private-upload boundary pada project brief;
- no-horizontal-overflow dan page-error checks.

Tidak termasuk:

- checkout atau admin;
- provider, deployment, atau production acceptance;
- physical screen-reader speech/output;
- interoperabilitas lintas browser/assistive technology;
- touch-device acceptance;
- izin propagasi product screen atau promosi `Official`.

## Evidence matrix

| Area | `/` | `/project-brief` | Result |
| --- | --- | --- | --- |
| Responsive | H1, entry paths, process, project proof, dan next step tetap ter-render pada empat viewport | H1, form, grouped fields, dan post-submit guidance tetap ter-render pada empat viewport | `VERIFIED` |
| Semantics | Satu `main`, satu H1, labelled sections, navigation links, dan route handoff | Satu `main`, satu H1, named form, labelled controls, required state, dan disabled file input | `VERIFIED` |
| Keyboard/focus | Skip link menjadi fokus pertama; Escape menutup menu dan mengembalikan fokus ke toggle | Error container menerima fokus; link error memindahkan fokus ke field terkait | `VERIFIED` |
| Recovery | Route navigation tetap tersedia pada compact layout | Empty-submit validation, API `503` recovery, nilai form tetap dipertahankan, dan tombol retry tersedia | `VERIFIED` |
| Media | Tiga media project proof memiliki alt text dan berhasil dimuat | Upload privat tetap disabled dengan alasan dan guidance link yang eksplisit | `VERIFIED` |
| Overflow | `document` dan `body` tidak melebihi viewport | `document` dan `body` tidak melebihi viewport | `VERIFIED` |

## Reproduction

Proof dijalankan dengan:

```text
corepack pnpm exec playwright test tests/e2e/product-route-proof.spec.ts --workers=1
```

Test source: `tests/e2e/product-route-proof.spec.ts`.

Proof memakai Chromium lokal melalui Next development server. Owner menerima
preview aktual untuk dua route ini pada 2026-09-22. Registry sekarang mencatat
`approved-owner` hanya untuk proof route yang dinamai; propagation guard tetap
tertutup dan tidak ada perluasan scope ke checkout, admin, provider, atau
production.

## Review boundary

Owner menerima preview homepage dan project brief pada viewport/content yang
sama pada 2026-09-22. Acceptance ini tetap scoped: checkout/admin,
provider/production, dan promosi komponen `Official` membutuhkan gate terpisah.
