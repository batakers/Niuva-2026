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
