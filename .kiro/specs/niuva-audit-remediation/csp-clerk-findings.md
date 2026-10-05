# Temuan: `clerkMiddleware({ contentSecurityPolicy: { strict: true } })` pada `/admin` (Task 7.1)

Status: temuan dari **pembacaan sumber**. Tidak ada build atau `next start` yang
dijalankan pada task ini, dan tidak ada code yang diubah. Semua klaim di bawah
memakai path dan nomor baris nyata. Klaim yang tidak dapat dipastikan dari sumber
ditandai **UNVERIFIED**; verifikasi empiris dijadwalkan di task 7.24 (§6).

Versi yang dibaca:

- `@clerk/nextjs` 7.8.0 (`node_modules/@clerk/nextjs/package.json`, baris `"version"`).
  Jalur singkat di bawah: `CN = node_modules/@clerk/nextjs/dist/esm`.
- `@clerk/backend` 3.17.1, di
  `node_modules/.pnpm/@clerk+backend@3.17.1_react_f7a4ec24d0394fa84a05b778144c56f9/node_modules/@clerk/backend/dist/`
  (disingkat `CB`).
- `next` 16.3.2 (`node_modules/next/package.json:3`).

## 1. Ringkasan

1. Dengan `strict: true`, Clerk menulis **`Content-Security-Policy`** (bukan
   Report-Only, karena `reportOnly` tidak diset) pada **setiap respons** yang
   melewati handler `clerkMiddleware`, termasuk respons redirect dan halaman
   sign-in. Ia juga membuat nonce sendiri dan menulis `x-nonce`.
2. Ia menyuntik nonce ke **request header** (`content-security-policy` dan
   `x-nonce`) lewat mekanisme `x-middleware-override-headers`, sehingga rendering
   Next.js dan `<DynamicClerkScripts>` dapat membacanya. Jadi propagasi nonce ke
   Next bekerja tanpa kode tambahan di `src/proxy.ts`, pada `/admin` dan
   `/api/admin`.
3. Kebijakan Clerk **berbeda** dari `src/lib/security/headers.ts` pada banyak
   direktif. Jika kedua header sampai ke browser, browser menerapkan **keduanya**
   (irisan), dan itu kemungkinan memblokir sumber yang dipakai Clerk atau
   gambar/font yang dipakai halaman admin (§4, §5). Apakah header `next.config.ts`
   ditimpa, digabung, atau dua-duanya terkirim **tidak dapat dipastikan dari
   sumber** (UNVERIFIED, §4.2).

## 2. Apa yang ditulis Clerk

### 2.1 Titik masuk

`src/proxy.ts:28-30` meneruskan `{ contentSecurityPolicy: { strict: true } }`
sebagai opsi kedua `clerkMiddleware`. Tipe opsi: `node_modules/@clerk/nextjs/dist/types/server/clerkMiddleware.d.ts:26`
(`contentSecurityPolicy?: ContentSecurityPolicyOptions`). Bentuk opsi
(`strict`, `directives`, `reportOnly`, `reportTo`):
`.../dist/types/server/content-security-policy.d.ts:14-27`.

Di `CN/server/clerkMiddleware.js`:

- Baris 188: blok berjalan bila `options.contentSecurityPolicy` ada.
- Baris 189-192: memanggil `createContentSecurityPolicyHeaders(host, options)`.
  `host` berasal dari `frontendApi` publishable key (`parsePublishableKey`, `.replace("$", "")`).
- Baris 194-197: untuk tiap pasangan header: `setHeader(handlerResult, key, value)`
  (response header; `CN/utils/response.js:6-8` = `res.headers.set`, artinya
  menimpa header bernama sama yang sudah ada pada `handlerResult`) **dan**
  menyalinnya ke `cspRequestHeaders`.
- Baris 198: `setRequestHeadersOnNextResponse(handlerResult, clerkRequest, cspRequestHeaders)`.

Blok ini berada **setelah** handler pengguna dan `catch` kontrol-alur (baris
179-187) dan **sebelum** cek `isRedirect` (baris 213). Jadi CSP ditulis juga pada:

