# Patch Next 16.3.2 — request gambar yang dibatalkan

`next@16.3.2.patch` melepaskan pembacaan sumber gambar internal dari socket klien pertama. Next menggabungkan request varian gambar yang sama; pembatalan satu klien harus tetap memungkinkan pembacaan sumber selesai dan cache melayani klien berikutnya. Patch diterapkan pada CommonJS dan ESM melalui `patchedDependencies` pnpm, tanpa paket baru atau perubahan versi.

`.gitattributes` menjaga file `patches/*.patch` memakai LF pada checkout Windows dan Linux, sehingga hash patch tetap cocok dengan lockfile frozen. Aturan tersebut hanya berlaku untuk file patch.

Penyebab direproduksi dengan Next yang terpasang: `fetchInternalImage()` + `serveStatic()` menggantung ketika socket klien ditutup sesudah chunk pertama. Dengan patch, byte sumber selesai dan request HEAD tetap mendapatkan sumber lengkap. Batas body, validasi gambar, transformasi, kebijakan cache, serta pemeriksaan akses tetap pada implementasi existing.

Referensi: [issue upstream #96538](https://github.com/vercel/next.js/issues/96538) dan [PR upstream #96542](https://github.com/vercel/next.js/pull/96542). Keduanya ditutup; PR tersebut tidak di-merge. Patch ini diverifikasi pada paket Niuva yang terpasang, bukan klaim bahwa upstream sudah memperbaikinya.

Saat memperbarui Next, tinjau kembali patch dan jalankan `corepack pnpm test:backend tests/backend/next-image-optimizer-abort.test.ts`, E2E penuh, dan build. Lepaskan patch hanya jika versi pengganti terbukti lulus reproduksi abort tersebut tanpa patch. Perubahan instalasi dicatat di `pnpm-workspace.yaml` dan `pnpm-lock.yaml`; `package.json` tidak berubah.
