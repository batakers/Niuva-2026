# Verifikasi header aktual pada production build (Task 7.24)

Status: empiris, lokal, loopback, non-produksi. Bukan penerimaan visual, bukan
kesiapan produksi. Tidak ada code produksi yang diubah.

## 1. Cara menjalankan

- Build: `$env:NIUVA_NEXT_DIST_DIR='.next-task724-tmp'; node node_modules\next\dist\bin\next build` (exit 0, Next 16.3.2).
- Server: `next start -H 127.0.0.1 -p 3457` dengan env minimum: `NIUVA_NEXT_DIST_DIR`,
  `APP_URL=http://127.0.0.1:3457`, `NIUVA_DEPLOYMENT_TIER` tidak diset,
  `CLERK_SECRET_KEY` dan `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` kosong. `.env.local`
  tidak dipakai, tidak ada `DATABASE_URL`, database tidak dijalankan.
- Tier efektif: `production` (NODE_ENV=production dari `next start`, tier tidak diset).
- Pengambilan header: `node:http` mentah (`rawHeaders`, tanpa redirect, header
  dihitung per nama) dua kali per route; browser: Playwright Chromium, listener
  `securitypolicyviolation`.

Batas startup pada loopback http: `next.config.ts` mencatat
`[niuva] APP_URL is insecure-scheme for tier production; serverActions.allowedOrigins left empty`.
Itu peringatan, bukan kegagalan; server tetap naik. Tidak ada code diubah. Akibat:
`serverActions.allowedOrigins` kosong (same-origin), jadi perilaku Server Action lintas
origin tidak diuji di sini.

## 2. Hasil per route (production, dua request masing-masing)

| Route | Status | Jumlah CSP | Penulis CSP | nonce | `'unsafe-inline'` di script-src | `'strict-dynamic'` | `x-nonce` di response | Report-Only |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 200 | 1 (`Content-Security-Policy`) | statis `next.config` | tidak ada | ya | tidak | tidak | 0 |
| `/services` | 200 | 1 | statis | tidak ada | ya | tidak | tidak | 0 |
| `/checkout` | 307 ke `/login?returnTo=/checkout` | 1 (`content-security-policy`, huruf kecil) | proxy header-only | ya, berbeda tiap request | tidak | ya | tidak | 0 |
| `/account` | 307 ke `/login?returnTo=/account` | 1 (huruf kecil) | proxy header-only | ya, berbeda | tidak | ya | tidak | 0 |
| `/account/privacy` | 307 ke `/login?...` | 1 (huruf kecil) | proxy header-only | ya, berbeda | tidak | ya | tidak | 0 |
| `/account/privacy/confirm` (publik, 200) | 200 | 1 | proxy header-only | ya | tidak | ya | tidak | 0 |
| `/admin` | 503 (fail-closed, tanpa credential Clerk) | 1 (`Content-Security-Policy`) | statis | tidak ada | ya | tidak | tidak | 0 |
| `/admin/sign-in` | 503 | 1 | statis | tidak ada | ya | tidak | tidak | 0 |
| `/api/admin/x` (JSON) | 503 | 1 | statis | tidak ada | ya | tidak | tidak | 0 |

Semua respons di atas membawa tepat satu header per nama untuk
`Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`, `X-Permitted-Cross-Domain-Policies`.
`'unsafe-eval'` tidak muncul di route mana pun. `upgrade-insecure-requests` ada di
semua CSP tier production.

CSP header-only (`/checkout`, `/account`): `script-src 'self' 'nonce-<n>' 'strict-dynamic'`;
`style-src 'self' 'unsafe-inline'`; `connect-src 'self'`; selebihnya sama dengan statis.
CSP statis: `script-src 'self' 'unsafe-inline'`.

Nonce pada HTML `/checkout` (badan respons 307): 10 dari 10 tag `<script>` membawa
`nonce="..."` yang sama dengan nonce di header; 0 tag tanpa nonce. Pola sama pada
`/account` dan `/account/privacy`. Dua request `/checkout` berturut-turut: nonce
berbeda. Pada `/account/privacy/confirm` yang dirender penuh di browser:
`script-src` bernonce, nol pelanggaran CSP, konten tampil ("Konfirmasi salinan data");
dari 22 elemen script, 3 tidak membawa nonce pada properti DOM (kemungkinan script
yang disisipkan dinamis dan dipercaya lewat `strict-dynamic`; tidak diselidiki).