- respons `NextResponse.next()` biasa,
- `return;` di `src/proxy.ts:19-21` (jalur `isAdminSignInPath`), karena
  `handlerResult` default `NextResponse.next()` (baris 178),
- redirect hasil `auth.protect({ unauthenticatedUrl })` (`src/proxy.ts:23-24`),
  lewat `handleControlFlowErrors` (baris 186).

Pengecualian: jika `requestState.headers` punya `Location` (handshake/redirect
Clerk, baris 153-167), fungsi mengembalikan `NextResponse.redirect(...)` **lebih
awal** dan blok CSP (baris 188) tidak dijalankan. Respons handshake itu tidak
membawa CSP Clerk. Dampaknya kecil (redirect), tetapi tercatat untuk 7.24.

### 2.2 Nama header, Report-Only, nonce

`CB/chunk-73GEKEET.mjs:335-349`:

- baris 335: `ContentSecurityPolicy: "content-security-policy"`
- baris 336: `ContentSecurityPolicyReportOnly: "content-security-policy-report-only"`
- baris 343: `Nonce: "x-nonce"`
- baris 349: `ReportingEndpoints: "reporting-endpoints"`

`CN/server/content-security-policy.js`:

- Baris 168-187 `createContentSecurityPolicyHeaders`.
  - Baris 171: `nonce = options.strict ? generateNonce() : undefined`. Nonce dibuat
    **per pemanggilan**, yaitu per request, hanya bila `strict`.
  - Baris 177-181: `reportOnly` true -> header Report-Only; selain itu header
    `Content-Security-Policy` (enforcing). Repo tidak memakai `reportOnly`
    (`src/proxy.ts:28-30`), jadi yang ditulis adalah **enforcing**.
  - Baris 173-176: `reportTo` menambah `report-to csp-endpoint` dan header
    `reporting-endpoints`. Tidak dipakai di repo.
  - Baris 182-184: bila ada nonce, header `x-nonce` ikut ditulis.
- Baris 129-134 `generateNonce`: 16 byte dari `crypto.getRandomValues`, di-base64
  (`btoa`). Karakter base64 (`+ / =`) tidak mengandung `& > <` yang ditolak
  `getScriptNonceFromHeader` (`CN/app-router/server/utils.js:90`).

### 2.3 Direktif yang dihasilkan (mode strict, tanpa `directives` tambahan)

Sumber: `CN/server/content-security-policy.js:58-93` (default) dan
`135-166` (`buildContentSecurityPolicyDirectives`). Hasil akhir disusun
`formatCSPHeader` (baris 120-128), diurutkan alfabet per direktif.

| Direktif | Nilai | Baris |
| --- | --- | --- |
| `connect-src` | `'self'`, `https://clerk-telemetry.com`, `https://*.clerk-telemetry.com`, `https://api.stripe.com`, `https://maps.googleapis.com`, `https://img.clerk.com`, `https://images.clerkstage.dev`, `https://*.protect.clerk.com:*`, **+ `frontendApi` host** | 59-67; host: 143 |
| `default-src` | `'self'` | 69 |
| `form-action` | `'self'` | 70 |
| `frame-src` | `'self'`, `https://challenges.cloudflare.com`, `https://*.js.stripe.com`, `https://js.stripe.com`, `https://hooks.stripe.com`, `https://*.protect.clerk.com` | 71-78 |
| `img-src` | `'self'`, `https://img.clerk.com` | 79 |
| `script-src` | `'self'`, `'unsafe-inline'`, `https://*.js.stripe.com`, `https://js.stripe.com`, `https://maps.googleapis.com`, `https://*.protect.clerk.com`, **`'strict-dynamic'`**, **`'nonce-<nonce>'`**; `'unsafe-eval'` hanya bila `NODE_ENV !== "production"` | 80-90; `https:`/`http:` dihapus di 145-146; strict-dynamic + nonce di 147-150 |
| `style-src` | `'self'`, `'unsafe-inline'` | 91 |
| `worker-src` | `'self'`, `blob:` | 92 |

Catatan:

