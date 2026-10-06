# Investigasi E2E media beranda — 6 Oktober 2026

Status: investigasi lokal selesai; akar penyebab kegagalan CI lama **belum terbukti**. Timeout/retry/assertions dan runtime gambar tidak diubah. `expectDecodedImage()` tetap menunggu decode sukses serta dimensi positif.

## Bukti CI yang diperiksa langsung

- `main` pada `ae43fb93c8642741d166e23c621937ae283e8f0d`: [Quality 37331063062](https://github.com/batakers/Niuva-2026/actions/runs/37331063062), completed/success.
- Attempt 1 [37286002533](https://github.com/batakers/Niuva-2026/actions/runs/37286002533): tiga kegagalan tes yang sama, masing-masing sekitar 30 detik, stack di `expectDecodedImage()` / `locator.evaluate`.
- Attempt 1 [37291522614](https://github.com/batakers/Niuva-2026/actions/runs/37291522614): pola sama, sekitar 30,1–30,2 detik.
- Kedua artifact API mengembalikan `[]` saat diperiksa ulang. Path `trace.zip` di log tidak menjadi artifact yang dapat diunduh. Trace CI gagal **tidak** diinspeksi.
- Pada run pertama, `The destination stream closed early` tercatat 08:52:34 UTC; tes gagal pertama selesai 08:54:30 UTC setelah berjalan sekitar 30 detik. Pesan stream berada sekitar 86 detik sebelum awal tes itu. Pada run kedua, jaraknya sekitar 118 detik sebelum awal tes. Kedekatan satu job tidak membuktikan stream itu adalah request gambar yang macet.
- Stack decode menyatakan fase saat deadline seluruh tes habis. Stack tersebut tidak membuktikan `image.decode()` sendiri memakai 30 detik, gambar tertentu macet, atau ISR menjadi penyebab.

## Reproduksi lokal terarah

Command: `corepack pnpm exec playwright test tests/e2e/product-route-proof.spec.ts tests/e2e/customer-email-auth.spec.ts --trace on`. Peluncur PowerShell tersembunyi memakai harness existing, database `niuva_test` di loopback 55432, mock OAuth/email, server Next dev port 3000. Hasil: **5/5 lulus**, 51,2 detik keseluruhan; tes product proof 7,9 detik.

Trace lokal `test-results/product-route-proof-author-56ce0-sponsive-and-semantic-proof/trace.zip` benar-benar diinspeksi untuk attachment JSON publik. Suite penuh berikutnya mengganti direktori hasil default, sehingga path tersebut adalah lokasi saat inspeksi, bukan artifact persisten yang masih tersedia. Tidak menyalin cookie, token, state OAuth, payload, atau URL ber-query ke laporan.

| Viewport | Media publik | Decode mulai (ms sejak tes) | Interval sampai decode selesai (ms) | Dimensi sebelum decode |
| --- | --- | ---: | ---: | --- |
| 390×844 | `/media/portfolio/cs-01-smart-drop-box.png` | 4896 | 66 | 390×219 |
| 390×844 | `/media/portfolio/cs-02-motor-ev.png` | 4974 | 51 | 390×219 |
| 390×844 | `/media/portfolio/cs-05-bagit.png` | 5054 | 51 | 390×219 |
| 1280×900 | `/media/portfolio/cs-01-smart-drop-box.png` | 5469 | 53 | 384×216 |
| 1280×900 | `/media/portfolio/cs-02-motor-ev.png` | 5536 | 53 | 384×216 |
| 1280×900 | `/media/portfolio/cs-05-bagit.png` | 5600 | 43 | 384×216 |

Interval mencakup helper scroll dan assertions, sehingga bukan pengukuran murni decoder browser. Keenam gambar sudah `complete = true` pada snapshot sebelum decode. Response media yang tercatat 200/304; tidak ada requestfailed publik. Login selesai pada 1393 ms, proof layout empat viewport selesai pada 4580 ms, dan seluruh proof selesai pada 7357 ms. Kondisi gagal tidak tereproduksi dalam run terarah ini.

## Instrumentasi dan batas

`product-route-proof.spec.ts` menambahkan attachment `public-homepage-media-diagnostics`: fase, waktu relatif, viewport, index/alt gambar, pathname media publik, complete/dimensi, serta status response. Query, cookie, storage, token, private-media path, dan isi berkas tidak direkam di attachment ini. Assertions layout/semantic/media/keyboard/form/error tetap ada.

Suite penuh berjalan dengan source/config yang sama setelah run terarah: **110 lulus, 5 skip existing, 0 gagal**, 3,0 menit; product proof lulus 5,3 detik. Pesan `The destination stream closed early` juga muncul pada run lokal penuh yang lulus. Ini menunjukkan pesan tersebut sendiri tidak cukup untuk mengidentifikasi kegagalan decode. Attachment pada tes sukses tidak disimpan terpisah oleh list reporter; trace run terarah menyediakan data fase yang diinspeksi. CI baseline memakai `next dev`; run itu tidak menguji cache ISR produksi. Tidak ada eksperimen `next start` yang dapat menjelaskan kejadian CI lama, sehingga tidak ada perubahan caching/loading speculative.

Langkah berikut bila CI gagal lagi: gunakan attachment/trace dari attempt gagal untuk menentukan gambar, complete/dimensi, response, dan waktu tersisa sebelum decode. Workflow saat ini tidak mengunggah artifact; penyimpanan artifact CI memerlukan instruksi infrastruktur tersendiri. Akar penyebab tetap terbuka sampai ada bukti failure tersebut.