## 3. Perbandingan dengan sebelum (temuan 7.1 dan `headers.ts` statis)

- Sebelum: satu CSP statis `script-src 'self' 'unsafe-inline'` pada semua route.
  Sesudah: `/checkout` dan `/account/*` menerima CSP bernonce tanpa `'unsafe-inline'`
  di `script-src`; `/`, `/services`, `/admin*` tetap statis. Sesuai §9 dan §10.
- Dugaan "double CSP" (temuan §4.2) tidak terjadi pada route header-only: tepat satu
  header. Pada route tersebut CSP statis sengaja tidak berlaku (`STATIC_CSP_SOURCE`),
  jadi hasil ini bukan bukti penimpaan header, melainkan pengecualian.
- `x-nonce` tidak bocor ke response (header-only path hanya menulisnya ke request).

## 4. Daftar periksa 14 butir (§6 csp-clerk-findings.md)

| # | Butir | Status |
| --- | --- | --- |
| 1 | Header semua route | Terverifikasi untuk `/`, `/services`, `/checkout`, `/account*`, `/admin*`. `/api/admin` hanya varian 503. |
| 2 | Jumlah CSP di `/admin` | Terverifikasi hanya jalur 503 (satu, statis). Jalur Clerk aktif: UNVERIFIED (tanpa credential). |
| 3 | Enforcing, bukan Report-Only | Terverifikasi untuk semua route yang diuji; Report-Only 0. Clerk: UNVERIFIED. |
| 4 | Nonce di script-src dan `x-nonce` di response | Terverifikasi header-only (nonce ada, `x-nonce` tidak di response). Clerk: UNVERIFIED. |
| 5 | Nonce berbeda tiap request | Terverifikasi `/checkout`, `/account*`. Clerk: UNVERIFIED. |
| 6 | Nonce header sama dengan atribut `<script>` | Terverifikasi `/checkout` (10/10), `/account*`. `/admin/sign-in` dengan Clerk: UNVERIFIED. |
| 7 | `'unsafe-inline'` dan `'strict-dynamic'` bersama; inline tanpa nonce diabaikan | Sebagian: header-only tidak memuat `'unsafe-inline'`; perilaku inline tanpa nonce di browser tidak diuji. Kombinasi Clerk: UNVERIFIED. |
| 8 | `/admin/sign-in` tampil, Clerk UI termuat | UNVERIFIED: tanpa credential Clerk, `/admin*` 503. Halaman 503 tampil di browser tanpa pelanggaran. |
| 9 | Avatar/gambar admin, font `data:` | UNVERIFIED (butuh Clerk dan sesi admin). |
| 10 | Redirect `/admin` tanpa sesi | UNVERIFIED (503, bukan 307). Redirect `/checkout` dan `/account` membawa CSP bernonce (terverifikasi). |
| 11 | 503 tanpa credential | Terverifikasi: 503, satu CSP statis (`'unsafe-inline'`), header keamanan lain lengkap. |
| 12 | `/checkout`, `/account`, `/services`, `/` sebelum/sesudah | Terverifikasi: sesudah 7.22, nonce hanya di `/checkout` dan `/account*`; `/` dan `/services` tanpa nonce. |
| 13 | `'unsafe-eval'` tidak ada di production | Terverifikasi di semua route yang diuji. |
| 14 | HSTS dan header lain tetap ada | Terverifikasi pada semua route termasuk `/admin` 503 dan header-only. |

Catatan "halaman tetap tampil": `/`, `/services` (statis, 200), `/login` dan halaman
`/account/privacy/confirm` tampil di Chromium. Font loader dan collector analytics
tidak menghasilkan pelanggaran CSP pada halaman yang dimuat. Halaman `/checkout`
yang sebenarnya (setelah login) UNVERIFIED: butuh sesi Customer dan database, tidak
tersedia (auth mock tidak aktif pada build production, database tidak dijalankan).
Request `_rsc` prefetch tercatat `ERR_ABORTED` oleh Playwright saat halaman ditutup;
itu pembatalan navigasi, bukan pelanggaran CSP.

## 5. Temuan (bukti, tanpa perbaikan)