- `'unsafe-inline'` tetap ada di `script-src` (baris 83) dan **tidak dibuang** oleh
  mode strict; yang dibuang hanya `http:` dan `https:` (baris 145-146). Menurut
  semantik CSP3, browser yang mengerti nonce/`strict-dynamic` mengabaikan
  `'unsafe-inline'` bila ada nonce, dan `strict-dynamic` membuat `'self'` serta
  allowlist host diabaikan untuk script. Itu pengetahuan spesifikasi, **bukan**
  dibaca dari repo ini (UNVERIFIED terhadap perilaku browser di proyek ini;
  cek di 7.24).
- `style-src` **tidak** mendapat nonce (baris 91 tanpa penambahan di 143-150).
  `'unsafe-inline'` style tetap.
- Tidak ada `base-uri`, `object-src`, `frame-ancestors`, `font-src`,
  `media-src`, `manifest-src`, `upgrade-insecure-requests` dari Clerk. Semuanya
  bisa ditambah lewat `directives` (`CN/server/content-security-policy.js:152-162`,
  nilai bawaan digabung dan diduplikasi oleh `handleExistingDirective` baris 94-107;
  `'none'` mengganti seluruh set).
- Nilai `directives` kustom yang menyentuh `script-src` **ditambahkan setelah**
  nonce/strict-dynamic (baris 152-162), jadi dapat menambah tapi tidak menghapus
  entri bawaan.

## 3. Propagasi nonce ke Next.js

Panduan terpasang: `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`.

- Baris 38: nonce menuntut **dynamic rendering**.
- Baris 181: Next menerapkan nonce saat SSR berdasarkan header CSP **pada request**
  (bukan response).
- Baris 185-191: proxy menyetel CSP (dan `x-nonce`), Next mengekstrak nonce dari
  pola `'nonce-{value}'` di CSP request, lalu menempelkannya ke script framework,
  bundle halaman, style/script inline buatan Next, dan `<Script nonce>`.

Yang dilakukan Clerk:

1. `CN/server/utils.js:21-34` `setRequestHeadersOnNextResponse`: bila respons
   belum punya `x-middleware-override-headers`, ia menyalin **semua** request header
   ke `x-middleware-request-*`, lalu untuk tiap header baru menambahkan nama ke
   `x-middleware-override-headers` dan menyetel `x-middleware-request-<nama>`.
2. `CN/server/clerkMiddleware.js:193-198` memanggilnya dengan
   `content-security-policy` dan `x-nonce` (dan `reporting-endpoints` bila
   `reportTo`). Jadi request yang dilihat renderer membawa CSP Clerk, dan Next
   mengekstrak nonce dari situ.
3. Sisi Next yang menerima: `node_modules/next/dist/server/lib/router-utils/resolve-routes.js:413-437`
   membaca `x-middleware-override-headers`, dan menyetel/menghapus request header
   sesuai daftar. Baris 444-465 menyalin sisa header middleware ke response
   (`resHeaders[key] = value`, baris 462).
4. `ClerkProvider` dengan `dynamic` (dipakai di `src/app/admin/layout.tsx:18`)
   merender `<DynamicClerkScripts>` di dalam `<Suspense>`
   (`CN/app-router/server/ClerkProvider.js:25-37`). `DynamicClerkScripts` membaca
   nonce: `headers().get("X-Nonce")` dulu, fallback ke parse CSP
   (`CN/app-router/server/DynamicClerkScripts.js:6-20`;
   parser: `CN/app-router/server/utils.js:79-96`, mencari `script-src` lalu
   `default-src`, mengambil token `'nonce-...'`). Nonce diteruskan ke
   `ClerkScriptTags` (baris 44).

Kesimpulan: pada `/admin` dan `/api/admin`, nonce **sudah mengalir** dari proxy ke
renderer. Pada route **di luar matcher** (`src/proxy.ts:68-70`: hanya
`/admin/:path*` dan `/api/admin/:path*`) tidak ada nonce sama sekali.

