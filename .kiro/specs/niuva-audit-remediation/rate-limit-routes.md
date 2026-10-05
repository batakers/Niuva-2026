# Inventaris route publik untuk rate limit per pelaku (task 5.7)

Sumber: pencarian `assertPublicMutationRequest(` di seluruh `src/` dan `tests/`.
Pemakai di luar `src/app/api/**`: tidak ada (selain definisinya di
`src/lib/http/public-mutation.ts`). Semua route hanya mengekspor `POST`.

## Jumlah

Ditemukan **14** route, sesuai harapan. Tidak ada selisih.

## Tabel

Semua limiter saat ini in-memory per instance dengan `maxKeys: 256` dan
`windowMs: 60_000` (60 detik). Kolom "Sesi Customer" menunjukkan apakah sesi
Customer tersedia di route pada saat guard dipanggil.

| # | File route | Method | `endpointId` usulan | Limit / jendela saat ini | Sesi Customer | Batch |
| - | ---------- | ------ | ------------------- | ------------------------ | ------------- | ----- |
| 1 | `src/app/api/uploads/intents/route.ts` | POST | `POST /api/uploads/intents` | 10 / 60 dtk | Opsional (`getCurrentCustomer()`, dibaca setelah guard) | 1 (5.8) |
| 2 | `src/app/api/uploads/confirm/route.ts` | POST | `POST /api/uploads/confirm` | 20 / 60 dtk | Tidak ada pembacaan sesi di route | 1 (5.8) |
| 3 | `src/app/api/shipping/rates/route.ts` | POST | `POST /api/shipping/rates` | 10 / 60 dtk | Wajib (`requireCustomer()`, setelah guard) | 1 (5.8) |
| 4 | `src/app/api/quote/[token]/accept/route.ts` | POST | `POST /api/quote/[token]/accept` | 5 / 60 dtk (limiter dipakai bersama dengan `decline`) | Tidak; akses lewat token | 2 (5.9) |
| 5 | `src/app/api/quote/[token]/decline/route.ts` | POST | `POST /api/quote/[token]/decline` | 5 / 60 dtk (limiter dipakai bersama dengan `accept`) | Tidak; akses lewat token | 2 (5.9) |
| 6 | `src/app/api/project-brief/route.ts` | POST | `POST /api/project-brief` | 5 / 60 dtk | Wajib (`requireCustomer()`) | 2 (5.9) |
| 7 | `src/app/api/custom-print/preview-estimate/route.ts` | POST | `POST /api/custom-print/preview-estimate` | 15 / 60 dtk | Wajib (`requireCustomer()`) | 3 (5.10) |
| 8 | `src/app/api/custom-print/requests/route.ts` | POST | `POST /api/custom-print/requests` | 5 / 60 dtk | Wajib (`requireCustomer()`) | 3 (5.10) |
| 9 | `src/app/api/custom-print/requests/[token]/files/route.ts` | POST | `POST /api/custom-print/requests/[token]/files` | 5 / 60 dtk | Opsional (`getCurrentCustomer()`); juga akses lewat token | 3 (5.10) |
| 10 | `src/app/api/account/claim/route.ts` | POST | `POST /api/account/claim` | 5 / 60 dtk | Wajib (`requireCustomer()`) | 4 (5.11) |
| 11 | `src/app/api/account/make/[id]/model/route.ts` | POST | `POST /api/account/make/[id]/model` | 5 / 60 dtk | Wajib (`requireCustomer()`) | 4 (5.11) |
| 12 | `src/app/api/account/make/[id]/quotes/[quoteId]/decision/route.ts` | POST | `POST /api/account/make/[id]/quotes/[quoteId]/decision` | 5 / 60 dtk | Wajib (`requireCustomer()`) | 4 (5.11) |
| 13 | `src/app/api/account/inquiries/[id]/quotes/[quoteId]/decision/route.ts` | POST | `POST /api/account/inquiries/[id]/quotes/[quoteId]/decision` | 5 / 60 dtk | Wajib (`requireCustomer()`) | 5 (5.12) |
| 14 | `src/app/api/checkout/route.ts` | POST | `POST /api/checkout` | 5 / 60 dtk | Wajib (`requireCustomer()`) | 5 (5.12) |

## Pembagian batch

- Batch 1 (5.8): baris 1–3.
- Batch 2 (5.9): baris 4–6.
- Batch 3 (5.10): baris 7–9.
- Batch 4 (5.11): baris 10–12.
- Batch 5 (5.12): baris 13–14 (sisa dua route). Checkout sengaja terakhir karena risikonya tertinggi.

## Catatan

- `endpointId` memakai pola route Next.js dengan segmen dinamis apa adanya
  (`[token]`, `[id]`, `[quoteId]`), bukan nilai token nyata, supaya kardinalitas
  kunci tetap terbatas dan token tidak masuk ke kunci limiter.
- Semua 14 `endpointId` unik. Route `accept` dan `decline` sebelumnya berbagi
  satu limiter (5/60 dtk) per modul; dengan `endpointId` terpisah, kuota masing-masing
  menjadi independen. Limit tidak dinaikkan (sesuai 19.4).
- Sesi Customer tidak dipakai sebagai kunci. Guard dipanggil sebelum `requireCustomer()`
  di semua route, jadi kunci tetap diturunkan dari `deriveActorKey` dan `endpointId`.
- Server Action tidak termasuk daftar ini; `endpointId` action ditambahkan di task 19.4.

## Tambahan task 5.17

Jumlah route menjadi **15**. Route baru:
`src/app/api/custom-print/requests/[token]/upload-intent/route.ts` dengan
`endpointId` `POST /api/custom-print/requests/[token]/upload-intent`, limit
10 / 60 dtk (tidak lebih tinggi dari `uploads/intents`), limiter sendiri, tanpa
sesi Customer (akses lewat token di path; token dan kelayakan append divalidasi
sebelum intent dibuat). `POST /api/uploads/intents` kini hanya untuk Customer
(`requireCustomer()` di `UploadService.createIntent`); `endpointId` dan limit
tidak berubah.