1. **Respons tanpa CSP pada `/checkout/*` sub-path dan varian huruf.**
   `GET /checkout/x` (404) dan `GET /Checkout` (404) mengembalikan header keamanan
   lain tetapi **nol** `Content-Security-Policy`. Sebab: `STATIC_CSP_SOURCE`
   mengecualikan `checkout(?:/|$)` dari CSP statis, sedangkan matcher proxy hanya
   `source: "/checkout"` (tanpa `/:path*`), sehingga tidak ada penulis CSP. Tersisa
   hanya halaman 404 hari ini (tidak ada route di bawah `/checkout`), tetapi route
   anak di masa depan akan tanpa CSP. Komentar di `headers.ts` menyatakan kedua sisi
   case-insensitive; `/Checkout` membuktikan sisi matcher tidak menulis CSP.
2. **Request prefetch tanpa CSP.** `GET /checkout` dengan `next-router-prefetch: 1`
   mengembalikan 307 dengan nol CSP (dikecualikan matcher, sekaligus dikecualikan dari
   CSP statis). `GET /account/x` dengan header yang sama: 404 tanpa CSP. Dampak kecil
   (payload RSC, bukan dokumen), tetapi menyimpang dari klaim §9 "satu CSP per route".
3. **Pelanggaran `script-src eval` di `/login`** (CSP statis, bukan terkait nonce):
   `sourceFile` chunk klien, kolom 3929, berisi probe JIT zod (`Function("")` dalam
   `try/catch`). Bersifat deteksi fitur, jatuh ke jalur tanpa JIT; tidak mematahkan
   halaman. Berpotensi menjadi noise laporan CSP bila `report-to` ditambahkan. Berlaku
   di halaman mana pun yang memuat zod di klien.
4. Tier production menambah `upgrade-insecure-requests`; di loopback http Chromium
   tetap memuat subresource (tidak ada kegagalan), jadi tidak menghalangi pengujian ini.

**Catatan tindak lanjut (perbaikan temuan 1):** matcher proxy diubah dari
`source: "/checkout"` menjadi `source: "/checkout/:path*"` (juga mencakup `/checkout`
polos) dengan kondisi `missing` prefetch yang sama seperti `/account/:path*`. Sub-path
`/checkout/...` kini mendapat nonce + CSP dari proxy. Diverifikasi ulang dengan unit
test (`proxy-header-only.test.ts`: matcher, `/checkout/anything` mendapat CSP tanpa
panggilan Clerk). Pengecekan header nyata lewat build+start tidak dijalankan ulang.
Sisa yang diterima: prefetch tanpa CSP (temuan 2) dan `/Checkout` (varian huruf) yang
tidak cocok dengan matcher Next; `STATIC_CSP_SOURCE` tidak diubah.

## 6. UNVERIFIED (ringkas)

- Seluruh jalur Clerk aktif (`/admin`, `/admin/sign-in`, `/api/admin`): penggabungan
  CSP Clerk dengan statis, nonce Clerk, `x-nonce` di response, redirect handshake,
  avatar/font `data:`. Alasan: tidak ada credential Clerk; 503 fail-closed.
- `/checkout` setelah login (perlu sesi Customer + DB) dan form/aksi di dalamnya.
- Perilaku `minimalMode` dan APP_URL https pada tier production.
- Perilaku browser untuk inline script tanpa nonce dan kombinasi
  `'unsafe-inline'` + nonce (jalur Clerk).
- Perangkat fisik, AT, provider, kesiapan produksi: di luar cakupan. Penerimaan visual
  tetap "belum ditinjau".

## 7. Pertanyaan untuk Owner (tanpa keputusan T6)

1. Apakah celah CSP pada `/checkout/*`, varian huruf, dan prefetch (temuan 1 dan 2)
   cukup dicatat hingga ada route anak, atau diperbaiki sebelum 7.25? (Bukan keputusan
   strategi T6; keputusan cakupan perbaikan.)
2. Apakah `/`, `/services`, dan route publik statis lain tetap memakai `'unsafe-inline'`
   hingga keputusan T6 (nonce seluruh situs, `experimental.sri`, atau cakupan terbatas)?
3. Apakah pengujian jalur Clerk dijadwalkan dengan credential staging setelah
   persetujuan provider, karena 7.24 tidak dapat menutupnya?
4. Apakah pelanggaran `eval` zod perlu ditangani bila pelaporan CSP (`report-to`) diaktifkan?