Hal yang tidak ditemukan di dokumen Next terpasang: tidak ada pernyataan
bagaimana `x-middleware-override-headers` berinteraksi bila dua lapisan proxy
menyetel header yang sama. Tidak relevan hari ini (satu proxy), tetapi relevan bila
7.21 menyetel nonce sendiri untuk jalur non-Clerk: pastikan **satu** sumber nonce
per request (§7).

## 4. Konflik dengan `src/lib/security/headers.ts` / `next.config.ts`

### 4.1 Perbedaan kebijakan

`next.config.ts:12-18` memasang `getSecurityHeaders()` pada `source: "/:path*"`
(semua route, termasuk `/admin`). CSP-nya
(`src/lib/security/headers.ts:61-76`):

- `default-src 'self'`, `base-uri 'self'`, `object-src 'none'`,
  `frame-ancestors 'none'`, `form-action 'self'`
- `img-src 'self' https://*.googleusercontent.com data: blob:`
- `font-src 'self' data:`, `media-src`, `manifest-src`, `worker-src 'self' blob:`
- `script-src 'self' 'unsafe-inline'` (+ `'unsafe-eval'` di non-production), baris 72
- `style-src 'self' 'unsafe-inline'`, baris 73
- `connect-src 'self'` (+ `ws:`/`wss:` di dev, origin R2 di non-production), baris 56-60, 74
- `upgrade-insecure-requests` di production, baris 75

Perbedaan yang berdampak bila keduanya terkirim (browser mengevaluasi setiap
header CSP secara terpisah; sebuah sumber harus lolos semuanya. Ini aturan CSP,
UNVERIFIED terhadap browser proyek ini):

| Area | `headers.ts` | Clerk strict | Akibat irisan |
| --- | --- | --- | --- |
| `script-src` | `'self' 'unsafe-inline'` | nonce + `strict-dynamic` + allowlist Stripe/Clerk | Script yang dimuat `clerk-js` dari host frontendApi hanya lolos kebijakan Clerk (via `strict-dynamic`), tetapi **tidak** lolos `headers.ts` (host bukan `'self'`). Risiko: clerk-js diblok di `/admin`. |
| `connect-src` | `'self'` | `'self'` + Clerk telemetry + frontendApi | Panggilan browser ke frontendApi Clerk diblok oleh `headers.ts`. |
| `img-src` | `'self'` + googleusercontent + `data:` + `blob:` | `'self'` + `img.clerk.com` | Gambar `data:`/`blob:`/googleusercontent diblok oleh Clerk; `img.clerk.com` diblok oleh `headers.ts`. |
| `font-src` | `'self' data:` | tidak ada -> jatuh ke `default-src 'self'` | Font `data:` diblok oleh kebijakan Clerk. |
| `frame-src` | tidak ada -> `default-src 'self'` | Clerk/Stripe/Cloudflare | Frame Clerk (bila dipakai) diblok oleh `headers.ts`. |

Baris di tabel adalah **analisis dari dua teks kebijakan**, bukan hasil runtime.

### 4.2 Apakah "double CSP" benar-benar terjadi?

Alasan ia mungkin tidak terjadi (header ditimpa):

