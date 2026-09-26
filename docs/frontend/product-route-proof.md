# Product Route Proof — `/` dan `/project-brief`

Status: **TECHNICAL PROOF VERIFIED · OWNER VISUAL ACCEPTED**

Tanggal pemeriksaan: **2026-09-22**

Post-remediation revalidation pada **2026-09-25** berstatus
**`approved-owner`**. Owner menerima kedua route pada empat viewport, fallback
media homepage sebagai kondisi build-only tanpa seeded database, serta checkbox
native 20×20px karena label terkait dapat diklik. Acceptance `approved-owner` di
atas tetap menjadi historical acceptance untuk preview yang diterima pada
2026-09-22; acceptance baru ini menutup revalidasi pasca-remediation tanpa
mengubah scope route.

Dokumen ini mencatat proof terarah untuk dua route yang sebelumnya diizinkan
sebagai propagation proof. Proof ini tidak mempromosikan komponen menjadi
`Official`. DS-DEC-019 kemudian mengotorisasi Foundation/Typography secara
global, tetapi tidak memperluas visual acceptance yang dicatat dokumen ini.

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
- visual acceptance route lain, izin promosi komponen `Official`, atau
  physical-device/AT, provider, dan production readiness.

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
`approved-owner` hanya untuk proof route yang dinamai. Foundation/Typography
global authorization dari DS-DEC-019 tidak mengubah status visual proof dan tidak
memperluasnya ke checkout, admin, provider, atau production.

## Review boundary

Owner menerima preview homepage dan project brief pada viewport/content yang
sama pada 2026-09-22. Acceptance ini tetap scoped: checkout/admin,
provider/production, dan promosi komponen `Official` membutuhkan gate terpisah.

## Post-remediation browser review — 2026-09-25

Review dijalankan melalui build yang sudah tersedia dengan `corepack pnpm start
-p 3000`, Chromium lokal, tanpa migration atau database reset. Full-page
screenshot dibuat untuk kedua route pada viewport `320`, `390`, `768`, dan
`1280` px sebagai bahan review visual sementara; screenshot tidak ditambahkan ke
checkout sebagai acceptance artifact.

| Route | Viewport | Evidence lokal | Status Owner |
| --- | --- | --- | --- |
| `/` | 320 / 390 / 768 / 1280 | HTTP 200, Space Grotesk global, Foundation/Typography `approved`, no horizontal overflow, reduced-motion emulation, dan tidak ada console/page error pada load normal. Project-proof media tidak tersedia pada build-only karena seeded database tidak dijalankan; Owner menerima fallback `Bukti project terpilih belum tersedia` sebagai batas environment. | `approved-owner` — 2026-09-25 |
| `/project-brief` | 320 / 390 / 768 / 1280 | HTTP 200, Space Grotesk global, Fraunces hanya pada editorial accent, no horizontal overflow, labelled controls, skip/focus/error recovery, retry preservation, reduced-motion emulation, dan tidak ada console/page error pada load normal. Owner menerima checkbox native 20×20px karena label terkait dapat diklik. | `approved-owner` — 2026-09-25 |

`tests/e2e/product-route-proof.spec.ts` terhadap build-only server berhenti pada
assertion media homepage: expected 3 image, received 0. Ini adalah batas data
environment yang diterima Owner, bukan migration failure atau visual rejection;
assertion tiga media tetap strict untuk E2E test server dengan fixture yang
sesuai. Probe interaksi route yang tidak memerlukan seeded media tetap lulus.

Review ini tidak menutup physical-device/AT, provider, production readiness,
checkout/admin visual acceptance, atau promotion gate komponen. Checkbox tidak
mendapat remediation tambahan berdasarkan keputusan Owner; contract dan scope
gate lain tetap berlaku.
