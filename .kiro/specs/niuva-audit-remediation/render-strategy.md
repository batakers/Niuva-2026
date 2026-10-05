# Strategi render per route (Task 9.13, Req 16.1)

Status: keputusan dokumen. Tidak ada kode yang diubah oleh task ini. Penerapan ada di 9.14 (`/`), 9.15 (`/projects*`), 9.16 (sisa), dan pembandingan hasil `build` ada di 9.18.

## Dasar dokumen terpasang

Dibaca dari `node_modules/next/dist/docs/`:

- `01-app/02-guides/caching-without-cache-components.md`
- `01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md`

Fakta yang dipakai:

1. `cacheComponents` tidak aktif di `next.config.ts`, jadi `dynamic`, `revalidate`, dan `fetchCache` masih berlaku. Dokumen index segment config hanya mencantumkan `dynamicParams`, `runtime`, `preferredRegion`, `maxDuration` sebagai opsi "baru"; tiga opsi lama hanya berlaku pada model sebelumnya (version history v16.0.0). Jika `cacheComponents` diaktifkan kelak, semua strategi di bawah harus ditulis ulang (keputusan T7, di luar program ini).
2. `export const revalidate = <angka>` harus literal yang dapat dianalisis statis (`300` valid, `60 * 5` tidak). `revalidate` terendah di antara layout dan page menentukan frekuensi seluruh route.
3. `fetchCache` dan `fetch` hanya mengatur `fetch()`. Query Prisma bukan `fetch`, sehingga cache halaman hanya terjadi bila route tidak memakai Request-time API. Cache data non-`fetch` memakai `unstable_cache`.
4. Request-time API (`cookies()`, `headers()`, `searchParams`, `connection()`) membuat route dinamis. `revalidate = 0` atau `dynamic = "force-dynamic"` juga memaksa dinamis.
5. `revalidatePath` hanya bermakna bila route punya cache entry. Pada route dinamis, ia tidak berdampak pada halaman publik. Pola segment dinamis memakai `revalidatePath("/projects/[slug]", "page")`, bukan path konkret.
6. Di development, page selalu dirender saat diminta; klasifikasi hanya dapat diverifikasi dari output `build` (9.18).

## Snapshot historis sebelum penerapan (dibaca 9.13)

Tabel ini mempertahankan keadaan awal untuk traceability. Keadaan setelah Tahap 12 ada di tabel pembandingan build di bawah; jangan memakai snapshot ini sebagai inventaris runtime terkini.

| Route | Request-time API hari ini | Akibat |
| --- | --- | --- |
| `/` | `await connection()` | dinamis; `revalidatePath("/")` tidak berpengaruh |
| `/projects` | `searchParams` (parameter `preview`) | dinamis |
| `/projects/[slug]` | `params` dan `searchParams` (`preview`) | dinamis |
| `/shop`, `/shop/[slug]` | `connection()` dan `searchParams` | dinamis; `revalidatePath("/shop")` tidak berpengaruh |
| `/services` | tidak ada | statis |
| `/services/[slug]` | `generateStaticParams` ada, tetapi juga `connection()` setelah `notFound` guard | dinamis, bertentangan dengan asumsi design "statis" |
| `/cart`, `/checkout`, `/account/*`, `/quote/[token]`, `/orders/[token]`, `/custom-print/requests/[token]`, `/project-brief`, `/custom-print`, `/custom-print/request` | `connection()` | dinamis |

Proxy nonce (`src/proxy.ts`) hanya memiliki `/admin`, `/api/admin`, `/checkout`, `/account`. Route publik lain memakai CSP statis dari `next.config.ts`, jadi nonce tidak memaksa route publik menjadi dinamis.

## Tabel keputusan

| Route | Strategi | Nilai yang direncanakan | Alasan |
| --- | --- | --- | --- |
| `/` | revalidasi berjangka | `revalidate = 300` | Konten portfolio dan produk berubah jarang. `revalidatePath("/")` sudah dipanggil pada perubahan produk dan portfolio di `src/app/admin/actions.ts`. Perlu menghapus `connection()`; fallback saat database down sudah ada (try/catch). |
| `/projects` | revalidasi berjangka | `revalidate = 300` | Sama. `revalidatePath("/projects")` sudah dipanggil. Parameter `preview` tidak boleh membaca `searchParams` di jalur produksi (lihat Catatan A). |
| `/projects/[slug]` | revalidasi berjangka | `revalidate = 300` | Sama. Perlu invalidasi pola: tambahkan `revalidatePath("/projects/[slug]", "page")` pada aksi publish/ubah portfolio (Catatan B). |
| `/shop` | revalidasi berjangka pendek | `revalidate = 60` | Stok terlihat di halaman. `revalidatePath("/shop")` sudah dipanggil pada produk, varian, stok, dan media. |
| `/shop/[slug]` | revalidasi berjangka pendek | `revalidate = 60` | Sama. Perlu `revalidatePath("/shop/[slug]", "page")` (Catatan B). |
| `/services` | statis (tetap) | tanpa segment config | Satu-satunya route publik statis hari ini. Jangan diubah. |
| `/services/[slug]` | revalidasi berjangka (RK-16, task 26.3) | `revalidate = 300`, `generateStaticParams` dipertahankan | Konten layanan berasal dari `publicServices`; proyek terkait membaca portfolio terpublikasi dan memakai fallback kosong saat database gagal. Kedua aksi portfolio menginvalidasi `/services/[slug]` dengan tipe `page`. Keputusan Owner: handoff Tahap 12, 5 Oktober 2026. |
| `/cart`, `/checkout` | dinamis | `connection()` dipertahankan | Per sesi dan customer login; tidak boleh di-cache. `/checkout` juga memakai nonce CSP dari proxy. |
| `/account/*` | dinamis | `connection()` dipertahankan | Per customer; nonce CSP dari proxy. |
| `/quote/[token]`, `/orders/[token]`, `/custom-print/requests/[token]` | dinamis | `connection()` dipertahankan | Per token; isi tidak boleh di-cache atau dibagi antar pengunjung. |
| `/project-brief`, `/custom-print/request` | dinamis | `connection()` dipertahankan | Form dengan guard redirect dan parameter query. |
| `/custom-print` | dinamis | `connection()` dipertahankan | Membaca status fitur live; di luar daftar design, dicatat agar tidak terlewat. Dapat ditinjau ulang di 9.16. |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | dinamis | tidak diubah | Alur auth; bukan halaman konten. |
| `/auth-test-policy`, `/internal-testing/*`, `/demo/action-queue`, `/api/frontend-preview/media/[id]` | dinamis, `noindex` | tidak diubah | Khusus test atau internal; dikecualikan dari sitemap (9.19). |
| `/admin/*` | dinamis | tidak diubah | Dilindungi Clerk; bukan permukaan publik. |