- Urutan eksekusi: `headers` dari `next.config` jalan **sebelum** proxy
  (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:206-209`).
- Header response dari proxy disalin dengan **penugasan**
  `resHeaders[key] = value` (`node_modules/next/dist/server/lib/router-utils/resolve-routes.js:462`),
  yang bisa menimpa header bernama sama yang dipasang `next.config`.

Alasan ia mungkin tetap terjadi:

- Nama key berbeda kapitalisasi: `next.config.ts:15` -> `headers.ts:87`
  `"Content-Security-Policy"`; Clerk -> `"content-security-policy"`
  (`CB/chunk-73GEKEET.mjs:335`). Objek biasa memperlakukan keduanya sebagai dua
  key. Siapa yang menang saat dikirim ke socket: **UNVERIFIED**.
- `resolve-routes.js:56` memuat `fsChecker.headers` hanya bila bukan
  `minimalMode`; perilaku di `next start` (production) belum dibaca. **UNVERIFIED**.

**Keputusan untuk 7.21/7.22:** jangan mengandalkan penimpaan. Tetapkan (dan
buktikan di 7.24) bahwa `/admin` mengirim **tepat satu** header
`Content-Security-Policy` (§6, butir 2).

## 5. Lain-lain yang relevan

- Jalur tanpa credential: `src/proxy.ts:51-61` mengembalikan 503 **sebelum**
  `adminProxy`. Respons itu tidak lewat Clerk, jadi tidak membawa CSP Clerk
  maupun nonce. Header statis dari `next.config.ts` tetap berlaku bila ia
  diterapkan ke respons ini (UNVERIFIED, periksa di 7.24 dengan credential
  dikosongkan di mode `local-test`).
- `_next/data`: proxy tetap dipanggil untuk `_next/data` meski dikecualikan
  (`proxy.md:663`). `src/proxy.ts` tidak memakainya (App Router), tetapi
  perluasan matcher di 7.21 harus diuji (`proxy.md:660-675`).
- Server Function di path yang dikecualikan matcher ikut tidak tercakup proxy
  (`proxy.md:217`), jadi `/checkout` dan `/account` tidak mendapat nonce hingga
  matcher diperluas.
- Prefetch: panduan CSP merekomendasikan `missing` header `next-router-prefetch`
  dan `purpose: prefetch` (`content-security-policy.md:130-146`; contoh matcher
  `proxy.md:621-650`). Clerk menghasilkan nonce tiap request yang dicocokkan,
  jadi prefetch tidak perlu memicunya.
- `strict` memaksa `/admin` bersifat dynamic. `/admin` sudah dynamic (dipakai
  `ClerkProvider dynamic`, `src/app/admin/layout.tsx:18`), sehingga tidak ada
  kehilangan render statis di sana.

## 6. Daftar periksa empiris untuk task 7.24 (production build, `next start`)

Gunakan dist dir terpisah (`NIUVA_NEXT_DIST_DIR`), tier `local-test`, dan jangan
mencetak secret.

1. Ambil respons `GET /admin`, `/admin/sign-in`, `/api/admin/...` (bila ada),
   `/checkout`, `/account`, `/services`, `/` dengan `curl -i`; catat semua header
   `content-security-policy*` persis (tanpa nilai secret).
2. **Jumlah header CSP di `/admin`:** satu atau dua? Jika dua, catat apakah yang
   kedua berasal dari `next.config.ts` (§4.2). Catat juga kapitalisasi yang terkirim.
3. Ada `Content-Security-Policy` atau hanya `-Report-Only`? (Harapan dari sumber:
   enforcing.)
4. Nonce ada di `script-src`, dan `x-nonce` ada di **response**? (Clerk menulis
   `x-nonce` ke response, baris 195, sekaligus ke request, baris 196-198;
   konfirmasi apakah header itu bocor ke klien dan apakah itu dapat diterima.)
5. Nonce **berbeda di tiap request** (dua `curl` berurutan).
6. Nonce di header sama dengan atribut `nonce` pada tag `<script>` di HTML `/admin/sign-in`
   (dan script Clerk serta script framework Next).
7. `'unsafe-inline'` dan `'strict-dynamic'` ada bersama di `script-src`; di browser
   nyata, `'unsafe-inline'` diabaikan (uji dengan inline script tanpa nonce).
8. `/admin/sign-in` tampil, Clerk UI termuat, tanpa pelanggaran CSP di console
   (periksa `script-src`, `connect-src`, `frame-src`, `img-src`, `font-src`).
9. Avatar/gambar admin (`data:`, `blob:`, googleusercontent, `img.clerk.com`) dan font
   `data:` tidak diblok.
10. Jalur redirect: `GET /admin` tanpa sesi -> 307 ke `/admin/sign-in`. Apakah
    redirect membawa CSP (baris 194 vs 160)?
11. Jalur 503 tanpa credential: header apa yang ada (§5)?
12. `/checkout`, `/account`, `/services`, `/`: pastikan **tidak ada** nonce dan
    `x-nonce` sebelum 7.21/7.22 (baseline); setelah 7.22, nonce hanya di route
    dinamis cakupan.
13. Produksi vs dev: `'unsafe-eval'` tidak muncul di production
    (`CN/server/content-security-policy.js:82`, `headers.ts:72`).
14. `Strict-Transport-Security` dan header lain dari `headers.ts` tetap ada pada
    `/admin` (tidak hilang oleh penimpaan header Clerk).

## 7. Implikasi untuk 7.21 dan 7.22

7.21 (`src/proxy.ts`, pisahkan jalur Clerk dan header-only):

- Clerk hanya menangani `/admin` dan `/api/admin`. Opsi `contentSecurityPolicy`
  tidak bisa dipakai untuk jalur non-Clerk, sehingga jalur header-only harus
  membuat nonce dan header sendiri (Web Crypto, `crypto.getRandomValues` seperti
  Clerk, `content-security-policy.js:129-134`), dan meneruskannya lewat
  `NextResponse.next({ request: { headers } })` (`proxy.md:433-434`).
- Agar konsisten, pertimbangkan satu modul pembangun CSP di
  `src/lib/security/headers.ts` yang menerima nonce, lalu dipakai jalur
  header-only **dan** dilewatkan ke Clerk via `directives`, bukan dua kebijakan
  independen. Dengan cara itu kebijakan Clerk dapat memuat
  `img-src ... data: blob:`, `font-src`, `base-uri`, `object-src 'none'`,
  `frame-ancestors 'none'` yang hari ini hanya ada di `headers.ts`
  (penambahan lewat `directives` didukung, baris 152-162).
- Jaga HTML 503 tanpa credential (`src/proxy.ts:51-61`) dan allowlist sign-in
  (`src/proxy.ts:19-21`). Respons 503 tidak lewat Clerk, jadi perlu header CSP
  sendiri bila header statis dihapus.
- Matcher: `missing` prefetch (`proxy.md:621-650`), uji `_next/data` (`proxy.md:660-675`).

7.22 (`src/lib/security/headers.ts`, `next.config.ts`):

- Pada route yang mendapat nonce dari proxy (`/admin`, `/api/admin`, dan nanti
  `/checkout`, `/account`), `next.config.ts` **tidak boleh** ikut menulis CSP
  statis `'unsafe-inline'`. Pisahkan `headers()` menjadi (a) header non-CSP untuk
  `/:path*` dan (b) CSP statis hanya untuk route yang tidak melalui proxy nonce
  (mis. route publik statis). Dengan begitu satu sumber CSP per route dan
  tidak ada irisan tak sengaja (§4).
- Route publik statis tidak bisa mendapat nonce (`content-security-policy.md:38,181`);
  cakupan awal 7.22 sesuai (`/checkout`, `/account/*`, `/admin/*`, `/api/*` relevan).
  Statis tetap `'unsafe-inline'`; itu dicatat di 7.25 (keputusan Owner), bukan
  dipilih di sini.
- Setelah perubahan, bandingkan hasil dengan baseline 7.24 (§6). Terutama butir 2,
  8, 9, dan 14.

## 8. Yang belum terverifikasi (ringkas)

- UNVERIFIED: apakah `/admin` di production mengirim satu atau dua header CSP, dan
  mana yang menang (§4.2).
- UNVERIFIED: apakah irisan kebijakan saat ini memblokir clerk-js/koneksi Clerk di
  `/admin` (§4.1). Sumber hanya menunjukkan teks kebijakan.
- UNVERIFIED: perilaku browser untuk `'unsafe-inline'` versus nonce dan
  `strict-dynamic` (pengetahuan spesifikasi CSP3, bukan dari repo).
- UNVERIFIED: apakah `x-nonce` di response menjadi masalah dan apakah redirect
  handshake Clerk (tanpa CSP) berdampak.
- UNVERIFIED: perilaku header `next.config` pada `minimalMode` / `next start`
  (`resolve-routes.js:56`).
- Tidak dijalankan di task ini: `next build`, `next start`, dan pengambilan header
  (langkah di `tasks.md` 7.1 digeser ke 7.24; gate `build` tidak dijalankan
  karena tidak ada perubahan code).


## 9. Hasil 7.21: penggabungan header proxy dan `next.config` (dibaca dari sumber Next 16.3.2)

- `node_modules/next/dist/server/lib/router-utils/resolve-routes.js`: header
  `next.config` diterapkan lebih dulu ke objek biasa `resHeaders` (baris 544-562,
  `resHeaders[key] = value`). Header respons proxy disalin sesudahnya
  (baris 445-463, `resHeaders[key] = value`). Objek berurutan sisip, jadi entri
  proxy datang belakangan.
- `node_modules/next/dist/server/lib/router-server.js:371-373` dan `395-397`
  menerapkan `res.setHeader(key, resHeaders[key])` untuk tiap key. `setHeader`
  Node tidak peka huruf besar/kecil, jadi `Content-Security-Policy` (statis) lalu
  `content-security-policy` (proxy/Clerk) menjadi **satu** header, nilai proxy
  menang. Jawaban untuk UNVERIFIED §4.2 pada jalur `next start` non-minimal:
  tidak ada dua CSP, CSP proxy menimpa CSP statis. Ini hasil pembacaan sumber,
  belum empiris (task 7.24). `minimalMode` (`resolve-routes.js:56`, header statis
  dilewati di sini) tetap UNVERIFIED.
- Konsekuensi: pada rute yang diproses proxy dan proxy menyetel CSP (`/admin`,
  `/api/admin` via Clerk; `/checkout`, `/account/*` via jalur header-only),
  CSP statis `'unsafe-inline'` tertimpa, tanpa perubahan `next.config.ts`.
  Pengecualian: respons yang tidak membawa CSP proxy (503 tanpa credential,
  redirect handshake Clerk, request prefetch yang dikecualikan matcher) tetap
  memakai CSP statis. Untuk 7.22: jangan mengandalkan penimpaan sebagai satu-satunya
  jaminan; pisahkan CSP statis dari rute yang dicakup proxy.
- Matcher `_next/data`: `unstable_doesMiddlewareMatch` menormalkan
  `/_next/data/<build>/<halaman>.json` ke `/<halaman>` sebelum mencocokkan,
  sehingga data route `/admin/...` tetap lewat Clerk dan `/checkout` lewat jalur
  header-only (diuji di `tests/unit/proxy-header-only.test.ts`).
- Fail-closed: jalur header-only hanya untuk prefiks `/checkout` dan `/account`
  secara eksplisit; path lain yang lolos matcher (termasuk huruf besar seperti
  `/Admin`) jatuh ke jalur Clerk.

## 10. Hasil 7.22: pemisahan CSP statis dan batas penggabungan Clerk

- `/checkout` dan `/account/*`: CSP statis `next.config.ts` tidak berlaku lagi
  (`STATIC_CSP_SOURCE` di `src/lib/security/headers.ts`); satu-satunya CSP berasal
  dari proxy jalur header-only (nonce + strict-dynamic, tanpa `'unsafe-inline'`
  di `script-src`, R2 lewat `connectOrigins` dari `getObjectStorageConnectOrigin`).
  Header keamanan lain tetap di `/:path*`.
- `/admin` dan `/api/admin`: **tidak diubah**. Penggabungan `directives` Clerk
  (`node_modules/@clerk/nextjs/dist/esm/server/content-security-policy.js`,
  `handleExistingDirective`/`buildContentSecurityPolicyDirectives`) hanya
  **menambah** nilai. `'unsafe-inline'` di `script-src` dan `style-src` adalah
  bawaan Clerk dan tidak dapat dibuang lewat `directives` (hanya `http:`/`https:`
  dihapus oleh `strict`). Nonce dibuat Clerk sendiri; `directives` tidak dapat
  menerima nonce buatan kita. Jadi `/admin` tetap memuat `'unsafe-inline'`
  (diabaikan browser CSP3 karena nonce + `strict-dynamic`). CSP statis dibiarkan
  pada `/admin` agar 503 tanpa credential dan redirect handshake tetap punya CSP.
