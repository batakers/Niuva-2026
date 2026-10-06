# Perbaikan Quality gates — PR #42

Mulai: 6 Oktober 2026. Owner meminta kelanjutan perbaikan Quality gates melalui Superpowers. Branch/PR yang sama dipertahankan; instruksi **jangan merge** tetap berlaku. Workflow, credential, dependency, provider dan keputusan bisnis tidak diperluas.

Metode: `superpowers:systematic-debugging`, lalu TDD untuk perbaikan penyebab yang terkonfirmasi dan `verification-before-completion` untuk hasil akhir. Eksekusi/review oleh agent utama; tidak ada subagent yang diminta.

## Fase 1 — bukti awal

Run [37359554372](https://github.com/batakers/Niuva-2026/actions/runs/37359554372), head `1df9d85fac573cfa9539bc76a2508a12ae6f31b5`, gagal pada dua attempt. Masing-masing E2E 109 lulus/5 skip/1 gagal; tiga percobaan tes product proof terhenti pada `expectDecodedImage()` / `image.decode()` dalam loop media. Lint/typecheck/unit/backend/Prisma/integrasi lulus; build CI di-skip. Pola serupa sudah terjadi sebelum PR ini, tetapi itu tidak membuktikan penyebab baru/lamanya sama.

Artifact API kosong. JSON diagnosis tersimpan di attachment pada runner, tetapi list reporter tidak menampilkannya di log. Data terakhir tentang gambar/viewport/request tidak tersedia. Rerun kedua tidak menambah data untuk membedakan deadline seluruh tes dari macetnya request/decode.

Dokumentasi Image dari Next 16.3.2 yang terpasang dibaca. Pemeriksaan source: helper men-scroll gambar lalu menunggu native decode/dimensi; product proof menggabungkan login, delapan navigasi layout dan dua viewport media dalam satu deadline tes. Bukti tersebut belum menentukan lokasi waktu habis.

## Eksperimen 1 — membuat diagnosis dapat diambil

Perubahan hanya pada test: catat awal dan akhir body request gambar publik; keluarkan maksimal 200 event diagnosis existing ke stdout dengan prefix `NIUVA_PUBLIC_MEDIA_DIAGNOSTICS` pada run gagal maupun lulus untuk pembanding. Alt dibatasi 160 karakter. Attachment tetap ada. Exception dilempar kembali; seluruh assertion, timeout, retry dan navigasi tetap.

Projection hanya fase/waktu relatif, viewport, index/alt, pathname media publik, complete/dimensi dan status response. Tidak mencetak error asli, query, cookie, token, storage, provider payload atau private-media URL. Perubahan workflow tidak diperlukan untuk mengambil data job log ini.

Hipotesis yang akan dibedakan: (a) fase sebelum decode sudah menghabiskan sebagian besar deadline; (b) request objek/optimizer belum selesai; (c) state gambar/native lazy decode tidak maju walaupun request selesai. Belum memilih perbaikan runtime atau readiness berdasarkan dugaan.

Status: instrumentasi lokal dalam verifikasi. Hasil command, commit/run diagnosis, hipotesis terpilih dan validasi perbaikan akan ditambahkan sesuai bukti aktual.

Source instrumentasi final: lint/typecheck lulus; target product proof + page-readiness **3/3 lulus**, 36,3 detik. Stdout benar-benar diparse: **114 event**, 29 transfer selesai, seluruh key sesuai projection dan pathname tanpa query. Proof selesai pada 10.202 ms; enam decode dimulai pada 6.892–7.789 ms, semuanya sudah complete dan berdimensi positif. Ini bukti lokal yang sehat, bukan bukti akar penyebab CI atau perbaikannya.

Verifikasi awal: lint/typecheck lulus; product proof + dua test page-readiness lulus **3/3**, 38,1 detik. Instrumentasi kemudian ditambah event `requestfinished` dan stdout pada run lulus agar arrival header tidak disamakan dengan body lengkap. Source final instrumentasi diverifikasi lagi sebelum dikirim.

Rujukan primer: [MDN decode](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode), [MDN lazy loading](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/loading), dan [Playwright requestfinished](https://playwright.dev/docs/api/class-page#page-event-requestfinished). Response dan transfer body adalah fase berbeda; dokumentasi bukan bukti bahwa salah satunya menyebabkan failure di repo ini.

Run diagnosis [37365177684](https://github.com/batakers/Niuva-2026/actions/runs/37365177684), head `6d64ecbefa2f8a08c6f87b9cb8bc037d18b5227d`, attempt 1 berakhir tanpa runner/step setelah antrean 15 menit. Anotasi GitHub: "The job was not acquired by Runner of type hosted even after multiple attempts". [Status resmi Actions](https://www.githubstatus.com/incidents/3q1yb5m7ltvb) melaporkan keterlambatan penugasan runner; ini menjelaskan antrean diagnosis, bukan bukti penyebab timeout decode sebelumnya. Job yang sama dijalankan ulang untuk memperoleh data tes.

Pembanding lokal lanjutan: product proof diulang lima kali pada source diagnosis yang sama, **5/5 lulus**, 39,7 detik keseluruhan; setiap proof selesai pada 4.466–6.070 ms. Command: `corepack pnpm exec playwright test tests/e2e/product-route-proof.spec.ts --repeat-each=5 --output .local/quality-repeat-results`. Tidak menaikkan timeout, retry, atau mengubah assertion. Linux lokal belum tersedia: WSL hanya memiliki distribusi internal Docker Desktop dan engine Docker tidak berjalan; tidak memasang atau mengubah infrastruktur untuk eksperimen ini.

## Fase 2 — hasil diagnosis Linux dan penyebab

Attempt 2 run diagnosis mendapat runner Linux dan menjalankan semua gate. Lint, typecheck, unit, backend, Prisma dan integrasi lulus. E2E kembali **109 lulus/5 skip/1 gagal**; build di-skip. Stdout menghasilkan tiga projection kegagalan yang dapat diambil.

Ketiganya macet pada gambar Smart Drop Box di viewport 390×844. Decode mulai pada **3.360 / 4.725 / 3.566 ms**, sehingga login/delapan navigasi belum mendekati deadline 30 detik. State gambar `complete=false`, dimensi 0×0. Request varian mobile sudah dimulai pada layout 390 px sebelumnya dan tidak mendapat response/transfer selesai; varian pada 320/768/1280 px mendapat 200/304 serta body lengkap. Hipotesis deadline habis oleh fase sebelumnya gugur. Gejala ada sebelum decoder menerima byte; mengganti helper decode belum didukung bukti.

[Issue Next #96538](https://github.com/vercel/next.js/issues/96538) mendokumentasikan cache varian gambar yang tetap pending setelah klien pertama memutus request dingin. [PR #96542](https://github.com/vercel/next.js/pull/96542) ditutup tanpa merge. Source Next **16.3.2 yang terpasang** sesuai rantai penyebabnya: `fetchInternalImage()` memasang `_req.socket` pada mock response; pembatalan socket menghentikan stream `serveStatic()`; `hasStreamed` tidak selesai; batcher hanya membersihkan pending key setelah generator selesai. Error `destination stream closed early` juga muncul pada tes lain sebelum product proof, sehingga tidak dijadikan bukti langsung asal request gambar yang macet.

## Fase 3 — reproduksi RED dan patch GREEN

Regression baru `tests/backend/next-image-optimizer-abort.test.ts` memakai fungsi Next yang sebenarnya, filesystem publik yang sebenarnya, serta pemutusan socket sesudah chunk pertama. Deadline fixture 2 detik membatasi reproduksi stream yang menggantung; timeout E2E existing tetap 30 detik.

- **RED**, paket unpatched: `corepack pnpm test:backend tests/backend/next-image-optimizer-abort.test.ts` → **1 gagal/1 lulus**. Fetch setelah abort tetap pending; pembanding HEAD lulus. Reproduksi ini berhasil di Windows, sehingga penyebab tidak disimpulkan hanya dari laporan upstream atau perbedaan OS.
- Patch: fasilitas bawaan `pnpm patch`/`patch-commit`; hapus hubungan socket klien pada fetch internal CommonJS dan ESM. Tidak mengubah dependency/version, body limit, validasi format, transformasi, cache policy, auth, provider, atau workflow. `pnpm-workspace.yaml` dan lockfile hanya menambahkan pendaftaran/hash patch existing `next@16.3.2` beserta referensi peer Next; tidak ada versi paket lain berubah.
- **GREEN**, paket patched: command reproduksi yang sama → **2/2 lulus**, 18 ms waktu tes. Seluruh byte sumber cocok dan request HEAD tetap menjadi pembacaan GET lengkap.

Petunjuk maintenance/upgrade ada di `patches/README.md`. Patch bersifat version-specific dan perlu ditinjau ulang pada upgrade Next. Verifikasi penuh lokal dan CI pada head perbaikan masih berjalan; belum mengklaim seluruh Quality lulus atau siap production.

`.gitattributes` ditambahkan dengan satu aturan `/patches/*.patch text eol=lf`. Hash SHA-256 file LF cocok dengan lockfile (`3e43b6d5…`); versi CRLF berbeda (`499ab212…`). Aturan sempit ini mempertahankan hash frozen pada checkout Windows/Linux tanpa mengubah line ending source lain.

## Fase 4 — verifikasi source perbaikan

Lint dan typecheck lulus. Unit/component **86 file/1.203 tes**, backend **73 file/549 tes**, Prisma validate, dan integrasi **20 file/121 tes** lulus pada source patched. `prisma generate` berjalan melalui pre-hook resmi; client tetap 7.10.0.

E2E penuh lokal pertama: **109 lulus/5 skip/1 gagal**. Product proof selesai **4.140 ms** dengan keenam decode complete/dimensi positif; kegagalan terjadi pada `account-work.spec.ts:38`, setelah klik “Pantau di akun” menunggu heading detail inquiry dalam assertion 5 detik. Snapshot masih menunjukkan Project Brief sukses dan indikator Next sedang merender. Ini kegagalan berbeda; sebab pastinya belum terkonfirmasi dan tidak dinyatakan selesai oleh patch gambar.

Investigasi terpisah tanpa edit/pelemahan test: `corepack pnpm exec playwright test tests/e2e/account-work.spec.ts tests/e2e/product-route-proof.spec.ts --trace on --output .local/quality-account-trace-results` → **5/5 lulus**, 41,3 detik. Trace diproses lokal dengan projection tanpa cookie/body/query/private URL: request detail inquiry **200/808 ms**, heading terlihat setelah **828 ms**. Cold compilation masih dugaan, bukan penyebab terverifikasi. Trace mentah tetap lokal. E2E penuh kemudian dijalankan kembali; smoke tier production lokal dan build menunggu hasilnya.

E2E penuh lokal kedua: **109 lulus/5 skip/1 gagal**; account-work dan product proof lulus (media proof **3.906 ms**, enam decode selesai). Kegagalan berbeda pada `customer-privacy.spec.ts:121`: selector global `getByRole("alert")` menangkap pesan penolakan aplikasi **dan** `__next-route-announcer__` bawaan Next. Snapshot membuktikan pesan “Tautan tidak berlaku” sudah tampil; yang gagal adalah strict locator dengan dua hasil, bukan kontrol penutupan/replay.

Perbaikan test minimal: kedua pemeriksaan replay (EXPORT/CLOSE) memakai alert dalam `main`, dengan tambahan `toHaveCount(1)` dan pemeriksaan teks penolakan existing yang sama. Tidak memakai `.first()`, menghapus announcer, mengubah runtime privasi, mengurangi assertion, atau mengubah timeout/retry. Run gagal dan snapshot di atas menjadi bukti RED untuk selector; verifikasi GREEN targeted/full menyusul.

GREEN targeted setelah perbaikan selector: `corepack pnpm exec playwright test tests/e2e/customer-privacy.spec.ts tests/e2e/product-route-proof.spec.ts --trace on --output .local/quality-privacy-trace-results` → **5/5 lulus**, 33,9 detik. Lint/typecheck, E2E penuh, smoke tier production lokal, dan build kemudian diverifikasi kembali pada source final.

E2E penuh lokal ketiga: **108 lulus/5 skip/2 gagal**; product proof selesai **3.503 ms** dengan enam decode. Dua fixture privasi gagal berpindah dari register ke verify-email. Snapshot membuktikan server memberi pesan rate limit. `CustomerEmailService.throttle()` dan `CustomerEmailRepository.limit()` menunjukkan batas IP email **20/jam** yang tersimpan di `customer_auth_rate_limits`; global setup E2E tidak menghapus bucket tersebut. Pengulangan berbagai run memakai IP loopback yang sama sehingga state quota tersisa lintas run. Ini berbeda dari limiter request publik per proses; tidak disimpulkan sebagai kegagalan pendaftaran atau policy usia.

Perbaikan isolasi test: helper actor menghasilkan alamat dokumentasi IPv6 per worker/test/attempt dan menolak base URL di luar loopback. Kedua suite auth-email/privasi memberi actor konsisten pada browser context, termasuk context tanpa JavaScript. Header fixture `x-forwarded-for`/`x-real-ip` mengikuti input actor existing; tidak mengubah handler, store, limit/window, policy, atau menghapus bucket DB. Referensi: [Playwright context headers](https://playwright.dev/docs/api/class-browsercontext#browser-context-set-extra-http-headers), [RFC 3849](https://www.rfc-editor.org/rfc/rfc3849).

Tambahan E2E membuktikan limiter HTTP tetap aktif: 20 permintaan forgot-password untuk email fixture tidak ada menerima 200, permintaan ke-21 actor yang sama menerima 429, actor berbeda menerima 200. Tidak mengirim email atau membuat akun dalam tes counter tersebut. Target auth-email + privasi + product proof dengan trace lokal → **10/10 lulus**, 49,2 detik. E2E bertambah satu kasus; tidak ada kasus dihapus/di-skip, timeout/retry tetap. Gate final penuh dan build dijalankan kembali setelah isolasi ini.

Gotcha isolasi actor pada pengulangan E2E dicatat singkat di root `AGENTS.md` sebagai perubahan kontrak verifikasi yang tahan lama. Dokumen Owner dalam `docs/` tetap utuh.

## Checkpoint akhir lokal dan pengiriman

Source final lulus seluruh pemeriksaan berikut:

| Pemeriksaan | Hasil |
| --- | --- |
| Lint/strict TypeScript | Lulus; exit 0, tanpa error/warning lint |
| Unit/component | 86 file / 1.203 tes lulus |
| Backend termasuk regression abort | 73 file / 549 tes lulus |
| Prisma generate/validate | Lulus; client/schema 7.10.0 |
| Integrasi PostgreSQL resmi | 20 file / 121 tes lulus |
| Target auth-email/privasi/media dengan trace | 10/10 lulus |
| E2E penuh final | **111 lulus / 5 skip existing / 0 gagal**, 2,4 menit |
| Tier production di harness Next dev lokal, port 3101 | **5/5 lulus**, 12,3 detik |
| Build tanpa database tersedia | **68/68 halaman statis**, exit 0 |
| `corepack pnpm install --frozen-lockfile --offline` | Lulus; tidak ada perubahan versi paket |
| Diff dan hash patch di index | Lulus; hash LF cocok dengan lockfile |

Product proof final selesai **3.446 ms**, enam decode selesai. Coverage statements tetap unit **37,63%**, backend **33,07%**, integrasi **34,68%**; threshold tidak berubah.

Commit patch: `afa207e00507056ca5278752fe8f3c88cdbcf56e`. Commit harness/bukti dikirim sesudahnya pada branch PR #42 yang sama. CI untuk head kiriman akhir masih harus diverifikasi; hasil final tersedia di check PR dan laporan pengiriman lokal, tanpa membuat commit dokumentasi tambahan hanya untuk memicu run baru.

Batas hasil: satu kegagalan navigasi akun lokal awal belum memiliki penyebab pasti; targeted trace dan run berikutnya lulus tanpa perubahan alur akun. Ini tidak diklaim sebagai semua flakiness telah terhapus. Patch Next perlu ditinjau saat upgrade. Visual Owner belum ditinjau; perangkat fisik/AT, hosted Clerk, provider, staging dan production tetap belum terverifikasi. `PUB-RELEASE` tetap `NOT_AUTHORIZED`; tidak ada merge/deployment/aktivasi.

Rollback remediasi tidak memerlukan perubahan schema/data: revert commit patch bersama pendaftaran/hash/test regression-nya dan revert commit fixture jika diperlukan. Mengembalikan patch juga mengembalikan bug abort yang direproduksi, sehingga tidak dianggap perbaikan readiness.