## Catatan untuk task penerapan

- **A. Preview dan `searchParams`.** `/projects`, `/projects/[slug]`, dan `/shop*` memakai `?preview=` lewat `searchParams`. Selama `searchParams` dibaca di page, route tetap dinamis dan `revalidate` tidak ada artinya. 9.14 sampai 9.16 harus memisahkan jalur produksi (tanpa `searchParams`) dari jalur preview, tanpa mengubah perilaku preview yang sudah diterima Owner. Opsi yang perlu dipilih saat penerapan: proteksi preview di proxy/route terpisah, atau tetap dinamis dengan cache data memakai `unstable_cache`. Keputusan tidak diambil di sini karena menyentuh permukaan publik yang sudah diterima.
- **B. Invalidasi pola.** `src/app/admin/actions.ts` saat ini hanya memanggil `revalidatePath("/shop")`, `"/projects"`, `"/"`. Untuk detail `[slug]` belum ada panggilan. Pola `type: "page"` diperlukan agar detail ikut invalid (Req 16.2). Perubahan `actions.ts` adalah bagian 9.15/9.16, bukan 9.13.
- **C. `/services/[slug]`.** Selisih dinamis pada 9.18 ditutup oleh keputusan RK-16 dan task 26.3: hapus `connection()`, ISR 300 detik dengan slug layanan yang sama dan fallback database tetap tersedia. Model `Service` (RK-08) tidak diubah.
- **D. Batas `revalidate`.** Nilai 300 dan 60 adalah usulan awal berdasarkan frekuensi perubahan dan keberadaan invalidasi on-demand. Nilai dapat disesuaikan di 9.14 sampai 9.16 tanpa mengubah strategi.
- **E. Verifikasi.** Klasifikasi statis/dinamis diverifikasi dari output `build` (9.18, Req 16.8); test e2e tidak membuktikan cache.

## Kolom pembandingan (diisi 9.18)

| Route | Strategi direncanakan | Hasil `build` | Selisih |
| --- | --- | --- | --- |
| `/` | revalidasi 300 | `○` static, Revalidate 5m, Expire 1y | Tidak ada |
| `/projects` | revalidasi 300 | `○` static, Revalidate 5m, Expire 1y | Tidak ada |
| `/projects/[slug]` | revalidasi 300 | `●` SSG (`generateStaticParams`) | Tidak ada selisih klasifikasi. Kolom Revalidate kosong di tabel build, tetapi route prerender dan mewarisi `revalidate` segment; tidak dapat dibuktikan dari output ini. |
| `/shop` | revalidasi 60 | `○` static, Revalidate 1m, Expire 1y | Tidak ada |
| `/shop/[slug]` | revalidasi 60 | `●` SSG (`generateStaticParams`) | Sama seperti `/projects/[slug]`. |
| `/services` | statis | `○` static | Tidak ada |
| `/services/[slug]` | ISR 300 (RK-16) | Empat slug `●` SSG, masing-masing Revalidate 5m, Expire 1y | Tidak ada; build task 26.3, 5 Oktober 2026, exit 0. `prerender-manifest.json` mencatat `initialRevalidateSeconds: 300` untuk tiap slug. |

Dijalankan pada Task 9.18 dengan `corepack pnpm build` (Next 16.3.2, exit 0, compile berhasil). Route `/preview/projects*` dan `/preview/shop*` berklasifikasi `ƒ` (dinamis), sesuai jalur preview yang dipisahkan dari jalur produksi.

Pembaruan task 26.3: `corepack pnpm build` dengan `NIUVA_NEXT_DIST_DIR=.local/stage12-next`, Next 16.3.2, exit 0. Output nyata menampilkan `/services/research-development`, `/services/consultant-workshop`, `/services/design-prototyping`, dan `/services/apparel-merchandise` sebagai `●`, Revalidate 5m dan Expire 1y. Build dilakukan tanpa koneksi database; informasi layanan tetap ter-prerender ketika proyek terkait gagal dibaca. Bukti ini tetap lokal, loopback, non-production; penerimaan visual belum ditinjau.
